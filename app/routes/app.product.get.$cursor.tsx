import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

interface ProductPreview {
  id: string;
  title: string;
  imgUrl: string;
  sku: string;
  brand: string;
  product: string;
  d2cStatus: "DRAFT" | "ACTIVE" | "ARCHIVED" | string;
  b2bStatus: "DRAFT" | "ACTIVE" | "ARCHIVED" | string;
}

interface Reply {
    error?: any;
    products?: any[];
    moreProducts?: boolean;
    lastCursor?: string;
}

export async function action({request, params}: ActionFunctionArgs) {
    const { admin } = await authenticate.admin(request);
    let reply: Reply = {};
    
    try {
        const response = await admin.graphql(
            `#graphql
                query getProducts($cursor: String!) {
                    products(first: 50, query: "status:ACTIVE", after: $cursor) {
                    edges {
                        node {
                        id
                        title
                        vendor
                        productType
                        variants(first: 250) {
                            nodes {
                            displayName
                            sku
                            status: metafield(namespace: "custom", key: "status") {
                                value
                            }
                            }
                        }
                        media(first: 1) {
                            nodes {
                            preview {
                                image {
                                url
                                }
                            }
                            }
                        }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                    }
                    }
                }
                `,
                {
                    variables: {
                        cursor: params.cursor
                    }
                }
        );

        if (response.ok) {
            const result = await response.json();

            const productList: ProductPreview[] = [];

            result.data.products.edges.forEach((product: any) => {
                let b2b = "";
                let d2c = "";
                
                product.node.variants.nodes.forEach((variant: any) => {
                if (variant.displayName.toUpperCase() === "D2C") {
                    d2c = variant.status && variant.status.value ? variant.status.value : "";
                } else if (variant.displayName.toUpperCase() === "B2B") {
                    b2b = variant.status && variant.status.value ? variant.status.value : "";
                }
                });

                productList.push({
                id: product.node.id,
                title: product.node.title,
                brand: product.node.vendor,
                product: product.node.productType,
                imgUrl: product.node.media.nodes[0].preview.image.url,
                sku: product.node.variants.nodes[0].sku,
                d2cStatus: d2c,
                b2bStatus: b2b
                });
            });

            reply.moreProducts = result.data.products.pageInfo.hasNextPage;
            reply.lastCursor = result.data.products.edges[result.data.products.edges.length - 1].cursor;

            reply.products = productList;



        }
    } catch (error) {
        reply.error = error;
    }

    return new Response(JSON.stringify(reply), {
        headers: { "Content-Type": "application/json" }
    });
}