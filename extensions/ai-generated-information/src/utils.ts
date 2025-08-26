export async function getProductData(productId) {
    return await makeGraphQLQuery(
        `#graphql
            query Product($id: ID!) {
                product(id: $id) {
                    tone: metafield(namespace: "custom", key: "tone") {
                        value
                    }
                    recipient: metafield(namespace: "custom", key: "recipient") {
                        value
                        reference {
                            ... on Metaobject {
                                name: field(key: "name") {
                                    value
                                }
                                displayName: field(key: "display_name") {
                                    value
                                }
                            }
                        }
                    }
                    nuditylevel: metafield(namespace: "custom", key: "nuditylevel") {
                        value
                    }
                    politicallevel: metafield(namespace: "custom", key: "politicallevel") {
                        value
                    }
                    sexuallevel: metafield(namespace: "custom", key: "sexuallevel") {
                        value
                    }
                    languagelevel: metafield(namespace: "custom", key: "foulLanguage") {
                        value
                    }
                }
            }
        `,
        { id: productId }
    );
}

async function makeGraphQLQuery(query, variables) {
  const graphQLQuery = {
    query,
    variables,
  };

  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify(graphQLQuery),
  });

  if (!res.ok) {
    console.error("Network error");
  }

  return await res.json();
}