import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

interface Definition {
    id: string;
    name: string;
    defined: boolean;
}

export interface DefinitionPreview {
    id: string;
    name: string;
    defined: boolean;
}

export interface TabReply {
    definitions: DefinitionPreview[];
    validations: string[] | null;
}

export async function loader({request, params}: LoaderFunctionArgs) {

    const { admin } = await authenticate.admin(request);

    let reply: TabReply = {
        definitions: [],
        validations: null
    }

    if (params.definitionType === "tone") {
        const response = await admin.graphql(
            `#graphql
                query GetMetafieldOptions($identifier: MetafieldDefinitionIdentifierInput!) {
                    metafieldDefinition(identifier: $identifier) {
                        validations {
                            name
                            value
                        }
                    }
                }
            `,
            {
                variables: {
                    identifier: {
                        ownerType: "PRODUCT",
                        namespace: "custom",
                        key: "tone"
                    }
                }
            }
        );

        const result = await response.json();

        reply.validations = JSON.parse(result.data.metafieldDefinition.validations.filter((validation: any) => validation.name === "choices")[0].value);

    } else if (params.definitionType === "recipient" || params.definitionType === "occasionName") {
        const response = await admin.graphql(
            `#graphql
                query GetMetaobjectFieldOptions($type: String!) {
                    metaobjectDefinitionByType(type: $type) {
                        fieldDefinitions {
                            key
                            validations {
                                name
                                value
                            }
                        }
                    }
                }
            `,
            {
                variables: {
                    type: params.definitionType === "occasionName" ? "occasion" : "recipient"
                }
            }
        );

        const result = await response.json();
        if (params.definitionType === "recipient") {
            reply.validations = JSON.parse(result.data.metaobjectDefinitionByType.fieldDefinitions.filter((field: any) => field.key === "group")[0].validations.filter((validation: any) => validation.name === "choices")[0].value);
        } else {
            reply.validations = JSON.parse(result.data.metaobjectDefinitionByType.fieldDefinitions.filter((field: any) => field.key === "name")[0].validations.filter((validation: any) => validation.name === "choices")[0].value);
        }    
    } else {
        const url = new URL(request.url);
        const searchTerm = url.searchParams.get("search");
        const filter = url.searchParams.get("definition");

        let query = `${searchTerm ? `display_name:${searchTerm}` : ""}`;

        if (params.definitionType === "artist") {
            query = `${searchTerm ? `display_name:${searchTerm} OR fields.name_map:${searchTerm}` : ""}`
        }

        if (filter !== "ALL") {
            query = query + `${query === "" ? "" : " "}${filter === "UNDEFINED" ? "NOT " : ""}fields.definition: true`
        }

        let variables = {
            type: params.definitionType,
            query: query,
            cursor: null
        }

        const definitionList: Definition[] = [];
        let moreDefinitions: boolean = true;

        while (moreDefinitions) {
            const response = await admin.graphql(
                `#graphql
                    query getDefinitions($type: String!, $query: String, $cursor: String) {
                        metaobjects(type: $type, query: $query, first: 250, sortKey: "updated_at", reverse: true, after: $cursor) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                displayName
                                id
                                defined: field(key: "definition") {
                                    value
                                }
                            }
                        }
                    }
                `,
                {
                    variables: variables
                }
            );

            const result = await response.json();

            result.data.metaobjects.nodes.forEach((definition: any) => {
                definitionList.push({
                    id: definition.id,
                    name: definition.displayName,
                    defined: definition.defined? definition.defined.value === 'true': false 
                });
            });

            moreDefinitions = result.data.metaobjects.pageInfo.hasNextPage;
            variables.cursor = result.data.metaobjects.pageInfo.endCursor;
        }

        reply = {
            definitions: definitionList,
            validations: null
        };
    }

    return new Response(JSON.stringify(reply), {
        headers: { "Content-Type": "application/json" }
    });
}