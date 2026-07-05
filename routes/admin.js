const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const router = express.Router();

router.post("/login", async(req, res) => {
    try {
        const { mobile, password } = req.body;

        const admin = await Admin.findOne({ mobile });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid Mobile Number",
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid Password",
            });
        }

        const token = jwt.sign({
                id: admin._id,
                mobile: admin.mobile,
            },
            process.env.JWT_SECRET, { expiresIn: "1d" }
        );

        res.json({
            success: true,
            token,
            role: "admin",
            admin: {
                id: admin._id,
                mobile: admin.mobile
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

module.exports = router;