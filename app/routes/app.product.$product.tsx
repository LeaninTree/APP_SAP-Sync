import {
  Page,
  BlockStack,
  Card,
  TextField,
  Text,
  Box,
  Tag,
  Badge,
  Checkbox,
  Select,
  InlineStack,
  Layout,
  InlineGrid,
  Thumbnail,
  Listbox,
  EmptySearchResult,
  AutoSelection,
  Combobox,
  Banner,
  ChoiceList
} from "@shopify/polaris";
import { useCallback, useState, useMemo, useEffect } from "react";
import { authenticate } from "app/shopify.server";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";

interface Variant {
    id: String;
    name: String;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    price: Number;
    compareAtPrice: Number;
    inventory: Number;
    count?: Number;
    clearance?: Boolean;
    introDate?: Date;
    activeDate?: Date;
    nlaDate?: Date;
    owoDate?: Date;
    vbpDate?: Date;
    tempOutDate?: Date;
    pricingOverride?: Boolean;
}

interface Media {
    type: "IMAGE" | "VIDEO" | "OTHER";
    url: String;
    alt?: String;
}

interface Product {
    id: String;
    sku: String;
    upc: String;
    prefix?: String;
    category?: String;
    title: String;
    sapTitle?: String;
    description: String;
    metaDescription: String;
    type: String;
    brand: String;
    line?: String;
    variants: Variant[];
    occasion?: String;
    size?: String;
    orientation?: String;
    artist?: String;
    assortment?: String;
    premiumFeatures?: String[];
    verse1?: String;
    verse2?: String;
    verse3?: String;
    language?: String;
    innuendo?: String;
    political?: String;
    nudity?: String;
    media?: Media[];
    tone?: String;
    tags: String[];
    recipient?: String;
    customizable?: String;
}

export async function loader({request, params}: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    const success = url.searchParams.get("success");

    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(
        `#graphql
            query getProduct($id: ID!) {
                product(id: $id) {
                    id
                    title
                    description
                    seo {
                        description
                    }
                    productType
                    vendor
                    tags
                    media(first: 250) {
                        nodes {
                            id
                            alt
                            mediaContentType
                            preview {
                                image {
                                    url   
                                }
                            }
                        }
                    }
                    variants(first: 250) {
                        nodes {
                            id
                            sku
                            barcode
                            title
                            price
                            compareAtPrice
                            inventoryQuantity
                            status: metafield(namespace: "custom", key: "status") {
                                value
                            }
                            count: metafield(namespace: "custom", key: "count") {
                                value
                            }
                            clearance: metafield(namespace: "custom", key: "clearance") {
                                value
                            }
                            activeDate: metafield(namespace: "custom", key: "active_date") {
                                value
                            }
                            introDate: metafield(namespace: "custom", key: "intro_date") {
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
                            pricingOverride: metafield(namespace: "custom", key: "pricing_override") {
                                value
                            }
                        }
                    }
                    prefix: metafield(namespace: "custom", key: "prefix") {
                        value
                    }
                    category: metafield(namespace: "custom", key: "category") {
                        value
                    }
                    sapTitle: metafield(namespace: "custom", key: "sap_title") {
                        value
                    }
                    line: metafield(namespace: "custom", key: "line") {
                        value
                    }
                    occasion: metafield(namespace: "custom", key: "occasion") {
                        value
                    }
                    size: metafield(namespace: "custom", key: "size") {
                        value
                    }
                    orientation: metafield(namespace: "custom", key: "orientation") {
                        value
                    }
                    artist: metafield(namespace: "custom", key: "artist") {
                        value
                    }
                    assortment: metafield(namespace: "custom", key: "assortment") {
                        value
                    }
                    premiumFeatures: metafield(namespace: "custom", key: "premium_features") {
                        value
                    }
                    verse1: metafield(namespace: "custom", key: "verse_front") {
                        value
                    }
                    verse2: metafield(namespace: "custom", key: "verse_inside_1") {
                        value
                    }
                    verse3: metafield(namespace: "custom", key: "verse_inside_2") {
                        value
                    }
                    language: metafield(namespace: "custom", key: "foulLanguage") {
                        value
                    }
                    innuendo: metafield(namespace: "custom", key: "sexuallevel") {
                        value
                    }
                    political: metafield(namespace: "custom", key: "politicallevel") {
                        value
                    }
                    nudity: metafield(namespace: "custom", key: "nuditylevel") {
                        value
                    }
                    tone: metafield(namespace: "custom", key: "tone"){
                        value
                    }
                    recipient: metafield(namespace: "custom", key: "recipient") {
                        value
                    }
                    customizable: metafield(namespace: "custom", key: "customizable") {
                        value
                    }
                }
            }
        `,
        {
            variables: {
                id: `gid://shopify/Product/${params.product}`
            }
        }
    );

    const data = await response.json();

    const variantsList: Variant[] = [];

    data.data.product.variants.nodes.forEach((variant: any) => {
    
        let formattedVariant: Variant = {
            id: variant.id,
            name: variant.title,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            inventory: variant.inventoryQuantity,
        };

        if (variant.count && variant.count.value) {
            formattedVariant.count = variant.count.value;
        }

        if (variant.clearance && variant.clearance.value != null) {
            formattedVariant.clearance = variant.clearance.value;
        }

        if (variant.introDate && variant.introDate.value) {
            formattedVariant.introDate = variant.introDate.value;
        }

        if (variant.activeDate && variant.activeDate.value) {
            formattedVariant.activeDate = variant.activeDate.value;
        }

        if (variant.nlaDate && variant.nlaDate.value) {
            formattedVariant.nlaDate = variant.nlaDate.value;
        }

        if (variant.owoDate && variant.owoDate.value) {
            formattedVariant.owoDate = variant.owoDate.value;
        }

        if (variant.vbpDate && variant.vbpDate.value) {
            formattedVariant.vbpDate = variant.vbpDate.value;
        }

        if (variant.tempOutDate && variant.tempOutDate.value) {
            formattedVariant.tempOutDate = variant.tempOutDate.value;
        }

        if (variant.status && variant.status.value) {
            formattedVariant.status = variant.status.value;
        }

        if (variant.pricingOverride && variant.pricingOverride.value != null) {
            formattedVariant.pricingOverride = variant.pricingOverride.value;
        }

        variantsList.push(formattedVariant);
    });

    let product: Product = {
        id: params.product ? params.product : "",
        sku: data.data.product.variants.nodes[0].sku,
        upc: data.data.product.variants.nodes[0].barcode,
        title: data.data.product.title,
        description: data.data.product.description,
        metaDescription: data.data.product.seo.description,
        brand: data.data.product.vendor,
        type: data.data.product.productType,
        variants: variantsList,
        tags: data.data.product.tags,
    }

    if (data.data.product.sapTitle && data.data.product.sapTitle.value) {
        product.sapTitle = data.data.product.sapTitle.value;
    }

    if (data.data.product.line && data.data.product.line.value) {
        product.line = data.data.product.line.value;
    }

    if (data.data.product.occasion && data.data.product.occasion.value) {
        product.occasion = data.data.product.occasion.value;
    }

    if (data.data.product.orientation && data.data.product.orientation.value) {
        product.orientation = data.data.product.orientation.value;
    }

    if (data.data.product.verse1 && data.data.product.verse1.value) {
        product.verse1 = data.data.product.verse1.value;
    }

    if (data.data.product.verse2 && data.data.product.verse2.value) {
        product.verse2 = data.data.product.verse2.value;
    }

    if (data.data.product.verse3 && data.data.product.verse3.value) {
        product.verse3 = data.data.product.verse3.value;
    }

    if (data.data.product.language && data.data.product.language.value) {
        product.language = data.data.product.language.value;
    }

    if (data.data.product.innuendo && data.data.product.innuendo.value) {
        product.innuendo = data.data.product.innuendo.value;
    }

    if (data.data.product.political && data.data.product.political.value) {
        product.political = data.data.product.political.value;
    }

    if (data.data.product.nudity && data.data.product.nudity.value) {
        product.nudity = data.data.product.nudity.value;
    }

    if (data.data.product.tone && data.data.product.tone.value) {
        product.tone = data.data.product.tone.value;
    }

    if (data.data.product.customizable && data.data.product.customizable.value) {
        product.customizable = data.data.product.customizable.value;
    }

    if (data.data.product.media && data.data.product.media.nodes.length > 0) {
        const tempArray: Media[] = [];
        for (let i = 0; i < data.data.product.media.nodes.length; i++) {
            let mediaObj: any = {};

            mediaObj.id = data.data.product.media.nodes[i].id;

            if (data.data.product.media.nodes[i].mediaContentType == "IMAGE") {
                mediaObj.type = "IMAGE";
            } else if (data.data.product.media.nodes[i].mediaContentType == "EXTERNAL_VIDEO" || data.data.product.media.nodes[i].mediaContentType == "VIDEO") {
                mediaObj.type = "VIDEO";
            } else {
                mediaObj.type = "OTHER";
            }

            if (data.data.product.media.nodes[i].preview.image) {
                mediaObj.url = data.data.product.media.nodes[i].preview.image.url;

                if (data.data.product.media.nodes[i].alt) {
                    mediaObj.alt = data.data.product.media.nodes[i].alt;
                }

                tempArray.push(mediaObj);
            }
        }

        product.media = tempArray;
    }

    if (data.data.product.premiumFeatures && data.data.product.premiumFeatures.value.length > 0) {
        const tempArray: String[] = [];

        for (let i = 0; i < JSON.parse(data.data.product.premiumFeatures.value).length; i++) {
            const featureResponse = await admin.graphql(
                `#graphql
                    query getFeature($id: ID!) {
                        metaobject(id: $id) {
                            name: field(key: "name") {
                                value
                            }
                        }
                    }
                `,
                {
                    variables: {
                        id: JSON.parse(data.data.product.premiumFeatures.value)[i]
                    }
                }
            );

            const featureData = await featureResponse.json();

            if (featureData.data.metaobject.name && featureData.data.metaobject.name.value) {
                tempArray.push(featureData.data.metaobject.name.value);
            }
        }
        
        product.premiumFeatures = tempArray;
    }

    if (data.data.product.assortment && data.data.product.assortment.value) {
        const assortmentResponse = await admin.graphql(
            `#graphql
                query getAssortment($id: ID!) {
                    metaobject(id: $id) {
                        displayName
                    }
                }
            `,
            {
                variables: {
                    id: data.data.product.assortment.value
                }
            }
        );
        
        const assortmentData = await assortmentResponse.json();

        product.assortment = assortmentData.data.metaobject.displayName;
    }

    if (data.data.product.artist && data.data.product.artist.value) {
        const artistResponse = await admin.graphql(
            `#graphql
                query getArtist($id: ID!) {
                    metaobject(id: $id) {
                        displayName
                    }
                }
            `,
            {
                variables: {
                    id: data.data.product.artist.value
                }
            }
        );

        const artistData = await artistResponse.json();

        product.artist = artistData.data.metaobject.displayName;
    }

    if (data.data.product.size && data.data.product.size.value) {
        const sizeResponse = await admin.graphql(
            `#graphql
                query getSize($id: ID!) {
                    metaobject(id: $id) {
                        displayName
                    }
                }
            `,
            {
                variables: {
                    id: data.data.product.size.value
                }
            }
        );

        const sizeData = await sizeResponse.json();

        product.size = sizeData.data.metaobject.displayName;
    }

    if (data.data.product.prefix && data.data.product.prefix.value) {
        const prefixResponse = await admin.graphql(
            `#graphql
                query getPrefix($id: ID!){
                    metaobject(id: $id) {
                        displayName
                    }
                }
            `,
            {
                variables: {
                    id: data.data.product.prefix.value
                }
            }
        );

        const prefixData = await prefixResponse.json();

        product.prefix = prefixData.data.metaobject.displayName.toUpperCase();
    }

    if (data.data.product.category && data.data.product.category.value) {
        const categoryResponse = await admin.graphql(
            `#graphql
                query getCategory($id: ID!){
                    metaobject(id: $id) {
                        displayName
                    }
                }
            `,
            {
                variables: {
                    id: data.data.product.category.value
                }
            }
        );

        const categoryData = await categoryResponse.json();

        product.category = categoryData.data.metaobject.displayName.toUpperCase();
    }

    if (data.data.product.recipient && data.data.product.recipient.value) {
        const recipientResponse = await admin.graphql(
            `#graphql
                query getRecipient($id: ID!) {
                    metaobject(id: $id) {
                        displayName
                    }   
                }
            `,
            {
                variables: {
                    id: data.data.product.recipient.value
                }
            }
        );
        
        const recipientData = await recipientResponse.json();
        
        product.recipient = recipientData.data.metaobject.displayName;
    }

    const toneResponse = await admin.graphql(
        `#graphql
            query getToneOptions($id: MetafieldDefinitionIdentifierInput!) {
                metafieldDefinition(identifier: $id) {
                    validations {
                        name
                        value
                    }
                }
            }
        `,
        {
            variables: {
                id: {
                    ownerType: "PRODUCT",
                    namespace: "custom",
                    key: "tone"
                }
            }
        }
    );

    const toneData = await toneResponse.json();

    const toneOptions = JSON.parse(toneData.data.metafieldDefinition.validations.filter((validation: any) => validation.name === "choices")[0].value).map((choice: string) => ({
        value: choice,
        label: choice
    }));

    const recipientResponse = await admin.graphql(
        `#graphql
            query getRecipientOptions($type: String!) {
                metaobjects(type: $type, first: 250) {
                    nodes {
                        displayName
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

    const recipientData = await recipientResponse.json();

    const recipientOptions = recipientData.data.metaobjects.nodes.map((choice: any) => ({
        value: choice.displayName,
        label: choice.displayName
    }));

    const customizableResponse = await admin.graphql(
        `#graphql
            query getCustomizableOptions($id: MetafieldDefinitionIdentifierInput!) {
                metafieldDefinition(identifier: $id) {
                    validations {
                        name
                        value
                    }
                }
            }
        `,
        {
            variables: {
                id: {
                    ownerType: "PRODUCT",
                    namespace: "custom",
                    key: "customizable"
                }
            }
        }
    );

    const customizableData = await customizableResponse.json();

    const customizableOptions = JSON.parse(customizableData.data.metafieldDefinition.validations.filter((validation: any) => validation.name === "choices")[0].value).map((choice: string) => ({
        value: choice,
        label: choice
    }));

    return [product, toneOptions, recipientOptions, customizableOptions, error, success];
}

export default function ProductPage() {

    const [productData, toneOptions, recipientOptions, customizableOptions, error, success] = useLoaderData<typeof loader>();

    const [title, setTitle] = useState(productData.title);
    const [description, setDescription] = useState(productData.description);
    const [metaDescription, setMetaDescription] = useState(productData.metaDescription);

    const [selectedKeywords, setSelectedKeyWords] = useState<string[]>(productData.tags);
    const [keywordValue, setKeywordValue] = useState('');
    const [keywordSuggestion, setKeywordSuggestion] = useState('');
    const handleActiveKeywordOptionChange = useCallback((activeOption: string) => {
        const activeOptionIsAction =  activeOption === keywordValue;

        if (!activeOptionIsAction && !selectedKeywords.includes(activeOption)) {
            setKeywordSuggestion(activeOption);
        } else {
            setKeywordSuggestion('');
        }
    }, [keywordValue, selectedKeywords]);
    const updateKeywordSelection = useCallback((selected: string) => {
        const nextSelectedKeyword = new Set([...selectedKeywords]);

        if (nextSelectedKeyword.has(selected)) {
            nextSelectedKeyword.delete(selected);
        } else {
            nextSelectedKeyword.add(selected);
        }

        setSelectedKeyWords([...nextSelectedKeyword]);
        setKeywordValue('');
        setKeywordSuggestion('');
    }, [selectedKeywords]);
    const removeKeyword = useCallback((keyword: string) => {
        updateKeywordSelection(keyword);
    }, [updateKeywordSelection]);
    const getAllKeywords = useCallback(() => {
        const savedKeywords = productData.tags;
        return [...new Set([...savedKeywords, ...selectedKeywords].sort())];
    }, [selectedKeywords]);
    const formatOptionText = useCallback((option: string) => {
        const trimValue = keywordValue.trim().toLocaleLowerCase();
        const matchIndex = option.toLocaleLowerCase().indexOf(trimValue);

        if (!keywordValue || matchIndex === -1) return option;

        const start = option.slice(0, matchIndex);
        const highlight = option.slice(matchIndex, matchIndex + trimValue.length);
        const end = option.slice(matchIndex + trimValue.length, option.length);

        return (
            <p>
                {start}
                <Text fontWeight="bold" as="span">
                    {highlight}
                </Text>
                {end}
            </p>
        );
    }, [keywordValue]);
    const escapeSpecialRegExCharacters = useCallback((value: string) => {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }, []);
    const keywordOptions = useMemo(() => {
        let list;
        const allTags = getAllKeywords();
        const filterRegex = new RegExp(escapeSpecialRegExCharacters(keywordValue), 'i');
        if (keywordValue) {
            list = allTags.filter((tag) => tag.match(filterRegex));
        } else {
            list = allTags;
        }

        return [...list];
    }, [keywordValue, getAllKeywords, escapeSpecialRegExCharacters]);
    const verticalContentMarkup = selectedKeywords.length > 0 ? (
        <InlineStack gap="050">
            {selectedKeywords.map((keyword) => (
                <Tag key={`option-${keyword}`} onRemove={() => removeKeyword(keyword)}>
                    {keyword}
                </Tag>
            ))}
        </InlineStack>
    ) : null;
    const optionMarkup = keywordOptions.length > 0 ? (
        keywordOptions.map((option) => {
            return (
                <Listbox.Option
                    key={option}
                    value={option}
                    selected={selectedKeywords.includes(option)}
                    accessibilityLabel={option}
                >
                    <Listbox.TextOption selected={selectedKeywords.includes(option)}>
                        {formatOptionText(option)}
                    </Listbox.TextOption>
                </Listbox.Option>
            );
        })
    ) : null;
    const noKeywordResults = keywordValue && !getAllKeywords().includes(keywordValue);
    const actionMarkup = noKeywordResults ? (
        <Listbox.Action value={keywordValue}>{`Add "${keywordValue}"`}</Listbox.Action>
    ) : null;
    const emptyStateMarkup = optionMarkup ? null : (
        <EmptySearchResult 
            title=""
            description={`No keywords found matching "${keywordValue}"`}
        />
    );
    const listboxMarkup = optionMarkup || actionMarkup || emptyStateMarkup ? (
        <Listbox
            autoSelection={AutoSelection.None}
            onSelect={updateKeywordSelection}
            onActiveOptionChange={handleActiveKeywordOptionChange}
        >
            {actionMarkup}
            {optionMarkup}
        </Listbox>
    ) : null;


    const [override, setOverride] = useState(productData.variants.map((variant: any) => variant.pricingOverride ? true : false));
    const [displayHelp, setDisplayHelp] = useState(productData.variants.map(() => false));
    const [clearance, setClearance] = useState(productData.variants.map((variant: any) => variant.clearance ? true : false));
    const [pricing, setPricing] = useState(productData.variants.map((variant: any) => variant.price));

    const [altText, setAltText] = useState(productData.media.map((media: any) => media.alt ? media.alt : ""));

    const [customizable, setCustomizable] = useState(productData.customizable ? productData.customizable : "");
    const [tone, setTone] = useState(productData.tone ? productData.tone : "");
    const [recipient, setRecipient] = useState(productData.recipient ? productData.recipient : "");
    const [language, setLanguage] = useState(productData.language ? productData.language : "");
    const [sexual, setSexual] = useState(productData.innuendo ? productData.innuendo : "");
    const [nudity, setNudity] = useState(productData.nudity ? productData.nudity : "");
    const [political, setPolitical] = useState(productData.political ? productData.political : "");

    const [dataChange, setDataChange] = useState(false);
    useEffect(
        () => {
            if (title != productData.title) {
                setDataChange(true);
                return;
            }
            if (description != productData.description) {
                setDataChange(true);
                return;
            }
            if (metaDescription != productData.metaDescription) {
                setDataChange(true);
                return;
            }
            if (recipient != productData.recipient) {
                setDataChange(true);
                return;
            }
            if (tone != productData.tone) {
                setDataChange(true);
                return;
            } 
            if (customizable != productData.customizable) {
                setDataChange(true);
                return;
            }
            if (political != productData.political) {
                setDataChange(true);
                return;
            } 
            if (nudity != productData.nudity) {
                setDataChange(true);
                return;
            }
            if (sexual != productData.innuendo) {
                setDataChange(true);
                return;
            }
            if (language != productData.language) {
                setDataChange(true);
                return;
            }

            const orgKeywords = productData.tags;
            if (orgKeywords.length !== keywordOptions.length) {
                setDataChange(true);
                return;
            }

            const orgKeywordSet = new Set(orgKeywords);
            const newKeywordSet = new Set(keywordOptions);

            if (orgKeywordSet.size !== newKeywordSet.size) {
                setDataChange(true);
                return;
            }

            for (const tag of newKeywordSet) {
                if (!orgKeywordSet.has(tag)) {
                    setDataChange(true);
                    return;
                }
            } 

            const orgAltText = productData.media.map((media: any) => media.alt ? media.alt : "");
            for (let i = 0; i < altText.length; i++) {
                if (altText[i] != orgAltText[i]) {
                    setDataChange(true);
                    return;
                }
            }

            const orgOverride = productData.variants.map((variant: any) => variant.pricingOverride ? true : false);
            for (let i = 0; i < override.length; i++) {
                if (override[i] != orgOverride[i]) {
                    setDataChange(true);
                    return;
                }
            }

            const orgClearance = productData.variants.map((variant: any) => variant.clearance ? true : false);
            for (let i = 0; i < clearance.length; i++) {
                if (clearance[i] != orgClearance[i]) {
                    setDataChange(true);
                    return;
                }
            }

            const orgPricing = productData.variants.map((variant: any) => variant.price);
            for (let i = 0; i < pricing.length; i++) {
                if (pricing[i] != orgPricing[i]) {
                    setDataChange(true);
                    return;
                }
            }

            setDataChange(false);
        },
        [
            political,
            nudity,
            sexual,
            language,
            recipient,
            tone,
            customizable,
            pricing,
            clearance,
            override,
            altText,
            keywordOptions,
            metaDescription,
            description,
            title
        ]
    );

    const [syncBanner, setSyncBanner] = useState(false);
    const [removeBanner, setRemoveBanner] = useState(false);

    useEffect(() => {
        if (success) {
            setSyncBanner(false);
            setRemoveBanner(false);
        }
    }, [success]);

    const fetcher = useFetcher();

    return (
        <Page
            fullWidth
            title={`${productData.sku} | ${title}`}
            subtitle={`${productData.category ? `${productData.category}-`: null}${productData.prefix}${productData.sku}${productData.upc ? ` | UPC-17: ${productData.upc}` : ""}`}
            backAction={{
                content: "Products",
                url: "/app/product"
            }}
            primaryAction={{
                content: 'Save', 
                disabled: !dataChange || (syncBanner || removeBanner),
                onAction: () => {fetcher.submit(
                    {
                        title: title,
                        description: description,
                        metaDescription: metaDescription,
                        keywords: JSON.stringify(keywordOptions),
                        tone: tone,
                        recipient: recipient,
                        customizable: customizable,
                        language: language,
                        political: political,
                        sexual: sexual,
                        nudity: nudity,
                        altTexts: JSON.stringify(altText.map((text: String, index: number) => ({
                            id: productData.media[index].id,
                            alt: text
                        }))),
                        variants: JSON.stringify(override.map((override: Boolean, index: number) => ({
                            id: productData.variants[index].id,
                            override: override,
                            clearance: clearance[index],
                            price: pricing[index]
                        })))
                    },
                    { method: "POST", action: `/app/product/${productData.id}/update` }
                )}
            }}
            secondaryActions={[
                {
                    content: 'Resync with SAP',
                    disabled: (syncBanner || removeBanner),
                    onAction: () => {setSyncBanner(true)},
                },
                {
                    content: 'Remove Product',
                    destructive: true,
                    disabled: (syncBanner || removeBanner),
                    onAction: () => {setRemoveBanner(true)},
                },
            ]}
        >
            <BlockStack gap="500">
                {error ?
                    <Banner tone="critical" key="Banner-Error">
                        <Text variant="bodyMd" as="p">
                            There was an error preforming the {error} action. Please try again.
                        </Text>
                    </Banner>
                :
                    null
                }
                {success ?
                    <Banner tone="success" key="Banner-Success">
                        <Text variant="bodyMd" as="p">
                            The product {success} action was completed.
                        </Text>
                    </Banner>
                :
                    null
                }
                {syncBanner ? 
                    <Banner
                        title="WARNING! SAP Sync"
                        action={{
                            content: "Sync",
                            url: `/app/product/${productData.id}/sync`
                        }}
                        onDismiss={() => setSyncBanner(false)}
                        tone="warning"
                        key="Banner-Sync"
                    >
                        <Text variant="bodyMd" as="p">
                            This action can override data displayed on this page. All changes should be done within SAP, when possible, to guarantee those changes persist.
                        </Text>
                    </Banner>
                :
                    null
                }
                {removeBanner ?
                    <Banner
                        title="WARNING! Remove Product from Feed"
                        action={{
                            content: "Remove",
                            url: `/app/product/${productData.id}/remove`
                        }}
                        onDismiss={() => setRemoveBanner(false)}
                        tone="critical"
                        key="Banner-Remove"
                    >
                        <Text variant="bodyMd" as="p">
                            This action will remove the product from getting any future product feed updates and setting all sub-products to NLA status. This action should rarely be used, only when a product was created by mistake or will never be sold in the future.
                        </Text>
                    </Banner>
                :
                    null
                }
                <Layout key="Page-1">
                    <Layout.Section>
                        <BlockStack gap="500">
                            <Card key="Col1-1">
                                <BlockStack gap="200">
                                    <TextField 
                                        label="Title"
                                        value={title}
                                        onChange={(newValue: string) => setTitle(newValue)}
                                        autoComplete="off"
                                        key="Col1-1-1"
                                    />
                                    <TextField 
                                        label="SAP Title"
                                        disabled
                                        value={productData.sapTitle}
                                        autoComplete="off"
                                        key="Col1-1-2"
                                    />
                                    <TextField 
                                        label="Description"
                                        value={description}
                                        onChange={(newValue: string) => setDescription(newValue)}
                                        autoComplete="off"
                                        multiline={5}
                                        key="Col1-1-3"
                                    />
                                    <TextField 
                                        label="Meta-Description"
                                        value={metaDescription}
                                        onChange={(newValue: string) => setMetaDescription(newValue)}
                                        autoComplete="off"
                                        multiline={3}
                                        key="Col1-1-4"
                                    />
                                    <Text variant="bodyLg" as="p" key="Col1-1-5">
                                        Keywords
                                    </Text>
                                    <Combobox
                                        allowMultiple
                                        activator={
                                            <Combobox.TextField 
                                                autoComplete="off"
                                                label="Search keywords"
                                                labelHidden
                                                value={keywordValue}
                                                suggestion={keywordSuggestion}
                                                verticalContent={verticalContentMarkup}
                                                onChange={setKeywordValue}   
                                                placeholder="Add Keyword..."
                                            />
                                        }
                                        key="Col1-1-6"
                                    >
                                        {listboxMarkup}
                                    </Combobox>
                                </BlockStack>
                            </Card>
                            <Card key="Col1-2">
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h3" key="Col1-2-1">
                                        Product Verses
                                    </Text>
                                    <TextField 
                                        label="Front"
                                        value={productData.verse1 ? productData.verse1 : ""}
                                        disabled
                                        autoComplete="off"
                                        key="Col1-2-2"
                                    />
                                    <TextField 
                                        label="Inside 1"
                                        value={productData.verse2 ? productData.verse2 : ""}
                                        disabled
                                        autoComplete="off"
                                        key="Col1-2-3"
                                    />
                                    <TextField 
                                        label="Inside 2"
                                        value={productData.verse3 ? productData.verse3 : ""}
                                        disabled
                                        autoComplete="off"
                                        key="Col1-2-4"
                                    />
                                </BlockStack>
                            </Card>
                            <Card key="Col1-3">
                                <BlockStack gap="400">
                                    <Text variant="headingMd" as="h3" key="Col1-3-1">
                                        Sale Channels
                                    </Text>
                                    {productData.variants.map((variant: any, index: number) => (
                                        <Box borderColor="border" borderWidth="025" borderRadius="150" padding="200" key={`Col1-3-${index + 2}`}>
                                            <BlockStack gap="300">
                                                <InlineGrid gap="500" columns={3} key={`Col1-3-${index + 2}-1`}>
                                                    <InlineStack gap="200">
                                                        <Text variant="headingSm" as="h4">
                                                            {variant.name}
                                                        </Text>
                                                        {variant.status === "ACTIVE" ?
                                                            <Badge progress="complete" tone="success">Active</Badge>
                                                        :
                                                            variant.status === "DRAFT" ?
                                                                <Badge progress="incomplete" tone="info">Pre-Launch</Badge>
                                                            :
                                                                <Badge progress="partiallyComplete" tone="warning">Not Avaliable</Badge>
                                                        }
                                                    </InlineStack>
                                                    <div />
                                                    <Text alignment="end" variant="bodyLg" as="p">Product Per Package: {variant.count ? variant.count : 1}</Text>
                                                </InlineGrid>
                                                <InlineGrid gap="150" columns={['twoThirds', 'oneThird']} key={`Col1-3-${index + 2}-2`}>
                                                    <Checkbox 
                                                        label="Pricing Override" 
                                                        helpText={displayHelp[index] ? "Pricing will update on next Sync after override is turned off." : ""}
                                                        checked={override[index]}
                                                        onChange={(newValue) => {
                                                            const newHelpArray = [...displayHelp];
                                                            if (override[index] === true && newValue === false) {
                                                                newHelpArray[index] = true;
                                                            } else {
                                                                newHelpArray[index] = false;
                                                            }
                                                            setDisplayHelp(newHelpArray);
                                                            const newArray = [...override];
                                                            newArray[index] = newValue;
                                                            setOverride(newArray);
                                                        }}
                                                    />
                                                    <TextField
                                                        label="Inventory"
                                                        disabled
                                                        type="number"
                                                        value={variant.inventory.toString()}
                                                        autoComplete="off"
                                                        align="center"
                                                    />
                                                </InlineGrid>
                                                <InlineGrid gap="150" columns={3} key={`Col1-3-${index + 2}-3`}>
                                                    <Select
                                                        label="Clearance"
                                                        options={[
                                                            {label: "Yes", value: "true"},
                                                            {label: "No", value: "false"}
                                                        ]}
                                                        value={clearance[index] ? "true" : "false"}
                                                        onChange={(newValue) => {
                                                            const newArray = [...clearance];
                                                            newArray[index] = newValue === "true" ? true : false;
                                                            setClearance(newArray);
                                                        }}
                                                        disabled={!override[index]}
                                                    />
                                                    <TextField 
                                                        label="Current Price"
                                                        disabled={!override[index]}
                                                        type="currency"
                                                        prefix="$"
                                                        value={pricing[index].toString()}
                                                        onChange={(newValue) => {
                                                            const newArray = [...pricing];
                                                            newArray[index] = parseFloat(newValue);
                                                            setPricing(newArray);
                                                        }}
                                                        autoComplete="off"
                                                    />
                                                    <TextField 
                                                        label="Retail Price"
                                                        disabled
                                                        type="currency"
                                                        prefix="$"
                                                        value={variant.compareAtPrice > 0 ? variant.compareAtPrice.toString() : ""}
                                                        autoComplete="off"
                                                    />
                                                </InlineGrid>
                                                <InlineGrid gap="150" columns={6} key={`Col1-3-${index + 2}-4`}>
                                                    <TextField 
                                                        label="Intro Date [06]"
                                                        disabled
                                                        type="date"
                                                        value={variant.introDate ? variant.introDate : ""}
                                                        autoComplete="off"
                                                    />
                                                    <TextField 
                                                        label="Active Date [01]"
                                                        disabled
                                                        type="date"
                                                        value={variant.activeDate ? variant.activeDate : ""}
                                                        autoComplete="off"
                                                    />
                                                    <TextField 
                                                        label="NLA Date [02]"
                                                        disabled
                                                        type="date"
                                                        value={variant.nlaDate ? variant.nlaDate : ""}
                                                        autoComplete="off"
                                                    />
                                                    <TextField 
                                                        label="Out When Out Date [03]"
                                                        disabled
                                                        type="date"
                                                        value={variant.owoDate ? variant.owoDate : ""}
                                                        autoComplete="off"
                                                    />
                                                    <TextField 
                                                        label="Verify Purchase Date [04]"
                                                        disabled
                                                        type="date"
                                                        value={variant.vbpDate ? variant.vbpDate : ""}
                                                        autoComplete="off"
                                                    />
                                                    <TextField 
                                                        label="Temp Out Date [05]"
                                                        disabled
                                                        type="date"
                                                        value={variant.tempOutDate ? variant.tempOutDate : ""}
                                                        autoComplete="off"
                                                    />
                                                </InlineGrid>
                                                <Text variant="bodyLg" as="p" key={`Col1-3-${index + 2}-5`}>
                                                    Current Sales Channels
                                                </Text>
                                                <InlineStack gap="100" key={`Col1-3-${index + 2}-6`}>
                                                    {//TODO
                                                    /*index === 0 ? 
                                                        <Tag key={`Col1-3-${index + 2}-6-1`}>Willow & Ivy Website</Tag>
                                                    :
                                                        <>
                                                            <Tag>Willow & Ivy Faire</Tag>
                                                            <Tag>B2B Website</Tag>
                                                        </>
                                                    }
                                                    */}
                                                </InlineStack>
                                            </BlockStack>
                                        </Box>
                                    ))}
                                </BlockStack>
                            </Card>
                            <Card key="Col1-4">
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h3" key="Col1-4-1">
                                        Media
                                    </Text>
                                    {productData.media && productData.media.map((media: any, index: number) => (
                                        <Box borderColor="border" borderWidth="025" borderRadius="150" padding="200" key={`Col1-4-${index + 2}`}>
                                            <BlockStack gap="200">
                                                <InlineStack gap="300">
                                                    <Text variant="headingMd" as="h5">
                                                        {index + 1}
                                                    </Text>
                                                    <Text variant="bodyLg" as="p" alignment="center">
                                                        {media.type}
                                                    </Text>
                                                    <Thumbnail source={media.url} alt={media.alt ? media.alt : ""} size="large" />
                                                </InlineStack>
                                                <TextField 
                                                    label="Alt-Text"
                                                    value={altText[index]}
                                                    autoComplete="off"
                                                    multiline={3}
                                                    onChange={(newValue) => {
                                                        const newArray = [...altText];
                                                        newArray[index] = newValue;
                                                        setAltText(newArray);
                                                    }}
                                                />
                                            </BlockStack>
                                        </Box>
                                    ))}
                                </BlockStack>
                            </Card>
                        </BlockStack>
                    </Layout.Section>
                    <Layout.Section variant="oneThird">
                        <BlockStack gap="500">
                            <Card key="Col2-1">
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h3" key="Col2-1-1">
                                        Product Hierarchy
                                    </Text>
                                    <TextField 
                                        label="Product Line"
                                        disabled
                                        value={productData.line}
                                        autoComplete="off"
                                        key="Col2-1-2"
                                    />
                                    <InlineGrid gap="200" columns={2} key="Col2-1-3">
                                        <TextField 
                                            label="Brand"
                                            disabled
                                            value={productData.brand}
                                            autoComplete="off"
                                        />
                                        <TextField 
                                            label="Product Type"
                                            disabled
                                            value={productData.type}
                                            autoComplete="off"
                                        />
                                    </InlineGrid>
                                    <InlineGrid gap="200" columns={2} key="Col2-1-4">
                                        <TextField 
                                            label="Assortment"
                                            disabled
                                            value={productData.assortment ? productData.assortment : ""}
                                            autoComplete="off"
                                        />
                                        <TextField 
                                            label="Occasion"
                                            disabled
                                            value={productData.occasion}
                                            autoComplete="off"
                                        />
                                    </InlineGrid>
                                    <InlineGrid gap="200" columns={2} key="Col2-1-5">
                                        <Select
                                            label="Tone"
                                            value={tone}
                                            options={toneOptions}
                                            onChange={(newValue) => setTone(newValue)}
                                        />
                                        <Select
                                            label="Recipient"
                                            value={recipient}
                                            options={recipientOptions}
                                            onChange={(newValue) => setRecipient(newValue)}
                                        />
                                    </InlineGrid>
                                </BlockStack>
                            </Card>
                            <Card key="Col2-2">
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h3" key="Col2-2-1">
                                        Product Features
                                    </Text>
                                    <InlineGrid gap="200" columns={2}key="Col2-2-2">
                                        <TextField 
                                            label="Size"
                                            disabled
                                            value={productData.size ? productData.size : ""}
                                            autoComplete="off"
                                        />
                                        <TextField 
                                            label="Orientation"
                                            disabled
                                            value={productData.orientation ? productData.orientation : ""}
                                            autoComplete="off"
                                        />
                                    </InlineGrid>
                                    <InlineGrid gap="200" columns={2} key="Col2-2-3">
                                        <TextField 
                                            label="Artist"
                                            disabled
                                            value={productData.artist ? productData.artist : ""}
                                            autoComplete="off"
                                        />
                                    </InlineGrid>
                                    <ChoiceList
                                        allowMultiple
                                        title="Customizable"
                                        choices={customizableOptions}
                                        selected={customizable}
                                        onChange={(newValue) => setCustomizable(newValue)}
                                    />
                                    <Text variant="bodyLg" as="p" key="Col2-2-4">
                                        Processes
                                    </Text>
                                    <InlineStack gap="100" key="Col2-2-5">
                                        {productData.premiumFeatures?.map((feature: string, index: number) =>(
                                            <Tag key={`Col2-2-4-${index + 1}`}>{feature}</Tag>
                                        ))}
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                            <Card key="Col2-3">
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h3" key="Col2-3-1">
                                        Crudeness & Divisiveness Ratings
                                    </Text>
                                    <InlineGrid gap="200" columns={4} key="Col2-3-2">
                                        <TextField 
                                            label="Language"
                                            type="number"
                                            value={language}
                                            autoComplete="off"
                                            onChange={(newValue) => setLanguage(newValue)}
                                        />
                                        <TextField 
                                            label="Political"
                                            type="number"
                                            value={political}
                                            autoComplete="off"
                                            onChange={(newValue) => setPolitical(newValue)}
                                        />
                                        <TextField 
                                            label="Sexual"
                                            type="number"
                                            value={sexual}
                                            autoComplete="off"
                                            onChange={(newValue) => setSexual(newValue)}
                                        />
                                        <TextField 
                                            label="Nudity"
                                            type="number"
                                            value={nudity}
                                            autoComplete="off"
                                            onChange={(newValue) => setNudity(newValue)}
                                        />
                                    </InlineGrid>
                                </BlockStack>
                            </Card>
                            <Card key="Col2-4">
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h3" key="Col2-4-1">
                                        Taxonomy Specific Fields
                                    </Text>
                                    {/* //TODO */}
                                </BlockStack>
                            </Card>
                        </BlockStack>
                    </Layout.Section>
                </Layout>
                <Text variant="bodyMd" as="p" tone="subdued" alignment="center" key="Page-2">
                    For any questions or help please submit a ticket to the HelpDesk.
                </Text>
            </BlockStack>
        </Page>
    );
}