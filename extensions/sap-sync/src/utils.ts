export async function updateProduct(id: string) {
    return await makeGraphQLQuery(
        `#graphql
            query GetSku($id: ID!) {
                product(id: $id) {
                    variants(first: 1) {
                        nodes {
                            title
                            sku
                        }
                    }
                }
            }
        `,
        {
            id: id
        }
    )
    .then(getData => getData.data)
    .then(productJson => {
        return fetch(`https://endpointtesting.free.beeceptor.com/?sku=${productJson.product.variants.nodes[0].sku}`); //TODO update URL
    })
    .then(response => response.json())
    .then(async result => {

        if (result.error.code != 200) {
            return result.error;
        }

        const brandsResult = await makeGraphQLQuery(
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
                brand: result.brand.toLowerCase()
            }
        );

        let brandName = "UNDEFINED";
        let brandNeedsAttention = false;

        if (brandsResult.data.metaobjectByHandle === null) {
            brandName = result.brand;
            brandNeedsAttention = true;
        } else {
            brandName = brandsResult.data.metaobjectByHandle.field.value;
        }

        const categoryResult = await makeGraphQLQuery(
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
                        b2bCount: field(key: "b2b_count") {
                            value
                        }
                    }
                }
            `,
            {
                name: result.product_category.toLowerCase()
            }
        );

        let categoryNeedsAttention = false;
        let categoryId = null;
        let assortmentId = null;
        let sizeId = null;
        let b2bCount = null;

        let d2cCount = null;

        let typeNeedsAttention = false;
        let typeName = "UNDEFINED";
        let prop65 = null;
        let taxonomyString = null;

        if (categoryResult.data.metaobjectByHandle === null) {
            categoryId = result.product_category;
            categoryNeedsAttention = true;
        } else {
            categoryId = categoryResult.data.metaobjectByHandle.id;
            b2bCount = categoryResult.data.metaobjectByHandle.b2bCount.value;
            assortmentId = categoryResult.data.metaobjectByHandle.assortment.value;
            sizeId = categoryResult.data.metaobjectByHandle.size.value;

            if (categoryResult.data.metaobjectByHandle.assortment.value != null) {
                d2cCount = categoryResult.data.metaobjectByHandle.assortment.reference.d2cCount;
            }

            if (categoryResult.data.metaobjectByHandle.type === null) {
                typeNeedsAttention = true;
            } else {
                typeName = categoryResult.data.metaobjectByHandle.type.reference.name.value;
                prop65 = categoryResult.data.metaobjectByHandle.type.reference.prop65.value;
                taxonomyString = categoryResult.data.metaobjectByHandle.type.reference.taxonomy.value;
            }
        }

        const occasionResult = await makeGraphQLQuery(
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
                code: result.prefix.toLowerCase()
            }
        );

        let occasionNeedsAttention = false;
        let occasionName = "UNDEFINED";
        let occasionId = null;

        if (occasionResult.data.metaobjectByHandle === null) {
            occasionName = result.prefix;
            occasionNeedsAttention = true;
        } else {
            occasionId = occasionResult.data.metaobjectByHandle.id;
            occasionName = occasionResult.data.metaobjectByHandle.field.value;
        }

        const processArray = [];
        const processNeedsAttention = [];

        result.processes.forEach(async process => {
            const processResult = await makeGraphQLQuery(
                `#graphql
                    query getProcess($code: String!) {
                        metaobjectByHandle(handle: {handle: $code, type: "processes"}) {
                            id
                        }
                    }
                `,
                {
                    code: process.toLowerCase()
                }
            );

            if (processResult.data.metaobjectByHandle === null) {
                processNeedsAttention.push(process);
            } else {
                processArray.push(processResult.data.metaobjectByHandle.id);
            }
        });

        let orientation = null;

        if (result.orientation.toUpperCase() === "V") {
            orientation = "Vertical";
        } else if (result.orientation.toUpperCase() === "H") {
            orientation = "Horizontal";
        }

        const artistResult = await makeGraphQLQuery(
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
                queryString: `fields.name_mapping:"${result.artist}"`
            }
        );

        let artistNeedsAttention = false;
        let artist = null;

        if (artistResult.data.metaobjects.edges.length === 0) {
            artistNeedsAttention = true;
            artist = result.artist;
        } else {
            artist = artistResult.data.metaobjects.edges[0].node.id;
        }

        const variants = [];

        result.variants.forEach(variant => {
            let count = null;
            let activeDate = null;
            let nLADate = null;
            let oWODate = null;
            let vBPDate = null;
            let tempOutDate = null;
            let introDate = null;

            if (variant.name.toUpperCase() === "D2C") {
                count = d2cCount;
            } else if (variant.name.toUpperCase() === "B2B") {
                count = b2bCount;
            }

            if (variant.date_code === "01") {
                activeDate = variant.date;
            } else if (variant.date_code === "02") {
                nLADate = variant.date;
            } else if (variant.date_code === "03") {
                oWODate = variant.date;
            } else if (variant.date_code === "04") {
                vBPDate = variant.date;
            } else if (variant.date_code === "05") {
                tempOutDate = variant.date;
            } else if (variant.date_code === "06") {
                introDate = variant.date;
            }

            variants.push({
                name: variant.name,
                sku: variant.sku,
                price: variant.price,
                compare_at_price: variant.compare_at_price,
                inventory: variant.inventory,
                count,
                activeDate,
                nLADate,
                oWODate,
                vBPDate,
                tempOutDate,
                introDate
            });
        });
        
        return {
            sapJSON: JSON.stringify(result),
            brandNeedsAttention,
            vendor: brandName,
            sapTitle: result.title,
            categoryNeedsAttention,
            category: categoryId,
            prop65,
            size: sizeId,
            assortment: assortmentId,
            taxonomy: taxonomyString,
            productType: typeName,
            typeNeedsAttention,
            occasionNeedsAttention,
            occasionName,
            occasion: occasionId,
            processNeedsAttention,
            processes: processArray,
            line: result.line,
            verse_front: result.verse_front,
            verse_inside_1: result.verse_inside_1,
            verse_inside_2: result.verse_inside_2,
            orientation,
            artistNeedsAttention,
            artist,
            variants
        }
    })
    .then(async result => {
        if (result.code) {
            return [{
                code: result.code,
                message: result.message
            }]
        }

        const errors = [];
            
        if (result.brandNeedsAttention) {
            errors.push({
                code: result.vendor,
                message: `BRAND | There is no current definition for the given code. Please define it and run the sync again.`
            });
        }

        if (result.categoryNeedsAttention) {
            errors.push({
                code: result.category,
                message: `CATEGORY | There is no current definition for the given code. Please define it and run the sync again.`
            });
        }

        if (result.typeNeedsAttention) {
            errors.push({
                code: result.productType,
                message: `PRODUCT TYPE | There is no current definition for the given product type. Please submit a HelpDesk ticket to IT.`
            });
        }

        if (result.occasionNeedsAttention) {
            errors.push({
                code: result.occasionName,
                message: `OCCASION | There is no current definition for the given code. Please define it and run the sync again.`
            });
        }

        if (result.artistNeedsAttention) {
            errors.push({
                code: result.artist,
                message: `ARTIST | There is no current definition for the given artist. Please define it and run the sync again.`
            });
        }

        result.processNeedsAttention.forEach(process => {
            errors.push({
                code: process,
                message: `PROCESS | There is no current definition for the given code. Please define it and run the sync again.`
            })
        });

        if (errors.length > 0) {
            return errors;
        }

        const channels = [];
        const formatedVariants = [];

        result.variants.forEach(variant => {
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
                })
            }

            formatedVariants.push({
                compareAtPrice: variant.compare_at_price,
                optionValues: [
                    {
                        optionName: "Channels",
                        name: variant.name
                    }
                ],
                price: variant.price,
                sku: variant.sku,
                metafields: variantMetafields,
                inventoryQuantities: [{
                    locationId: "gid://shopify/Location/71228096646", //TODO HAVE TO BE MANUALLY SET
                    name: "available",
                    quantity: variant.inventory
                }]
            })
        });

        const productMetafields = [];

        if (result.sapJSON) {
            productMetafields.push({
                namespace: "custom",
                key: "product_feed_json",
                value: result.sapJSON
            });
        }
        
        if (result.sapTitle) {
            productMetafields.push({
                namespace: "custom",
                key: "sap_title",
                value: result.sapTitle
            });
        }

        if (result.category) {
            productMetafields.push({
                namespace: "custom",
                key: "category",
                value: result.category
            });
        }

        if (result.prop65) {
            productMetafields.push({
                namespace: "custom",
                key: "prop65",
                value: result.prop65.toString()
            });
        }

        if (result.size) {
            productMetafields.push({
                namespace: "custom",
                key: "size",
                value: result.size
            });
        }

        if (result.assortment) {
            productMetafields.push({
                namespace: "custom",
                key: "assortment",
                value: result.assortment
            });
        }

        if (result.occasionName != "UNDEFINED") {
            productMetafields.push({
                namespace: "custom",
                key: "occasion",
                value: result.occasionName
            });
        }

        if (result.occasion) {
            productMetafields.push({
                namespace: "custom",
                key: "prefix",
                value: result.occasion
            });
        }

        if (result.processes.length > 0) {
            productMetafields.push({
                namespace: "custom",
                key: "premium_features",
                value: JSON.stringify(result.processes)
            });
        }

        if (result.line) {
            productMetafields.push({
                namespace: "custom",
                key: "line",
                value: result.line
            });
        }

        if (result.verse_front.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_front",
                value: result.verse_front.text
            });
        }

        if (result.verse_inside_1.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_inside_1",
                value: result.verse_inside_1.text
            });
        }

        if (result.verse_inside_2.text) {
            productMetafields.push({
                namespace: "custom",
                key: "verse_inside_2",
                value: result.verse_inside_2.text
            });
        }

        if (result.orientation) {
            productMetafields.push({
                namespace: "custom",
                key: "orientation",
                value: result.orientation
            });
        }

        if (result.artist) {
            productMetafields.push({
                namespace: "custom",
                key: "artist",
                value: result.artist
            });
        }

        const updateProduct = await makeGraphQLQuery(
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
                id: id,
                product: {
                    vendor: result.vendor,
                    category: `gid://shopify/TaxonomyCategory/${result.taxonomy}`,
                    productType: result.productType,
                    productOptions: [{
                        name: "Channels",
                        values: channels
                    }],
                    variants: formatedVariants,
                    metafields: productMetafields
                }
            }
        );

        if (updateProduct.data.productSet.userErrors.length > 0) {

            const userErrors = [];

            updateProduct.data.productSet.userErrors.forEach(error => {
                userErrors.push({
                    code: "UPDATE PRODUCT",
                    message: `(${error.field}) ${error.message}`
                });
            });

            return userErrors;
        }

        return [{code: "SUCCESS"}]
    });
}

async function makeGraphQLQuery(query, variables) {
  const graphQLQuery = {
    query,
    variables,
  };

  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify(graphQLQuery),
  });

  if (!res.ok) {
    console.error("Network error");
  }

  return await res.json();
}