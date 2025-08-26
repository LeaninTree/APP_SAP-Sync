import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function loader({request, params}: LoaderFunctionArgs) {
    const { admin } = await authenticate.admin(request);
    
    //TODO

    //Get Sku

    //Pass sku to api

    //update product with api data

    const error = false;

    if (error) {
        return redirect(`/app/product/${params.product}?error=sync`);
    }

    return redirect(`/app/product/${params.product}?success=sync`);
}