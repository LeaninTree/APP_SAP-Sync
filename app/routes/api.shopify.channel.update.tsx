import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { Rule, Channel } from "./app.channels";

export async function action({request}: ActionFunctionArgs) {
    const formData = await request.formData()

    const deleteList: string[] = JSON.parse(formData.get("delete") as string);
    const changeList: Rule[] = JSON.parse(formData.get("newChange") as string);
    const orderList: string[] = JSON.parse(formData.get("order") as string);
    const channel: Channel = JSON.parse(formData.get("channel") as string);

    console.log("============================================================================================");
    console.log("============================================================================================");
    console.log(deleteList);
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log(changeList);
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log(orderList);
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

    const { admin } = await authenticate.admin(request);

    let errors: boolean = false;
    const handleIDMap = new Map();

    if (deleteList.length > 0) {
        for (const id in deleteList) {
            const deleteResponse = await admin.graphql(
                `#grahpql
                    mutation DeleteRule($id: ID!) {
                        metaobjectDelete(id: $id) {
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                {
                    variables: {
                        id: id
                    }
                }
            );
            const deleteResult = await deleteResponse.json();
            if (deleteResult.data.metaobjectDelete.userErrors.length > 0) {
                errors = true;
                for (let i = 0; i < deleteResult.data.metaobjectDelete.userErrors; i++) {
                    console.error(`[${deleteResult.data.metaobjectDelete.userErrors[i].field}] ${deleteResult.data.metaobjectDelete.userErrors[i].message}`);
                }
            }
        }
    }

    if (changeList.length > 0) {
        for (let i = 0; i < changeList.length; i++) {
            const fields = [
                {
                    key: "title",
                    value: changeList[i].title ? changeList[i].title : `TEMP_${(new Date()).toISOString()}`
                },
                {
                    key: "type",
                    value: changeList[i].type.toString()
                }
            ];
            if (changeList[i].variant !== "ALL") {
                fields.push({
                    key: "variant",
                    value: changeList[i].variant
                });
            }
            if (changeList[i].brand !== "ALL") {
                fields.push({
                    key: "brand",
                    value: changeList[i].brand
                });
            }
            if (changeList[i].product !== "ALL") {
                fields.push({
                    key: "product",
                    value: changeList[i].product
                });
            }
            if (changeList[i].occasion !== "ALL") {
                fields.push({
                    key: "occasion",
                    value: changeList[i].occasion
                });
            }
            if (changeList[i].assortment !== "ALL") {
                fields.push({
                    key: "assortment",
                    value: changeList[i].assortment
                });
            }
            if (changeList[i].customization !== "ALL") {
                fields.push({
                    key: "customization",
                    value: changeList[i].customization
                });
            }
            const upsertResponse = await admin.graphql(
                `#graphql
                    mutation UpdateRule($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
                        metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
                            metaobject {
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
                        handle: {
                            handle: changeList[i].handle,
                            type: "sales_channel_rule"
                        },
                        metaobject: {
                            handle: changeList[i].handle,
                            fields: fields
                        }
                    }
                }
            );
            const upsertResult = await upsertResponse.json();
            if (upsertResult.data.metaobjectUpsert.userErrors.length > 0) {
                errors = true;
                for (let i = 0; i < upsertResult.data.metaobjectUpsert.userErrors; i++) {
                    console.error(`[${upsertResult.data.metaobjectUpsert.userErrors[i].field}] ${upsertResult.data.metaobjectUpsert.userErrors[i].message}`);
                }
            }
            if (upsertResult.data.metaobjectUpsert.metaobject && upsertResult.data.metaobjectUpsert.metaobject.id) {
                handleIDMap.set(changeList[i].handle, upsertResult.data.metaobjectUpsert.metaobject.id);
            }
        }
    }

    console.log(handleIDMap);
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

    const uploadedRuleList = orderList.map((ruleItem: string) => {
        if (!ruleItem.startsWith("gid://shopify/Metaobject/") && handleIDMap.get(ruleItem)) {
            return handleIDMap.get(ruleItem);
        }
        return ruleItem;
    }).filter((ruleItem: string) => !ruleItem.startsWith("gid://shopify/Metaobject/"));
    console.log(uploadedRuleList);

    const channelResponse = await admin.graphql(
        `#graphql
            mutation UpsertChannel($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
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
                    type: "sales_channels",
                    handle: channel.handle
                },
                metaobject: {
                    handle: channel.handle,
                    fields: [
                        {
                            key: "title",
                            value: channel.title
                        },
                        {
                            key: "location",
                            value: channel.location
                        },
                        {
                            key: "external",
                            value: channel.external
                        },
                        {
                            key: "rules",
                            value: JSON.stringify(uploadedRuleList)
                        }
                    ]
                }
            }
        }
    );
    const channelResult = await channelResponse.json();
    if (channelResult.data.metaobjectUpsert.userErrors.length > 0) {
        errors = true;
        for (let i = 0; i < channelResult.data.metaobjectUpsert.userErrors; i++) {
            console.error(`[${channelResult.data.metaobjectUpsert.userErrors[i].field}] ${channelResult.data.metaobjectUpsert.userErrors[i].message}`);
        }
    }

    console.log("============================================================================================");
    console.log("============================================================================================");

    if (errors) {
        return new Response(JSON.stringify({status: "error"}), {
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({status: "success"}), {
        headers: { "Content-Type": "application/json" }
    });
}
