import { LoaderFunctionArgs } from "@remix-run/node";
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
    products?: any[];
    moreProducts?: boolean;
    lastCursor?: string;
}

export async function loader({request, params}: LoaderFunctionArgs) {
    const { admin } = await authenticate.admin(request);
    let reply: Reply = {};

    const url = new URL(request.url);
    const searchTerm = url.searchParams.get("search");

    const splitSort = params.sort?.toUpperCase().split("-");
    const sortKey = splitSort ? splitSort[0] : "TITLE";
    const direction = splitSort ? splitSort[1] : "ASC";

    let variables = {
        cursor: params.cursor ? params.cursor : null,
        query: `${searchTerm ? `(${searchTerm}) AND (` : ""}status:ACTIVE${searchTerm ? ")": ""}`,
        sortKey: sortKey,
        reverse: direction === "DESC" ? true : false
    }
    
    const response = await admin.graphql(
        `#graphql
            query getProducts($cursor: String, $sortKey: ProductSortKeys!, $reverse: Boolean!, $query: String) {
                products(first: 50, query: $query, sortKey: $sortKey, after: $cursor, reverse: $reverse) {
                    edges {
                        node {
                            id
                            title
                            vendor
                            productType
                            variants(first: 250) {
                                nodes {
                                    title
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
            variables: variables
        }
        );

        const result = await response.json();

        const productList: ProductPreview[] = [];

        result.data.products.edges.forEach((product: any) => {
            let b2b = "";
            let d2c = "";
            
            product.node.variants.nodes.forEach((variant: any) => {
                if (variant.title.toUpperCase() === "D2C") {
                    d2c = variant.status && variant.status.value ? variant.status.value : "";
                } else if (variant.title.toUpperCase() === "B2B") {
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

        if (result.data.products.edges.length != 0 ) {
            if (!result.data.products.edges[result.data.products.edges.length - 1].cursor.endsWith("==")) {
                reply.lastCursor = result.data.products.edges[result.data.products.edges.length - 1].cursor;
            }
        }

        reply.products = productList;

    return new Response(JSON.stringify(reply), {
        headers: { "Content-Type": "application/json" }
    });
}