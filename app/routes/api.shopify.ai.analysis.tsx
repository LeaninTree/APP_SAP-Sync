import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { runAIAnalysis } from "./webhooks.sap.feed/aiAnalysis";

export async function action({ request }: ActionFunctionArgs) {
    /*const { admin, payload} = await authenticate.flow(request);
    const { queue } = payload;

    for (let i = 0; i < queue.length; i++) {
        const aiResponse = await runAIAnalysis(admin, queue[i]);
        if (JSON.parse(aiResponse).error) {
            ITErrors.push({
                        code: sku,
                        message: aiResponse
                    });
        } else {
            const aiData = JSON.parse(aiResponse);
            productStatus.push({
                        code: sku,
                        message: "AI ANALYSIS | AI analysis has been completed."
                    });

            //TODO
            //Set product to active once done
        }
    }*/

    return new Response("Ok", { status: 200 });
}