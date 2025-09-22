import { ActionFunctionArgs, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function action({request}: ActionFunctionArgs) {
    try {
        const uploadHandler = unstable_createMemoryUploadHandler({
            maxPartSize: 5_000_000, // 5MB limit
        });
        const formData = await unstable_parseMultipartFormData(request, uploadHandler);
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
            throw new Error(`No file was uploaded or file format is incorrect.`);
        }

        const filename = file.name;
        const fileSize = file.size;
        const mimeType = file.type;

        const { admin } = await authenticate.admin(request);

        const stagedUploadsResult = await admin.graphql(
            `#graphql
                mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
                    stagedUploadsCreate(input: $input) {
                        stagedTargets {
                            url
                            resourceUrl
                            parameters {
                                name
                                value
                            }
                        }
                    }
                }
            `,
            {
                variables: {
                    input: {
                        filename,
                        mimeType,
                        resource: "IMAGE",
                        fileSize: fileSize.toString()
                    }
                }
            }
        );

        const stagedResult = await stagedUploadsResult.json();
        const stagedTarget = stagedResult.data.stagedUploadsCreate.stagedTargets[0];
        if (!stagedTarget) {
            throw new Error(`Failed to get staged upload target from Shopify.`);
        }

        const { url, parameters } = stagedTarget;
        const body = new FormData();
        parameters.forEach(({ name, value }: any) => body.append(name, value));
        body.append("file", file, filename);

        const uploadRes = await fetch(url, {
            method: "POST",
            body,
        });

        if (!uploadRes.ok) {
            throw new Error(`Failed to upload file to staged URL. Status: ${uploadRes.status}`);
        }

        const fileCreateResult = await admin.graphql(
            `#graphql
                mutation fileCreate($files: [FileCreateInput!]!) {
                    fileCreate(files: $files) {
                        files {
                            id
                            preview {
                                image {
                                    url
                                }
                            }
                        }
                }
            }
            `,
            {
                variables: {
                    files: {
                        alt: "",
                        originalSource: body.get('key')
                    }
                }
            }
        );

        const fileCreateResponse = await fileCreateResult.json();
        const shopifyFile = fileCreateResponse.data.fileCreate.files[0];
        if (!shopifyFile) {
            throw new Error(`Failed to create file record in Shopify.`);
        }

        return { success: true, url: shopifyFile.preview.image.url, id: shopifyFile.id };

    } catch (error) {
        console.error("Upload failed:", error);
        return { success: false, url: null, id: null };
    }























    const data = (await request.formData()).get("file") as File;

    const { admin } = await authenticate.admin(request);

    console.log(data);

    console.log("TEST", data?.name);

    /*const response = await admin.graphql(
        `
        `,
        {
            variables:

        }
    );*/


}
