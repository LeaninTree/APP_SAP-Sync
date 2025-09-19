import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { Field } from "./api.shopify.metaobject.get.$id";

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

    const fields: Field[] = [...JSON.parse(data)];
    fields.push({
        key: "definition",
        value: "true",
        name: "Definition",
        type: "boolean"
    })

    for (let i = 0; i < fields.length; i++) {
        if (fields[i].value === "NULL") {
            fields.splice(i, 1);
        }
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
                    fields: fields.filter(field => field.value !== null && field.value !== "NULL").map(field => ({
                        key: field.key, 
                        value: field.value
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