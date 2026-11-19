
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const uploadDocumentToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "dealerflow/documents",
                resource_type: "image",
                type: "authenticated",
                overwrite: false
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve(result);
            }
        );

        Readable.from(buffer).pipe(uploadStream);
    });
};

const getAuthenticatedDocumentUrl = (
    storageKey,
    resourceType,
    format
) => {
    return cloudinary.utils.private_download_url(
        storageKey,
        format,
        {
            resource_type: resourceType,
            type: "authenticated",
            expires_at: Math.floor(Date.now() / 1000) + 60,
            attachment: true
        }
    );
};

module.exports = {
    uploadDocumentToCloudinary,
    getAuthenticatedDocumentUrl
};
