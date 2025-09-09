import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { runAIAnalysis } from "./aiAnalysis";

export async function action({ request }: ActionFunctionArgs) {
    /*const { admin, payload} = await authenticate.flow(request);
    const { queue } = payload;

    for (let i = 0; i < queue.length; i++) {
        const aiResponse = await runAIAnalysis(admin, queue[i]);
        if (JSON.parse(aiResponse).error) {
            ITErrors.push({
                        code: sku,
                        message: aiResponse
                    });
        } else {
            const aiData = JSON.parse(aiResponse);
            productStatus.push({
                        code: sku,
                        message: "AI ANALYSIS | AI analysis has been completed."
                    });

            //TODO
            //Set product to active once done
        }
    }
        
    
    
    
    
    
    
    
     const shopifyAiData = JSON.parse(shopifyProductData.aiData); //TODO add type 
        let aiData = JSON.parse(shopifyProductData.aiData);

        const tempTitle: string = aiData && aiData.title ? aiData.title : sapProductData.title;

        const tempTone: string = shopifyProductData.tone ? shopifyProductData.tone : "Belated"; //TODO Get default Tone
        const tempLanguage: number = shopifyProductData.foulLanguage ? shopifyProductData.foulLanguage : 1;
        const tempSexual: number = shopifyProductData.sexualLevel ? shopifyProductData.sexualLevel : 1;
        const tempPolitical: number = shopifyProductData.politicalLevel ? shopifyProductData.politicalLevel : 1;
        const tempNudity: number = shopifyProductData.nudityLevel ? shopifyProductData.nudityLevel : 1;
        const tempRecipient: string = shopifyProductData.recipient ? shopifyProductData.recipient : defaultRecipient;

        let tags: string[] = [];
        let aiJsonWBannedTags = aiData;
        if (shopifyAiData) {
            const removedTags = shopifyAiData.keywords.filter((element: string) => !shopifyProductData.tags.includes(element));
            tags = aiData.keywords.filter((tag: string) => !removedTags.includes(tag));
            aiJsonWBannedTags.keywords = aiData.keywords.concat(removedTags);
        }

        const productMetafields: Metafield[] = [
            {
                namespace: "custom",
                key: "tone",
                value: shopifyAiData && tempTone === shopifyAiData.tone ? aiData.tone : tempTone
            },
            {
                namespace: "custom",
                key: "recipient",
                value: shopifyAiData && tempRecipient === shopifyAiData.recipient ? aiData.recipeint : tempRecipient
            },
            {
                namespace: "custom",
                key: "foulLanguage",
                value: shopifyAiData && tempLanguage === shopifyAiData.foulLanguageLevel ? aiData.foulLanguageLevel.toString() : tempLanguage.toString()
            },
            {
                namespace: "custom",
                key: "sexualLevel",
                value: shopifyAiData && tempSexual === shopifyAiData.sexualLevel ? aiData.sexualLevel.toString() : tempSexual.toString()
            },
            {
                namespace: "custom",
                key: "politicalLevel",
                value: shopifyAiData && tempPolitical === shopifyAiData.politicalLevel ? shopifyAiData.politicalLevel.toString() : tempPolitical.toString()
            },
            {
                namespace: "custom",
                key: "nudityLevel",
                value: shopifyAiData && tempNudity === shopifyAiData.nudityLevel ? shopifyAiData.nudityLevel.toString() : tempNudity.toString()
            },
            {
                namespace: "custom",
                key: "ai_json",
                value: JSON.stringify(aiJsonWBannedTags)
            }
        ];

        if (artist) {
            productMetafields.push({
                namespace: "custom",
                key: "artist",
                value: artist
            });
        }

        if (orientation) {
            productMetafields.push({
                namespace: "custom",
                key: "orientation",
                value: orientation
            });
        }

        if (processArray.length > 0) {
            productMetafields.push({
                namespace: "custom",
                key: "premium_features",
                value: JSON.stringify(processArray)
            });
        }

        if (occasionId) {
            productMetafields.push({
                namespace: "custom",
                key: "prefix",
                value: occasionId
            });
        }

        if (occasionName) {
            productMetafields.push({
                namespace: "custom",
                key: "occasion",
                value: occasionName
            });
        }

        if (assortmentId) {
            productMetafields.push({
                namespace: "custom",
                key: "assortment",
                value: assortmentId
            });
        }
            
        if (sizeId) {
            productMetafields.push({
                namespace: "custom",
                key: "size",
                value: sizeId
            });
        }

        if (prop65) {
            productMetafields.push({
                namespace: "custom",
                key: "prop65",
                value: prop65.toString()
            });
        }

        if (categoryId) {
            productMetafields.push({
                namespace: "custom",
                key: "category",
                value: categoryId
            });
        }

        if (sapProductData.verse_front.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_front",
                value: sapProductData.verse_front.text
            });
        }

        if (sapProductData.verse_inside_1.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_inside_1",
                value: sapProductData.verse_inside_1.text
            });
        }

        if (sapProductData.verse_inside_2.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_inside_2",
                value: sapProductData.verse_inside_2.text
            });
        }

        if (sapProductData.line) {
            productMetafields.push({
                namespace: "custom",
                key: "line",
                value: sapProductData.line
            });
        }

        if (sapProductData.title) {
            productMetafields.push({
                namespace: "custom",
                key: "sap_title",
                value: sapProductData.title
            });
        }

        if (sapProductData) {
            productMetafields.push({
                namespace: "custom",
                key: "product_feed_json",
                value: JSON.stringify(sapProductData)
            });
        }

        const updateProductResponse = await admin.graphql(
            `#graphql
                mutation updateProduct($product: ProductSetInput!, $id: ID!) {
                    productSet(synchronous: true, input: $product, identifier: {id: $id}) {
                        product {
                            id
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
                    id: shopifyProductData.id,
                    product: {
                        vendor: brandName,
                        productType: typeName,
                        category: `gid://shopify/TaxonomyCategory/${taxonomyString}`,
                        productOptions: [{
                            name: "Channels",
                            values: channels
                        }],
                        variants: formatedVariants,
                        title: !shopifyAiData || shopifyProductData.title === shopifyAiData.title ? tempTitle : shopifyProductData.title,
                        seo: {
                            title: !shopifyAiData || shopifyProductData.title === shopifyAiData.title ? tempTitle : shopifyProductData.title,
                            description: shopifyProductData.metaDescription && shopifyAiData ? shopifyProductData.metaDescription === shopifyAiData.metaDescription ? shopifyAiData.metaDescription : shopifyProductData.metaDescription : ""
                        },
                        descriptionHtml: shopifyProductData.description && shopifyAiData ? shopifyProductData.description === shopifyAiData.description ? shopifyAiData.description : shopifyProductData.description : "",
                        metafields: productMetafields
                    }
                }
            }
        );
        const updateProductResult = await updateProductResponse.json();

        if (updateProductResult.data.productSet.userErrors.length > 0) {
            updateProductResult.data.productSet.userErrors.forEach((error: any) => {
                ITErrors.push({
                    code: sku,
                    message: `PRODUCT UPDATE | (${error.field}) ${error.message}`
                });
            });
            continue;
        }

        tags = tags.slice(0, 249).concat(`${sapProductData.prefix.toUpperCase()}${sku}`);

        const updateProductTagsResponse = await admin.graphql(
            `#graphql
                mutation addProductTags($id: ID!, $tags: [String!]!) {
                    tagsAdd(id: $id, tags: $tags) {
                        node {
                            id
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
                    id: shopifyProductData.id,
                    tags: tags
                }
            }
        );
        const updateProductTagsResult = await updateProductTagsResponse.json();

        if (updateProductTagsResult.data.tagsAdd.userErrors.length > 0) {
            updateProductTagsResult.data.tagsAdd.userErrors.forEach((error: any) => {
                ITErrors.push({
                    code: sku,
                    message: `PRODUCT TAGS | (${error.field}) ${error.message}`
                });
            });
            continue;
        }

        const mediaDefinition: UploadMedia[] = [];
        if (aiData && aiData.altText.length > 0) {
            for (let i = 0; i < shopifyProductData.media.length; i++) {
                const segments = shopifyProductData.media[i].url.split('/');
                let name = segments[segments.length - 1];
                const paramsIndex = name.indexOf("?");
                if (paramsIndex !== -1) {
                    name = name.substring(0, paramsIndex);
                }
                for (let j = 0; j < aiData.altText.length; j++) {
                    if (name === aiData.altText[j].name) {
                        if (shopifyAiData) {
                            for (let k = 0; k < shopifyAiData.altText.length; k++) {
                                if (name === shopifyAiData.altText[k].name) {
                                    if (shopifyAiData.altText[k].text === shopifyProductData.media[i].alt) {
                                        mediaDefinition.push({
                                            id: shopifyProductData.media[i].id,
                                            alt: aiData.altText[j].text
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }

        if (mediaDefinition.length > 0) {
            const updateAltTextResponse = await admin.graphql(
                `#graphql
                    mutation updateAltText($files: [FileUpdateInput!]!) {
                        fileUpdate(files: $files) {
                            files {
                                id
                            }
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }                                    
                `,
                {
                    variables: {
                        files: mediaDefinition
                    }
                }
            );
            const updateAltTextResult = await updateAltTextResponse.json();

            if (updateAltTextResult.data.fileUpdate.userErrors.length > 0) {
                updateAltTextResult.data.fileUpdate.userErrors.forEach((error: any) => {
                    ITErrors.push({
                        code: sku,
                        message: `PRODUCT AltText | (${error.field}) ${error.message}`
                    });
                });
                continue;
            }
        }
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    */

    return new Response("Ok", { status: 200 });
}