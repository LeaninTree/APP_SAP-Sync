import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function action({ request }: ActionFunctionArgs) {
    const { payload, admin } = await authenticate.webhook(request);

    if (!admin) {
        return new Response("Unauthorized", { status: 401 });
    }

    console.log(payload);

    const imagesUpdated = payload.media.filter((image: any) => {
        const updatedDate = new Date(image.created_at);
        const nowDate = new Date();
        const timeDelta = nowDate.getTime() - updatedDate.getTime();
        const oneHour = 60 * 60 * 1000;
        if (timeDelta <= oneHour) {
            return true;
        }
        return false;
    });

    if (imagesUpdated.length > 0) {
        const queueResponse = await admin.graphql(
            `#graphql
                query AIQueue {
                    shop {
                        id
                        queue: metafield(namespace: "custom", key: "ai_queue") {
                            value
                        }
                        imageErrors: metafield(namespace: "custom", key: "image_errors") {
                            value
                        }
                    }
                }
            `,
            {

            }
        );
        const queueResult = await queueResponse.json();

        let imageProblems: string[] = [];
        if (queueResult.data.shop.imageErrors && queueResult.data.shop.imageErrors.value) {
            imageProblems = [...JSON.parse(queueResult.data.shop.imageErrors.value)];
        }
        const categoryMetafield = payload.metafields.filter((metafield: any) => metafield.key === "category");
        if (categoryMetafield.length > 0 && categoryMetafield[0].value !== null) {
            const categoryResponse = await admin.graphql(
                `#graphql
                    query CategoryMetaobject($id: ID!) {
                        metaobject(id: $id) {
                            imageCount: field(key: "image_count") {
                                value
                            }
                        }
                    }
                `,
                {
                    variables: {
                        id: categoryMetafield[0].value
                    }
                }
            );
            const categoryResult = await categoryResponse.json();
            let imageCount: number | null = null;
            if (categoryResult.data.metaobject.imageCount && categoryResult.data.metaobject.imageCount.value) {
                imageCount = Number(categoryResult.data.metaobject.imageCount.value);
            }
            if (imageCount !== null && payload.mediaCount) {
                if (payload.mediaCount > imageCount) {
                    imageProblems.push(payload.admin_graphql_api_id);
                } else if (payload.mediaCount === 0 || payload.mediaCount < imageCount) {
                    const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
                    const now = new Date();
                    const createdAt = new Date(payload.createdAt);
                    const timeDifference = now.getTime() - createdAt.getTime();
                    if (payload.mediaCount === 0 || timeDifference > oneWeekInMilliseconds) {
                        imageProblems.push(payload.admin_graphql_api_id);
                    }
                }   
            }   
        }

        let newAIQueue: string[] = [];
        if (queueResult.data.shop.queue && queueResult.data.shop.queue.value) {
            newAIQueue = [...JSON.parse(queueResult.data.shop.queue.value)];
        }
        if (!newAIQueue.includes(payload.admin_graphql_api_id)) {
            newAIQueue.push(payload.admin_graphql_api_id);
        }

        const queueUpdateResponse = await admin.graphql(
            `#graphql
                mutation MetafieldUpdate($metafields: [MetafieldsSetInput!]!) {
                    metafieldsSet(metafields: $metafields) {
                    userErrors {
                        field
                        message
                    }
                }
                }
            `,
            {
                variables: {
                    metafields: [
                        {
                            ownerId: queueResult.data.shop.id,
                            namespace: "custom",
                            key: "ai_queue",
                            value: JSON.stringify(newAIQueue)
                        },
                        {
                            ownerId: queueResult.data.shop.id,
                            namespace: "custom",
                            key: "image_errors",
                            value: JSON.stringify(imageProblems)
                        }
                    ]
                }
            }
        );
        const queueUpdateResult = await queueUpdateResponse.json();
        if (queueUpdateResult.data.metafieldsSet.userErrors.length > 0) {
            for (const updateError of queueUpdateResult.data.metafieldsSet.userErrors) {
                console.error(`[${updateError.field}] ${updateError.message}`);
            }
        }
    }

    return new Response("Ok", { status: 200 });
}
