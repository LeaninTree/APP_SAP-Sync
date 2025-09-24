import { AdminApiContextWithoutRest } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients";

interface Metafield {
    namespace: string;
    key: string;
    value: string;
}

interface Variant {
    title: string;
    selectedOptions: {
        name: string;
        optionValue: {
            name: string;
        }
    }[];
    sku: string;
    inventoryItem: {
        inventoryLevels: {
            nodes: {
                location: {
                    id: string;
                }
                quantities: {
                    quantity: string | number;
                }[];
            }[];
        }
    }
    compareAtPrice: string;
    price: string;
    barcode: string;
    metafields: {
        nodes: Metafield[];
    }
}

export async function retrieveProductsReferenced(admin: AdminApiContextWithoutRest, id: string, type: string) {
    let moreReferences: boolean = true;
    let cursor: string | null = null;
    const referencedProducts: string[] = [];

    while(moreReferences) {
        const referenceResponse: any = await admin.graphql(
            `#graphql
                query MetaobjectReferences($id: ID!, $cursor: String) {
                    metaobject(id: $id) {
                        referencedBy(first: 250, after: $cursor) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                referencer {
                                    ... on Product {
                                        id
                                    }
                                }
                            }
                        }
                    }
                }
            `,
            {
                variables: {
                    id: id,
                    cursor: cursor
                }
            }
        );

        const referenceResult = await referenceResponse.json();

        for (let i = 0; i < referenceResult.data.metaobject.referencedBy.nodes.length; i++) {
            referencedProducts.push(referenceResult.data.metaobject.referencedBy.nodes[i].referencer.id);
        }

        cursor = referenceResult.data.metaobject.referencedBy.pageInfo.endCursor;
        moreReferences = referenceResult.data.metaobject.referencedBy.pageInfo.hasNextPage;
    }

    switch (type) {
        case 'brand':
            referencedProducts.forEach( product => brandDefinitionUpdate(admin, product, id));
            return new Response("Ok", { status: 200 });
        case 'category':
            referencedProducts.forEach( product => categoryDefinitionUpdate(admin, product, id));
            return new Response("Ok", { status: 200 });
        case 'occasion':
            referencedProducts.forEach( product => occasionDefinitionUpdate(admin, product, id));
            return new Response("Ok", { status: 200 });
        default:
            return new Response("No Update", { status: 204 });
    }
}

async function brandDefinitionUpdate(admin: AdminApiContextWithoutRest, product: string, definitionId: string) {
    const definitionResponse = await admin.graphql(
        `#graphql
            query GetDefinition($id: ID!) {
                metaobject(id: $id) {
                    name: field(key: "name") {
                        value
                    }
                }
            }
        `,
        {
            variables: {
                id: definitionId
            }
        }
    );

    const definitionResult = await definitionResponse.json();

    const response = await admin.graphql(
        `#graphql
            mutation UpdateProductVendor($product: ProductUpdateInput!) {
                productUpdate(product: $product) {
                    userErrors {
                        field
                        message
                    }
                }
            }
        `,
        {
            variables: {
                product: {
                    id: product,
                    vendor: definitionResult.data.metaobject.name && definitionResult.data.metaobject.name.value ? definitionResult.data.metaobject.name.value : ""
                }
            }
        }
    );

    const result = await response.json();

    if (result.data.productUpdate.userErrors.length > 0) {
        const getShopMetafieldsResponse = await admin.graphql(
            `#graphql
                query ShopMetafields {
                    shop {
                        id
                        itErrors: metafield(namespace: "custom", key: "it_errors") {
                            value
                        }
                    }
                }
            `,
            {

            }
        );

        const getShopMetafieldsResult = await getShopMetafieldsResponse.json();

        const newITErrors = [...JSON.parse(getShopMetafieldsResult.data.shop.itErrors.value)];
        newITErrors.push(`[Metaobject Update] (${definitionId}) ${result.data.productUpdate.userErrors.field} - ${result.data.productUpdate.userErrorsmessage}`);

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
                    metafields: [
                        {
                            ownerId: getShopMetafieldsResult.data.shop.id,
                            namespace: "custom",
                            key: "it_errors",
                            value: JSON.stringify(newITErrors)
                        }
                    ]
                }
            }
        );

        const metafieldUpdateResult = await metafieldUpdateResponse.json();

        if (metafieldUpdateResult.data.userErrors.length > 0) {
            for (let i = 0; i < metafieldUpdateResult.data.userErrors; i++) {
                console.log(`[Metaobject Update] (${definitionId}) ${metafieldUpdateResult.data.userErrors[i].field} - ${metafieldUpdateResult.data.userErrors[i].message}`);
            }
        }
    }

    return;
}

async function occasionDefinitionUpdate(admin: AdminApiContextWithoutRest, product: string, definitionId: string) {
    const definitionResponse = await admin.graphql(
        `#graphql
            query GetDefinition($id: ID!) {
                metaobject(id: $id) {
                    name: field(key: "name") {
                        value
                    }
                }
            }
        `,
        {
            variables: {
                id: definitionId
            }
        }
    );

    const definitionResult = await definitionResponse.json();

    const response = await admin.graphql(
        `#graphql
            mutation UpdateProductVendor($product: ProductUpdateInput!) {
                productUpdate(product: $product) {
                    userErrors {
                        field
                        message
                    }
                }
            }
        `,
        {
            variables: {
                product: {
                    id: product,
                    metafields: [
                        {
                            namespace: "custom",
                            key: "occasion",
                            value: definitionResult.data.metaobject.name && definitionResult.data.metaobject.name.value ? definitionResult.data.metaobject.name.value : ""
                        }
                    ]
                }
            }
        }
    );

    const result = await response.json();

    if (result.data.productUpdate.userErrors.length > 0) {
        const getShopMetafieldsResponse = await admin.graphql(
            `#graphql
                query ShopMetafields {
                    shop {
                        id
                        itErrors: metafield(namespace: "custom", key: "it_errors") {
                            value
                        }
                    }
                }
            `,
            {

            }
        );

        const getShopMetafieldsResult = await getShopMetafieldsResponse.json();

        const newITErrors = [...JSON.parse(getShopMetafieldsResult.data.shop.itErrors.value)];
        newITErrors.push(`[Metaobject Update] (${definitionId}) ${result.data.productUpdate.userErrors.field} - ${result.data.productUpdate.userErrorsmessage}`);

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
                    metafields: [
                        {
                            ownerId: getShopMetafieldsResult.data.shop.id,
                            namespace: "custom",
                            key: "it_errors",
                            value: JSON.stringify(newITErrors)
                        }
                    ]
                }
            }
        );

        const metafieldUpdateResult = await metafieldUpdateResponse.json();

        if (metafieldUpdateResult.data.userErrors.length > 0) {
            for (let i = 0; i < metafieldUpdateResult.data.userErrors; i++) {
                console.log(`[Metaobject Update] (${definitionId}) ${metafieldUpdateResult.data.userErrors[i].field} - ${metafieldUpdateResult.data.userErrors[i].message}`);
            }
        }
    }

    return;
}

async function categoryDefinitionUpdate(admin: AdminApiContextWithoutRest, product: string, definitionId: string) {
    const definitionResponse = await admin.graphql(
        `#graphql
            query GetDefinition($id: ID!) {
                metaobject(id: $id) {
                    productType: field(key: "type") {
                        value
                    }
                    assortment: field(key: "assortment") {
                        value
                    }
                    size: field(key: "size") {
                        value
                    }
                    b2bCount: field(key: "b2b_count") {
                        value
                    }
                    d2cPrice: field(key: "D2CPrice") {
                        value
                    }
                    d2cComparePrice: field(key: "D2CCompareAtPrice") {
                        value
                    }
                    b2bPrice: field(key: "B2BPrice") {
                        value
                    }
                    b2bComparePrice: field(key: "B2BCompareAtPrice") {
                        value
                    }
                    clearance: field(key: "clearance") {
                        value
                    }
                }
            }
        `,
        {
            variables: {
                id: definitionId
            }
        }
    );

    const definitionResult = await definitionResponse.json();

    let assortment = "1";
    if (definitionResult.data.metaobject.assortment.value !== null) {
        const getAssortmentResponse = await admin.graphql(
            `#graphql
                query GetAssortmentCount($id: ID!) {
                    metaobject(id: $id) {
                        count: field(key: "count") {
                            value
                        }
                    }
                }
            `,
            {
                variables: {
                    id: definitionResult.data.metaobject.assortment.value
                }
            }
        );

        const getAssortmentResult = await getAssortmentResponse.json();
        assortment = getAssortmentResult.data.metaobject.count.value;
    }

    const productResponse = await admin.graphql(
        `#graphql
            query GetProductData($id: ID!) {
                product(id: $id) {
                    metafields(first: 250) {
                        nodes {
                            namespace
                            key
                            value
                        }
                    }
                    variants(first: 250) {
                        nodes {
                            title
                            selectedOptions {
                                name
                                optionValue {
                                    name
                                }
                            }
                            sku
                            inventoryItem {
                                inventoryLevels(first: 1) {
                                    nodes {
                                        location {
                                            id
                                        }
                                        quantities(names: ["available"]) {
                                            quantity
                                        }
                                    }
                                }
                            }
                            compareAtPrice
                            price
                            barcode
                            metafields(first: 250) {
                                nodes {
                                    namespace
                                    key
                                    value
                                }
                            }
                        }
                    }
                }
            }
        `,
        {
            variables: {
                id: product
            }
        }
    );

    const productResult = await productResponse.json();

    const newMetafields = productResult.data.product.metafields.nodes.map((metafield: Metafield) => {
        switch (metafield.key) {
            case "assortment":
                metafield.value = definitionResult.data.metaobject.assortment.value;
                return metafield;
            case "size":
                metafield.value = definitionResult.data.metaobject.size.value;
                return metafield;
            default:
                return metafield;
        }
    });

    const newVariants = productResult.data.product.variants.nodes.map((variant: Variant) => {
        let compare_at_price = variant.compareAtPrice;
        let price = variant.price;
        let newMetafields = variant.metafields.nodes.map((metafield: Metafield) => {
            if (metafield.key === "clearance") {
                metafield.value = definitionResult.data.metaobject.clearance.value; 
            }
            return metafield;
        });
        if (variant.title.toUpperCase() === "D2C") {
            compare_at_price = JSON.parse(definitionResult.data.metaobject.d2cComparePrice.value).amount;
            price = JSON.parse(definitionResult.data.metaobject.d2cPrice.value).amount;
            newMetafields = newMetafields.map((metafield: Metafield) => {
                if (metafield.key === "count") {
                    metafield.value = assortment;
                }
                return metafield;
            });
        } else if (variant.title.toUpperCase() === "B2B") {
            compare_at_price = JSON.parse(definitionResult.data.metaobject.b2bComparePrice.value).amount;
            price = JSON.parse(definitionResult.data.metaobject.b2bPrice.value).amount;
            newMetafields = newMetafields.map((metafield: Metafield) => {
                if (metafield.key === "count") {
                    metafield.value = definitionResult.data.metaobject.b2bCount.value;
                }
                return metafield;
            });
        }

        return {
            optionValues: [{
                optionName: variant.selectedOptions[0].name,
                name: variant.selectedOptions[0].optionValue.name
            }],
            sku: variant.sku,
            inventoryQuantities: [{
                locationId: variant.inventoryItem.inventoryLevels.nodes[0].location.id,
                name: "avaliable",
                quantity: variant.inventoryItem.inventoryLevels.nodes[0].quantities[0].quantity
            }],
            compareAtPrice: compare_at_price,
            price: price,
            barcode: variant.barcode,
            metafields: newMetafields
        }
    });

    console.log(newVariants);

    const response = await admin.graphql(
        `#graphql
            mutation UpdateProductVendor($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
                productSet(input: $input, identifier: $identifier) {
                    userErrors {
                        field
                        message
                    }
                }
            }
        `,
        {
            variables: {
                identifier: {
                    id: product
                },
                input: {
                    productType: definitionResult.data.metaobject.productType.value,
                    metafields: newMetafields,
                    variants: newVariants
                }
            }
        }
    );

    const result = await response.json();

    if (result.data.productUpdate.userErrors.length > 0) {
        const getShopMetafieldsResponse = await admin.graphql(
            `#graphql
                query ShopMetafields {
                    shop {
                        id
                        itErrors: metafield(namespace: "custom", key: "it_errors") {
                            value
                        }
                    }
                }
            `,
            {

            }
        );

        const getShopMetafieldsResult = await getShopMetafieldsResponse.json();

        const newITErrors = [...JSON.parse(getShopMetafieldsResult.data.shop.itErrors.value)];
        newITErrors.push(`[Metaobject Update] (${definitionId}) ${result.data.productUpdate.userErrors.field} - ${result.data.productUpdate.userErrorsmessage}`);

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
                    metafields: [
                        {
                            ownerId: getShopMetafieldsResult.data.shop.id,
                            namespace: "custom",
                            key: "it_errors",
                            value: JSON.stringify(newITErrors)
                        }
                    ]
                }
            }
        );

        const metafieldUpdateResult = await metafieldUpdateResponse.json();

        if (metafieldUpdateResult.data.userErrors.length > 0) {
            for (let i = 0; i < metafieldUpdateResult.data.userErrors; i++) {
                console.log(`[Metaobject Update] (${definitionId}) ${metafieldUpdateResult.data.userErrors[i].field} - ${metafieldUpdateResult.data.userErrors[i].message}`);
            }
        }
    }

    return;
}
