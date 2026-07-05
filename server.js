const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path")
const bcrypt = require('bcrypt');
const Student = require("./models/user.js");
const nodemailer = require("nodemailer");
const otpStore = {}; // Temporary storage for OTP
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const feedbackRoutes = require("./routes/feedback");
const Admission = require("./models/Admission");
const adminRoutes = require("./routes/admin");
// const Enquiry = require("./models/Enquiry");



dotenv.config({ path: path.join(__dirname, ".env") });

const authRoutes = require("./routes/auth");

const phoneOTP = {};
const app = express();

app.get("/", (req, res) => {
    res.send("<h1>School Backend Server is Running Successfully! ✅</h1>");
});

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        "http://localhost:1234",
        "http://localhost:5173",
        "http://127.0.0.1:1234",
        "http://127.0.0.1:5173",
        "https://school-s6ur.vercel.app"
    ];

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());
app.use("/api/feedback", feedbackRoutes);
app.use("/api", authRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/upload", express.static(path.join(__dirname, "uploads")));
app.use("/api/admin", adminRoutes);

const visitorSchema = new mongoose.Schema({

    name: String,

    mobile: String,

    message: String,

    interest: String,

    type: String

}, {
    timestamps: true
});

const Visitor = mongoose.models.Visitor || mongoose.model(
    "Visitor",
    visitorSchema
);

// VISITOR FORM
app.post("/api/visitor", async(req, res) => {

    try {

        const newVisitor = new Visitor({
            name: req.body.name,
            mobile: req.body.mobile,
            message: req.body.message,
            interest: req.body.interest,
            type: "visitor"
        });

        await newVisitor.save();

        res.json({
            message: "Visitor Saved"
        });

    } catch (error) {

        console.log("Visitor save error:", error);

        res.status(500).json({
            message: "Something went wrong while saving visitor"
        });

    }
});

app.delete("/api/visitor/:id", async(req, res) => {

    try {

        await Visitor.findByIdAndDelete(req.params.id);

        res.json({
            message: "Visitor deleted successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Delete failed"
        });

    }

});

// GET ALL ENQUIRIES


const enquirySchema = new mongoose.Schema({

    name: {
        type: String
    },

    phone: {
        type: String
    },

    className: {
        type: String
    },

    message: {
        type: String
    },

    interest: {
        type: String
    }

}, {
    timestamps: true
});

// ADMISSION FORM
app.post("/api/admission", async(req, res) => {

    try {

        const newAdmission = new Admission({

            name: req.body.name,

            mobile: req.body.mobile,

            className: req.body.className,

            message: req.body.message

        });

        await newAdmission.save();

        res.json({
            success: true,
            message: "Admission submitted successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

});

app.get("/api/admission", async(req, res) => {

    try {

        const data = await Admission.find().sort({
            createdAt: -1
        });

        res.json(data);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Error fetching admissions"
        });

    }

});

app.delete("/api/admission/:id", async(req, res) => {

    try {

        await Admission.findByIdAndDelete(req.params.id);

        res.json({
            message: "Admission deleted successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Delete failed"
        });

    }

});

app.get("/api/enquiries", async(req, res) => {

    try {

        const data = await Admission.find()
            .sort({ createdAt: -1 });

        res.json(data);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Error fetching admissions"
        });

    }

});

app.get("/api/visitor", async(req, res) => {

    const data = await Visitor.find();

    res.json(data);
});

// --- 1. PAYMENT MODEL (Schema) ---
const paymentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true
    },

    studentName: {
        type: String,
        required: true
    },

    studentRoll: {
        type: String,
        required: true
    },

    studentClass: {
        type: String,
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    transactionId: {
        type: String,
        required: true,
        unique: true
    },

    status: {
        type: String,
        default: "Pending"
    },

    date: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});


const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

// --- 2. PAYMENT ROUTES ---

// Submit Payment (Student side)

app.post("/api/payment/submit", async(req, res) => {
    try {
        // 1. Yahan studentRoll aur studentClass ko add karein (Destructuring)
        const { studentId, studentName, studentRoll, studentClass, amount, transactionId, paymentMethod } = req.body;

        // Check duplicate transaction
        const existingTxn = await Payment.findOne({ transactionId });
        if (existingTxn) {
            return res.status(400).json({ message: "This Transaction ID is already submitted!" });
        }

        // 2. new Payment object mein ye dono fields pass karein
        const newPayment = new Payment({
            studentId,
            studentName,
            studentRoll, // Add this
            studentClass, // Add this
            amount,
            transactionId,
            paymentMethod
        });

        await newPayment.save();
        res.status(201).json({ message: "Payment submitted! Waiting for Admin approval." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during payment submission" });
    }
});

// Get Payment History (Student side)
app.get("/api/payment/history/:studentId", async(req, res) => {
    try {
        const history = await Payment.find({ studentId: req.params.studentId }).sort({ date: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: "Error fetching payment history" });
    }
});

// Update Status (Admin side - Future use)
app.put("/api/admin/payment/status", async(req, res) => {
    try {
        const { paymentId, status } = req.body;
        await Payment.findByIdAndUpdate(paymentId, { status });
        res.json({ message: "Payment status updated!" });
    } catch (error) {
        res.status(500).json({ message: "Status update failed" });
    }
});



// Yahan 'async' hona bahut zaroori hai
app.post("/api/admin/change-password", async(req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: "Password required" });
        }

        // Ab ye line error nahi degi
        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedAdmin = await Student.findOneAndUpdate({ role: "admin" }, { password: hashedPassword }, { new: true });

        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// 1. Send OTP Route
app.post("/api/admin/send-otp", async(req, res) => {
    try {

        const { email } = req.body;

        const admin = await Student.findOne({
            role: "admin",
            email
        });

        if (!admin) {
            return res.status(404).json({
                message: "Admin email not found"
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        otpStore[email] = {
            otp,
            expires: Date.now() + 5 * 60 * 1000
        };

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Admin Password Reset OTP",
            html: `
        <h2>School Management System</h2>

        <p>Your OTP is</p>

        <h1>${otp}</h1>

        <p>Valid for 5 minutes.</p>
      `
        });

        res.json({
            message: "OTP sent successfully"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Failed to send OTP"
        });

    }
});

// 2. Verify OTP and Change Password
app.post("/api/admin/verify-otp-reset", async(req, res) => {

    try {

        const {
            email,
            otp,
            newPassword
        } = req.body;

        const data = otpStore[email];

        if (!data) {

            return res.status(400).json({
                message: "OTP not found"
            });

        }

        if (Date.now() > data.expires) {

            delete otpStore[email];

            return res.status(400).json({
                message: "OTP Expired"
            });

        }

        if (otp !== data.otp) {

            return res.status(400).json({
                message: "Invalid OTP"
            });

        }

        const hash = await bcrypt.hash(
            newPassword,
            10
        );

        await Student.findOneAndUpdate({
            role: "admin",
            email
        }, {
            password: hash
        });

        delete otpStore[email];

        res.json({
            message: "Password updated successfully"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Server Error"
        });

    }

});

// --- ADMIN SIDE: Fetch All Pending Payments ---
app.get("/api/admin/pending-payments", async(req, res) => {
    try {
        // Sirf wo payments dhoondo jinka status 'Pending' hai
        const pendingPayments = await Payment.find({ status: "Pending" }).sort({ date: -1 });
        res.json(pendingPayments);
    } catch (error) {
        console.error("Error fetching pending payments:", error);
        res.status(500).json({ message: "Error fetching data from database" });
    }
});

// APPROVE PAYMENT
app.post("/api/admin/approve-payment", async(req, res) => {
    try {
        const { paymentId } = req.body;

        // 1. Payment find karo
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        // Agar payment pehle se approved hai toh dobara calculation na ho
        if (payment.status === "Approved") {
            return res.status(400).json({ message: "Payment is already approved!" });
        }

        // 2. Payment status ko approved mark karein
        payment.status = "Approved";
        await payment.save();

        // 3. Student ko dhoondhein uske Roll Number se
        const student = await Student.findOne({ rollNo: payment.studentRoll });

        if (student) {
            // Nayi paid fees calculate karein (Purani paid fees + Naya payment amount)
            const updatedPaidFees = (student.paidFees || 0) + payment.amount;
            student.paidFees = updatedPaidFees;

            // Agar paidFees totalFees ke barabar ya usse zyada ho jaye, toh status "Paid" karein
            if (updatedPaidFees >= (student.totalFees || 0) && student.totalFees > 0) {
                student.feeStatus = "Paid";
            } else {
                student.feeStatus = "Pending";
            }

            // Student document ko save karein
            await student.save();
        } else {
            return res.status(404).json({ message: "Payment approved, but student not found to update fees!" });
        }

        res.json({
            message: "Payment approved and student fee records updated successfully!"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Approval failed"
        });
    }
});


// REJECT PAYMENT
app.post("/api/admin/reject-payment", async(req, res) => {
    try {
        const { paymentId } = req.body;

        await Payment.findByIdAndUpdate(paymentId, {
            status: "Rejected"
        });

        res.json({
            message: "Payment rejected"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Reject failed"
        });
    }
});

app.post("/api/admin/forgot-password", async(req, res) => {
    const { answer, newPassword } = req.body;

    const admin = await Student.findOne({ role: "admin" });

    if (admin.securityAnswer === answer) {
        admin.password = newPassword;
        await admin.save();
        res.json({ message: "Password reset successful!" });
    } else {
        res.status(401).json({ message: "Wrong answer to security question!" });
    }
});


// Search
// Search Route - Ab ye crash nahi hoga!
app.get("/api/search", async(req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ message: "Search query is empty" });

        const searchRegex = { $regex: query, $options: "i" };

        // 1. Notices mein dhundo (Kyunki Notice model niche bana hua hai)
        const notices = await Notice.find({
            $or: [{ text: searchRegex }] // Aapke schema me field ka naam 'text' hai
        }).limit(5);

        // 2. Admissions mein dhundo (Kyunki Admission model upar imported hai)
        const admissions = await Admission.find({
            $or: [{ name: searchRegex }, { message: searchRegex }]
        }).limit(5);

        // Sabko ek object mein bhej do (Event aur Teacher hata diye hain taaki crash na ho)
        res.json({ notices, admissions, events: [], teachers: [] });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ message: "Server search error" });
    }
});

// --- NOTICE MODEL ---
const noticeSchema = new mongoose.Schema({
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const Notice = mongoose.model("Notice", noticeSchema);

// --- GET NOTICES ROUTE ---
app.get("/api/notices", async(req, res) => {
    try {
        const notices = await Notice.find().sort({ date: -1 });
        // Frontend ko sirf text ki array chahiye toh map use karein
        res.json(notices);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notices" });
    }
});

app.post("/api/notices", async(req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: "Notice text required" });
        }

        const newNotice = new Notice({ text });
        await newNotice.save();

        res.json({ message: "Notice added successfully" });
    } catch (error) {
        console.error("Notice error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE NOTICE
app.delete("/api/admin/notices/:id", async(req, res) => {
    try {
        const deletedNotice = await Notice.findByIdAndDelete(req.params.id);

        if (!deletedNotice) {
            return res.status(404).json({
                message: "Notice not found"
            });
        }

        res.json({
            message: "Notice deleted successfully"
        });

    } catch (error) {
        console.error("Delete Notice Error:", error);

        res.status(500).json({
            message: "Server error while deleting notice"
        });
    }
});

// Fee history admin
app.get("/api/admin/payment-history", async(req, res) => {

    try {

        const payments = await Payment.find()
            .sort({ createdAt: -1 });

        res.json(payments);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

});
app.delete("/api/admin/payment-history/:id", async(req, res) => {
    try {

        const payment = await Payment.findByIdAndDelete(req.params.id);

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        res.json({
            message: "Payment deleted successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Delete failed"
        });
    }
});

// otp for student password change
const sendPhoneOtp = async(phone, otp) => {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
        console.warn(`[OTP] FAST2SMS_API_KEY not set. Generated OTP for ${phone}: ${otp}`);
        return;
    }

    const params = new URLSearchParams({
        authorization: apiKey,
        route: "otp",
        variables_values: otp,
        numbers: phone
    });

    const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`SMS provider failed with status ${response.status}`);
    }
};

app.post("/api/send-phone-otp", async(req, res) => {
    try {
        const phone = String(req.body.phone || "").replace(/\D/g, "");

        if (!phone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        phoneOTP[phone] = otp;

        await sendPhoneOtp(phone, otp);

        res.json({ message: "OTP sent to phone" });
    } catch (err) {
        console.error("OTP send failed:", err);
        res.status(500).json({ message: "SMS failed" });
    }
});

app.post("/api/verify-phone-otp-change-password", async(req, res) => {
    try {
        const phone = String(req.body.phone || "").replace(/\D/g, "");
        const { otp, newPassword } = req.body;

        if (!phone || !otp || !newPassword) {
            return res.status(400).json({ message: "Phone, OTP and new password are required" });
        }

        if (phoneOTP[phone] !== String(otp)) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatedStudent = await Student.findOneAndUpdate({ number: Number(phone) }, { password: hashedPassword }, { new: true });

        delete phoneOTP[phone];

        if (!updatedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({ message: "Password changed successfully" });
    } catch (err) {
        console.error("Password change failed:", err);
        res.status(500).json({ message: "Password change failed" });
    }
});

app.get("/api/student/:id", async(req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json(student);
    } catch (err) {
        res.status(500).json({
            message: "Server Error"
        });
    }
});


// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error"
    });
});

const mongoUri = process.env.DB_CONNECT_STRING || process.env.MONGO_URI;

if (!mongoUri) {
    console.error("Missing MongoDB connection string. Set DB_CONNECT_STRING in Backend/.env");
    process.exit(1);
}

mongoose.connect(mongoUri)
    .then(() => console.log("DB connected"))
    .catch((err) => {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    });

// app.listen(3000, () => {
//     console.log("Server running 3000");
// });
// ✅ Ise replace karein code ke bilkul niche:
const PORT = process.env.BACKEND_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// ✅ Vercel serverless ke liye export
module.exports = app;