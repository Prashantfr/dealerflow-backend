const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png"
];

const storage = multer.memoryStorage();

const upload = multer({
    storage,

    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },

    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(
                new Error("Only PDF, JPG and PNG files are allowed")
            );
        }

        cb(null, true);
    }
});

module.exports = upload;