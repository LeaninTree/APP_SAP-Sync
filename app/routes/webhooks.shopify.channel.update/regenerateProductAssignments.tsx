import { AdminApiContextWithoutRest } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients";

export interface Product {
    id: string;
    vendor: string;
    productType: string;
    occasion: string;
    assortment: string;
    customization: string[];
    variants: string;
}

export interface SalesChannels {
    name: string;
    rules: string[];
}

export async function RegenerateProductLists(admin: AdminApiContextWithoutRest) {
    const allProducts = await getAllProducts(admin);

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

    const uploadChannels: {handle: string, products: string}[] = [];
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
        }
        uploadChannels.push({
            handle: channel.name,
            products: JSON.stringify(channelList)
        });
    }

    const shopResponse = await admin.graphql( 
        `#graphql
            query GetShopID {
                shop {
                    id
                }
            }
        `,
        {

        }
    );
    const shopResult = await shopResponse.json();
    
    const metafields: {ownerId: string; namespace: "product_list"; key: string; value: string}[] = uploadChannels.map(channel => ({
        ownerId: shopResult.data.shop.id,
        namespace: "product_list",
        key: channel.handle,
        value: channel.products
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
        for (let i = 0; i < metafieldUpdateResult.data.metafieldsSet.userErrors; i++) {
            console.log(`[${metafieldUpdateResult.data.metafieldsSet.userErrors[i].field}] ${metafieldUpdateResult.data.metafieldsSet.userErrors[i].message}`)
        }
    }
}

async function getAllProducts(admin: AdminApiContextWithoutRest): Promise<Product[]> {
    let moreProducts: boolean = true;
    let currentCursor: string | null = null;
    const productList: Product[] = [];
    while (moreProducts) {
        const response = await admin.graphql(
            `#graphql
                query getProducts($cursor: String) {
                    products(first: 250, query: "status:active", after: $cursor) {
                        pageInfo {
                            endCursor
                            hasNextPage
                        }
                        nodes {
                            id
                            vendor
                            productType
                            occasion: metafield(namespace: "custom", key: "occasion") {
                                value
                            }
                            assortment: metafield(namespace: "custom", key: "assortment") {
                                value
                            }
                            customization: metafield(namespace: "custom", key: "customizable") {
                                value
                            }
                            variants(first: 250) {
                                nodes {
                                    id
                                    title
                                }
                            }
                        }
                    }
                }
            `,
            {
                variables: {
                    cursor: currentCursor
                }
            }
        );
        const result: any = await response.json();
        for (const product of result.data.products.nodes) {
            let tempAssortment = "";
            if (product.assortment && product.assortment.value) {
                const assortmentResponse = await admin.graphql(
                    `#graphql
                        query getAssortmentName($id: ID!) {
                            metaobject(id: $id) {
                                displayName
                            }
                        }
                    `,
                    {
                        variables: {
                            id: product.assortment.value
                        }
                    }
                );
                const assortmentResult = await assortmentResponse.json();
                tempAssortment = assortmentResult.data.metaobject.displayName;
            }
            for (const variant of product.variants.nodes) {
                productList.push({
                    id: variant.id,
                    vendor: product.vendor,
                    productType: product.productType,
                    occasion: product.occasion && product.occasion.value ? product.occasion.value : "",
                    customization: product.customization && product.customization.value ? JSON.parse(product.customization.value) : [],
                    variants: variant.title,
                    assortment: tempAssortment
                })
            }
        };
        moreProducts = result.data.products.pageInfo.hasNextPage;
        currentCursor = result.data.products.pageInfo.endCursor;
    }
    return productList;
}

export function productRuleMatch (product: Product, ruleMetaobject: any): boolean {
    const brandValue = ruleMetaobject.brand?.value;
    if (brandValue && brandValue !== 'ALL' && product.vendor.toUpperCase() !== brandValue.toUpperCase()) {
        return false;
    }
    const productTypeValue = ruleMetaobject.product?.value;
    if (productTypeValue && productTypeValue !== 'ALL' && product.productType.toUpperCase() !== productTypeValue.toUpperCase()) {
        return false;
    }
    const occasionValue = ruleMetaobject.occasion?.value;
    if (occasionValue && occasionValue !== 'ALL' && product.occasion.toUpperCase() !== occasionValue.toUpperCase()) {
        return false;
    }
    const assortmentValue = ruleMetaobject.assortment?.value;
    if (assortmentValue && assortmentValue !== 'ALL' && product.assortment.toUpperCase() !== assortmentValue.toUpperCase()) {
        return false;
    }
    const customizationValue = ruleMetaobject.customization?.value;
    if (customizationValue && customizationValue !== 'ALL' && !product.customization.includes(customizationValue)) {
        return false;
    }
    const variantValue = ruleMetaobject.variant?.value;
    if (variantValue && variantValue !== 'ALL' && product.variants.toUpperCase() !== variantValue.toUpperCase()) {
        return false;
    }
    return true;
}
