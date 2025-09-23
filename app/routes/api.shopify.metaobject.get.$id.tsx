import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { Field } from "./app.definitions";

export async function loader({request, params}: LoaderFunctionArgs) {

    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(
        `#graphql
            query GetMetaobjectFields($id: ID!) {
                metaobject(id: $id) {
                    type
                    displayName
                    fields {
                        key
                        value
                        type
                        definition {
                            name
                            validations {
                                name
                                value
                            }
                        }
                    }
                    referencedBy(first: 1) {
                        pageInfo {
                            startCursor
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
    const tempfields = await Promise.all(result.data.metaobject.fields.filter((field: any) => field.key !== "definition").map(async (field: any) => {
        let tempValue = field.value

        const tempField: Field = {
            key: field.key,
            value: tempValue,
            type: field.type,
            name: field.definition.name
        };

        if (field.type === "metaobject_reference") {
            const fieldDefinitionResponse = await admin.graphql(
                `#graphql
                    query GetFieldDefinition($id: ID!) {
                        metaobjectDefinition(id: $id) {
                            metaobjects(first: 250) {
                                nodes {
                                    id
                                    displayName
                                }
                            }
                        }
                    }
                `,
                {
                    variables: {
                        id: field.definition.validations[0].value
                    }
                }
            );

            const fieldDefinitionResult = await fieldDefinitionResponse.json();
            tempField.options = fieldDefinitionResult.data.metaobjectDefinition.metaobjects.nodes.map((definition: any) => ({
                label: definition.displayName,
                value: definition.id
            }));
            if (tempField.options) {
                tempField.options = [{
                    label: "",
                    value: "NULL"
                }, ...tempField.options];
            }
        }

        if (field.type === "file_reference" && field.value !== null) {
            const mediaResponse = await admin.graphql(
                `#graphql
                    query GetMediaURL($id: ID!) {
                        node(id: $id) {
                            ... on MediaImage {
                                image {
                                    url
                                }
                            }
                        }
                    } 
                `,
                {
                    variables: {
                        id: field.value
                    }
                }
            );

            const mediaResult = await mediaResponse.json();

            tempField.value = field.value;
            tempField.url = mediaResult.data.node.image.url;
        }

        if (field.definition.validations.length > 0) {
            const filteredFields = field.definition.validations.filter((validation: any) => validation.name === "choices");
            if (filteredFields.length > 0) {
                 tempField.options = JSON.parse(filteredFields[0].value).map((option: string) => ({label: option, value: option}));
            }
        }

        return tempField
    }));

    const reply = {
        name: result.data.metaobject.displayName,
        type: result.data.metaobject.type,
        isUsed: result.data.metaobject.referencedBy.pageInfo.startCursor !== null,
        fields: tempfields
    };

    return new Response(JSON.stringify(reply), {
        headers: { "Content-Type": "application/json" }
    });
}