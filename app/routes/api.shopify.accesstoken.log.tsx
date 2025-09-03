import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function loader({request, params}: LoaderFunctionArgs) {
    const { session } = await authenticate.admin(request);
    console.log("==========================================================================================");
    console.log("CURRENT TOKEN: ", session.accessToken);
    console.log("==========================================================================================");

    return null;
}