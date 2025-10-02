import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import { RegenerateProductLists } from "./regenerateProductAssignments";

export async function action({ request }: ActionFunctionArgs) {
    const { shop, payload, admin } = await authenticate.webhook(request);

    if (!admin) {
        throw new Response("Unauthorized", { status: 401 });
    }

    RegenerateProductLists(admin);
    return new Response("Ok", { status: 200 });
}