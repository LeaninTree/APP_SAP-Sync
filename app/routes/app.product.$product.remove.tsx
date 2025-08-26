import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function loader({request, params}: LoaderFunctionArgs) {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(
        `#graphql
            query getProduct($id: ID!) {
                product(id: $id) {
                    id
                    variants(first: 250) {
                        nodes {
                            status: metafield(namespace: "custom", key: "status") {
                                value
                            }
                        }
                    }
                }
            }
        `,
        {
            variables: {
                id: `gid://shopify/Product/${params.product}`
            }
        }
    );

    const data = await response.json();

    const setResponse = await admin.graphql(
        `#graphql
            mutation updateProduct($product: ProductUpdateInput!) {
                productUpdate(product: $product) {
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
                product: {
                    id: `gid://shopify/Product/${params.product}`,
                    status: "ARCHIVED"
                }
            }
        }
    );

    const setData = await setResponse.json();

    if (setData.data.productUpdate.userErrors.length > 0) {
        return redirect(`/app/product/${params.product}?error=remove`);
    }

    return redirect(`/app/product`);
}
