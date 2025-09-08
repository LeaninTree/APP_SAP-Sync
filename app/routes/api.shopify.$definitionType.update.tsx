import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function action({request, params}: ActionFunctionArgs) {
    const data = (await request.formData()).get("validations") as string;

    const { admin } = await authenticate.admin(request);

    if (params.definitionType === "tone") {
        const response = await admin.graphql(
            `#graphql
                mutation updateMetafieldValidations($definition: MetafieldDefinitionUpdateInput!) {
                    metafieldDefinitionUpdate(definition: $definition) {
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                variables: {
                    definition: {
                        key: "tone",
                        namespace: "custom",
                        ownerType: 'PRODUCT',
                        validations: [
                            {
                                name: "choices",
                                value: data
                            }
                        ]
                    }
                }
            }
        );

        const result = await response.json();

        if (result.data.metafieldDefinitionUpdate.userErrors.length > 0) {
            return new Response(JSON.stringify({status: "error"}), {
                headers: { "Content-Type": "application/json" }
            });
        }
    } else {
        const typeResponse = await admin.graphql(
            `#graphql
                query GetMetaobjectId($type: String!) {
                    metaobjectDefinitionByType(type: $type) {
                        id
                    }
                }
            `,
            {
                variables: {
                    type: params.definitionType
                }
            }
        );

        const typeResult = await typeResponse.json();
        
        const response = await admin.graphql(
            `#graphql
                mutation UpdateMetaobjectDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
                    metaobjectDefinitionUpdate(id: $id, definition: $definition) {
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                variables: {
                    id: typeResult.data.metaobjectDefinitionByType.id,
                    definition: {
                        fieldDefinitions: [
                            {
                                update: {
                                    key: params.definitionType === "occasion" ? "name" : "group",
                                    validations: [
                                        {
                                            name: "choices",
                                            value: data
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }
        );

        const result = await response.json();

        if (result.data.metaobjectDefinitionUpdate.userErrors.length > 0) {
            return new Response(JSON.stringify({status: "error"}), {
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    return new Response(JSON.stringify({status: "success"}), {
        headers: { "Content-Type": "application/json" }
    });
}