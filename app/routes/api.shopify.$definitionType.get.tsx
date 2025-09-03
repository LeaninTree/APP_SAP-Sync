import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

interface Definition {
    id: string;
    name: string;
}

interface Reply {
    definitions?: Definition[];
    moreDefinitions?: boolean;
    validations?: string[];
}

export async function loader({request, params}: LoaderFunctionArgs) {

    const { admin } = await authenticate.admin(request);
    let reply: Reply = {};

    if (params.definitionType === "tone" || params.definitionType === "occasionName") {
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
                        key: params.definitionType === "tone" ? "tone" : "occasion"
                    }
                }
            }
        );

        const result = await response.json();

        const metafieldOptions = JSON.parse(result.data.metafieldDefinition.validations.filter((validation: any) => validation.name === "choices")[0].value);

        reply.validations = metafieldOptions;

    } else {
        const url = new URL(request.url);
        const searchTerm = url.searchParams.get("search");

        let query = `${searchTerm ? `display_name:${searchTerm}` : ""}`;

        if (params.definitionType === "artist") {
            query = `${searchTerm ? `display_name:${searchTerm} OR fields.name_map:${searchTerm}` : ""}`
        }

        let variables = {
            type: params.definitionType,
            query: query,
        }

        const response = await admin.graphql(
            `#graphql
                query getDefinitions($type: String!, $query: String) {
                    metaobjects(type: $type, query: $query, first: 50, sortKey: "updated_at") {
                        pageInfo {
                            hasNextPage
                        }
                        nodes {
                            displayName
                            id
                        }
                    }
                }
            `,
            {
                variables: variables
            }
        );

        const result = await response.json();

        const definitionList: Definition[] = [];

        result.data.metaobjects.nodes.forEach((definition: any) => {
            definitionList.push({
                id: definition.id,
                name: definition.displayName
            });
        });

        reply.moreDefinitions = result.data.metaobjects.pageInfo.hasNextPage;

        reply.definitions = definitionList;
    }

    return new Response(JSON.stringify(reply), {
        headers: { "Content-Type": "application/json" }
    });
}