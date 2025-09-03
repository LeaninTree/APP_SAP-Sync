import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { AdminApiContextWithoutRest } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/admin/types";
import { Type, createUserContent, GoogleGenAI, GenerateContentResponse, PartListUnion } from "@google/genai"

interface Error {
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

interface Recipient {
    id: string;
    gendered: string;
    forKid: boolean;
    group: string;
    name: string;
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

interface Metafield {
    namespace: string;
    key: string;
    value: string | boolean;
}

interface AIMedia {
    name: string;
    text: string;
}

interface AIRecipient {
    id?: string;
    name?: String;
}

interface AIResponse {
    title: string;
    description: string;
    metaDescription: string;
    keywords: string[];
    altText: AIMedia[];
    nudityLevel: number;
    politicalLevel: number;
    sexualLevel: number;
    foulLanguageLevel: number;
    tone: string;
    recipient: AIRecipient | null;
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

interface SAPProduct {
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

interface ShopifyVariant {
    name: string;
    activeDate: Date | null;
    nlaDate: Date | null;
    owoDate: Date | null;
    vbpDate: Date | null;
    tempOutDate: Date | null;
    introDate: Date | null;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT";
    latestDate: string;
    pricingOverride: boolean;
    clearance: boolean;
}

interface ShopifyMedia {
    id: string;
    url: string;
    mimeType: string;
    alt: string;
}

interface ShopifyProduct {
    id: string;
    mediaCount: number;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT";
    createdAt: Date;
    variants: ShopifyVariant[];
    aiData: string;
    media: ShopifyMedia[];
    latestMediaUpdate: Date;
    recipient: string;
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

interface UploadMedia {
    id: string;
    alt: string;
}

export async function action({ request }: ActionFunctionArgs) {
    if (request.method === 'POST') {
        const { admin } = await authenticate.admin(request);
        const data = await request.json();

        const callStartTime = Date.now();
        const twentyFourHoursAgo = callStartTime - (24 * 60 * 60 * 1000);
        const call24HoursAgo = new Date(twentyFourHoursAgo);
        const imageDelayCalc = callStartTime - (168 * 60 * 60 * 1000); // One Week Delay
        const imageDelay = new Date(imageDelayCalc)

        const ITErrors: Error[] = [];
        const MissingDefintionErrors: Error[] = [];
        const ImageCountErrors: Error[] = [];
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
                            value: "elevationWarehouse"
                        }
                    }
                }
            }
        );
        const locationData = await locationResponse.json();
        const locationId: string = locationData.data.location.id;

        const defaultRecipientResponse = await admin.graphql(
            `#graphql
                query {
                    metaobjectByHandle(handle: {type: "recipient", handle: "for-ungendered-friend"}) {
                        id
                    }
                }
            `,
            {

            }
        );
        const defaultRecipientResult = await defaultRecipientResponse.json();
        const defaultRecipient: string = defaultRecipientResult.data.metaobjectByHandle.id;

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

            let productMissingDefinition = false;

            let brandName: String | null = null;
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
                    MissingDefintionErrors.push({
                        code: sapProductData.brand,
                        message: "BRAND | Missing definition."
                    });
                    productMissingDefinition = true;
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
                    MissingDefintionErrors.push({
                        code: sapProductData.product_category,
                        message: "CATEGORY | Missing definition."
                    });
                    productMissingDefinition = true;
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

                    if (categoryResult.data.metaobjectByHandle.type === null) {
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
                        MissingDefintionErrors.push({
                            code: sapProductData.product_category,
                            message: "CATEGORY | Missing product type."
                        });
                        productMissingDefinition = true;
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
                    MissingDefintionErrors.push({
                        code: sapProductData.prefix,
                        message: "OCCASION | Missing definition."
                    });
                    productMissingDefinition = true;
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
                        MissingDefintionErrors.push({
                            code: process,
                            message: "PROCESS | Missing definition."
                        });
                        productMissingDefinition = true;
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
                            queryString: `fields.name_mapping:"${sapProductData.artist}"`
                        }
                    }
                );

                const artistResult = await artistResponse.json();

                if (artistResult.data.metaobjects.edges.length === 0) {
                    artistCache.set(sapProductData.artist, {
                        id: null
                    });
                    MissingDefintionErrors.push({
                        code: sapProductData.artist,
                        message: "ARTIST | Missing definition."
                    });
                    productMissingDefinition = true;
                } else {
                    artist = artistResult.data.metaobjects.edges[0].node.id;
                    artistCache.set(sapProductData.artist, {
                        id: artistResult.data.metaobjects.edges[0].node.id
                    });
                }
            }

            if (productMissingDefinition) {
                continue;
            }
            
            if (imageCount) {
                if (shopifyProductData.mediaCount > imageCount) {
                    ImageCountErrors.push({
                        code: sku,
                        message: `IMAGES | This product has more images then expected.`
                    });
                } else if (shopifyProductData.mediaCount === 0 || shopifyProductData.mediaCount < imageCount) {
                    if (shopifyProductData.mediaCount === 0 || imageDelay > shopifyProductData.createdAt) {
                        ImageCountErrors.push({
                            code: sku,
                            message: `IMAGES | This product has less images then expected.`
                        });
                    }
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
                    } else if (currentShopifyVariant[0].clearance) {
                        variantClearance = true;
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

                switch (variant.date_code) {
                    case "01":
                        activeDate = new Date(variant.date);
                        break;
                    case "02":
                        nLADate = new Date(variant.date);
                        break;
                    case "03":
                        oWODate = new Date(variant.date);
                        break;
                    case "04":
                        vBPDate = new Date(variant.date);
                        break;
                    case "05":
                        tempOutDate = new Date(variant.date);
                        break;
                    case "06":
                        introDate = new Date(variant.date);
                    default:
                        ITErrors.push({
                            code: `${sku}-${variant.name}`,
                            message: `Invalid date code passed from SAP (${variant.date_code})`
                        });
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

                uploadVariants.push({
                    name: variant.name,
                    sku: sku,
                    inventory: variant.inventory,
                    count,
                    override,
                    price,
                    compareAtPrice,
                    activeDate,
                    nLADate,
                    oWODate,
                    vBPDate,
                    tempOutDate,
                    introDate,
                    variantStatus,
                    latestDate,
                    variantClearance,
                    upc17: variant.upc17
                });
            }

            let aiData = shopifyProductData.aiData; //TODO add type

            if (!aiData || (shopifyProductData.latestMediaUpdate > call24HoursAgo)) {
                const aiResponse = await runAIAnalysis(admin, shopifyProductData, sapProductData, typeName, occasionName);

                if (typeof aiResponse === "string") {
                    ITErrors.push({
                        code: sku,
                        message: aiResponse
                    });
                    continue;
                } else if ((aiResponse as Error).code) {
                    MissingDefintionErrors.push(aiResponse as Error);
                    continue;
                } else {
                    aiData = aiResponse;
                    productStatus.push({
                        code: sku,
                        message: "AI ANALYSIS | AI analysis has been completed."
                    });
                }
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
                        value: variant.override ? variant.override : false
                    },
                    {
                        namespace: "custom",
                        key: "clearance",
                        value: variant.variantClearance ? variant.variantClearance : false
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
            };

            const shopifyAiData = JSON.parse(shopifyProductData.aiData); //TODO add type 

            const tempTitle: string = aiData && aiData.title ? aiData.title : sapProductData.title;

            const tempTone: string = shopifyProductData.tone ? shopifyProductData.tone : "Belated";
            const tempLanguage: number = shopifyProductData.foulLanguage ? shopifyProductData.foulLanguage : 1;
            const tempSexual: number = shopifyProductData.sexualLevel ? shopifyProductData.sexualLevel : 1;
            const tempPolitical: number = shopifyProductData.politicalLevel ? shopifyProductData.politicalLevel : 1;
            const tempNudity: number = shopifyProductData.nudityLevel ? shopifyProductData.nudityLevel : 1;
            const tempRecipient: string = shopifyProductData.recipient ? shopifyProductData.recipient : defaultRecipient;

            let tags: string[] = [];
            let aiJsonWBannedTags = aiData;
            if (shopifyAiData) {
                const removedTags = shopifyAiData.keywords.filter((element: string) => !shopifyProductData.tags.includes(element));
                tags = aiData.keywords.filter((tag: string) => !removedTags.includes(tag));
                aiJsonWBannedTags.keywords = aiData.keywords.concat(removedTags);
            }

            const productMetafields: Metafield[] = [
                {
                    namespace: "custom",
                    key: "tone",
                    value: shopifyAiData && tempTone === shopifyAiData.tone ? aiData.tone : tempTone
                },
                {
                    namespace: "custom",
                    key: "recipient",
                    value: shopifyAiData && tempRecipient === shopifyAiData.recipient ? aiData.recipeint : tempRecipient
                },
                {
                    namespace: "custom",
                    key: "foulLanguage",
                    value: shopifyAiData && tempLanguage === shopifyAiData.foulLanguageLevel ? aiData.foulLanguageLevel.toString() : tempLanguage.toString()
                },
                {
                    namespace: "custom",
                    key: "sexualLevel",
                    value: shopifyAiData && tempSexual === shopifyAiData.sexualLevel ? aiData.sexualLevel.toString() : tempSexual.toString()
                },
                {
                    namespace: "custom",
                    key: "politicalLevel",
                    value: shopifyAiData && tempPolitical === shopifyAiData.politicalLevel ? shopifyAiData.politicalLevel.toString() : tempPolitical.toString()
                },
                {
                    namespace: "custom",
                    key: "nudityLevel",
                    value: shopifyAiData && tempNudity === shopifyAiData.nudityLevel ? shopifyAiData.nudityLevel.toString() : tempNudity.toString()
                },
                {
                    namespace: "custom",
                    key: "ai_json",
                    value: JSON.stringify(aiJsonWBannedTags)
                }
            ];

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
                        product: {
                            vendor: brandName,
                            status: "ACTIVE",
                            productType: typeName,
                            category: `gid://shopify/TaxonomyCategory/${taxonomyString}`,
                            productOptions: [{
                                name: "Channels",
                                values: channels
                            }],
                            variants: formatedVariants,
                            title: shopifyProductData.title === shopifyAiData.title ? tempTitle : shopifyProductData.title,
                            seo: {
                                title: shopifyProductData.title === shopifyAiData.title ? tempTitle : shopifyProductData.title,
                                description: shopifyProductData.metaDescription === shopifyAiData.metaDescription ? aiData.metaDescription : shopifyProductData.metaDescription
                            },
                            descriptionHtml: shopifyProductData.description === shopifyAiData.description ? aiData.description : shopifyProductData.description,
                            metafields: productMetafields
                        }
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
            
            tags = tags.slice(0, 249).concat(`${sapProductData.prefix.toUpperCase()}${sku}`);

            const updateProductTagsResponse = await admin.graphql(
                `#graphql
                    mutation addProductTags($id: ID!, $tags: [String!]!) {
                        tagsAdd(id: $id, tags: $tags) {
                            node {
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
                        tags: tags
                    }
                }
            );
            const updateProductTagsResult = await updateProductTagsResponse.json();
            
            if (updateProductTagsResult.data.tagsAdd.userErrors.length > 0) {
                updateProductTagsResult.data.tagsAdd.userErrors.forEach((error: any) => {
                    ITErrors.push({
                        code: sku,
                        message: `PRODUCT TAGS | (${error.field}) ${error.message}`
                    });
                });
                continue;
            }
            
            const mediaDefinition: UploadMedia[] = [];
            if (aiData && aiData.altText.length > 0) {
                for (let i = 0; i < shopifyProductData.media.length; i++) {
                    const segments = shopifyProductData.media[i].url.split('/');
                    let name = segments[segments.length - 1];
                    const paramsIndex = name.indexOf("?");
                    if (paramsIndex !== -1) {
                        name = name.substring(0, paramsIndex);
                    }
                    for (let j = 0; j < aiData.altText.length; j++) {
                        if (name === aiData.altText[j].name) {
                            if (shopifyAiData) {
                                for (let k = 0; k < shopifyAiData.altText.length; k++) {
                                    if (name === shopifyAiData.altText[k].name) {
                                        if (shopifyAiData.altText[k].text === shopifyProductData.media[i].alt) {
                                            mediaDefinition.push({
                                                id: shopifyProductData.media[i].id,
                                                alt: aiData.altText[j].text
                                            });
                                        }
                                        break;
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }
            
            if (mediaDefinition.length > 0) {
                const updateAltTextResponse = await admin.graphql(
                    `#graphql
                        mutation updateAltText($files: [FileUpdateInput!]!) {
                            fileUpdate(files: $files) {
                                files {
                                    id
                                }
                                userErrors {
                                    field
                                    message
                                    code
                                }
                            }
                        }                                    
                    `,
                    {
                        variables: {
                            files: mediaDefinition
                        }
                    }
                );
                const updateAltTextResult = await updateAltTextResponse.json();

                if (updateAltTextResult.data.fileUpdate.userErrors.length > 0) {
                    updateAltTextResult.data.fileUpdate.userErrors.forEach((error: any) => {
                        ITErrors.push({
                            code: sku,
                            message: `PRODUCT AltText | (${error.field}) ${error.message}`
                        });
                    });
                    continue;
                }
            }
            //TODO set customizable metafield, move it to 
        }

        const flowResponse = await admin.graphql(
            `#graphql
                mutation flowTrigger($payload: JSON) {
                    flowTriggerReceive(handle: "product-feed-status-update", payload: $payload) {
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                variables: {
                    payload: {
                        ITErrors: ITErrors.map(error => `[${error.code}] ${error.message}`),
                        ActionRequiredNotice: MissingDefintionErrors.concat(ImageCountErrors).map(error => `[${error.code}] ${error.message}`),
                        StatusUpdate: productStatus.map(error => `[${error.code}] ${error.message}`)
                    }
                }
            }
        );

        const flowResult = await flowResponse.json();

        if (flowResult.data.userErrors.length > 0) {
            for (let i = 0; i < flowResult.data.userErrors.length; i++) {
                console.log(`[${flowResult.data.userErrors[i].field}] ${flowResult.data.userErrors[i].message}`)
            }
        }

        return new Response(
            `OK - Data Processing Complete`, 
            {
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );
    } else {
        return new Response(
            `${request.method} not allowed. Please use POST.`, 
            {
                status: 405,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};


async function getShopifyProductData(admin: AdminApiContextWithoutRest, sku: String) {
    const productResponse = await admin.graphql(
        `#graphql
            query GetProductBySku($query: String!, $sortKey: ProductMediaSortKeys!) {
                products(first: 1, query: $query) {
                    nodes {
                        id
                        title
                        seo {
                            description
                        }
                        description
                        tags
                        mediaCount {
                            count
                        }
                        createdAt
                        status
                        variants(first: 250) {
                            nodes {
                                sku
                                title
                                activeDate: metafield(namespace: "custom", key: "active_date") {
                                    value
                                }
                                nlaDate: metafield(namespace: "custom", key: "nla_date") {
                                    value
                                }
                                owoDate: metafield(namespace: "custom", key: "owo_date") {
                                    value
                                }
                                vbpDate: metafield(namespace: "custom", key: "vbp_date") {
                                    value
                                }
                                tempOutDate: metafield(namespace: "custom", key: "temp_out_date") {
                                    value
                                }
                                introDate: metafield(namespace: "custom", key: "intro_date") {
                                    value
                                }
                                status: metafield(namespace: "custom", key: "status") {
                                    value
                                }
                                latestDate: metafield(namespace: "custom", key: "latest_date") {
                                    value
                                }
                                pricingOverride: metafield(namespace: "custom", key: "pricing_override") {
                                    value
                                }
                                clearance: metafield(namespace: "custom", key: "clearance") {
                                    value
                                }
                            }
                        }
                        media(first: 250, sortKey: $sortKey) {
                            nodes {
                                id
                                ... on MediaImage {
                                    createdAt
                                    alt
                                    image {
                                        url
                                    }
                                    mimeType
                                }
                            }
                        }
                        aiData: metafield(namespace: "custom", key: "ai_json") {
                            value
                        }
                        tone: metafield(namespace: "custom", key: "tone") {
                            value
                        }
                        foulLanguage: metafield(namespace: "custom", key: "foulLanguage") {
                            value
                        }
                        sexualLevel: metafield(namespace: "custom", key: "sexuallevel") {
                            value
                        }
                        politicalLevel: metafield(namespace: "custom", key: "politicallevel") {
                            value
                        }
                        nudityLevel: metafield(namespace: "custom", key: "nuditylevel") {
                            value
                        }
                        recipient: metafield(namespace: "custom", key: "recipient") {
                            value
                        }
                    }
                }
            }
        `,
        {
            variables: {
                query: `sku:${sku}`,
                sortKey: "CREATED_AT"
            }
        }
    );

    const productResult = await productResponse.json();

    if (productResult.data.products.nodes.length === 0) {
        return null;
    }

    let latestMediaUpdate = new Date(0);
    const media: ShopifyMedia[] = [];
    for (let i = 0; i < productResult.data.products.nodes[0].media.nodes.length; i++) {
        if ( productResult.data.products.nodes[0].media.nodes[i].mediaImage) {
            const updateDate = productResult.data.products.nodes[0].media.nodes[i].mediaImage.createdAt;
            if (latestMediaUpdate < updateDate) {
                latestMediaUpdate = updateDate;
            }

            media.push({
                id: productResult.data.products.nodes[0].media.nodes[i].id,
                url: productResult.data.products.nodes[0].media.nodes[i].image.url,
                mimeType: productResult.data.products.nodes[0].media.nodes[i].mimeType,
                alt: productResult.data.products.nodes[0].media.nodes[i].alt
            });
        }
    }

    const variants: ShopifyVariant[] = [];
    for (let i = 0; i < productResult.data.products.nodes[0].variants.nodes.length; i++) {
        variants.push({
            name: productResult.data.products.nodes[0].variants.nodes[i].title,
            activeDate: productResult.data.products.nodes[0].variants.nodes[i].activeDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].activeDate.value) : null,
            nlaDate: productResult.data.products.nodes[0].variants.nodes[i].nlaDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].nlaDate.value) : null,
            owoDate: productResult.data.products.nodes[0].variants.nodes[i].owoDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].owoDate.value) : null,
            vbpDate: productResult.data.products.nodes[0].variants.nodes[i].vbpDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].vbpDate.value) : null,
            tempOutDate: productResult.data.products.nodes[0].variants.nodes[i].tempOutDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].tempOutDate.value) : null,
            introDate: productResult.data.products.nodes[0].variants.nodes[i].introDate ? new Date(productResult.data.products.nodes[0].variants.nodes[i].introDate.value) : null,
            status: productResult.data.products.nodes[0].variants.nodes[i].status ? productResult.data.products.nodes[0].variants.nodes[i].status.value : null,
            latestDate: productResult.data.products.nodes[0].variants.nodes[i].latestDate ? productResult.data.products.nodes[0].variants.nodes[i].latestDate.value : null,
            pricingOverride: productResult.data.products.nodes[0].variants.nodes[i].pricingOverride ? productResult.data.products.nodes[0].variants.nodes[i].pricingOverride.value : null,
            clearance: productResult.data.products.nodes[0].variants.nodes[i].clearance ? productResult.data.products.nodes[0].variants.nodes[i].value: null
        });
    }

    return {
        id: productResult.data.products.nodes[0].id,
        mediaCount: productResult.data.products.nodes[0].mediaCount.count,
        status: productResult.data.products.nodes[0].status,
        createdAt: new Date(productResult.data.products.nodes[0].createdAt),
        variants: variants,
        aiData: productResult.data.products.nodes[0].aiData ? productResult.data.products.nodes[0].aiData.value : null,
        media: media,
        latestMediaUpdate,
        title: productResult.data.products.nodes[0].title,
        metaDescription: productResult.data.products.nodes[0].seo.description,
        description: productResult.data.products.nodes[0].description,
        tags: productResult.data.products.nodes[0].tags,
        tone: productResult.data.products.nodes[0].tone ? productResult.data.products.nodes[0].tone.value : null,
        foulLanguage: productResult.data.products.nodes[0].foulLanguage ? productResult.data.products.nodes[0].foulLanguage.value : null,
        sexualLevel: productResult.data.products.nodes[0].sexualLevel ? productResult.data.products.nodes[0].sexualLevel.value : null,
        politicalLevel: productResult.data.products.nodes[0].politicalLevel ? productResult.data.products.nodes[0].politicalLevel.value : null,
        nudityLevel: productResult.data.products.nodes[0].nudityLevel ? productResult.data.products.nodes[0].nudityLevel.value : null,
        recipient: productResult.data.products.nodes[0].recipient ? productResult.data.products.nodes[0].recipient.value : null
    }
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

async function runAIAnalysis(admin: AdminApiContextWithoutRest, shopifyProductData: ShopifyProduct, sapProductData: SAPProduct, typeName: string | null, occasionName: string | null): Promise<AIResponse | String | Error> {
    const ai = new GoogleGenAI({});

    const strippedURLs = shopifyProductData.media.map(media => {
        const segments = media.url.split('/');
        const finalSegment = segments[segments.length - 1];
        const paramsIndex = finalSegment.indexOf("?");
        if (paramsIndex !== -1) {
            return finalSegment.substring(0, paramsIndex);
        }
        return finalSegment;
    });

    let toneList: String[] = [];
    const toneListResponse = await admin.graphql(
        `#graphql
            query ToneMetafield($ownerType: MetafieldOwnerType!) {
                metafieldDefinition(identifier: {ownerType: $ownerType, namespace: "custom", key: "tone"}) {
                    validations {
                        name
                        value
                    }
                }
            }
        `,
        {
            variables: {
                ownerType: "PRODUCT"
            }
        }
    );
    const toneListResult = await toneListResponse.json();
    if (toneListResult.data.metafieldDefinition.validations.length > 0 ) {
        for (let i = 0; i < toneListResult.data.metafieldDefinition.validations.length; i++) {
            if (toneListResult.data.metafieldDefinition.validations[i].name === "choices") {
                toneList = toneListResult.data.metafieldDefinition.validations[i].value;
            }
        }
    }

    const recipientList: Recipient[] = [];
    const genderedList: String[] = [];
    const groupList: String[] = [];
    const recipientListResponse = await admin.graphql(
        `#graphql
            query RecipientMetaobject($type: String!) {
                metaobjectDefinitionByType(type: $type) {
                    metaobjects(first: 250) {
                        edges {
                            node {
                                id
                                gendered: field(key: "gendered") {
                                    value
                                }
                                group: field(key: "group") {
                                    value
                                }
                                forKid: field(key: "for_kid") {
                                    value
                                }
                                name: field(key: "name") {
                                    value
                                }
                                displayName: field(key: "display_name") {
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
                type: "recipient"
            }
        }
    );
    const recipientListResult = await recipientListResponse.json();
    if (recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges.length > 0) {
        for (let i = 0; i < recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges.length; i++) {
            if (!genderedList.includes(recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.gendered.value)) {
                genderedList.push(recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.gendered.value);
            }
            if (!groupList.includes(recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.group.value)) {
                groupList.push(recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.group.value);
            }
            recipientList.push({
                id: recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.id,
                gendered: recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.gendered ? recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.gendered.value : null,
                group: recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.group ? recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.group.value : null,
                forKid: recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.forKid === "True" ? true : false,
                name: recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.displayName && recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.displayName.value ? recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.displayName.value : recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.name && recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.name.value ? recipientListResult.data.metaobjectDefinitionByType.metaobjects.edges[i].node.name.value : null
            });
        }
    }

    const typePrompt = `The images provided are product images${typeName === null ? "" : ` for a ${typeName}`}.`;
    const recipientPrompt = `Would the recipient of this product best be descibed as a child. From the following list, which gender best describes the recipient: ${JSON.stringify(genderedList)}. From the following list, which group best describes the recipient: ${JSON.stringify(groupList)}.`;
    const tonePrompt = `From the following list, pick which tone best describes the product: ${JSON.stringify(toneList)}.`;
    const titlePrompt = `Provide a product title that is SEO optimized based on the title "${sapProductData.title}"${occasionName === null ? "" : `, adding in ${occasionName}`}, clean up the title to make it human readable.`;
    const desciptionPrompt = `Create a ecommerce focused description for the product.`;
    const metaDescriptionPrompt = `Create SEO optimized meta-description for the product that is between 140 and 160 characters.`;
    const keywordsPrompt = `Generate a list of at least 50 but no more then 90, keywords for the product optimized for SEO to allow the product to be searchable.`;
    const altTextPrompt = `Create SEO optimized alt text, no longer then 130 characters, for the following image(s), using the filename of the image for the name field: ${strippedURLs}`;
    const crudePrompt = `On a scale of 1 to 5, with 5 being the crudest rate the nudity, political divisiveness, sexual innuendo and foul language levels.`;

    const content: PartListUnion = [{text: `${typePrompt} ${recipientPrompt} ${tonePrompt} ${titlePrompt} ${desciptionPrompt} ${metaDescriptionPrompt} ${keywordsPrompt} ${altTextPrompt} ${crudePrompt}`}];

    for (let i = 0; i < shopifyProductData.media.length; i++) {
            const response = await fetch(shopifyProductData.media[i].url);
            const imageArrayBuffer = await response.arrayBuffer();
            const base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');
            content.push({
                inlineData: {
                    mimeType: shopifyProductData.media[i].mimeType,
                    data: base64ImageData
                }
        });                            
    }

    const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            createUserContent(content)
        ],
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING
                    },
                    description: {
                        type: Type.STRING
                    },
                    metaDescription: {
                        type: Type.STRING
                    },
                    keywords: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING
                        }
                    },
                    altText: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: {
                                    type: Type.STRING
                                },
                                text: {
                                    type: Type.STRING
                                }
                            }
                        }
                    },
                    nudityLevel: {
                        type: Type.INTEGER
                    },
                    politicalLevel: {
                        type: Type.INTEGER
                    },
                    sexualLevel: {
                        type: Type.INTEGER
                    },
                    foulLanguageLevel: {
                        type: Type.INTEGER
                    },
                    tone: {
                        type: Type.STRING
                    },
                    recipient: {
                        type: Type.OBJECT,
                        properties: {
                            gender: {
                                type: Type.STRING
                            },
                            group: {
                                type: Type.STRING
                            },
                            kid: {
                                type: Type.BOOLEAN
                            }
                        }
                    }
                }
            }
        }
    }).catch((error) => {
        return `AI ANALYSIS | (${error.status}) ${error.name} - ${error.message}`;
    });

    if (typeof aiResponse === "string") {
        return aiResponse;
    }

    let aiJson = null; //TODO add type

    if (aiResponse && aiResponse.text) {
        aiJson = JSON.parse(aiResponse.text);
    }

    let recipient: AIRecipient = {};
    if (aiJson && aiJson.recipient && aiJson.recipient.gender && aiJson.recipient.kid != null && aiJson.recipient.group) {
        const filteredRecipientList = recipientList.filter(recipient => recipient.forKid === aiJson.recipient.kid && recipient.gendered === aiJson.recipient.gender && recipient.group === aiJson.recipient.group); 
        if (filteredRecipientList.length > 0) {
            recipient.id = filteredRecipientList[0].id;
            recipient.name = filteredRecipientList[0].name;
        } else {
            return {
                code: `${aiJson.recipient.gender} - ${aiJson.recipient.group}${aiJson.recipient.kid ? " - For Kid" : ""}`,
                message: `RECIPIENT | Missing definition.` 
            }
        }
    }

    return {
        title: aiJson.title,
        description: aiJson.description,
        metaDescription: aiJson.metaDescription,
        keywords: aiJson.keywords,
        altText: aiJson.altText,
        nudityLevel: aiJson.nudityLevel,
        politicalLevel: aiJson.politicalLevel,
        sexualLevel: aiJson.sexualLevel,
        foulLanguageLevel: aiJson.foulLanguageLevel,
        tone: aiJson.tone,
        recipient: recipient.id ? recipient : null
    };
}