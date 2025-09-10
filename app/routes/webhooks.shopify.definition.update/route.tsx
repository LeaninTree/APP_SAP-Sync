import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { retrieveProductsReferenced } from "./definitionReruns";

export async function action({ request }: ActionFunctionArgs) {
    const { shop, payload, admin } = await authenticate.webhook(request);

    if (!admin) {
        throw new Response("Unauthorized", { status: 401 });
    }

    retrieveProductsReferenced(admin, payload.id, payload.type);
    return new Response("Ok", { status: 200 });
}
