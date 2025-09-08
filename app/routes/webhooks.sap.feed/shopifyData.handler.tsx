import { AdminApiContextWithoutRest } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients";

interface ShopifyVariant {
    name: string;
    activeDate: Date | null;
    nlaDate: Date | null;
    owoDate: Date | null;
    vbpDate: Date | null;
    tempOutDate: Date | null;
    introDate: Date | null;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT";
    latestDate: string;
    pricingOverride: boolean;
    clearance: boolean;
}

interface ShopifyMedia {
    id: string;
    url: string;
    mimeType: string;
    alt: string;
}

export interface ShopifyProduct {
    id: string;
    mediaCount: number;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT";
    createdAt: Date;
    variants: ShopifyVariant[];
    aiData: string;
    media: ShopifyMedia[];
    latestMediaUpdate: Date;
    recipient: string;
}

export async function getShopifyProductData(admin: AdminApiContextWithoutRest, sku: String) {
    const productResponse = await admin.graphql(
        `#graphql
            query GetProductBySku($query: String!) {
                products(first: 1, query: $query) {
                    nodes {
                        id
                        title
                        seo {
                            description
                        }
                        description
                        tags
                        mediaCount {
                            count
                        }
                        createdAt
                        status
                        variants(first: 250) {
                            nodes {
                                sku
                                title
                                activeDate: metafield(namespace: "custom", key: "active_date") {
                                    value
                                }
                                nlaDate: metafield(namespace: "custom", key: "nla_date") {
                                    value
                                }
                                owoDate: metafield(namespace: "custom", key: "owo_date") {
                                    value
                                }
                                vbpDate: metafield(namespace: "custom", key: "vbp_date") {
                                    value
                                }
                                tempOutDate: metafield(namespace: "custom", key: "temp_out_date") {
                                    value
                                }
                                introDate: metafield(namespace: "custom", key: "intro_date") {
                                    value
                                }
                                status: metafield(namespace: "custom", key: "status") {
                                    value
                                }
                                latestDate: metafield(namespace: "custom", key: "latest_date") {
                                    value
                                }
                                pricingOverride: metafield(namespace: "custom", key: "pricing_override") {
                                    value
                                }
                                clearance: metafield(namespace: "custom", key: "clearance") {
                                    value
                                }
                            }
                        }
                        media(first: 250) {
                            nodes {
                                id
                                ... on MediaImage {
                                    createdAt
                                    alt
                                    image {
                                        url
                                    }
                                    mimeType
                                }
                            }
                        }
                        aiData: metafield(namespace: "custom", key: "ai_json") {
                            value
                        }
                        tone: metafield(namespace: "custom", key: "tone") {
                            value
                        }
                        foulLanguage: metafield(namespace: "custom", key: "foulLanguage") {
                            value
                        }
                        sexualLevel: metafield(namespace: "custom", key: "sexuallevel") {
                            value
                        }
                        politicalLevel: metafield(namespace: "custom", key: "politicallevel") {
                            value
                        }
                        nudityLevel: metafield(namespace: "custom", key: "nuditylevel") {
                            value
                        }
                        recipient: metafield(namespace: "custom", key: "recipient") {
                            value
                        }
                    }
                }
            }
        `,
        {
            variables: {
                query: `sku:${sku}`
            }
        }
    );

    const productResult = await productResponse.json();

    if (productResult.data.products.nodes.length === 0) {
        return null;
    }

    let latestMediaUpdate = new Date(0);
    const media: ShopifyMedia[] = [];
    for (let i = 0; i < productResult.data.products.nodes[0].media.nodes.length; i++) {
        if ( productResult.data.products.nodes[0].media.nodes[i]) {
            const updateDate = productResult.data.products.nodes[0].media.nodes[i].createdAt;
            if (latestMediaUpdate < updateDate) {
                latestMediaUpdate = updateDate;
            }

            media.push({
                id: productResult.data.products.nodes[0].media.nodes[i].id,
                url: productResult.data.products.nodes[0].media.nodes[i].image.url,
                mimeType: productResult.data.products.nodes[0].media.nodes[i].mimeType,
                alt: productResult.data.products.nodes[0].media.nodes[i].alt
            });
        }
    }

    const variants: ShopifyVariant[] = [];
    for (let i = 0; i < productResult.data.products.nodes[0].variants.nodes.length; i++) {
        variants.push({
            name: productResult.data.products.nodes[0].variants.nodes[i].title,
            activeDate: productResult.data.products.nodes[0].variants.nodes[i].activeDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].activeDate.value) : null,
            nlaDate: productResult.data.products.nodes[0].variants.nodes[i].nlaDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].nlaDate.value) : null,
            owoDate: productResult.data.products.nodes[0].variants.nodes[i].owoDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].owoDate.value) : null,
            vbpDate: productResult.data.products.nodes[0].variants.nodes[i].vbpDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].vbpDate.value) : null,
            tempOutDate: productResult.data.products.nodes[0].variants.nodes[i].tempOutDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].tempOutDate.value) : null,
            introDate: productResult.data.products.nodes[0].variants.nodes[i].introDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].introDate.value) : null,
            status: productResult.data.products.nodes[0].variants.nodes[i].status ? productResult.data.products.nodes[0].variants.nodes[i].status.value : null,
            latestDate: productResult.data.products.nodes[0].variants.nodes[i].latestDate ? productResult.data.products.nodes[0].variants.nodes[i].latestDate.value : null,
            pricingOverride: productResult.data.products.nodes[0].variants.nodes[i].pricingOverride ? productResult.data.products.nodes[0].variants.nodes[i].pricingOverride.value === 'true' ? true : false : false,
            clearance: productResult.data.products.nodes[0].variants.nodes[i].clearance ? productResult.data.products.nodes[0].variants.nodes[i].clearance.value === 'true' ? true : false : false
        });
    }

    return {
        id: productResult.data.products.nodes[0].id,
        mediaCount: productResult.data.products.nodes[0].mediaCount.count,
        status: productResult.data.products.nodes[0].status,
        createdAt: new Date(productResult.data.products.nodes[0].createdAt),
        variants: variants,
        aiData: productResult.data.products.nodes[0].aiData ? productResult.data.products.nodes[0].aiData.value : null,
        media: media,
        latestMediaUpdate,
        title: productResult.data.products.nodes[0].title,
        metaDescription: productResult.data.products.nodes[0].seo.description,
        description: productResult.data.products.nodes[0].description,
        tags: productResult.data.products.nodes[0].tags,
        tone: productResult.data.products.nodes[0].tone ? productResult.data.products.nodes[0].tone.value : null,
        foulLanguage: productResult.data.products.nodes[0].foulLanguage ? productResult.data.products.nodes[0].foulLanguage.value : null,
        sexualLevel: productResult.data.products.nodes[0].sexualLevel ? productResult.data.products.nodes[0].sexualLevel.value : null,
        politicalLevel: productResult.data.products.nodes[0].politicalLevel ? productResult.data.products.nodes[0].politicalLevel.value : null,
        nudityLevel: productResult.data.products.nodes[0].nudityLevel ? productResult.data.products.nodes[0].nudityLevel.value : null,
        recipient: productResult.data.products.nodes[0].recipient ? productResult.data.products.nodes[0].recipient.value : null
    }
}