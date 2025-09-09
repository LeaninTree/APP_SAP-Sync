import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export interface ActionResponse {
    success: boolean,
    message: string;
    id?: string;
}

export async function loader({request, params}: LoaderFunctionArgs) {
    const { admin } = await authenticate.admin(request);
    const currentDate = new Date();

    const response = await admin.graphql(
        `#graphql
            mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
                metaobjectCreate(metaobject: $metaobject) {
                    metaobject {
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
                metaobject: {
                    type: params.type,
                    fields: [
                        {
                            key: params.type === "brand" ? "key" : params.type === "occasion" ? "code" : params.type === "process" ? "manufacturing_code" : "name",
                            value: `Temp_${currentDate.toISOString()}`
                        },
                        {
                            key: "definition",
                            value: "false"
                        }
                    ]
                }
            }
        }
    );

    const result = await response.json();

    if (result.data.metaobjectCreate.userErrors.length > 0) {
        result.data.metaobjectCreate.userErrors.forEach((error: any) => {
            return {success: false, message: `[${error.field}] ${error.message}`}
        });
    }

    return {success: true, message: "", id: result.data.metaobjectCreate.metaobject.id};
}