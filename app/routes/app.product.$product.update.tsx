import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function action({request, params}: ActionFunctionArgs) {
    const data = await request.formData();

    const { admin } = await authenticate.admin(request);

    const variants = JSON.parse(data.get("variants") as string);

    const formattedVariants = variants.map((variant: any) => ({
        id: variant.id,
        price: variant.price,
        metafields: [
            {
                namespace: "custom",
                key: "pricing_override",
                value: variant.override.toString()
            },
            {
                namespace: "custom",
                key: "clearance",
                value: variant.clearance.toString()
            }
        ]
    }));

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
                id: `gid://shopify/Product/${params.product}`,
                product: {
                    title: data.get("title"),
                    descriptionHtml: data.get("description"),
                    seo: {
                        description: data.get("description"),
                        title: data.get("title")
                    },
                    metafields: [
                        {
                            namespace: "custom",
                            key: "tone",
                            value: data.get("tone")
                        },
                        {
                            namespace: "custom",
                            key: "customizable",
                            value: data.get("customizable")
                        },
                        {
                            namespace: "custom",
                            key: "foulLanguage",
                            value: data.get("language")
                        },
                        {
                            namespace: "custom",
                            key: "sexuallevel",
                            value: data.get("sexual")
                        },
                        {
                            namespace: "custom",
                            key: "politicallevel",
                            value: data.get("political")
                        },
                        {
                            namespace: "custom",
                            key: "nuditylevel",
                            value: data.get("nudity")
                        },
                    ],
                    variants: formattedVariants
                }
            }
        }
    );

    const updateResult = await updateResponse.json();

    if (updateResult.data.data.productSet.userErrors.length > 0) {
        return redirect(`/app/product/${params.product}?error=save`);
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

    if (updateMediaResult.data.data.fileUpdate.userErrors.length > 0) {
        return redirect(`/app/product/${params.product}?error=save`);
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
                id: `gid://shopify/Product/${params.product}`,
                tags: JSON.parse(data.get("keywords") as string)
            }
        }
    );

    const updateTagsResult = await updateTagsResponse.json();

    if (updateTagsResult.data.data.tagsAdd.userErrors.length > 0) {
        return redirect(`/app/product/${params.product}?error=save`);
    }

    return redirect(`/app/product/${params.product}?success=save`);
}