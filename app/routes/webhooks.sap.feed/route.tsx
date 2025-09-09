import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { handleProductFeed } from "./sapData.handler";

export async function action({ request }: ActionFunctionArgs) {
    const { shop, payload, admin } = await authenticate.webhook(request);

    if (!admin) {
        throw new Response("Unauthorized", { status: 401 });
    }

    if (payload.type === "product_feed") {
        const response = handleProductFeed(admin, JSON.parse(payload.fields.data), payload.id);
        return new Response("Ok", { status: 200 });
    }

    return new Response("No Update", { status: 204 });
}
