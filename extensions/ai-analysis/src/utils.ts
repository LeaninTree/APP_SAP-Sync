export async function updateProduct(product, media) {
    return await makeGraphQLQuery(
        `#graphql
            mutation updateProduct($product: ProductUpdateInput!) {
                productUpdate(product: $product) {
                    userErrors {
                        field
                        message
                    }
                    product {
                        id
                    }
                }
            }
        `,
        {
            product: product
        }
    )
    .then(response => response.data)
    .then(result => {
        //UPDATE MEDIA
        console.log(result.productUpdate);
        console.log(product)
        
        return [{code: "SUCCESS"}]
    })

}

export async function getProductData(id: string) {
    const productData =  await makeGraphQLQuery(
        `#graphql
            query Product($id: ID!) {
                product(id: $id) {
                    json: metafield(namespace: "custom", key: "ai_json") {
                        value
                    }
                    title
                    seo {
                        description
                    }
                    description
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
                    tone: metafield(namespace: "custom", key: "tone") {
                        value
                    }
                    recipient: metafield(namespace: "custom", key: "recipient") {
                        value
                    }
                    media(first: 250) {
                        edges {
                            node {
                                id
                                alt
                            }
                        }
                    }
                }
            }
        `,
        {id: id}
    );

    const altText = productData.data.product.media.edges.map((media) => {
        return {
            id: media.node.id,
            alt: media.node.alt
        }
    });
    
    const toneData = await makeGraphQLQuery(
        `#graphql
            query toneMetafield($id: MetafieldDefinitionIdentifierInput) {
                metafieldDefinition(identifier: $id) {
                    validations {
                        name
                        value
                    }
                }
            }
        `,
        {id: {
            namespace: "custom",
            key: "tone",
            ownerType: "PRODUCT"
        }}
    );

    const toneList = JSON.parse(toneData.data.metafieldDefinition.validations.filter((validation) => validation.name === 'choices')[0].value);

    const recipentData = await makeGraphQLQuery(
        `#graphql
            query recipientMetafield($type: String!) {
                metaobjects(type: $type, first: 250) {
                    edges {
                        node {
                            id
                            displayName
                        }
                    }
                }
            }
        `,
        {type: "recipiemt"} //TODO
    );

    const recipentList = recipentData.data.metaobjects.edges.map((entry) => {
        return {
            id: entry.node.id,
            name: entry.node.displayName
        }
    });

    return {
        json: productData.data.product.json ? JSON.parse(productData.data.product.json.value): null,
        title: productData.data.product.title,
        seoDescription: productData.data.product.seo.description,
        description: productData.data.product.description,
        nudityLevel: productData.data.product.nudityLevel ? productData.data.product.nudityLevel.value: null,
        politicalLevel: productData.data.product.politicalLevel ? productData.data.product.politicalLevel.value : null,
        sexualLevel: productData.data.product.sexualLevel ? productData.data.product.sexualLevel.value : null,
        languageLevel: productData.data.product.languageLevel ? productData.data.product.languageLevel.value : null,
        tone: productData.data.product.tone ? productData.data.product.tone.value : null,
        toneList: toneList,
        recipent: productData.data.product.recipient ? productData.data.product.recipient.value : null,
        recipentList: recipentList,
        altText: altText
    };
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