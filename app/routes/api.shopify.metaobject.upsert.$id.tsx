import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { Field } from "./app.definitions";

export async function action({request, params}: ActionFunctionArgs) {
    const data = (await request.formData()).get("fields") as string;

    const { admin } = await authenticate.admin(request);

    const handleResponse = await admin.graphql(
        `#graphql
            query GetMetaobjectHandle($id: ID!) {
                metaobject(id: $id) {
                    handle
                    type
                }
            }
        `,
        {
            variables: {
                id: `gid://shopify/Metaobject/${params.id}`
            }
        }
    );

    const handleResult = await handleResponse.json();

    console.log("==========================================================================================================");
    console.log("==========================================================================================================");
    console.log(data);
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

    const fields: Field[] = [...JSON.parse(data)].filter((field: Field) => field.value !== "NULL").map((field: Field) => {
        if (field.value === null) {
            return {
                key: field.key,
                value: "",
                type: field.type,
                name: field.name,
                options: field.options,
                url: field.url
            };
        }
        return field;
    });
    fields.push({
        key: "definition",
        value: "true",
        name: "Definition",
        type: "boolean"
    })
    console.log(fields)
    console.log("==========================================================================================================");
    console.log("==========================================================================================================");

    function isValueBoolean(value: any): boolean {
        return typeof value === 'boolean';
    }

    const upsertResponse = await admin.graphql(
        `#graphql
            mutation UpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
                metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
                    userErrors {
                        field
                        message
                    }
                }
            }
        `,
        {
            variables: {
                handle: {
                    handle: handleResult.data.metaobject.handle,
                    type: handleResult.data.metaobject.type
                },
                metaobject: {
                    fields: fields.filter(field => field.value !== null && field.value !== "NULL").map(field => {
                        if (field.type === 'money') {
                            const tempValue = JSON.parse(field.value);
                            return {
                                key: field.key,
                                value: JSON.stringify({
                                    amount: Number(tempValue.amount),
                                    currency_code: tempValue.currency_code
                                }),
                                type: field.type,
                                name: field.name
                            }
                        } else {
                            return field;
                        }
                    }).map(field => ({
                        key: field.key, 
                        value: isValueBoolean(field.value) ? field.value.toString() : field.value
                    }))
                }
            }
        }
    );

    const upsertResult = await upsertResponse.json();

    if (upsertResult.data.metaobjectUpsert.userErrors.length > 0) {
        return new Response(JSON.stringify({status: "error"}), {
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({status: "success"}), {
        headers: { "Content-Type": "application/json" }
    });
}