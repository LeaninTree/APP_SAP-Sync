import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

interface Field {
    key: string;
    value: string;
    options?: string[];
}

interface Reply {
    type?: string;
    name?: string;
    fields?: Field[];
}

export async function loader({request, params}: LoaderFunctionArgs) {

    const { admin } = await authenticate.admin(request);
    let reply: Reply = {};

    const response = await admin.graphql(
        `#graphql
            query GetMetaobjectFields($id: ID!) {
                metaobject(id: $id) {
                    type
                    displayName
                    fields {
                        key
                        value
                        definition {
                            validations {
                                name
                                value
                            }
                        }
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

    reply.type = result.data.metaobject.type;

    reply.name = result.data.metaobject.displayName;

    reply.fields = result.data.metaobject.fields.map((field: any) => {
        const tempField: Field = {
            key: field.key,
            value: field.value
        };

        if (field.definition.validations.length > 0) {
            const filteredFields = field.definition.validations.filter((validation: any) => validation.name === "choices");
            if (filteredFields.length > 0) {
                 tempField.options = JSON.parse(filteredFields[0].value);
            }
        }

        return tempField
    });

    return new Response(JSON.stringify(reply), {
        headers: { "Content-Type": "application/json" }
    });
}