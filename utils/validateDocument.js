const ALLOWED_TYPES = new Map([
    ["application/pdf", "pdf"],
    ["image/jpeg", "jpg"],
    ["image/png", "png"]
]);

const validateDocument = async (file) => {
    if (!file || !file.buffer) {
        const error = new Error("Document file is required");
        error.statusCode = 400;
        throw error;
    }

    const { fileTypeFromBuffer } = await import("file-type");

    const detected = await fileTypeFromBuffer(file.buffer);

    if (
        !detected ||
        !ALLOWED_TYPES.has(detected.mime) ||
        detected.mime !== file.mimetype
    ) {
        const error = new Error(
            "Invalid file content. Only PDF, JPG and PNG are allowed"
        );
        error.statusCode = 400;
        throw error;
    }

    return {
        mimeType: detected.mime,
        extension: ALLOWED_TYPES.get(detected.mime)
    };
};

module.exports = validateDocument;