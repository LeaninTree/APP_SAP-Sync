import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function action({request, params}: ActionFunctionArgs) {
    const { admin, redirect } = await authenticate.admin(request);

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
                    id: `gid://shopify/Product/${params.id}`,
                    status: "ARCHIVED"
                }
            }
        }
    );

    const setData = await setResponse.json();

    if (setData.data.productUpdate.userErrors.length > 0) {
        return new Response(JSON.stringify({
            tone: 'warning',
            message: "There was an error attempting to remove the product. Please try again."
        }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    return redirect(`/app/products`); 
}
