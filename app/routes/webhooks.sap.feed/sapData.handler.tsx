import { AdminApiContextWithoutRest } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients";
import { getShopifyProductData } from "./shopifyData.handler";

export interface Error {
    code: string;
    message: string;
}

interface Brand {
    name: string | null;
}

interface Category {
    categoryId: string | null;
    assortmentId: string | null;
    sizeId: string | null;
    b2bCount: number | null;
    d2cCount: number | null;
    imageCount: number | null;
    d2cPrice: number | null;
    d2cCompareAtPrice: number | null;
    b2bPrice: number | null;
    b2bCompareAtPrice: number | null;
    clearance: boolean | null;
    productType: string | null;
    typeName: string | null;
    prop65: boolean | null;
    taxonomyString: string | null;
}

interface Occasion {
    name: string | null;
    id: string | null;
}

interface Process {
    id: string | null;
}

interface Artist {
    id: string | null;
}

interface Channel {
    name: string;
}

interface VariantOptionValue {
    optionName: string;
    name: string;
}

interface InventoryQuantity {
    locationId: string;
    name: string;
    quantity: number;
}

export interface Metafield {
    namespace: string;
    key: string;
    value: string | boolean;
}

export interface Recipient {
    id: string;
    gendered: string;
    forKid: boolean;
    group: string;
    name: string;
}

interface SAPVerse {
    number: string;
    text: string;
}

interface SAPVariants {
    name: string;
    sku: string;
    price: string;
    compare_at_price: string;
    date_code: string;
    date: string;
    inventory: number;
    upc17: string;
}

export interface SAPProduct {
    debug_prdha?: string;
    debug_vakey?: string;
    title: string;
    brand: string;
    family?: string;
    product_category: string;
    prefix: string;
    processes: string[];
    line: string;
    verse_front: SAPVerse;
    verse_inside_1: SAPVerse;
    verse_inside_2: SAPVerse;
    orientation: "V" | "H";
    artist: string;
    variants: SAPVariants[];
}

interface UploadVariant {
    optionValues: VariantOptionValue[];
    sku: string;
    inventoryQuantities: InventoryQuantity[];
    compareAtPrice: number | null;
    price: number | null;
    barcode: string;
    metafields: Metafield[];
}

interface UploadProduct {
    productOptions: {
        name: string;
        values: Channel[]
    }[];
    variants: UploadVariant[];
    metafields: Metafield[];
    category?: string;
    vendor?: string;
    productType?: string;
}

export async function handleProductFeed(admin: AdminApiContextWithoutRest, data: any[], feedID: string) {
    const ITErrors: Error[] = [];
    const productStatus: Error[] = [];

    const brandCache = new Map<String, Brand>();
    const categoryCache = new Map<String, Category>();
    const occasionCache = new Map<String, Occasion>();
    const processCache = new Map<String, Process>();
    const artistCache = new Map<String, Artist>();

    const locationResponse = await admin.graphql(
        `#graphql
            query($identifier: LocationIdentifierInput!) {
                location: locationByIdentifier(identifier: $identifier) {
                    id
                }
            }
        `,
        {
            variables: {
                identifier: {
                    customId: {
                        namespace: "custom",
                        key: "id",
                        value: "2260"
                    }
                }
            }
        }
    );
    const locationData = await locationResponse.json();
    const locationId: string = locationData.data.location.id;

    for (const [key, value] of Object.entries(data)) {
        const sku = key;
        const sapProductData = value as SAPProduct;

        const shopifyProductData = await getShopifyProductData(admin, sku);
        if (!shopifyProductData) {
            ITErrors.push({
                code: sku,
                message: "Unable to find product in Shopify."
            });
            continue;
        }

        let brandName: string | null = null;
        if (brandCache.get(sapProductData.brand)) {
            if ((brandCache.get(sapProductData.brand) as Brand).name) {
                brandName = (brandCache.get(sapProductData.brand) as Brand).name;
            }
        } else {
            const brandResponse = await admin.graphql(
                `#graphql
                    query getBrands($brand: String!) {
                        metaobjectByHandle(handle: {handle: $brand, type: "brand"}) {
                            id
                            field(key: "name") {
                                value
                            }
                        }
                    }
                `,
                {
                    variables: {
                        brand: sapProductData.brand.toLowerCase()
                    }
                }
            );

            const brandsResult = await brandResponse.json();

            if (brandsResult.data.metaobjectByHandle === null) {
                brandCache.set(sapProductData.brand, {name: null});
                const brandCreateResponse = await admin.graphql(
                    `#graphql
                        mutation createDefinition($metaobject: MetaobjectCreateInput!) {
                            metaobjectCreate(metaobject: $metaobject) {
                                metaobject {
                                    handle
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `,
                    {
                        variables: {
                            metaobject: {
                                type: "brand",
                                handle: sapProductData.brand,
                                fields: [
                                    {
                                        key: "key",
                                        value: sapProductData.brand
                                    },
                                    {
                                        key: "definition",
                                        value: "false"
                                    }
                                ]
                            }
                        }
                    }
                );
                
                const brandCreateResult = await brandCreateResponse.json();

                if (brandCreateResult.data.metaobjectCreate.userErrors.length > 0) {
                    brandCreateResult.data.metaobjectCreate.userErrors.forEach((error: any) => ITErrors.push({
                        code: `${sku}-${sapProductData.brand}`,
                        message: `Failed to creat brand metaobject - [${error.field}] ${error.message}`
                    }))
                }
            } else {
                brandName = brandsResult.data.metaobjectByHandle.field.value;
                brandCache.set(sapProductData.brand, {name: brandsResult.data.metaobjectByHandle.field.value});
            }
        }

        let categoryId: string | null = null;
        let assortmentId: string | null = null;
        let sizeId: string | null = null;
        let b2bCount: number | null = null;
        let d2cCount: number | null = null;
        let imageCount: number | null = null;
        let d2cPrice: number | null = null;
        let d2cCompareAtPrice: number | null = null;
        let b2bPrice: number | null = null;
        let b2bCompareAtPrice: number | null = null;
        let clearance: boolean | null = null;
        let productType: string | null = null;
        let typeName: string | null = null;
        let prop65: boolean | null = null;
        let taxonomyString: string | null = null;
        if (categoryCache.get(sapProductData.product_category)) {
            if ((categoryCache.get(sapProductData.product_category) as Category).taxonomyString && (categoryCache.get(sapProductData.product_category) as Category).prop65 && (categoryCache.get(sapProductData.product_category) as Category).typeName && (categoryCache.get(sapProductData.product_category) as Category).productType && (categoryCache.get(sapProductData.product_category) as Category).clearance && (categoryCache.get(sapProductData.product_category) as Category).b2bCompareAtPrice && (categoryCache.get(sapProductData.product_category) as Category).b2bPrice && (categoryCache.get(sapProductData.product_category) as Category).d2cCompareAtPrice && (categoryCache.get(sapProductData.product_category) as Category).d2cPrice && (categoryCache.get(sapProductData.product_category) as Category).imageCount && (categoryCache.get(sapProductData.product_category) as Category).d2cCount && (categoryCache.get(sapProductData.product_category) as Category).b2bCount && (categoryCache.get(sapProductData.product_category) as Category).categoryId && (categoryCache.get(sapProductData.product_category) as Category).assortmentId && (categoryCache.get(sapProductData.product_category) as Category).sizeId) {
                categoryId = (categoryCache.get(sapProductData.product_category) as Category).categoryId;
                assortmentId = (categoryCache.get(sapProductData.product_category) as Category).assortmentId;
                sizeId = (categoryCache.get(sapProductData.product_category) as Category).sizeId;
                b2bCount = (categoryCache.get(sapProductData.product_category) as Category).b2bCount;
                d2cCount = (categoryCache.get(sapProductData.product_category) as Category).d2cCount;
                imageCount = (categoryCache.get(sapProductData.product_category) as Category).imageCount;
                d2cPrice = (categoryCache.get(sapProductData.product_category) as Category).d2cPrice;
                d2cCompareAtPrice = (categoryCache.get(sapProductData.product_category) as Category).d2cCompareAtPrice;
                b2bPrice = (categoryCache.get(sapProductData.product_category) as Category).b2bPrice;
                b2bCompareAtPrice = (categoryCache.get(sapProductData.product_category) as Category).b2bCompareAtPrice;
                clearance = (categoryCache.get(sapProductData.product_category) as Category).clearance;
                productType = (categoryCache.get(sapProductData.product_category) as Category).productType;
                typeName = (categoryCache.get(sapProductData.product_category) as Category).typeName;
                prop65 = (categoryCache.get(sapProductData.product_category) as Category).prop65;
                taxonomyString = (categoryCache.get(sapProductData.product_category) as Category).taxonomyString;
            }
        } else {
            const categoryResponse = await admin.graphql(
                `#graphql
                    query getCategories($name: String!) {
                        metaobjectByHandle(handle: {handle: $name, type: "category"}) {
                            id
                            type: field(key: "type") {
                                value
                                reference {
                                    ... on Metaobject {
                                        name: field(key: "name") {
                                            value
                                        }
                                        prop65: field(key: "prop65") {
                                            value
                                        }
                                        taxonomy: field(key: "category") {
                                            value
                                        }
                                    }
                                }
                            }
                            assortment: field(key: "assortment") {
                                value
                                reference {
                                    ... on Metaobject {
                                        d2cCount: field (key: "count") {
                                            value
                                        }
                                    }
                                }
                            }
                            size: field(key: "size") {
                                value
                            }
                            imageCount: field(key: "image_count") {
                                value
                            }
                            b2bCount: field(key: "b2b_count") {
                                value
                            }
                            d2cPrice: field(key: "D2CPrice") {
                                value
                            }
                            d2cCompareAtPrice: field(key: "D2CCompareAtPrice") {
                                value
                            }
                            b2bPrice: field(key: "B2BPrice") {
                                value
                            }
                            b2bCompareAtPrice: field(key: "B2BCompareAtPrice") {
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
                        name: sapProductData.product_category.toLowerCase()
                    }
                }
            );

            const categoryResult = await categoryResponse.json();

            if (categoryResult.data.metaobjectByHandle === null) {
                categoryCache.set(sapProductData.product_category, {
                    categoryId: null,
                    assortmentId: null,
                    sizeId: null,
                    b2bCount: null,
                    d2cCount: null,
                    imageCount: null,
                    d2cPrice: null,
                    d2cCompareAtPrice: null,
                    b2bPrice: null,
                    b2bCompareAtPrice: null,
                    clearance: null,
                    productType: null,
                    typeName: null,
                    prop65: null,
                    taxonomyString: null
                });
                const categpryCreateResponse = await admin.graphql(
                    `#graphql
                        mutation createDefinition($metaobject: MetaobjectCreateInput!) {
                            metaobjectCreate(metaobject: $metaobject) {
                                metaobject {
                                    handle
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `,
                    {
                        variables: {
                            metaobject: {
                                type: "category",
                                handle: sapProductData.product_category,
                                fields: [
                                    {
                                        key: "name",
                                        value: sapProductData.product_category
                                    },
                                    {
                                        key: "definition",
                                        value: "false"
                                    }
                                ]
                            }
                        }
                    }
                );

                const categoryCreateResult = await categpryCreateResponse.json();
                
                if (categoryCreateResult.data.metaobjectCreate.userErrors.length > 0) {
                    categoryCreateResult.data.metaobjectCreate.userErrors.forEach((error: any) => ITErrors.push({
                        code: `${sku}-${sapProductData.product_category}`,
                        message: `Failed to create metaobject - [${error.field}] ${error.message}`
                    }))
                }
            } else {
                categoryId = categoryResult.data.metaobjectByHandle.id;
                assortmentId = categoryResult.data.metaobjectByHandle.assortment.value;
                sizeId = categoryResult.data.metaobjectByHandle.size.value;
                b2bCount = categoryResult.data.metaobjectByHandle.b2bCount.value;
                imageCount = categoryResult.data.metaobjectByHandle.imageCount.value;
                d2cPrice = categoryResult.data.metaobjectByHandle.d2cPrice.value;
                d2cCompareAtPrice = categoryResult.data.metaobjectByHandle.d2cCompareAtPrice.value;
                b2bPrice = categoryResult.data.metaobjectByHandle.b2bPrice.value;
                b2bCompareAtPrice = categoryResult.data.metaobjectByHandle.b2bCompareAtPrice.value;
                clearance = categoryResult.data.metaobjectByHandle.clearance.value;

                if (categoryResult.data.metaobjectByHandle.assortment.value != null) {
                    d2cCount = categoryResult.data.metaobjectByHandle.assortment.reference.d2cCount;
                } else {
                    d2cCount = 1;
                }

                if (categoryResult.data.metaobjectByHandle.type.reference === null) {
                    categoryCache.set(sapProductData.product_category, {
                        categoryId: null,
                        assortmentId: null,
                        sizeId: null,
                        b2bCount: null,
                        d2cCount: null,
                        imageCount: null,
                        d2cPrice: null,
                        d2cCompareAtPrice: null,
                        b2bPrice: null,
                        b2bCompareAtPrice: null,
                        clearance: null,
                        productType: null,
                        typeName: null,
                        prop65: null,
                        taxonomyString: null
                    });
                } else {
                    typeName = categoryResult.data.metaobjectByHandle.type.reference.name.value;
                    prop65 = categoryResult.data.metaobjectByHandle.type.reference.prop65.value;
                    taxonomyString = categoryResult.data.metaobjectByHandle.type.reference.taxonomy.value;

                    categoryCache.set(sapProductData.product_category, {
                        categoryId: categoryResult.data.metaobjectByHandle.id,
                        assortmentId: categoryResult.data.metaobjectByHandle.assortment.value,
                        sizeId: categoryResult.data.metaobjectByHandle.size.value,
                        b2bCount: categoryResult.data.metaobjectByHandle.b2bCount.value,
                        d2cCount: d2cCount,
                        imageCount: categoryResult.data.metaobjectByHandle.imageCount.value,
                        d2cPrice: categoryResult.data.metaobjectByHandle.d2cPrice.value,
                        d2cCompareAtPrice: categoryResult.data.metaobjectByHandle.d2cCompareAtPrice.value,
                        b2bPrice: categoryResult.data.metaobjectByHandle.b2bPrice.value,
                        b2bCompareAtPrice: categoryResult.data.metaobjectByHandle.b2bCompareAtPrice.value,
                        clearance: categoryResult.data.metaobjectByHandle.clearance.value,
                        productType: categoryResult.data.metaobjectByHandle.type.value,
                        typeName: categoryResult.data.metaobjectByHandle.type.reference.name.value,
                        prop65: categoryResult.data.metaobjectByHandle.type.reference.prop65.value,
                        taxonomyString: categoryResult.data.metaobjectByHandle.type.reference.taxonomy.value
                    });
                }
            }
        }

        let occasionName: string | null = null;
        let occasionId: string | null = null;
        if (occasionCache.get(sapProductData.prefix)) {
            if ((occasionCache.get(sapProductData.prefix) as Occasion).name && (occasionCache.get(sapProductData.prefix) as Occasion).id) {
                occasionName = (occasionCache.get(sapProductData.prefix) as Occasion).name;
                occasionId = (occasionCache.get(sapProductData.prefix) as Occasion).id;
            }
        } else {
            const occasionResponse = await admin.graphql(
                `#graphql
                    query getOccasion($code: String!) {
                        metaobjectByHandle(handle: {handle: $code, type: "occasion"}) {
                            id
                            field(key: "name") {
                                value
                            }
                        }
                    }
                `,
                {
                    variables: {
                        code: sapProductData.prefix.toLowerCase()
                    }
                }
            );

            const occasionResult = await occasionResponse.json();

            if (occasionResult.data.metaobjectByHandle === null) {
                occasionCache.set(sapProductData.prefix, {
                    name: null,
                    id: null
                });
                const occasionCreateResponse = await admin.graphql(
                    `#graphql
                        mutation createDefinition($metaobject: MetaobjectCreateInput!) {
                            metaobjectCreate(metaobject: $metaobject) {
                                metaobject {
                                    handle
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `,
                    {
                        variables: {
                            metaobject: {
                                type: "occasion",
                                handle: sapProductData.prefix,
                                fields: [
                                    {
                                        key: "code",
                                        value: sapProductData.prefix
                                    },
                                    {
                                        key: "definition",
                                        value: "false"
                                    }
                                ]
                            }
                        }
                    }
                );

                const occasionCreateResult = await occasionCreateResponse.json();
                
                if (occasionCreateResult.data.metaobjectCreate.userErrors.length > 0) {
                    occasionCreateResult.data.metaobjectCreate.userErrors.forEach((error: any) => ITErrors.push({
                        code: `${sku}-${sapProductData.prefix}`,
                        message: `Failed to create metaobject - [${error.field}] ${error.message}`
                    }))
                }
            } else {
                occasionId = occasionResult.data.metaobjectByHandle.id;
                occasionName = occasionResult.data.metaobjectByHandle.field.value;
                occasionCache.set(sapProductData.prefix, {
                    name: occasionResult.data.metaobjectByHandle.field.value,
                    id: occasionResult.data.metaobjectByHandle.id
                });
            }
        }

        const processArray: String[] = [];
        for (const process of sapProductData.processes) {
            if (processCache.get(process)) {
                if ((processCache.get(process) as Process).id != null) {
                    processArray.push((processCache.get(process) as Process).id as string);
                }
            } else {
                const processResponse = await admin.graphql(
                    `#graphql
                        query getProcess($code: String!) {
                            metaobjectByHandle(handle: {handle: $code, type: "processes"}) {
                                id
                            }
                        }
                    `, 
                    {
                        variables: {
                            code: process.toLowerCase()
                        }
                    }
                );

                const processResult = await processResponse.json();

                if (processResult.data.metaobjectByHandle === null) {
                    processCache.set(process, {
                        id: null
                    });
                    const processCreateResponse = await admin.graphql(
                        `#graphql
                            mutation createDefinition($metaobject: MetaobjectCreateInput!) {
                                metaobjectCreate(metaobject: $metaobject) {
                                    metaobject {
                                        handle
                                    }
                                    userErrors {
                                        field
                                        message
                                    }
                                }
                            }
                        `,
                        {
                            variables: {
                                metaobject: {
                                    type: "processes",
                                    handle: process,
                                    fields: [
                                        {
                                            key: "manufacturing_code",
                                            value: process
                                        },
                                        {
                                            key: "definition",
                                            value: "false"
                                        }
                                    ]
                                }
                            }
                        }
                    );

                    const processCreateResult = await processCreateResponse.json();
                    
                    if (processCreateResult.data.metaobjectCreate.userErrors.length > 0) {
                        processCreateResult.data.metaobjectCreate.userErrors.forEach((error: any) => ITErrors.push({
                            code: `${sku}-${process}`,
                            message: `Failed to create metaobject - [${error.field}] ${error.message}`
                        }))
                    }
                } else {
                    processArray.push(processResult.data.metaobjectByHandle.id);
                    processCache.set(process, {
                            id: processResult.data.metaobjectByHandle.id,
                    });
                }
            }
        }

        let orientation: string | null = null;
        if (sapProductData.orientation.toUpperCase() === "V") {
            orientation = "Vertical";
        } else if (sapProductData.orientation.toUpperCase() === "H") {
            orientation = "Horizontal";
        }

        let artist: string | null = null;
        if (artistCache.get(sapProductData.artist)) {
            if ((artistCache.get(sapProductData.artist) as Artist).id) {
                artist = (artistCache.get(sapProductData.artist) as Artist).id;
            }
        } else {
            const artistResponse = await admin.graphql(
                `#graphql
                    query getArtist($queryString: String!) {
                        metaobjects(type: "artist", first: 1, query: $queryString) {
                            edges {
                                node {
                                    id
                                }
                            }
                        }
                    }
                `,
                {
                    variables: {
                        queryString: `fields.altNames:"${sapProductData.artist}" OR fields.name:"${sapProductData.artist}"`
                    }
                }
            );

            const artistResult = await artistResponse.json();

            if (artistResult.data.metaobjects.edges.length === 0) {
                artistCache.set(sapProductData.artist, {
                    id: null
                });
                const artistCreateResponse = await admin.graphql(
                    `#graphql
                        mutation createDefinition($metaobject: MetaobjectCreateInput!) {
                            metaobjectCreate(metaobject: $metaobject) {
                                metaobject {
                                    handle
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `,
                    {
                        variables: {
                            metaobject: {
                                type: "artist",
                                handle: sapProductData.artist.replace(" ", "_"),
                                fields: [
                                    {
                                        key: "name",
                                        value: sapProductData.artist
                                    },
                                    {
                                        key: "definition",
                                        value: "false"
                                    }
                                ]
                            }
                        }
                    }
                );

                const artistCreateResult = await artistCreateResponse.json();
                    
                if (artistCreateResult.data.metaobjectCreate.userErrors.length > 0) {
                    artistCreateResult.data.metaobjectCreate.userErrors.forEach((error: any) => ITErrors.push({
                        code: `${sku}-${sapProductData.artist}`,
                        message: `Failed to create metaobject - [${error.field}] ${error.message}`
                    }))
                }
            } else {
                artist = artistResult.data.metaobjects.edges[0].node.id;
                artistCache.set(sapProductData.artist, {
                    id: artistResult.data.metaobjects.edges[0].node.id
                });
            }
        }

        if (shopifyProductData.status === "DRAFT") {
            productStatus.push({
                code: sku,
                message: "PRODUCT CREATED | Product initially created on Shopify Data site."
            });
        }

        const uploadVariants = []; //TODO Add Type
        for (const variant of sapProductData.variants) {
            let count = 1;
            let price: number | null = null;
            let compareAtPrice: number | null = null;
            let activeDate: Date | null = null;
            let nLADate: Date | null = null;
            let oWODate: Date | null = null;
            let vBPDate: Date | null = null;
            let tempOutDate: Date | null = null;
            let introDate: Date | null = null;
            let variantStatus = "DRAFT";
            let latestDate: string | null = null;

            const currentShopifyVariant = shopifyProductData.variants.filter(item => item.name && item.name.toUpperCase() === variant.name.toUpperCase());

            let override = false;
            let variantClearance = clearance ? clearance: false;

            if (currentShopifyVariant.length > 0) {
                activeDate = currentShopifyVariant[0].activeDate;
                introDate = currentShopifyVariant[0].introDate;
                tempOutDate = currentShopifyVariant[0].tempOutDate;
                nLADate = currentShopifyVariant[0].nlaDate;

                oWODate = currentShopifyVariant[0].owoDate;
                vBPDate = currentShopifyVariant[0].vbpDate;

                if (currentShopifyVariant[0].pricingOverride) {
                    override = true;
                    if (currentShopifyVariant[0].clearance) {
                        variantClearance = true;
                    }
                }

                if (currentShopifyVariant[0].status) {
                    variantStatus = currentShopifyVariant[0].status;
                }
            }

            if (variant.name.toUpperCase() === "D2C") {
                if (!override) {
                    price = d2cPrice;
                }
                count = d2cCount ? d2cCount : 1;
                compareAtPrice = d2cCompareAtPrice;
            } else if (variant.name.toUpperCase() === "B2B") {
                if (!override) {
                    price = b2bPrice;
                }
                count = b2bCount ? b2bCount : 1;
                compareAtPrice = b2bCompareAtPrice;
            }

            if (variant.date_code) {
                switch (variant.date_code) {
                    case "01":
                        activeDate = convertYYYYMMDDtoDate(variant.date);
                        break;
                    case "02":
                        nLADate = convertYYYYMMDDtoDate(variant.date);
                        break;
                    case "03":
                        oWODate = convertYYYYMMDDtoDate(variant.date);
                        break;
                    case "04":
                        vBPDate = convertYYYYMMDDtoDate(variant.date);
                        break;
                    case "05":
                        tempOutDate = convertYYYYMMDDtoDate(variant.date);
                        break;
                    case "06":
                        introDate = convertYYYYMMDDtoDate(variant.date);
                    default:
                        ITErrors.push({
                            code: `${sku}-${variant.name}`,
                            message: `Invalid date code passed from SAP (${variant.date_code})`
                        });
                }
            }

            latestDate = variant.date_code;

            const actionDate = findMostRecentPastDate(activeDate, introDate, nLADate, tempOutDate);

            if (actionDate != null) {
                if (actionDate === activeDate || actionDate === introDate) {
                    if (variantStatus !== "ACTIVE") {
                        productStatus.push({
                            code: `${sku}-${variant.name}`,
                            message: "PRODUCT ACTIVATED | Product is now for sale on qualifying sales channels."
                        });
                    }
                    variantStatus = "ACTIVE";
                } else if (actionDate === nLADate || actionDate === tempOutDate) {
                    if (variantStatus !== "ARCHIVED") {
                        productStatus.push({
                            code: `${sku}-${variant.name}`,
                            message: "PRODUCT NLA | Product is now delisted from all sales channels."
                        });
                    }
                    variantStatus = "ARCHIVED";
                }
            }

            const tempVariant: any = { //TODO type
                name: variant.name,
                sku: sku,
                inventory: variant.inventory,
                upc17: variant.upc17,
                count,
                override,
                variantStatus,
                variantClearance
            };

            if (price) {
                tempVariant.price = price;
            }

            if (compareAtPrice) {
                tempVariant.compareAtPrice = compareAtPrice;
            }

            if (activeDate) {
                tempVariant.activeDate = activeDate;
            }

            if (nLADate) {
                tempVariant.nLADate = nLADate;
            }

            if (oWODate) {
                tempVariant.oWODate = oWODate;
            }

            if (vBPDate) {
                tempVariant.vBPDate = vBPDate;
            }

            if (tempOutDate) {
                tempVariant.tempOutDate = tempOutDate;
            }

            if (introDate) {
                tempVariant.introDate = introDate;
            }

            if (latestDate) {
                tempVariant.latestDate = latestDate;
                }

            uploadVariants.push(tempVariant);
        }

        const channels: Channel[] = [];
        const formatedVariants: UploadVariant[] = [];
        for (const variant of uploadVariants) {
            channels.push({
                name: variant.name
            });

            const variantMetafields: Metafield[] = [
                {
                    namespace: "custom",
                    key: "count",
                    value: variant.count ? variant.count.toString() : "1"
                },
                {
                    namespace: "custom",
                    key: "status",
                    value: variant.variantStatus ? variant.variantStatus : "DRAFT"
                },
                {
                    namespace: "custom",
                    key: "latest_date",
                    value: variant.latestDate ? variant.latestDate : "00"
                },
                {
                    namespace: "custom",
                    key: "pricing_override",
                    value: variant.override ? variant.override.toString() : 'false'
                },
                {
                    namespace: "custom",
                    key: "clearance",
                    value: variant.variantClearance ? variant.variantClearance.toString() : 'false'
                }
            ];

            if (variant.activeDate) {
                variantMetafields.push({
                    namespace: "custom",
                    key: "active_date",
                    value: variant.activeDate.toISOString()
                });
            }
            if (variant.nLADate) {
                variantMetafields.push({
                    namespace: "custom",
                    key: "nla_date",
                    value: variant.nLADate.toISOString()
                });
            }
            if (variant.oWODate) {
                variantMetafields.push({
                    namespace: "custom",
                    key: "owo_date",
                    value: variant.oWODate.toISOString()
                });
            }
            if (variant.vBPDate) {
                variantMetafields.push({
                    namespace: "custom",
                    key: "vbp_date",
                    value: variant.vBPDate.toISOString()
                });
            }
            if (variant.tempOutDate) {
                variantMetafields.push({
                    namespace: "custom",
                    key: "temp_out_date",
                    value: variant.tempOutDate.toISOString()
                });
            }
            if (variant.introDate) {
                variantMetafields.push({
                    namespace: "custom",
                    key: "intro_date",
                    value: variant.introDate.toISOString()
                });
            }

            formatedVariants.push({
                optionValues: [{
                    optionName: "Channels",
                    name: variant.name
                }],
                sku: sku,
                inventoryQuantities: [{
                    locationId: locationId,
                    name: "available",
                    quantity: variant.inventory ? variant.inventory : 0
                }],
                compareAtPrice: variant.compareAtPrice,
                price: variant.price,
                barcode: variant.upc17,
                metafields: variantMetafields
            });
        }

        const productMetafields: Metafield[] = [];

        if (artist) {
            productMetafields.push({
                namespace: "custom",
                key: "artist",
                value: artist
            });
        }

        if (orientation) {
            productMetafields.push({
                namespace: "custom",
                key: "orientation",
                value: orientation
            });
        }
        
        if (processArray.length > 0) {
            productMetafields.push({
                namespace: "custom",
                key: "premium_features",
                value: JSON.stringify(processArray)
            });
        }

        if (occasionId) {
            productMetafields.push({
                namespace: "custom",
                key: "prefix",
                value: occasionId
            });
        }

        if (occasionName) {
            productMetafields.push({
                namespace: "custom",
                key: "occasion",
                value: occasionName
            });
        }

        if (assortmentId) {
            productMetafields.push({
                namespace: "custom",
                key: "assortment",
                value: assortmentId
            });
        }
            
        if (sizeId) {
            productMetafields.push({
                namespace: "custom",
                key: "size",
                value: sizeId
            });
        }

        if (prop65) {
            productMetafields.push({
                namespace: "custom",
                key: "prop65",
                value: prop65.toString()
            });
        }

        if (categoryId) {
            productMetafields.push({
                namespace: "custom",
                key: "category",
                value: categoryId
            });
        }

        if (sapProductData.verse_front.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_front",
                value: sapProductData.verse_front.text
            });
        }

        if (sapProductData.verse_inside_1.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_inside_1",
                value: sapProductData.verse_inside_1.text
            });
        }

        if (sapProductData.verse_inside_2.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_inside_2",
                value: sapProductData.verse_inside_2.text
            });
        }

        if (sapProductData.line) {
            productMetafields.push({
                namespace: "custom",
                key: "line",
                value: sapProductData.line
            });
        }

        if (sapProductData.title) {
            productMetafields.push({
                namespace: "custom",
                key: "sap_title",
                value: sapProductData.title
            });
        }

        if (sapProductData) {
            productMetafields.push({
                namespace: "custom",
                key: "product_feed_json",
                value: JSON.stringify(sapProductData)
            });
        }

        let product: UploadProduct = {
            productOptions: [{
                name: "Channels",
                values: channels
            }],
            variants: formatedVariants,
            metafields: productMetafields
        }
        
        if (taxonomyString) {
            product.category = `gid://shopify/TaxonomyCategory/${taxonomyString}`;
        }

        if (brandName) {
            product.vendor = brandName;
        }

        if (typeName) {
            product.productType = typeName;
        }

        const updateProductResponse = await admin.graphql(
            `#graphql
                mutation updateProduct($product: ProductSetInput!, $id: ID!) {
                    productSet(synchronous: true, input: $product, identifier: {id: $id}) {
                        product {
                            id
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                variables: {
                    id: shopifyProductData.id,
                    product: product
                }
            }
        );
        const updateProductResult = await updateProductResponse.json();
        
        if (updateProductResult.data.productSet.userErrors.length > 0) {
            updateProductResult.data.productSet.userErrors.forEach((error: any) => {
                ITErrors.push({
                    code: sku,
                    message: `PRODUCT UPDATE | (${error.field}) ${error.message}`
                });
            });
            continue;
        }
    }

    const getShopMetafieldsResponse = await admin.graphql(
        `#graphql
            query ShopMetafields {
                shop {
                    id
                    itErrors: metafield(namespace: "custom", key: "it_errors") {
                        value
                    }
                    productStatus: metafield(namespace: "custom", key: "product_status") {
                        value
                    }
                }
            }
        `,
        {

        }
    );

    console.log("=====================================================================================================");
    console.log("=====================================================================================================");
    console.log(ITErrors);
    console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log(productStatus);
    console.log("=====================================================================================================");
    console.log("=====================================================================================================");

    const getShopMetafieldsResult = await getShopMetafieldsResponse.json();

    const newITErrors = [...JSON.parse(getShopMetafieldsResult.data.shop.itErrors.value)];
    newITErrors.concat(ITErrors.map(error => `[${error.code}] ${error.message}`));

    const newProductStatus = [...JSON.parse(getShopMetafieldsResult.data.shop.productStatus.value)];
    newProductStatus.concat(productStatus.map(error => `[${error.code}] ${error.message}`));

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
                    },
                    {
                        ownerId: getShopMetafieldsResult.data.shop.id,
                        namespace: "custom",
                        key: "product_status",
                        value: JSON.stringify(newProductStatus)
                    }
                ]
            }
        }
    );

    const metafieldUpdateResult = await metafieldUpdateResponse.json();
    
    if (metafieldUpdateResult.data.metafieldsSet.userErrors.length > 0) {
        for (let i = 0; i < metafieldUpdateResult.data.metafieldsSet.userErrors; i++) {
            console.log(`[${metafieldUpdateResult.data.metafieldsSet.userErrors[i].field}] ${metafieldUpdateResult.data.metafieldsSet.userErrors[i].message}`)
        }
    }

    const deleteResponse = await admin.graphql(
        `#graphql
            mutation DeleteFeed($id: ID!) {
                metaobjectDelete(id: $id) {
                    userErrors {
                        field
                        message
                    }
                }
            }
        `,
        {
            variables: {
                id: feedID
            }
        }
    );

    const deleteResult = await deleteResponse.json();
    if (deleteResult.data.metaobjectDelete.userErrors.length > 0) {
        for (let i = 0; i < deleteResult.data.metaobjectDelete.userErrors; i++) {
            console.log(`[${deleteResult.data.metaobjectDelete.userErrors[i].field}] ${deleteResult.data.metaobjectDelete.userErrors[i].message}`)
        }
    }

    return new Response(
        `OK - Data Processing Complete`, 
        {
            status: 200,
            headers: { "Content-Type": "application/json" }
        }
    );
}

function findMostRecentPastDate(date1: Date | null, date2: Date | null, date3: Date | null, date4: Date | null): Date | null {
    const now = new Date();

    const dates: Date[] = [];

    if (date1) {
        dates.push(date1);
    }

    if (date2) {
        dates.push(date2);
    }

    if (date3) {
        dates.push(date3);
    }

    if (date4) {
        dates.push(date4)
    }

    const pastDates = dates.filter(date => date < now);
    if (pastDates.length === 0) {
        return null;
    }

    pastDates.sort((a, b) => b.getTime() - a.getTime());

    return pastDates[0];
}

function convertYYYYMMDDtoDate(yyyymmddString: string): Date {
    const year = parseInt(yyyymmddString.substring(0, 4), 10);
    const month = parseInt(yyyymmddString.substring(4, 6), 10) - 1;
    const day = parseInt(yyyymmddString.substring(6, 8), 10);

    return new Date(year, month, day);
}
