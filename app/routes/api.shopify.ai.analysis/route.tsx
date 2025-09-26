import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { runAIAnalysis } from "./aiAnalysis";
import { Error, Metafield } from "../webhooks.sap.feed/sapData.handler";

interface Media {
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

interface UploadMedia {
    id: string;
    alt: string;
}

export async function action({ request }: ActionFunctionArgs) {
    const { admin, payload} = await authenticate.flow(request);
    const queue: string[] = JSON.parse(payload.properties.queue);
    let toneList: string[] = [];
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

    const genderedList: string[] = [];
    const groupList: string[] = [];
    const recipientListResponse = await admin.graphql(
        `#graphql
            query RecipientMetaobject($type: String!) {
                metaobjectDefinitionByType(type: $type) {
                    fieldDefinitions {
                        key
                        validations {
                            name
                            value
                        }
                    }
                    metaobjects(first: 1) {
                        nodes {
                            id
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
    for (let i = 0; i < recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions.length; i++) {
        if (recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions[i].key == "gendered") {
            for (let j = 0; j < recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions[i].validations.length; j++) {
                if (recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions[i].validations[j].name === "choices") {
                    const list = JSON.parse(recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions[i].validations[j].value);
                    for (const item in list) {
                        genderedList.push(list[item]);
                    }
                    break;
                }
            }
        } else if (recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions[i].key == "group") {
            for (let j = 0; j < recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions[i].validations.length; j++) {
                if (recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions[i].validations[j].name === "choices") {
                    const list = JSON.parse(recipientListResult.data.metaobjectDefinitionByType.fieldDefinitions[i].validations[j].value);
                    for (const item in list) {
                        groupList.push(list[item]);
                    }
                    break;
                }
            }
        }
    }

    const ITErrors: Error[] = [];
    const productStatus: Error[] = [];

    for (let i = 0; i < queue.length; i++) {
        const productResponse = await admin.graphql(
            `#graphql
                query GetProduct($id: ID!) {
                    product(id: $id) {
                        productType
                        title
                        description
                        seo {
                            description
                        }
                        occasion: metafield(namespace: "custom", key: "occasion") {
                            value
                        }
                        sapTitle: metafield(namespace: "custom", key: "sap_title") {
                            value
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
                        prefix: metafield(namespace: "custom", key: "prefix") {
                            value
                        }
                        tags
                        variants(first: 1) {
                            nodes {
                                sku
                            }
                        }
                        media(first: 250) {
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
                    }
                }
            `,
            {
                variables: {
                    id: queue[i]
                }
            }
        );

        const productResult = await productResponse.json();

        const media: Media[] = [];
        for (let i = 0; i < productResult.data.product.media.nodes.length; i++) {
            if ( productResult.data.product.media.nodes[i]) {
                media.push({
                    id: productResult.data.product.media.nodes[i].id,
                    url: productResult.data.product.media.nodes[i].image.url,
                    mimeType: productResult.data.product.media.nodes[i].mimeType,
                    alt: productResult.data.product.media.nodes[i].alt
                });

            }
        };

        const product: ShopifyProduct = {
            id: queue[i],
            sku: productResult.data.product.variants.nodes[0].sku,
            productType:  productResult.data.product.productType,
            occasion: productResult.data.product.occasion.value,
            sapTitle: productResult.data.product.sapTitle.value,
            media: media
        };

        const aiResponse = await runAIAnalysis(admin, product, toneList, genderedList, groupList);
        console.log(aiResponse);
        if (JSON.parse(aiResponse).error) {
            ITErrors.push({
                        code: product.sku,
                        message: aiResponse
                    });
        } else {
            const aiData = JSON.parse(aiResponse);
            productStatus.push({
                code: product.sku,
                message: "AI ANALYSIS | AI analysis has been completed."
            });

            const shopifyAiData = JSON.parse(productResult.data.product.aiData.value);

            console.log("=====================================================================================================");
            console.log("=====================================================================================================");
            console.log(aiData);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log(shopifyAiData);
            console.log("=====================================================================================================");
            console.log("=====================================================================================================");

            /*const tempTitle: string = aiData && aiData.title ? aiData.title : product.sapTitle;

            const tempTone: string = productResult.data.product.tone ? productResult.data.product.tone.value : toneList[0];
            const tempLanguage: number = productResult.data.product.foulLanguage ? productResult.data.product.foulLanguage.value : 1;
            const tempSexual: number = productResult.data.product.sexualLevel ? productResult.data.product.sexualLevel.value : 1;
            const tempPolitical: number = productResult.data.product.politicalLevel ? productResult.data.product.politicalLevel.value : 1;
            const tempNudity: number = productResult.data.product.nudityLevel ? productResult.data.product.nudityLevel.value : 1;
            const tempRecipient: string = productResult.data.product.recipient ? productResult.data.product.recipient.value : recipientListResult.data.metaobjectDefinitionByType.metaobjects.nodes[0].id;

            let tags: string[] = [];
            let aiJsonWBannedTags = aiData;
            if (shopifyAiData) {
                const removedTags = shopifyAiData.keywords.filter((element: string) => productResult.data.product.tags.includes(element));
                tags = aiData.keywords.filter((tag: string) => !removedTags.includes(tag));
                aiJsonWBannedTags.keywords = aiData.keywords.concat(removedTags);
            }

            const responsePrefix = await admin.graphql(
                `#graphql
                    query GetPrefix($id: ID!) {
                        metaobject(id: $id) {
                            handle
                        }
                    }
                `,
                {
                    variables: {
                        id: productResult.data.product.prefix.value
                    }
                }
            );

            const resultPrefix = await responsePrefix.json();

            tags = tags.slice(0, 249).concat(`${resultPrefix.data.metaobject.handle.toUpperCase()}${product.sku}`);

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

            const mediaDefinition: UploadMedia[] = [];
            if (aiData && aiData.altText.length > 0) {
                for (let i = 0; i < productResult.data.product.media.length; i++) {
                    const segments = productResult.data.product.media[i].url.split('/');
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
                                        if (shopifyAiData.altText[k].text === productResult.data.product.media[i].alt) {
                                            mediaDefinition.push({
                                                id: productResult.data.product.media[i].id,
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

            const updateProductResponse = await admin.graphql(
                `#graphql
                    mutation UpdateProduct($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
                        productUpdate(product: $product, media: $media) {
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
                        product: {
                            id: product.id,
                            title: !shopifyAiData || productResult.data.product.title === shopifyAiData.title ? tempTitle : productResult.data.product.title,
                            descriptionHtml: !shopifyAiData || productResult.data.product.description === shopifyAiData.description ? shopifyAiData.description : productResult.data.product.description,
                            seo: {
                                title: !shopifyAiData || productResult.data.product.title === shopifyAiData.title ? tempTitle : productResult.data.product.title,
                                description: !shopifyAiData || productResult.data.product.seo.description === shopifyAiData.metaDescription ? shopifyAiData.metaDescription : productResult.data.product.seo.description
                            },
                            status: 'ACTIVE',
                            tags: tags,
                            metafields: productMetafields
                        },
                        media: mediaDefinition
                    }
                }
            );

            const updateProductResult = await updateProductResponse.json();
            
            if (updateProductResult.data.productUpdate.userErrors.length > 0) {
                for (let i = 0; i < updateProductResult.data.productUpdate.userErrors.length; i++) {
                    ITErrors.push({
                        code: product.sku,
                        message: "PRODUCT UPDATE ERROR"
                    })
                }
            }*/
        }
    }

    //Check backlog for product

    /*const getShopMetafieldsResponse = await admin.graphql(
        `#graphql
            query ShopMetafields {
                shop {
                    id
                    itErrors: metafield(namespace: "custom", key: "it_errors") {
                        value
                    }
                    productStatus: metafield(namespace: "custom", key: "product_status") {
                        value
                    },
                    oldQueue: metafield(namespace: "custom", key: "ai_queue") {
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
    newITErrors.concat(ITErrors.map(error => `[${error.code}] ${error.message}`));

    const newProductStatus = [...JSON.parse(getShopMetafieldsResult.data.shop.productStatus.value)];
    newProductStatus.concat(productStatus.map(error => `[${error.code}] ${error.message}`));

    const tempQueue = [...JSON.parse(getShopMetafieldsResult.data.shop.oldQueue.value)];
    const newQueue = tempQueue.filter(value => !queue.includes(value));

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
                    },
                    {
                        ownerId: getShopMetafieldsResult.data.shop.id,
                        namespace: "custom",
                        key: "ai_queue",
                        value: JSON.stringify(newQueue)
                    }
                ]
            }
        }
    );

    const metafieldUpdateResult = await metafieldUpdateResponse.json();

    if (metafieldUpdateResult.data.metafieldsSet.userErrors.length > 0) {
        for (let i = 0; i < metafieldUpdateResult.data.userErrors; i++) {
            console.log(`[${metafieldUpdateResult.data.userErrors[i].field}] ${metafieldUpdateResult.data.userErrors[i].message}`)
        }
    }*/

    return new Response("Ok", { status: 200 });
}