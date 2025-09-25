import { AdminApiContextWithoutRest } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients";
import { Type, createUserContent, GoogleGenAI, PartListUnion } from "@google/genai"
import { ShopifyProduct } from "./route";

interface AIMedia {
    name: string;
    text: string;
}

interface AIRecipient {
    id?: string;
    name?: String;
}

export interface AIResponse {
    title: string;
    description: string;
    metaDescription: string;
    keywords: string[];
    altText: AIMedia[];
    nudityLevel: number;
    politicalLevel: number;
    sexualLevel: number;
    foulLanguageLevel: number;
    tone: string;
    recipient: AIRecipient | null;
}

export async function runAIAnalysis(admin: AdminApiContextWithoutRest, product: ShopifyProduct, toneList: string[], genderedList: string[], groupList: string[]): Promise<string> {
    const ai = new GoogleGenAI({});

    const strippedURLs = product.media.map(media => {
        const segments = media.url.split('/');
        const finalSegment = segments[segments.length - 1];
        const paramsIndex = finalSegment.indexOf("?");
        if (paramsIndex !== -1) {
            return finalSegment.substring(0, paramsIndex);
        }
        return finalSegment;
    }); 

    const typePrompt = `The images provided are product images for a ${product.productType}.`;
    const recipientPrompt = `From the following list, which gender best describes the recipient: ${JSON.stringify(genderedList)}. From the following list, which group best describes the recipient: ${JSON.stringify(groupList)}. Is this product made to be given to a kid?`;
    const tonePrompt = `From the following list, pick which tone best describes the product: ${JSON.stringify(toneList)}.`;
    const titlePrompt = `Provide a product title that is SEO optimized based on the title "${product.sapTitle}", adding in ${product.occasion}, clean up the title to make it human readable.`;
    const desciptionPrompt = `Create a ecommerce focused description for the product.`;
    const metaDescriptionPrompt = `Create SEO optimized meta-description for the product that is between 140 and 160 characters.`;
    const keywordsPrompt = `Generate a list of at least 50 but no more then 90, keywords for the product optimized for SEO to allow the product to be searchable.`;
    const altTextPrompt = `Create SEO optimized alt text, no longer then 130 characters, for the following image(s), using the filename of the image for the name field: ${strippedURLs}`;
    const crudePrompt = `On a scale of 1 to 5, with 5 being the crudest rate the nudity, political divisiveness, sexual innuendo and foul language levels.`;

    const content: PartListUnion = [{text: `${typePrompt} ${recipientPrompt} ${tonePrompt} ${titlePrompt} ${desciptionPrompt} ${metaDescriptionPrompt} ${keywordsPrompt} ${altTextPrompt} ${crudePrompt}`}];
    
    for (let i = 0; i < product.media.length; i++) {
            const response = await fetch(product.media[i].url);
            const imageArrayBuffer = await response.arrayBuffer();
            const base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');
            content.push({
                inlineData: {
                    mimeType: product.media[i].mimeType,
                    data: base64ImageData
                }
        });                            
    }

    const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            createUserContent(content)
        ],
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING
                    },
                    description: {
                        type: Type.STRING
                    },
                    metaDescription: {
                        type: Type.STRING
                    },
                    keywords: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING
                        }
                    },
                    altText: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: {
                                    type: Type.STRING
                                },
                                text: {
                                    type: Type.STRING
                                }
                            }
                        }
                    },
                    nudityLevel: {
                        type: Type.INTEGER
                    },
                    politicalLevel: {
                        type: Type.INTEGER
                    },
                    sexualLevel: {
                        type: Type.INTEGER
                    },
                    foulLanguageLevel: {
                        type: Type.INTEGER
                    },
                    tone: {
                        type: Type.STRING
                    },
                    recipient: {
                        type: Type.OBJECT,
                        properties: {
                            gender: {
                                type: Type.STRING
                            },
                            group: {
                                type: Type.STRING
                            },
                            kid: {
                                type: Type.BOOLEAN
                            }
                        }
                    }
                }
            }
        }
    });

    if (typeof aiResponse === "string") {
        return aiResponse;
    }

    let aiJson = null;

    if (aiResponse && aiResponse.text) {
        aiJson = JSON.parse(aiResponse.text);
    }

    let recipient: AIRecipient = {};
    if (aiJson && aiJson.recipient && aiJson.recipient.gender && aiJson.recipient.kid != null && aiJson.recipient.group) {
        const getRecipientResponse = await admin.graphql(
            `#graphql
                query getRecipientId($handle: String!) {
                    metaobjectByHandle(handle: {type: "recipient", handle: $handle}) {
                        id
                        displayName
                    }
                }
            `,
            {
                variables: {
                    handle: `${aiJson.recipient.gender.replace(" ", "")}-${aiJson.recipient.group.replace(" ", "")}${aiJson.recipient.kid ? "-Kids" : ""}`
                }
            }
        );

        const getRecipientResult = await getRecipientResponse.json();

        if (getRecipientResult.data.metaobjectByHandle) {
            recipient.id = getRecipientResult.data.metaobjectByHandle.id;
            recipient.name = getRecipientResult.data.metaobjectByHandle.displayName;
        } else {
            const recipientCreateResponse = await admin.graphql(
                `#graphql
                    mutation createDefinition($metaobject: MetaobjectCreateInput!) {
                        metaobjectCreate(metaobject: $metaobject) {
                            metaobject {
                                id
                                displayName
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                {
                    variables: {
                        metaobject: {
                            type: "recipient",
                            handle: `${aiJson.recipient.gender.replace(" ", "")}-${aiJson.recipient.group.replace(" ", "")}${aiJson.recipient.kid ? "-Kids" : ""}`,
                            fields: [
                                {
                                    key: "name",
                                    value: `For ${aiJson.recipient.gender} ${aiJson.recipient.group} ${aiJson.recipient.kid ? "Kids" : ""}`
                                },
                                {
                                    key: "gendered",
                                    value: aiJson.recipient.gender
                                },
                                {
                                    key: "group",
                                    value: aiJson.recipient.group
                                },
                                {
                                    key: "for_kid",
                                    value: aiJson.recipient.kid.toString()
                                }
                            ]
                        }
                    }
                }
            );

            const recipientCreateResult = await recipientCreateResponse.json();
                    
            if (recipientCreateResult.data.metaobjectCreate.userErrors.length > 0) {
                return JSON.stringify({error: `Failed to create metaobject - [${recipientCreateResult.data.metaobjectCreate.userErrors[0].field}] ${recipientCreateResult.data.metaobjectCreate.userErrors[0].message}`});
            }

            recipient = {
                id: recipientCreateResult.data.metaobjectCreate.metaobject.id,
                name: recipientCreateResult.data.metaobjectCreate.metaobject.displayName,
            }
        }
    }

    return JSON.stringify({
        title: aiJson.title,
        description: aiJson.description,
        metaDescription: aiJson.metaDescription,
        keywords: aiJson.keywords,
        altText: aiJson.altText,
        nudityLevel: aiJson.nudityLevel,
        politicalLevel: aiJson.politicalLevel,
        sexualLevel: aiJson.sexualLevel,
        foulLanguageLevel: aiJson.foulLanguageLevel,
        tone: aiJson.tone,
        recipient: recipient
    });
}
