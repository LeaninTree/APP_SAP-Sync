import { type ActionFunctionArgs } from "@remix-run/node";

import { authenticate } from "app/shopify.server";
import { AdminApiContextWithoutRest } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/admin/types";

import { Type, createUserContent, GoogleGenAI } from "@google/genai"

interface FormatedVariant {
    name: String;
    activeDate: Date | null;
    nlaDate: Date | null;
    owoDate: Date | null;
    vbpDate: Date | null;
    tempOutDate: Date | null;
    introDate: Date | null;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT";
    latestDate: String;
    pricingOverride: Boolean;
}

interface ImageData {
    id: String;
    url: string;
    mimeType: string;
    alt: string;
}

interface FormatedProduct {
    id: String;
    sku: String;
    latestImageUpdate: Date | null;
    hasAIData: boolean;
    mediaCount: Number;
    createdAt: Date;
    variants: FormatedVariant[];
    imageURLs: ImageData[];
    previousAI: any;
    title: string;
    description: string;
    metaDescription: string;
    tone: string;
    recipient: string;
    language: string;
    political: string;
    sexual: string;
    nudity: string;
    tags: string[];
}

interface Error {
    code: String;
    message: String;
}

interface Recipient {
    id: String;
    gendered: String;
    forKid: Boolean;
    group: String;
    name: String;
}

interface UploadProduct {
    title?: string;
    descriptionHtml?: string;
    vendor: string;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT";
    productType: string;
    category: string;
    productOptions: {
        name: string;
        values: any[];
    }[];
    variants: any[];
    metafields: {
        namespace: string;
        key: string;
        value: string;
    }[];
    seo: {
        description?: string;
        title?: string;
    }
    tags?: string[];
}

interface UploadMedia {
    id: String;
    alt: String;
}

export const action = async ({ request }: ActionFunctionArgs ) => {
    const {admin, payload} = await authenticate.flow(request);

    const forceAI = payload.properties.forceAI;
    const callStartTime = Date.now();
    const currentDate =  new Date();
    const twentyFourHoursAgo = callStartTime - (24 * 60 * 60 * 1000);
    const call24HoursAgo = new Date(twentyFourHoursAgo);
    const imageDelayCalc = callStartTime - (168 * 60 * 60 * 1000); // One Week Delay
    const imageDelay = new Date(imageDelayCalc)

    const productList: FormatedProduct[] = [];

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

    const initialProductResponse = await admin.graphql(
        `#graphql
            query initialProducts($count: Int!) {
                products(first: $count, query: "status:ACTIVE,DRAFT") {
                    edges {
                        node {
                            id
                            createdAt
                            variants(first: 5) {
                                edges {
                                    node {
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
                                    }
                                }
                            }
                            mediaCount {
                                count
                            }
                            media(first: 250) {
                                edges {
                                    node {
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
                            }
                            aiJson: metafield(namespace: "custom", key: "ai_json") {
                                value
                            }
                            title
                            description
                            seo {
                                description
                            }
                            tags
                            tone: metafield(namespace: "custom", key: "tone") {
                                value
                            }
                            recipient: metafield(namespace: "custom", key: "recipient") {
                                value
                            }
                            language: metafield(namespace: "custom", key: "foulLanguage") {
                                value
                            }
                            political: metafield(namespace: "custom", key: "politicallevel") {
                                value
                            }
                            sexual: metafield(namespace: "custom", key: "sexuallevel") {
                                value
                            }
                            nudity: metafield(namespace: "custom", key: "nuditylevel") {
                                value
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                    }
                }
            }
        `,
        {
            variables: {
                count: 100
            }
        }
    );

    const initialProductData = await initialProductResponse.json(); 

    let moreProducts = initialProductData.data.products.pageInfo.hasNextPage;
    let lastCursor = initialProductData.data.products.edges[initialProductData.data.products.edges.length - 1].cursor;

    initialProductData.data.products.edges.forEach((product: any) => {
        let latestUpdate = new Date(0);

        const mediaList: ImageData[] = [];
        
        product.node.media.edges.forEach((media: any) => {
            if (Object.keys(media.node).length != 0) {
                const updatedDate = new Date(media.node.createdAt);
                if (latestUpdate < updatedDate) {
                    latestUpdate = updatedDate;
                }
                mediaList.push({
                    id: media.node.id,
                    url: media.node.image.url,
                    mimeType: media.node.mimeType,
                    alt: media.node.alt
                });
            }
        });
        
        const variantList: FormatedVariant[] = [];
        
        product.node.variants.edges.forEach((variant: any) => {
            variantList.push({
                name: variant.node.title,
                activeDate: variant.node.activeDate ? new Date(variant.node.activeDate.value) : null,
                nlaDate: variant.node.nlaDate ? new Date(variant.node.nlaDate.value) : null,
                owoDate: variant.node.owoDate ? new Date(variant.node.owoDate.value) : null,
                vbpDate: variant.node.vbpDate ? new Date(variant.node.vbpDate.value) : null,
                tempOutDate: variant.node.tempOutDate ? new Date(variant.node.tempOutDate.value) : null,
                introDate: variant.node.introDate ? new Date(variant.node.introDate.value) : null,
                status: variant.node.status ? variant.node.status.value : null,
                latestDate: variant.node.latestDate ? variant.node.latestDate.value : null,
                pricingOverride: variant.node.pricingOverride ? variant.node.pricingOverride.value : null
            });
        });

        productList.push({
            id: product.node.id,
            sku: product.node.variants.edges[0].node.sku,
            latestImageUpdate: latestUpdate,
            hasAIData: product.node.aiJson ? true : false,
            mediaCount: product.node.mediaCount.count,
            createdAt: product.node.createdAt,
            variants: variantList,
            imageURLs: mediaList,
            previousAI: JSON.parse(product.node.aiJson),
            title: product.node.title,
            description: product.node.description,
            metaDescription: product.node.seo.description,
            tone: product.node.tone ? product.node.tone.value : null,
            recipient: product.node.recipient ? product.node.recipient.value : null,
            language: product.node.language ? product.node.language.value : null,
            political: product.node.political ? product.node.political.value : null,
            sexual: product.node.sexual ? product.node.sexual.value : null,
            nudity: product.node.nudity ? product.node.nudity.value : null,
            tags: product.node.tags
        })
    });

    while (moreProducts) {
        const moreProductResponse = await admin.graphql(
            `#graphql
                query getMoreProducts($cursor: String!) {
                    products(first: 100, query: "status:ACTIVE,DRAFT", after: $cursor) {
                        edges {
                            node {
                                id
                                createdAt
                                variants(first: 5) {
                                    edges {
                                        node {
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
                                        }
                                    }
                                }
                                mediaCount {
                                    count
                                }
                                media(first: 250) {
                                    edges {
                                        node {
                                            id
                                            mediaContentType
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
                                }
                                aiJson: metafield(namespace: "custom", key: "ai_json") {
                                    value
                                }
                                title
                                description
                                seo {
                                    description 
                                }
                                tags
                                tone: metafield(namespace: "custom", key: "tone") {
                                    value
                                }
                                recipient: metafield(namespace: "custom", key: "recipient") {
                                    value
                                }
                                language: metafield(namespace: "custom", key: "foulLanguage") {
                                    value
                                }
                                political: metafield(namespace: "custom", key: "politicallevel") {
                                    value
                                }
                                sexual: metafield(namespace: "custom", key: "sexuallevel") {
                                    value
                                }
                                nudity: metafield(namespace: "custom", key: "nuditylevel") {
                                    value
                                }
                            }
                            cursor
                        }
                        pageInfo {
                            hasNextPage
                        }
                    }
                }
            `,
            {
                variables: {
                    cursor: lastCursor
                }
            }
        );

        const moreProductsData = await moreProductResponse.json();

        moreProducts = moreProductsData.data.products.pageInfo.hasNextPage;
        lastCursor = moreProductsData.data.products.edges[-1].cursor;

        moreProductsData.data.products.edges.forEach((product: any) => {
            let latestUpdate = new Date(0);

            const mediaList: ImageData[] = [];
            
            product.node.media.edges.forEach((media: any) => {
                if (media.node.mediaImage) {
                    const updatedDate = new Date(media.node.mediaImage.createdAt);
                    if (latestUpdate < updatedDate) {
                        latestUpdate = updatedDate;
                    }
                    mediaList.push({
                        id: media.node.id,
                        url: media.node.image.url,
                        mimeType: media.node.mimeType,
                        alt: media.node.alt
                    });
                }
            });

            const variantList: FormatedVariant[] = [];
        
            product.node.variants.edges.forEach((variant: any) => {
                variantList.push({
                    name: variant.node.title,
                    activeDate: variant.node.activeDate ? new Date(variant.node.activeDate.value) : null,
                    nlaDate: variant.node.nlaDate ? new Date(variant.node.nlaDate.value) : null,
                    owoDate: variant.node.owoDate ? new Date(variant.node.owoDate.value) : null,
                    vbpDate: variant.node.vbpDate ? new Date(variant.node.vbpDate.value) : null,
                    tempOutDate: variant.node.tempOutDate ? new Date(variant.node.tempOutDate.value) : null,
                    introDate: variant.node.introDate ? new Date(variant.node.introDate.value) : null,
                    status: variant.node.status ? variant.node.status.value : null,
                    latestDate: variant.node.latestDate ? variant.node.latestDate.value : null,
                    pricingOverride: variant.node.pricingOverride ? variant.node.pricingOverride.value : null
                });
            });

            productList.push({
                id: product.node.id,
                sku: product.node.variants.edges[0].node.sku,
                latestImageUpdate: latestUpdate,
                hasAIData: product.node.aiJson.value ? true : false,
                mediaCount: product.node.mediaCount.count,
                createdAt: product.node.createdAt,
                variants: variantList,
                imageURLs: mediaList,
                previousAI: JSON.parse(product.node.aiJson),
                title: product.node.title,
                description: product.node.description,
                metaDescription: product.node.seo.description,
                tone: product.node.tone ? product.node.tone.value : null,
                recipient: product.node.recipient ? product.node.recipient.value : null,
                language: product.node.language ? product.node.language.value : null,
                political: product.node.political ? product.node.political.value : null,
                sexual: product.node.sexual ? product.node.sexual.value : null,
                nudity: product.node.nudity ? product.node.nudity.value : null,
                tags: product.node.tags
            })
        });
    }

    const responseData = gatherData(admin, productList, forceAI, currentDate, call24HoursAgo, imageDelay, locationData.data.location.id).then(result => {
        const definitionErrors: Error[] = [];

        result.brandCache.forEach((obj: any, key: string) => {
            if (obj.needsAttention) {
                definitionErrors.push({
                    code: key,
                    message: `BRAND | There is no current definition for the given code.`
                });
            }
        });

        result.catalogCache.forEach((obj: any, key: string) => {
            if (obj.needsAttention) {
                definitionErrors.push({
                    code: key,
                    message: `CATEGORY | There is no current definition for the given code.`
                });
            }
        });

        result.occasionCache.forEach((obj: any, key: string) => {
            if (obj.needsAttention) {
                definitionErrors.push({
                    code: key,
                    message: `OCCASION | There is no current definition for the given code.`
                });
            }
        });

        result.processCache.forEach((obj: any, key: string) => {
            if (obj.needsAttention) {
                definitionErrors.push({
                    code: key,
                    message: "PROCESS | There is no current definition for the given code."
                });
            }
        });

        result.artistCache.forEach((obj: any, key: string) => {
            if (obj.needsAttention) {
                definitionErrors.push({
                    code: key,
                    message: "ARTIST | There is no current definition for the given artist."
                });
            }
        });

        return {
            itAlerts: result.productErrors,
            attentionRequired: definitionErrors.concat(result.imageAlerts),
            changeAlerts: result.aiRuns.concat(result.productsCreated, result.productsStatus)
        }
    });

    const resultData = await responseData

    console.log(resultData);

    //TODO FIX

    return new Response(JSON.stringify({return_value: resultData}));
};

async function gatherData(admin: AdminApiContextWithoutRest, productList: FormatedProduct[], forceAI: Boolean, callStartTime: Date, call24HoursAgo: Date, imageDelay: Date, locationId: String) {

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
                })
            }
        }
    
        const brandCache = new Map();
        const catalogCache = new Map();
        const occasionCache = new Map();
        const processCache = new Map();
        const artistCache = new Map();
        const productErrors: Error[] = [];
        const aiRuns: Error[] = [];
        const imageAlerts: Error[] = [];
        const productsCreated: Error[] = [];
        const productsStatus: Error[] = [];

        for (const product of productList) {
            const sapResponse = await fetch(`https://endpointtesting.free.beeceptor.com/?sku=${product.sku}`); //TODO Update URL
            const sapData = await sapResponse.json();

            if (sapData.error.code != 200) {
                productErrors.push({
                    code: product.sku,
                    message: `SAP ENDPOINT | (${sapData.error.code}) ${sapData.error.message}`
                });
            } else {
                let hasError = false;

                let brandName = "UNDEFINED";
                let categoryId = null;
                let assortmentId = null;
                let sizeId = null;
                let b2bCount = null;
                let d2cCount = null;
                let typeName = "UNDEFINED";
                let prop65 = null;
                let imageCount = null;
                let d2cPrice = null;
                let b2bPrice = null;
                let d2cCompareAtPrice = null;
                let b2bCompareAtPrice = null;
                let categoryClearance = null;
                let taxonomyString = null;
                let occasionName = "UNDEFINED";
                let occasionId = null;
                const processArray: String[] = [];
                let orientation = null;
                let artist = null;
                const variants: any[] = [];

                if (brandCache.get(sapData.brand)) {
                    brandName = brandCache.get(sapData.brand).name;
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
                                brand: sapData.brand.toLowerCase()
                            }
                        }
                    );

                    const brandsResult = await brandResponse.json();

                    if (brandsResult.data.metaobjectByHandle === null) {
                        brandName = sapData.brand;
                        hasError = true;
                        brandCache.set(sapData.brand, {name: sapData.brand, needsAttention: true})
                    } else {
                        brandName = brandsResult.data.metaobjectByHandle.field.value;
                        brandCache.set(sapData.brand, {name: brandsResult.data.metaobjectByHandle.field.value, needsAttention: false})
                    }
                }

                if (catalogCache.get(sapData.product_category)) {
                    categoryId = catalogCache.get(sapData.product_category).categoryId;
                    assortmentId = catalogCache.get(sapData.product_category).assortmentId;
                    sizeId = catalogCache.get(sapData.product_category).sizeId;
                    b2bCount = catalogCache.get(sapData.product_category).b2bCount;
                    d2cCount = catalogCache.get(sapData.product_category).d2cCount;
                    typeName = catalogCache.get(sapData.product_category).typeName;
                    prop65 = catalogCache.get(sapData.product_category).prop65;
                    imageCount = catalogCache.get(sapData.product_category).imageCount;
                    taxonomyString = catalogCache.get(sapData.product_category).taxonomyString;
                    d2cPrice = catalogCache.get(sapData.product_category).d2cPrice;
                    b2bPrice = catalogCache.get(sapData.product_category).b2bPrice;
                    d2cCompareAtPrice = catalogCache.get(sapData.product_category).d2cCompareAtPrice;
                    b2bCompareAtPrice = catalogCache.get(sapData.product_category).b2bCompareAtPrice;
                    categoryClearance = catalogCache.get(sapData.product_category).categoryClearance;
                } else {
                    const catalogResponse = await admin.graphql(
                        `#graphql
                            query getCategories($name: String!) {
                                metaobjectByHandle(handle: {handle: $name, type: "category"}) {
                                    id
                                    type: field(key: "type") {
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
                                name: sapData.product_category.toLowerCase()
                            }
                        }
                    );

                    const categoryResult = await catalogResponse.json();

                    if (categoryResult.data.metaobjectByHandle === null) {
                        categoryId = sapData.product_category;
                        hasError = true;
                        catalogCache.set(sapData.product_category, {
                            categoryId: sapData.product_category,
                            b2bCount: null,
                            assortmentId: null,
                            sizeId: null,
                            d2cCount: null,
                            typeName: null,
                            prop65: null,
                            imageCount: null,
                            taxonomyString: null,
                            needsAttention: true,
                            d2cPrice: null,
                            b2bPrice: null,
                            d2cCompareAtPrice: null,
                            b2bCompareAtPrice: null,
                            categoryClearance: null
                        });
                    } else {
                        categoryId = categoryResult.data.metaobjectByHandle.id;
                        b2bCount = categoryResult.data.metaobjectByHandle.b2bCount.value;
                        imageCount = categoryResult.data.metaobjectByHandle.imageCount.value;
                        assortmentId = categoryResult.data.metaobjectByHandle.assortment.value;
                        sizeId = categoryResult.data.metaobjectByHandle.size.value;

                        d2cPrice = categoryResult.data.metaobjectByHandle.d2cPrice.value;
                        b2bPrice = categoryResult.data.metaobjectByHandle.b2bPrice.value;
                        d2cCompareAtPrice = categoryResult.data.metaobjectByHandle.d2cCompareAtPrice.value;
                        b2bCompareAtPrice = categoryResult.data.metaobjectByHandle.b2bCompareAtPrice.value;
                        categoryClearance = categoryResult.data.metaobjectByHandle.clearance.value;

                        let d2cCountTemp = null;

                        if (categoryResult.data.metaobjectByHandle.assortment.value != null) {
                            d2cCount = categoryResult.data.metaobjectByHandle.assortment.reference.d2cCount;
                            d2cCountTemp = categoryResult.data.metaobjectByHandle.assortment.reference.d2cCount;
                        }

                        if (categoryResult.data.metaobjectByHandle.type === null) {
                            catalogCache.set(sapData.product_category, {
                                categoryId: categoryResult.data.metaobjectByHandle.id,
                                b2bCount: categoryResult.data.metaobjectByHandle.b2bCount.value,
                                assortmentId: categoryResult.data.metaobjectByHandle.assortment.value,
                                sizeId: categoryResult.data.metaobjectByHandle.size.value,
                                d2cCount: d2cCountTemp,
                                typeName: null,
                                prop65: null,
                                taxonomyString: null,
                                needsAttention: true,
                                imageCount: categoryResult.data.metaobjectByHandle.imageCount.value,
                                d2cPrice: categoryResult.data.metaobjectByHandle.d2cPrice.value,
                                b2bPrice: categoryResult.data.metaobjectByHandle.b2bPrice.value,
                                d2cCompareAtPrice: categoryResult.data.metaobjectByHandle.d2cCompareAtPrice.value,
                                b2bCompareAtPrice: categoryResult.data.metaobjectByHandle.b2bCompareAtPrice.value,
                                categoryClearance: categoryResult.data.metaobjectByHandle.clearance.value
                            });
                            hasError = true;
                        } else {
                            typeName = categoryResult.data.metaobjectByHandle.type.reference.name.value;
                            prop65 = categoryResult.data.metaobjectByHandle.type.reference.prop65.value;
                            taxonomyString = categoryResult.data.metaobjectByHandle.type.reference.taxonomy.value;

                            catalogCache.set(sapData.product_category, {
                                categoryId: categoryResult.data.metaobjectByHandle.id,
                                b2bCount: categoryResult.data.metaobjectByHandle.b2bCount.value,
                                assortmentId: categoryResult.data.metaobjectByHandle.assortment.value,
                                sizeId: categoryResult.data.metaobjectByHandle.size.value,
                                d2cCount: d2cCountTemp,
                                typeName: categoryResult.data.metaobjectByHandle.type.reference.name.value,
                                prop65: categoryResult.data.metaobjectByHandle.type.reference.prop65.value,
                                taxonomyString: categoryResult.data.metaobjectByHandle.type.reference.taxonomy.value,
                                needsAttention: false,
                                imageCount: categoryResult.data.metaobjectByHandle.imageCount.value,
                                d2cPrice: categoryResult.data.metaobjectByHandle.d2cPrice.value,
                                b2bPrice: categoryResult.data.metaobjectByHandle.b2bPrice.value,
                                d2cCompareAtPrice: categoryResult.data.metaobjectByHandle.d2cCompareAtPrice.value,
                                b2bCompareAtPrice: categoryResult.data.metaobjectByHandle.b2bCompareAtPrice.value,
                                categoryClearance: categoryResult.data.metaobjectByHandle.clearance.value
                            });
                        }
                    }
                }

                if (occasionCache.get(sapData.prefix)) {
                    occasionName = occasionCache.get(sapData.prefix).name;
                    occasionId = occasionCache.get(sapData.prefix).id;
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
                                code: sapData.prefix.toLowerCase()
                            }
                        }
                    );

                    const occasionResult = await occasionResponse.json();

                    if (occasionResult.data.metaobjectByHandle === null) {
                        hasError = true;
                        occasionName = sapData.prefix;
                        occasionCache.set(sapData.prefix, {
                            name: sapData.prefix,
                            id: null,
                            needsAttention: true
                        });
                    } else {
                        occasionId = occasionResult.data.metaobjectByHandle.id;
                        occasionName = occasionResult.data.metaobjectByHandle.field.value;
                        occasionCache.set(sapData.prefix, {
                            name: occasionResult.data.metaobjectByHandle.field.value,
                            id: occasionResult.data.metaobjectByHandle.id,
                            needsAttention: false
                        });
                    }
                }

                for (const process of sapData.processes) {
                    if (processCache.get(process)) {
                        processArray.push(processCache.get(process).id);
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
                            hasError = true;
                            processCache.set(process, {
                                id: null,
                                needsAttention: true
                            })
                        } else {
                            processArray.push(processResult.data.metaobjectByHandle.id);
                            processCache.set(process, {
                                id: processResult.data.metaobjectByHandle.id,
                                needsAttention: false
                            });
                        }
                    }
                }

                if (sapData.orientation.toUpperCase() === "V") {
                    orientation = "Vertical";
                } else if (sapData.orientation.toUpperCase() === "H") {
                    orientation = "Horizontal";
                }

                if (artistCache.get(sapData.artist)) {
                    artist = artistCache.get(sapData.artist).id;
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
                                queryString: `fields.name_mapping:"${sapData.artist}"`
                            }
                        }
                    );

                    const artistResult = await artistResponse.json();

                    if (artistResult.data.metaobjects.edges.length === 0) {
                        hasError = true;
                        artist = sapData.artist;
                        artistCache.set(sapData.artist, {
                            id: null,
                            needsAttention: true
                        });
                    } else {
                        artist = artistResult.data.metaobjects.edges[0].node.id;
                        artistCache.set(sapData.artist, {
                            id: artistResult.data.metaobjects.edges[0].node.id,
                            needsAttention: false
                        });
                    }
                }

                for (const variant of sapData.variants) {
                    let count = null;
                    let price = null;
                    let compareAtPrice = null;
                    let activeDate = null;
                    let nLADate = null;
                    let oWODate = null;
                    let vBPDate = null;
                    let tempOutDate = null;
                    let introDate = null;
                    let variantStatus = null;
                    let latestDate = null;

                    if (variant.name.toUpperCase() === "D2C") {

                        count = d2cCount;
                        price = d2cPrice;
                        compareAtPrice = d2cCompareAtPrice;
                    } else if (variant.name.toUpperCase() === "B2B") {
                        count = b2bCount;
                        price = b2bPrice;
                        compareAtPrice = b2bCompareAtPrice;
                    }

                    const currentVariant = product.variants.filter(item => item.name && item.name.toUpperCase() === variant.name.toUpperCase());

                    let override = false;

                    if (currentVariant.length > 0) {
                        if (currentVariant[0].latestDate && (currentVariant[0].latestDate === "01" && currentVariant[0].activeDate && callStartTime >= currentVariant[0].activeDate) || (currentVariant[0].latestDate === "06" && currentVariant[0].introDate && callStartTime >= currentVariant[0].introDate)) {
                            variantStatus = "ACTIVE";
                        }

                        if (currentVariant[0].latestDate && (currentVariant[0].latestDate === "02" && currentVariant[0].nlaDate && callStartTime >= currentVariant[0].nlaDate) || (currentVariant[0].latestDate === "05" && currentVariant[0].tempOutDate && callStartTime >= currentVariant[0].tempOutDate)) {
                            variantStatus = "ARCHIVED";
                        }

                        if (currentVariant[0].pricingOverride) {
                            override = true;
                        }
                    }

                    latestDate = variant.date_code;

                    if (variant.date_code === "01") {
                        activeDate = variant.date;
                        if (callStartTime >= variant.date_code) {
                            variantStatus = "ACTIVE";
                        }
                    } else if (variant.date_code === "02") {
                        nLADate = variant.date;
                        if (callStartTime >= variant.date_code) {
                            variantStatus = "ARCHIVED";
                        }
                    } else if (variant.date_code === "03") {
                        oWODate = variant.date;
                    } else if (variant.date_code === "04") {
                        vBPDate = variant.date;
                    } else if (variant.date_code === "05") {
                        tempOutDate = variant.date;
                        if (callStartTime >= variant.date_code) {
                            variantStatus = "ARCHIVED";
                        }
                    } else if (variant.date_code === "06") {
                        introDate = variant.date;
                        if (callStartTime >= variant.date_code) {
                            variantStatus = "ACTIVE";
                        }
                    }

                    let variantStatusValue = null;

                    if (product.variants.length > 0) {
                        for (let i = 0; i < product.variants.length; i++) {
                            if (product.variants[i].name === variant.name.toUpperCase()) {
                                variantStatusValue = product.variants[i].status;
                            }
                        }
                    }

                    if (variantStatus && variantStatusValue && variantStatus != variantStatusValue) {                        
                        productsStatus.push({
                            code: `${product.sku}-${variant.name.toUpperCase()}`,
                            message: `PRODUCT ${variantStatus} | The product's status has been updated.`
                        });
                    }

                    let tempVariant: any = {
                        name: variant.name,
                        sku: variant.sku,
                        inventory: variant.inventory,
                        count,
                        activeDate,
                        nLADate,
                        oWODate,
                        vBPDate,
                        tempOutDate,
                        introDate,
                        status: variantStatus,
                        latestDate: latestDate,
                    };

                    if (!override) {
                        tempVariant.price = price;
                        tempVariant.compare_at_price = compareAtPrice;
                        tempVariant.clearance = categoryClearance;
                    }

                    variants.push(tempVariant);
                }

                if (imageCount) {
                    if (product.mediaCount > imageCount) {
                        imageAlerts.push({
                            code: product.sku,
                            message: `TOO MANY IMAGES | Check the category the product is assigned to and make sure the definition is correct.`
                        });
                    } else if (product.mediaCount === 0 || product.mediaCount < imageCount) {
                        if (product.mediaCount === 0 || imageDelay > product.createdAt) {
                            imageAlerts.push({
                                code: product.sku,
                                message: `MISSING IMAGES | Use provided image tools to pin point and fix the images.`
                            });
                        }
                    }
                }

                if (call24HoursAgo < product.createdAt) {
                    productsCreated.push({
                        code: product.sku,
                        message: "PRODUCT CREATED | Product initially created on Shopify Data site."
                    });
                }

                if (!hasError) {
                    let aiError = false;
                    let aiResponse = null;

                    if (forceAI || (product.latestImageUpdate && product.latestImageUpdate > call24HoursAgo) || !product.hasAIData) {

                        const ai = new GoogleGenAI({});

                        const strippedURLs = product.imageURLs.map(urlObj => {
                            const segments = urlObj.url.split('/');
                            const finalSegment = segments[segments.length - 1];
                            const paramsIndex = finalSegment.indexOf("?");

                            if (paramsIndex !== -1) {
                                return finalSegment.substring(0, paramsIndex);
                            }

                            return finalSegment;
                        });

                        const typePrompt = `The images provided are product images${typeName === "UNDEFINED" ? "" : ` for a ${typeName}`}.`;
                        const recipientPrompt = `Would the recipient of this product best be descibed as a child. From the following list, which gender best describes the recipient: ${JSON.stringify(genderedList)}. From the following list, which group best describes the recipient: ${JSON.stringify(groupList)}.`;
                        const tonePrompt = `From the following list, pick which tone best describes the product: ${JSON.stringify(toneList)}.`;
                        const titlePrompt = `Provide a product title that is SEO optimized based on the title "${sapData.title}"${occasionName === "UNDEFINED" ? "" : `, adding in ${occasionName}`}, clean up the title to make it human readable.`;
                        const desciptionPrompt = `Create a ecommerce focused description for the product.`;
                        const metaDescriptionPrompt = `Create SEO optimized meta-description for the product that is between 140 and 160 characters.`;
                        const keywordsPrompt = `Generate a list of at least 50 but no more then 90, keywords for the product optimized for SEO to allow the product to be searchable.`;
                        const altTextPrompt = `Create SEO optimized alt text, no longer then 130 characters, for the following image(s), using the filename of the image for the name field: ${strippedURLs}`;
                        const crudePrompt = `On a scale of 1 to 5, with 5 being the crudest rate the nudity, political divisiveness, sexual innuendo and foul language levels.`;

                        const content: any[] = [{text: `${typePrompt} ${recipientPrompt} ${tonePrompt} ${titlePrompt} ${desciptionPrompt} ${metaDescriptionPrompt} ${keywordsPrompt} ${altTextPrompt} ${crudePrompt}`}];

                        for (let i = 0; i < product.imageURLs.length; i++) {
                            const response = await fetch(product.imageURLs[i].url);
                            const imageArrayBuffer = await response.arrayBuffer();
                            const base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');
                            content.push({
                                inlineData: {
                                    mimeType: product.imageURLs[i].mimeType,
                                    data: base64ImageData
                                }
                            });                            
                        }

                        aiResponse = await ai.models.generateContent({
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
                                    },
                                }
                            }
                        }).catch((error) => {
                            aiError = true;
                            productErrors.push({
                                code: product.sku,
                                message: `AI ANALYSIS | (${error.status}) ${error.name} - ${error.message}`
                            });
                        });
                    }

                    if (!aiError) {

                        let aiJson = null;

                        if (aiResponse && aiResponse.text) {
                            aiJson = JSON.parse(aiResponse.text);
                        }

                        const channels: any[] = [];
                        const formatedVariants: any[] = [];

                        for (const variant of variants) {
                            channels.push({
                                name: variant.name
                            })

                            const variantMetafields = [];

                            if (variant.count) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "count",
                                    value: variant.count
                                });
                            }

                            if (variant.activeDate) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "active_date",
                                    value: variant.activeDate
                                });
                            }

                            if (variant.nLADate) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "nla_date",
                                    value: variant.nLADate
                                });
                            }

                            if (variant.oWODate) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "owo_date",
                                    value: variant.oWODate
                                });
                            }

                            if (variant.vBPDate) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "vbp_date",
                                    value: variant.vBPDate
                                });
                            }

                            if (variant.tempOutDate) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "temp_out_date",
                                    value: variant.tempOutDate
                                });
                            }

                            if (variant.introDate) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "intro_date",
                                    value: variant.introDate
                                });
                            }

                            if (variant.status) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "status",
                                    value: variant.status
                                });
                            }

                            if (variant.latestDate) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "latest_date",
                                    value: variant.latestDate
                                });
                            }

                            if (variant.clearance) {
                                variantMetafields.push({
                                    namespace: "custom",
                                    key: "pricing_override",
                                    value: variant.clearance
                                });
                            }

                            let tempFormatedVariant: any = {
                                optionValues: [
                                    {
                                        optionName: "Channels",
                                        name: variant.name
                                    }
                                ],
                                sku: variant.sku,
                                metafields: variantMetafields,
                                inventoryQuantities: [{
                                    locationId: locationId, 
                                    name: "available",
                                    quantity: variant.inventory
                                }]
                            };

                            if (variant.compare_at_price) {
                                tempFormatedVariant.compareAtPrice = JSON.parse(variant.compare_at_price).amount;
                            }

                            if (variant.price) {
                                tempFormatedVariant.price = JSON.parse(variant.price).amount;
                            }

                            if (sapData.upc17) {
                                tempFormatedVariant.barcode = sapData.upc17;
                            }

                            formatedVariants.push(tempFormatedVariant);
                        }

                        const productMetafields = [];

                        let recipientAIID = null;
                        let recipientAIName = null;

                        if (aiJson && aiJson.recipient && aiJson.recipient.gender && aiJson.recipient.kid != null && aiJson.recipient.group) {
                            const filteredRecipientList = recipientList.filter(recipient => recipient.forKid === aiJson.recipient.kid && recipient.gendered === aiJson.recipient.gender && recipient.group === aiJson.recipient.group); 

                            if (filteredRecipientList.length > 0) {
                                recipientAIID = filteredRecipientList[0].id;
                                recipientAIName = filteredRecipientList[0].name;
                            } else {
                                imageAlerts.push({
                                    code: `${aiJson.recipient.gender} - ${aiJson.recipient.group}${aiJson.recipient.kid ? " - For Kid" : ""}`,
                                    message: `RECIPIENT | There is no current definition for the given hierarchy.`
                                })
                            }
                        }

                        let tempTitle = sapData.title;

                        if (aiJson && aiJson.title) {
                            if (recipientAIName) {
                                tempTitle =`${aiJson.title} ${recipientAIName}`;
                            } else {
                                tempTitle = aiJson.title
                            }
                            aiJson.title = tempTitle;
                        }

                        aiJson.recipientID = recipientAIID;

                        let tags = [];

                        let aiJsonWBannedTags = aiJson;

                        if (product.previousAI) {
                            const removedTags = product.previousAI.keywords.filter((element: string) => !product.tags.includes(element));

                            tags = aiJson.keywords.filter((tag: string) => !removedTags.includes(tag));

                            aiJsonWBannedTags.keywords = aiJson.keywords.concat(removedTags);
                        } 

                        if (aiJson) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "ai_json",
                                value: JSON.stringify(aiJsonWBannedTags)
                            });
                        }

                        if (recipientAIID) {
                            if (product.previousAI) {
                                if (product.previousAI.recipientID === product.recipient) {
                                    productMetafields.push({
                                        namespace: "custom",
                                        key: "recipient",
                                        value: recipientAIID
                                    });
                                }
                            } else {
                                productMetafields.push({
                                    namespace: "custom",
                                    key: "recipient",
                                    value: recipientAIID
                                });
                            }
                        }

                        if (aiJson && aiJson.nudityLevel) {
                            if (product.previousAI) {
                                if (product.previousAI.nudityLevel == product.nudity) {
                                    productMetafields.push({
                                        namespace: "custom",
                                        key: "nudityLevel",
                                        value: aiJson.nudityLevel.toString()
                                    });
                                }
                            } else {
                                productMetafields.push({
                                    namespace: "custom",
                                    key: "nudityLevel",
                                    value: aiJson.nudityLevel.toString()
                                });
                            }
                        }

                        if (aiJson && aiJson.politicalLevel) {
                            if (product.previousAI) {
                                if (product.previousAI.politicalLevel == product.political) {
                                    productMetafields.push({
                                        namespace: "custom",
                                        key: "politicalLevel",
                                        value: aiJson.politicalLevel.toString()
                                    });
                                }
                            } else {
                                productMetafields.push({
                                    namespace: "custom",
                                    key: "politicalLevel",
                                    value: aiJson.politicalLevel.toString()
                                });
                            }
                        }

                        if (aiJson && aiJson.sexualLevel) {
                            if (product.previousAI) {
                                if (product.previousAI.sexualLevel == product.sexual) {
                                    productMetafields.push({
                                        namespace: "custom",
                                        key: "sexualLevel",
                                        value: aiJson.sexualLevel.toString()
                                    });
                                }
                            } else {
                                productMetafields.push({
                                    namespace: "custom",
                                    key: "sexualLevel",
                                    value: aiJson.sexualLevel.toString()
                                });
                            }
                        }

                        if (aiJson && aiJson.foulLanguageLevel) {
                            if (product.previousAI) {
                                if (product.previousAI.foulLanguageLevel == product.language) {
                                    productMetafields.push({
                                        namespace: "custom",
                                        key: "foulLanguage",
                                        value: aiJson.foulLanguageLevel.toString()
                                    });
                                }
                            } else {
                                productMetafields.push({
                                    namespace: "custom",
                                    key: "foulLanguage",
                                    value: aiJson.foulLanguageLevel.toString()
                                });
                            }
                        }

                        if (aiJson && aiJson.tone) {
                            if (product.previousAI) {
                                if (product.previousAI.tone === product.tone) {
                                    productMetafields.push({
                                        namespace: "custom",
                                        key: "tone",
                                        value: aiJson.tone
                                    });
                                }
                            } else {
                                productMetafields.push({
                                    namespace: "custom",
                                    key: "tone",
                                    value: aiJson.tone
                                });
                            }
                        }

                        if (sapData) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "product_feed_json",
                                value: JSON.stringify(sapData)
                            });
                        }

                        if (sapData.title) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "sap_title",
                                value: sapData.title
                            });
                        }

                        if (categoryId) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "category",
                                value: categoryId
                            });
                        }

                        if (prop65) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "prop65",
                                value: prop65.toString()
                            });
                        }

                        if (sizeId) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "size",
                                value: sizeId
                            });
                        }

                        if (assortmentId) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "assortment",
                                value: assortmentId
                            });
                        }
                        
                        if (occasionName != "UNDEFINED") {
                            productMetafields.push({
                                namespace: "custom",
                                key: "occasion",
                                value: occasionName
                            });
                        }
                        
                        if (occasionId) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "prefix",
                                value: occasionId
                            });
                        }

                        if (processArray.length > 0) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "premium_features",
                                value: JSON.stringify(processArray)
                            });
                        }

                        if (sapData.line) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "line",
                                value: sapData.line
                            });
                        }
                        
                        if (sapData.verse_front.text) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "verse_front",
                                value: sapData.verse_front.text
                            });
                        }

                        if (sapData.verse_inside_1.text) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "verse_inside_1",
                                value: sapData.verse_inside_1.text
                            });
                        }

                        if (sapData.verse_inside_2.text) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "verse_inside_2",
                                value: sapData.verse_inside_2.text
                            });
                        }

                        if (orientation) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "orientation",
                                value: orientation
                            });
                        }

                        if (artist) {
                            productMetafields.push({
                                namespace: "custom",
                                key: "artist",
                                value: artist
                            });
                        }

                        let productDefinition: UploadProduct = {
                            vendor: brandName,
                            status: "ACTIVE",
                            productType: typeName,
                            category: `gid://shopify/TaxonomyCategory/${taxonomyString}`,
                            productOptions: [{
                                name: "Channels",
                                values: channels
                            }],
                            variants: formatedVariants,
                            metafields: productMetafields,
                            seo: {}
                        }

                        if (aiJson && aiJson.title) {
                            if (product.previousAI) {
                                if (product.previousAI.title === product.title) {
                                    productDefinition.title = tempTitle;
                                    productDefinition.seo.title = tempTitle;
                                }
                            } else {
                                productDefinition.title = tempTitle;
                                productDefinition.seo.title = tempTitle;
                            }
                        }

                        if (aiJson && aiJson.description) {
                            if (product.previousAI) {
                                if (product.previousAI.description === product.description) {
                                    productDefinition.descriptionHtml = aiJson.description;
                                }
                            } else {
                                productDefinition.descriptionHtml = aiJson.description; 
                            }
                        }

                        if (aiJson && aiJson.metaDescription) {
                            if (product.previousAI) {
                                if (product.previousAI.metaDescription === product.metaDescription) {
                                    productDefinition.seo.description = aiJson.metaDescription;
                                }
                            } else {
                                productDefinition.seo.description = aiJson.metaDescription;
                            }
                        }

                        const mediaDefinition: UploadMedia[] = [];

                        if (aiJson && aiJson.altText.length > 0) {
                            for (let i = 0; i < product.imageURLs.length; i++) {
                                const segments = product.imageURLs[i].url.split('/');
                                let name = segments[segments.length - 1];

                                const paramsIndex = name.indexOf("?");
                                if (paramsIndex !== -1) {
                                    name = name.substring(0, paramsIndex);
                                }

                                for (let j = 0; j < aiJson.altText.length; j++) {
                                    if (name === aiJson.altText[j].name) {
                                        if (product.previousAI) {
                                            for (let k = 0; k < product.previousAI.altText.length; k++) {
                                                if (name === product.previousAI.altText[k].name) {
                                                    if (product.previousAI.altText[k].text === product.imageURLs[i].alt) {
                                                        mediaDefinition.push({
                                                            id: product.imageURLs[i].id,
                                                            alt: aiJson.altText[j].text
                                                        });
                                                    }
                                                    break;
                                                }
                                            }
                                        } else {
                                            mediaDefinition.push({
                                                id: product.imageURLs[i].id,
                                                alt: aiJson.altText[j].text
                                            });
                                        }
                                        break;
                                    }
                                }
                            }
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
                                    product: productDefinition,
                                    id: product.id
                                }
                            }
                        );

                        const updateProductResult = await updateProductResponse.json();

                        if (updateProductResult.data.productSet.userErrors.length > 0) {
                            updateProductResult.data.productSet.userErrors.forEach((error: any) => {
                                productErrors.push({
                                    code: product.sku,
                                    message: `PRODUCT UPDATE | (${error.field}) ${error.message}`
                                })
                            })
                        } else {
                            if (aiJson && aiJson.keywords.length > 0) {                              
                                tags = tags.concat(`${sapData.prefix.toUpperCase()}${product.sku}`);
                                
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
                                            id: product.id,
                                            tags: tags
                                        }
                                    }
                                );

                                const updateProductTagsResult = await updateProductTagsResponse.json();

                                if (updateProductTagsResult.data.tagsAdd.userErrors.length > 0) {
                                    updateProductTagsResult.data.tagsAdd.userErrors.forEach((error: any) => {
                                        productErrors.push({
                                            code: product.sku,
                                            message: `PRODUCT TAGS | (${error.field}) ${error.message}`
                                        })
                                    });
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
                                        productErrors.push({
                                            code: product.sku,
                                            message: `PRODUCT AltText | (${error.field}) ${error.message}`
                                        })
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        return({
            brandCache: brandCache,
            catalogCache: catalogCache,
            occasionCache: occasionCache,
            processCache: processCache,
            artistCache: artistCache,
            productErrors: productErrors,
            aiRuns: aiRuns,
            imageAlerts: imageAlerts,
            productsCreated: productsCreated,
            productsStatus: productsStatus
        });
}

//TODO Set customizable metafield
//TODO Category specific metagields