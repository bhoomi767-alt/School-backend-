// const fs = require("fs");
// const path = require("path");
// const multer = require("multer");

// // const uploadDir = path.join(__dirname, "uploads");
// const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path.join(__dirname, 'uploads');
// fs.mkdirSync(uploadDir, { recursive: true });

// const storage = multer.diskStorage({
//     destination: function(req, file, cb) {
//         cb(null, uploadDir);
//     },
//     filename: function(req, file, cb) {
//         const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//         const ext = path.extname(file.originalname) || ".jpg";
//         cb(null, uniqueSuffix + ext);
//     }
// });

// const upload = multer({
//     storage,
//     limits: {
//         fileSize: 5 * 1024 * 1024
//     }
// });

// module.exports = upload;
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const uploadDir = process.env.NODE_ENV === "production" ? "/tmp/uploads" : path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const useCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

const storage = useCloudinary ?
    new(require("multer-storage-cloudinary").CloudinaryStorage)({
        cloudinary,
        params: {
            folder: "sunrise_academy_uploads",
            allowed_formats: ["jpg", "jpeg", "png"],
            public_id: (req, file) => {
                const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
                return uniqueSuffix;
            },
        },
    }) :
    multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname) || ".jpg";
            cb(null, uniqueSuffix + ext);
        },
    });

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;