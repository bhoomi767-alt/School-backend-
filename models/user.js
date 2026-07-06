const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 20
    },
    number: {
        type: Number,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        default: ""
    },
    password: {
        type: String,
        required: true
    },
    rollNo: {
        type: String,
        required: true,
    },
    fatherName: {
        type: String,
        default: ""
    },

    dob: {
        type: String,
        default: ""
    },

    aadharPhoto: {
        type: String,
        default: ""
    },
    photo: {
        type: String,
        default: ""
    },
    studentClass: {
        type: String,

        default: ""
    },
    percentage: {
        type: Number,
        default: 0
    },
    attendance: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ["admin", "student"],
        default: "student"
    },
    // Fees
    totalFees: {
        type: Number,
        required: true,
        default: 0,
    },

    paidFees: {
        type: Number,
        required: true,
        default: 0,
    },

    feeStatus: {
        type: String,
        enum: ["Paid", "Pending"],
        required: true,
        default: "Pending",
    },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);