/*
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


metaobject: {
    type: "product_feed",
    fields: [
        {
            key: "data",
            value: //JSON DATA HERE//
        },
        [
            key: "datetime",
            value: //ISO DATETIME STRING (OR IF NOT POSSIBLE SOME OTHER UNIQUE STRING)//
        ]
    ]
}

*/
