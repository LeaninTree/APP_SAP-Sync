import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function loader({request, params}: LoaderFunctionArgs) {
    const { admin } = await authenticate.admin(request);
     console.log("Test2")

    const response = await admin.graphql(
        `#graphql
            mutation DeleteMetaobject($id: ID!) {
                metaobjectDelete(id: $id) {
                    userErrors {
                        field
                        message
                    }
                }
            }
        `,
        {
            variables: {
                id: `gid://shopify/Metaobject/${params.id}`
            }
        }
    );

    const result = await response.json();

    if (result.data.metaobjectDelete.userErrors.length > 0) {
        result.data.metaobjectDelete.userErrors.forEach((error: any) => {
            return {success: false, message: `[${error.field}] ${error.message}`}
        });
    }

    return {success: true, message: ""};
}