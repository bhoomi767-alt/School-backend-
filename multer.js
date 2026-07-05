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

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// 1. Cloudinary Configure karein (Aapki env keys se connect karega)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Local Disk (/tmp) hata kar Cloudinary Storage set karein
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "sunrise_academy_uploads", // Cloudinary dashboard me is naam ka folder banega
        allowed_formats: ["jpg", "jpeg", "png"],
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            return uniqueSuffix;
        }
    },
});

// 3. Multer Middleware Initialization
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

module.exports = upload;