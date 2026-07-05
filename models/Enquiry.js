const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({

    name: String,

    mobile: String,

    studentClass: String,

    message: String,

    type: String,

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model(
    "Enquiry",
    enquirySchema
);