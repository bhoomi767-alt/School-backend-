const mongoose = require("mongoose");

const admissionSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    mobile: {
        type: String,
        required: true
    },

    className: {
        type: String,
        required: true
    },

    message: {
        type: String
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Admission", admissionSchema);