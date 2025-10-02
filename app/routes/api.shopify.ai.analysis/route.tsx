import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { HandleAIAnalysis } from "./handleAIAnalysis";

export interface Media {
    id: string;
    url: string;
    mimeType: string;
    alt: string;
}

export interface ShopifyProduct {
    id: string;
    sku: string;
    productType: string;
    occasion: string;
    sapTitle: string;
    media: Media[];
}

export async function action({ request }: ActionFunctionArgs) {
    const { admin, payload} = await authenticate.flow(request);
    
    HandleAIAnalysis(admin, payload);

    return new Response("Ok", { status: 200 });
}