import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { HandleImageUpdate } from "./handleImageUpdate";

export async function action({ request }: ActionFunctionArgs) {
    const { shop, payload, admin } = await authenticate.webhook(request);

    if (!admin) {
        throw new Response("Unauthorized", { status: 401 });
    }

    HandleImageUpdate(payload, admin);
    return new Response("Ok", { status: 200 });
}