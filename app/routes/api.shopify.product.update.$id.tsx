import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function action({request, params}: ActionFunctionArgs) {    
    const data = await request.formData();

    const { admin } = await authenticate.admin(request);

    const variants = JSON.parse(data.get("variants") as string);

    const recipientIdResponse = await admin.graphql(
        `#graphql
            query recipientMetaObject($handle: String!) {
                metaobjectByHandle(handle: {type: "recipient", handle: $handle}) {
                    id
                }
            }
        `,
        {
            variables: {
                handle: data.get("recipient")
            }
        }
    );

    const recipientIdResult = await recipientIdResponse.json()

    const recipientID = recipientIdResult.data.metaobjectByHandle.id;

    const metafieldIdResponse = await admin.graphql(
            `#graphql
                query OverrideMetafieldId($id: ID!) {
                    product(id: $id) {
                        variants(first: 250) {
                            nodes {
                                id
                                pricing_override: metafield(namespace: "custom", key: "pricing_override") {
                                    id
                                    value
                                }
                                clearance: metafield(namespace: "custom", key: "clearance") {
                                    id
                                    value
                                }
                                status: metafield(namespace: "custom", key: "status") {
                                    id
                                    value
                                }
                                count: metafield(namespace: "custom", key: "count") {
                                    id
                                    value
                                }
                                latest_date: metafield(namespace: "custom", key: "latest_date") {
                                    id
                                    value
                                }
                                active_date: metafield(namespace: "custom", key: "active_date") {
                                    id
                                    value
                                }
                                nla_date: metafield(namespace: "custom", key: "nla_date") {
                                    id
                                    value
                                }
                                owo_date: metafield(namespace: "custom", key: "owo_date") {
                                    id
                                    value
                                }
                                vbp_date: metafield(namespace: "custom", key: "vbp_date") {
                                    id
                                    value
                                }
                                temp_out_date: metafield(namespace: "custom", key: "temp_out_date") {
                                    id
                                    value
                                }
                                intro_date: metafield(namespace: "custom", key: "intro_date") {
                                    id
                                    value
                                }
                            }
                        }
                        tone: metafield(namespace: "custom", key: "tone") {
                            id
                        }
                        customizable: metafield(namespace: "custom", key: "customizable") {
                            id
                        }
                        foulLanguage: metafield(namespace: "custom", key: "foulLanguage") {
                            id
                        }
                        sexuallevel: metafield(namespace: "custom", key: "sexuallevel") {
                            id
                        }
                        politicallevel: metafield(namespace: "custom", key: "politicallevel") {
                            id
                        }
                        nuditylevel: metafield(namespace: "custom", key: "nuditylevel") {
                            id
                        }
                        recipient: metafield(namespace: "custom", key: "recipient") {
                            id
                        }
                    }
                }
            `,
            {
                variables: {
                    id: `gid://shopify/Product/${params.id}`
                }
            }
        );

    const metafieldIdResult = await metafieldIdResponse.json();

    const metafieldIDs = metafieldIdResult.data.product;
    
    const formattedVariants = variants.map((variant: any) => {
        let statusValue = null;
        let countValue = null;
        let latestDateValue = null;
        let activeDateValue = null;
        let nlaDateValue = null;
        let owoDateValue = null;
        let vbpDateValue = null;
        let tempOutDateValue = null;
        let introDateValue = null;

        for (let i = 0; i < metafieldIDs.variants.nodes.length; i++) {
            if (variant.id === metafieldIDs.variants.nodes[i].id) {
                statusValue = metafieldIDs.variants.nodes[i].status.value;
                countValue = metafieldIDs.variants.nodes[i].count.value;
                latestDateValue = metafieldIDs.variants.nodes[i].latest_date.value;
                activeDateValue = metafieldIDs.variants.nodes[i].active_date.value;
                nlaDateValue = metafieldIDs.variants.nodes[i].nla_date.value;
                owoDateValue = metafieldIDs.variants.nodes[i].owo_date.value;
                vbpDateValue = metafieldIDs.variants.nodes[i].vbp_date.value;
                tempOutDateValue = metafieldIDs.variants.nodes[i].temp_out_date.value;
                introDateValue = metafieldIDs.variants.nodes[i].intro_date.value;
            }
        }
        
        return {
            id: variant.id,
            price: variant.price,
            optionValues: [
                {
                    optionName: "Channels",
                    name: variant.name
                }
            ],
            metafields: [
                {
                    id: metafieldIDs.variants.nodes[0].pricing_override.id,
                    namespace: "custom",
                    key: "pricing_override",
                    value: variant.override.toString()
                },
                {
                    id: metafieldIDs.variants.nodes[0].clearance.id,
                    namespace: "custom",
                    key: "clearance",
                    value: variant.clearance.toString()
                },
                {
                    id: metafieldIDs.variants.nodes[0].status.id,
                    namespace: "custom",
                    key: "status",
                    value: statusValue
                },
                {
                    id: metafieldIDs.variants.nodes[0].count.id,
                    namespace: "custom",
                    key: "count",
                    value: countValue
                },
                {
                    id: metafieldIDs.variants.nodes[0].latest_date.id,
                    namespace: "custom",
                    key: "latest_date",
                    value: latestDateValue
                },
                {
                    id: metafieldIDs.variants.nodes[0].active_date.id,
                    namespace: "custom",
                    key: "active_date",
                    value: activeDateValue
                },
                {
                    id: metafieldIDs.variants.nodes[0].nla_date.id,
                    namespace: "custom",
                    key: "nla_date",
                    value: nlaDateValue
                },
                {
                    id: metafieldIDs.variants.nodes[0].owo_date.id,
                    namespace: "custom",
                    key: "owo_date",
                    value: owoDateValue
                },
                {
                    id: metafieldIDs.variants.nodes[0].vbp_date.id,
                    namespace: "custom",
                    key: "vbp_date",
                    value: vbpDateValue
                },
                {
                    id: metafieldIDs.variants.nodes[0].temp_out_date.id,
                    namespace: "custom",
                    key: "temp_out_date",
                    value: tempOutDateValue
                },
                {
                    id: metafieldIDs.variants.nodes[0].intro_date.id,
                    namespace: "custom",
                    key: "intro_date",
                    value: introDateValue
                }
            ]
        }
    });

    const updateResponse = await admin.graphql(
        `#graphql
            mutation updateProduct($product: ProductSetInput!, $id: ID!) {
                productSet(synchronous: true, input: $product, identifier: {id: $id}) {
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
                id: `gid://shopify/Product/${params.id}`,
                product: {
                    title: data.get("title"),
                    descriptionHtml: data.get("description"),
                    seo: {
                        description: data.get("description"),
                        title: data.get("title")
                    },
                    metafields: [
                        {
                            id: metafieldIDs.tone.id,
                            value: data.get("tone")
                        },
                        {
                            id: metafieldIDs.customizable.id,
                            value: JSON.parse(data.get("customizable") as string)
                        },
                        {
                            id: metafieldIDs.foulLanguage.id,
                            value: data.get("language")
                        },
                        {
                            id: metafieldIDs.sexuallevel.id,
                            value: data.get("sexual")
                        },
                        {
                            id: metafieldIDs.politicallevel.id,
                            value: data.get("political")
                        },
                        {
                            id: metafieldIDs.nuditylevel.id,
                            value: data.get("nudity")
                        },
                        {
                            id: metafieldIDs.recipient.id,
                            value: recipientID
                        }
                    ],
                    variants: formattedVariants,
                    productOptions: [{
                        name: "Channels",
                        values: [
                            {
                                name: "D2C"
                            },
                            {
                                name: "B2B"
                            }
                        ]
                    }]
                }
            }
        }
    );

    const updateResult = await updateResponse.json();

    if (updateResult.data.productSet.userErrors.length > 0) {
        return new Response(JSON.stringify({
            tone: 'critical',
            message: "There was an error attempting to save the product. Please try again."
        }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    const updateMediaResponse = await admin.graphql(
        `#graphql
            mutation mediaUpdate($files: [FileUpdateInput!]!) {
                fileUpdate(files: $files) {
                    files {
                        id
                    }
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `,
        {
            variables: {
                files: JSON.parse(data.get("altTexts") as string)
            }
        }
    );

    const updateMediaResult = await updateMediaResponse.json();

    if (updateMediaResult.data.fileUpdate.userErrors.length > 0) {
        return new Response(JSON.stringify({
            tone: 'critical',
            message: "There was an error attempting to save the product. Please try again."
        }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    const updateTagsResponse = await admin.graphql(
        `#graphql
            mutation updateTags($id: ID!, $tags: [String!]!) {
                tagsAdd(id: $id, tags: $tags) {
                    node {
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
                id: `gid://shopify/Product/${params.id}`,
                tags: JSON.parse(data.get("keywords") as string)
            }
        }
    );

    const updateTagsResult = await updateTagsResponse.json();

    if (updateTagsResult.data.tagsAdd.userErrors.length > 0) {
        return new Response(JSON.stringify({
            tone: 'critical',
            message: "There was an error attempting to save the product. Please try again."
        }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({
            tone: 'success',
            message: "Product successfully saved."
        }), {
            headers: { "Content-Type": "application/json" }
        });
}