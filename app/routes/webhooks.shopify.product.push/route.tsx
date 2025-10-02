import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { HandleProductUpdate } from "./handleProductUpdate";

export async function action({ request }: ActionFunctionArgs) {
    const { shop, payload, admin } = await authenticate.webhook(request);

    if (!admin) {
        throw new Response("Unauthorized", { status: 401 });
    }
    HandleProductUpdate(admin, payload.admin_graphql_api_id);
    return new Response("Ok", { status: 200 });
}