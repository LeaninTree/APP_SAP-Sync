import { AdminApiContextWithoutRest } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients";
import { SalesChannels, productRuleMatch, Product } from "../webhooks.shopify.channel.update/regenerateProductAssignments";
import { ExternalGraphql } from "app/externalGraphQL";

interface ProductPayload {
    id: string;
    vendor: string;
    productType: string;
    occasion: string;
    assortment: string;
    customization: string[];
    variants: string;
    category: string;
    sku: string;
    title: string;
    description: string;
    seo: {
        title: string;
        description: string;
    };
    status: string;
    tags: string | string[];
    barcode: string;
    price: string;
    compareAtPrice: string;
    count: string;
    clearance: "true" | "false";
    tone: string;
    prop65: "true" | "false";
    line: string;
    orientation: string;
    verseFront: string;
    verseInside1: string;
    verseInside2: string;
    nudity: string;
    political: string;
    sex: string;
    language: string;
}

enum ProductStatus {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
  ARCHIVED = "ARCHIVED",
}

export async function HandleProductUpdate(admin: AdminApiContextWithoutRest, productID: string) {
    console.log(productID);
    /*let ITErrors = [];
    let moreSalesChannels: boolean = true;
    let currentSalesChannelsCursor: string | null = null;
    const salesChannels: SalesChannels[] = [];
    while (moreSalesChannels) {
        const salesChannelResponse = await admin.graphql(
            `#graphql
                query SalesChannels($type: String!, $cursor: String) {
                    metaobjectDefinitionByType(type: $type) {
                        metaobjects(first: 250, after: $cursor) {
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                            nodes {
                                handle
                                rules: field(key: "rules") {
                                    value
                                }
                            }
                        }
                    }
                }
            `,
            {
                variables: {
                    type: "sales_channels",
                    cursor: currentSalesChannelsCursor
                }
            }
        );
        const salesChannelResult: any = await salesChannelResponse.json();
        for (const saleChannel of salesChannelResult.data.metaobjectDefinitionByType.metaobjects.nodes) {
            salesChannels.push({
                name: saleChannel.handle,
                rules: JSON.parse(saleChannel.rules.value)
            });
        }
        moreSalesChannels = salesChannelResult.data.metaobjectDefinitionByType.metaobjects.pageInfo.hasNextPage;
        currentSalesChannelsCursor = salesChannelResult.data.metaobjectDefinitionByType.metaobjects.pageInfo.endCursor;
    }

    const productResponse = await admin.graphql(
        `#graphql
            query ProductDate($id: ID!) {
                product(id: $id) {
                    vendor
                    productType
                    title
                    descriptionHtml
                    seo {
                        title
                        description
                    }
                    tags
                    variants(first: 250) {
                        nodes {
                            id
                            title
                            sku
                            barcode
                            price
                            compareAtPrice
                            status: metafield(namespace: "custom", key: "status") {
                                value
                            }
                            count: metafield(namespace: "custom", key: "count") {
                                value
                            }
                            clearance: metafield(namespace: "custom", key: "clearance") {
                                value
                            }
                        }
                    }
                    category {
                        id
                    }
                    occasion: metafield(namespace: "custom", key: "occasion") {
                        value
                    }
                    customization: metafield(namespace: "custom", key: "customization") {
                        value
                    }
                    assortment: metafield(namespace: "custom", key: "assortment") {
                        value
                    }
                    tone: metafield(namespace: "custom", key: "tone") {
                        value
                    }
                    prop65: metafield(namespace: "custom", key: "prop65") {
                        value
                    }
                    line: metafield(namespace: "custom", key: "line") {
                        value
                    }
                    orientation: metafield(namespace: "custom", key: "orientation") {
                        value
                    }
                    verseFront: metafield(namespace: "custom", key: "verse_front") {
                        value
                    }
                    verseInside1: metafield(namespace: "custom", key: "verse_inside_1") {
                        value
                    }
                    verseInside2: metafield(namespace: "custom", key: "verse_inside_2") {
                        value
                    }
                    nudity: metafield(namespace: "custom", key: "nuditylevel") {
                        value
                    }
                    political: metafield(namespace: "custom", key: "politicallevel") {
                        value
                    }
                    sex: metafield(namespace: "custom", key: "sexuallevel") {
                        value
                    }
                    language: metafield(namespace: "custom", key: "foulLanguage") {
                        value
                    }
                }
            }
        `,
        {
            variables: {
                id: productID
            }
        }
    );
    const productResult = await productResponse.json();

    const allProducts: ProductPayload[] = productResult.data.product.variants.map((variant: any) => ({
        id: variant.id,
        vendor: productResult.data.product.vendor,
        productType: productResult.data.product.productType,
        occasion: productResult.data.product.occasion && productResult.data.product.occasion.value ? productResult.data.product.occasion.value : "",
        assortment: productResult.data.product.assortment && productResult.data.product.assortment.value ? lookupMetaobject(admin, productResult.data.product.assortment.value) : "",
        customization: productResult.data.product.customization && productResult.data.product.customization.value ? JSON.parse(productResult.data.product.customization.value) : [],
        variants: variant.title,
        category: productResult.data.product.category.id,
        sku: variant.sku,
        title: productResult.data.product.title,
        description: productResult.data.product.descriptionHtml,
        seo: {
            title: productResult.data.product.seo.title,
            description: productResult.data.product.seo.description
        },
        status: variant.status && variant.status.value ? variant.status.value : "DRAFT",
        tags: productResult.data.product.tags,
        barcode: variant.barcode,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        count: variant.count && variant.count.value ? variant.count.value : "1",
        clearance: variant.clearance && variant.clearance.value ? variant.clearance.value : "false",
        tone: productResult.data.product.tone && productResult.data.product.tone.value ? productResult.data.product.tone.value : "",
        prop65: productResult.data.product.prop65 && productResult.data.product.prop65.value ? productResult.data.product.prop65.value : "false",
        line: productResult.data.product.line && productResult.data.product.line.value ? productResult.data.product.line.value : "",
        orientation: productResult.data.product.orientation && productResult.data.product.orientation.value ? productResult.data.product.orientation.value : "",
        verseFront: productResult.data.product.verseFront && productResult.data.product.verseFront.value ? productResult.data.product.verseFront.value : "",
        verseInside1: productResult.data.product.verseInside1 && productResult.data.product.verseInside1.value ? productResult.data.product.verseInside1.value : "",
        verseInside2: productResult.data.product.verseInside2 && productResult.data.product.verseInside2.value ? productResult.data.product.verseInside2.value : "",
        nudity: productResult.data.product.nudity && productResult.data.product.nudity.value ? productResult.data.product.nudity.value : "0",
        political: productResult.data.product.political && productResult.data.product.political.value ? productResult.data.product.political.value : "0",
        sex: productResult.data.product.sex && productResult.data.product.sex.value ? productResult.data.product.sex.value : "0",
        language: productResult.data.product.language && productResult.data.product.language.value ? productResult.data.product.language.value : "0",
    }));
    
    const shopResponse = await admin.graphql(
        `#graphql
            query getShopData {
                shop {
                    id
                    metafields(first: 250) {
                        nodes {
                            namespace
                            key
                            value
                        }
                    }
                }
            }
        `,
        {

        }
    );
    const shopResult = await shopResponse.json();
    const currentChannels: {handle: string, token: string, products: string[]}[] = [];
    for (const channel of salesChannels) {
        let channelList: Product[] = [];
        for (const rule of channel.rules) {
            const ruleResponse = await admin.graphql(
                `#graphql
                    query Rule($id: ID!) {
                        metaobject(id: $id) {
                            displayName
                            type: field(key: "type") {
                                value
                            }
                            variant: field(key: "variant") {
                                value
                            }
                            brand: field(key: "brand") {
                                value
                            }
                            product: field(key: "product") {
                                value
                            }
                            occasion: field(key: "occasion") {
                                value
                            }
                            assortment: field(key: "assortment") {
                                value
                            }
                            customization: field(key: "customization") {
                                value
                            }
                        }
                    }
                `,
                {
                    variables: {
                        id: rule
                    }
                }
            );
            const ruleResult = await ruleResponse.json();
            const isExclusive = ruleResult.data.metaobject.type?.value === 'false';
            if (isExclusive) {
                channelList = channelList.filter(product => !productRuleMatch(product, ruleResult.data.metaobject));
            } else {
                const productsToAdd = allProducts.filter(product => productRuleMatch(product, ruleResult.data.metaobject));
                for (const newProduct of productsToAdd) {
                    if (!channelList.some(product => product.id === newProduct.id)) {
                        channelList.push(newProduct);
                    }
                }
            }
            currentChannels.push({
                handle: channel.name,
                products: JSON.parse(shopResult.data.shop.metafields.nodes.filter((metafield: {namespace: string; key: string; value: string;}) => metafield.namespace === "product_list" && metafield.key === channel.name)[0].value).concat(channelList.map(variant => variant.id)),
                token: shopResult.data.shop.metafields.nodes.filter((metafield: {namespace: string; key: string; value: string;}) => metafield.namespace === "token" && metafield.key === channel.name)[0].value
            });
        }
    }

    const metafields: {ownerId: string; namespace: "product_list"; key: string; value: string}[] = currentChannels.map(channel => ({
        ownerId: shopResult.data.shop.id,
        namespace: "product_list",
        key: channel.handle,
        value: JSON.stringify(channel.products)
    }));
    const metafieldUpdateResponse = await admin.graphql(
        `#graphql
            mutation MetafieldUpdates($metafields: [MetafieldsSetInput!]!) {
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
                metafields: metafields
            }
        }
    );
    const metafieldUpdateResult = await metafieldUpdateResponse.json();
    if (metafieldUpdateResult.data.metafieldsSet.userErrors.length > 0) {
        ITErrors = metafieldUpdateResult.data.metafieldsSet.userErrors.map((error: {field: string; message: string;}) => (`[${error.field}] ${error.message}`));
    }

    if (ITErrors.length === 0) {
        for (const channel of currentChannels) {
            const transferProducts = allProducts.filter(product => channel.products.includes(product.id));
            if (transferProducts.length > 0) {
                for (const product of transferProducts) {
                    let productID = null;
                    const skuquery = `#graphql
                        query CheckSKUMatch {
                            products(first: 1, query: "sku:${product.sku}") {
                                nodes {
                                    id
                                }
                            }
                        }
                    `;
                    const productCheckResponse = await ExternalGraphql(channel.token, skuquery, "wi-d2c-shop-qa.myshopify.com");
                    if (typeof productCheckResponse === 'string') {
                        ITErrors.push(`[${product.sku} | ${channel.handle}] ${productCheckResponse}`);
                    }
                    if ((productCheckResponse as any).products.nodes.length === 0) {
                        const productCreateQuery = `
                            mutation {
                                productCreate(product: {title: "${product.title}", status: ${ProductStatus.DRAFT}}) {
                                    product {
                                        id
                                    }
                                }
                            }
                        `;
                        const productCreateResponse = await ExternalGraphql(channel.token, productCreateQuery, "wi-d2c-shop-qa.myshopify.com");
                        if (typeof productCreateResponse === 'string') {
                            ITErrors.push(`[${product.sku} | ${channel.handle}] ${productCreateResponse}`);
                        }
                        productID = (productCreateResponse as any).productCreate.product.id;
                    } else {
                        productID = (productCheckResponse as any).products.nodes[0].id;
                    }

                    if (productID === null) {
                        ITErrors.push(`[${product.sku}] Failed to create or location product on ${channel.handle}`);
                    } else {
                        const productUpdateResponse = `#graphql
                            mutation UpdateProduct {
                                productSet(synchronous: true, identifier: {id: ${productID}}, input: {
                                    handle: "${product.productType.replace(" ", "")}-${product.occasion.replace(" ", "")}-${"recipient"}-${product.sku}"
                                    category: "${product.category}",
                                    descriptionHtml: "${product.description}",
                                    productType: "${product.productType}",
                                    seo: {
                                        title: "${product.seo.title}",
                                        description: "${product.seo.description}"
                                    },
                                    status: "${product.status}",
                                    tags: "${JSON.stringify(product.tags)}",
                                    title: "${product.title}",
                                    vendor: "${product.vendor}",
                                    variants: [{
                                        optionValues: [], //TODO
                                        barcode: "${product.barcode}",
                                        price: "${product.price}",
                                        compareAtPrice: "${product.compareAtPrice}"
                                        sku: "${product.sku}"
                                    }],
                                    metafields: [
                                        {
                                            namespace: "custom",
                                            key: "count",
                                            value: "${product.count}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "clearance",
                                            value: "${product.clearance}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "tone",
                                            value: "${product.tone}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "prop65",
                                            value: "${product.prop65}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "line",
                                            value: "${product.line}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "orientation",
                                            value: "${product.orientation}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "verse_front",
                                            value: "${product.verseFront}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "verse_inside_1",
                                            value: "${product.verseInside1}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "verse_inside_2",
                                            value: "${product.verseInside2}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "occasion",
                                            value: "${product.occasion}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "customization",
                                            value: "${product.customization}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "nudity_rating",
                                            value: "${product.nudity}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "political_rating",
                                            value: "${product.political}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "sex_rating",
                                            value: "${product.sex}"
                                        },
                                        {
                                            namespace: "custom",
                                            key: "language_rating",
                                            value: "${product.language}"
                                        },
                                    ]
                                }) {
                                    userErrors {
                                        code
                                        field
                                        message
                                    }
                                }
                            }
                        `;






                         //Product update, variant update, media update



                    //TODO: Push product to channels



                    }
                }
            }
        }
    }

    //TODO: Upload ITErrors */

    return new Response("Ok", { status: 200 });
}

async function lookupMetaobject(admin: AdminApiContextWithoutRest, id: string): Promise<string> {
    const response = await admin.graphql(
        `#graphql
            query GetMetaobject($id: ID!) {
                metaobject(id: $id) {
                    handle
                }
            }
        `,
        {
            variables: {
                id: id
            }
        }
    );
    const result = await response.json();
    return result.data.metaobject.handle ? result.data.metaobject.handle : "";
}
