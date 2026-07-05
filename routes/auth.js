const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
// const multer = require("multer");
const upload = require("../multer");

const router = express.Router();

const getStoredPhotoValue = (file) => {
    if (!file) return "";

    if (typeof file.filename === "string" && file.filename.trim()) {
        return `uploads/${file.filename}`;
    }

    if (typeof file.path === "string" && file.path.trim()) {
        const normalizedPath = file.path.replace(/\\/g, "/");
        const uploadsPrefix = "/uploads/";
        if (normalizedPath.includes(uploadsPrefix)) {
            return normalizedPath.split(uploadsPrefix).pop().startsWith("uploads/") ? normalizedPath.split(uploadsPrefix).pop() : normalizedPath.split(uploadsPrefix).pop();
        }
        return normalizedPath;
    }

    return "";
};

// REGISTER
router.post(
    "/register",
    upload.fields([
        { name: "photo", maxCount: 1 },
        { name: "aadharPhoto", maxCount: 1 },
    ]),
    async(req, res) => {
        try {
            // console.log("BODY:", req.body);
            const totalFees = Number(req.body.totalFees || 0);
            const paidFees = Number(req.body.paidFees || 0);
            const {
                name,
                number,
                password,
                rollNo,
                role,
                feeStatus,
                studentClass,
                percentage,
                attendance,
                fatherName,
                dob
            } = req.body;
            const normalizedNumber = String(number).replace(/\D/g, "").slice(0, 10);

            if (!normalizedNumber || !password || !name) {
                return res.status(400).json({
                    message: "Name, Mobile number, and Password are required."
                });
            }


            if (!/^\d{10}$/.test(normalizedNumber)) {
                return res.status(400).json({
                    message: "Mobile number must be exactly 10 digits"
                });
            }


            const isValidPassword =
                password.length >= 8 &&
                password[0] === password[0].toUpperCase() &&
                /[0-9]/.test(password) &&
                /[@$!%*?&]/.test(password);

            // console.log("PASSWORD VALID:", isValidPassword);

            if (!isValidPassword) {
                return res.status(400).json({
                    message: "Password must start with capital letter, contain number, special character and be at least 8 characters long"
                });
            }


            const existingUser = await User.findOne({ number: Number(normalizedNumber) });
            if (existingUser) {
                return res.status(400).json({
                    message: "User already exists"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const uploadedPhoto = req.files && req.files.photo && req.files.photo[0] ?
                getStoredPhotoValue(req.files.photo[0]) : "";

            const uploadedAadhar = req.files && req.files.aadharPhoto && req.files.aadharPhoto[0] ?
                getStoredPhotoValue(req.files.aadharPhoto[0]) :
                "";

            const newUser = new User({
                name,
                number: Number(normalizedNumber),
                password: hashedPassword,
                role: role || "student",

                rollNo: role === "student" ? rollNo : undefined,
                studentClass: role === "student" ? studentClass : undefined,

                totalFees: role === "student" ? totalFees : 0,
                paidFees: role === "student" ? paidFees : 0,

                feeStatus: role === "student" ?
                    (paidFees >= totalFees && totalFees > 0 ? "Paid" : "Pending") : undefined,

                percentage: role === "student" ? Number(percentage || 0) : 0,
                attendance: role === "student" ? Number(attendance || 0) : 0,

                photo: role === "student" ? uploadedPhoto : "",

                fatherName: role === "student" ? fatherName : "",

                dob: role === "student" ? dob : "",

                aadharPhoto: role === "student" ? uploadedAadhar : ""
            });


            await newUser.save();

            return res.status(201).json({
                message: "Registered successfully",
                user: {
                    _id: newUser._id,
                    name: newUser.name,
                    number: newUser.number,
                    role: newUser.role,
                    rollNo: newUser.rollNo,
                    photo: newUser.photo,
                    studentClass: newUser.studentClass,
                    feeStatus: newUser.feeStatus,
                    percentage: newUser.percentage,
                    attendance: newUser.attendance,
                    totalFees: newUser.totalFees,
                    paidFees: newUser.paidFees,
                    fatherName: newUser.fatherName,
                    dob: newUser.dob,
                    aadharPhoto: newUser.aadharPhoto
                }
            });

        } catch (error) {

            // console.error("REGISTER ERROR:", error);
            return res.status(500).json({
                message: "Internal Server Error during registration",
                error: error.message
            });
        }
    });


// LOGIN
router.post("/login", async(req, res) => {
    const { number, password } = req.body;

    const normalizedNumber = String(number).replace(/\D/g, "").slice(0, 10);
    const user = await User.findOne({ number: Number(normalizedNumber) });

    if (!user) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch) {
        return res.status(401).json({
            message: "Wrong password"
        });
    }

    const token = jwt.sign({ id: user._id },
        process.env.JWT_SECRET || "school_project_secret_key_123", { expiresIn: "1d" }
    );

    return res.status(200).json({
        message: "Login successful",
        token,
        role: user.role,
        user: {
            _id: user._id,
            name: user.name,
            number: user.number,
            rollNo: user.rollNo,
            photo: user.photo,
            studentClass: user.studentClass,
            feeStatus: user.feeStatus,
            percentage: user.percentage,
            attendance: user.attendance,

            totalFees: user.totalFees,
            paidFees: user.paidFees,
            fatherName: user.fatherName,
            dob: user.dob,
            aadharPhoto: user.aadharPhoto
        }
    });
});


// PROTECTED ROUTE
router.get("/profile", authMiddleware, async(req, res) => {
    res.json({
        message: "Welcome to dashboard",
        userId: req.user.id
    });
});

router.get("/students", async(req, res) => {
    try {
        const students = await User.find({ role: "student" });

        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching students"
        });
    }
});

router.get("/student/:id", async(req, res) => {
    try {
        const student = await User.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json(student);

    } catch (error) {
        res.status(500).json({
            message: "Error fetching student",
            error: error.message
        });
    }
});

router.put(
    "/student/:id",
    upload.fields([
        { name: "photo", maxCount: 1 },
        { name: "aadharPhoto", maxCount: 1 }
    ]),
    async(req, res) => {
        try {
            const student = await User.findById(req.params.id);

            if (!student) {
                return res.status(404).json({
                    message: "Student not found"
                });
            }

            const updates = {};

            if (req.body.name) {
                updates.name = req.body.name.trim();
            }

            if (req.body.number) {
                const normalizedNumber = String(req.body.number).replace(/\D/g, "").slice(0, 10);

                if (!/^\d{10}$/.test(normalizedNumber)) {
                    return res.status(400).json({
                        message: "Mobile number must be exactly 10 digits"
                    });
                }

                updates.number = Number(normalizedNumber);
            }

            if (req.body.password) {
                const password = req.body.password;
                const isValidPassword =
                    password.length >= 8 &&
                    password[0] === password[0].toUpperCase() &&
                    /[0-9]/.test(password) &&
                    /[@$!%*?&]/.test(password);

                if (!isValidPassword) {
                    return res.status(400).json({
                        message: "Password must start with capital letter, contain number, special character and be at least 8 characters long"
                    });
                }

                updates.password = await bcrypt.hash(password, 10);
            }

            if (req.body.rollNo !== undefined) {
                updates.rollNo = req.body.rollNo;
            }

            if (req.body.totalFees !== undefined) {
                updates.totalFees = Number(req.body.totalFees || 0);
            }

            if (req.body.paidFees !== undefined) {
                updates.paidFees = Number(req.body.paidFees || 0);
            }

            const total =
                updates.totalFees !== undefined ?
                updates.totalFees :
                student.totalFees;

            const paid =
                updates.paidFees !== undefined ?
                updates.paidFees :
                student.paidFees;

            updates.feeStatus =
                paid >= total && total > 0 ?
                "Paid" :
                "Pending";

            if (req.body.studentClass !== undefined) {
                updates.studentClass = req.body.studentClass;
            }

            if (req.body.percentage !== undefined) {
                updates.percentage = Number(req.body.percentage || 0);
            }

            if (req.body.attendance !== undefined) {
                updates.attendance = Number(req.body.attendance || 0);
            }

            if (req.body.role) {
                updates.role = req.body.role;
            }
            if (req.body.fatherName !== undefined) {
                updates.fatherName = req.body.fatherName;
            }

            if (req.body.dob !== undefined) {
                updates.dob = req.body.dob;
            }

            if (req.files && req.files.photo) {
                updates.photo = getStoredPhotoValue(req.files.photo[0]);
            }

            if (req.files && req.files.aadharPhoto) {
                updates.aadharPhoto = getStoredPhotoValue(req.files.aadharPhoto[0]);
            }

            const updatedStudent = await User.findByIdAndUpdate(req.params.id, updates, { new: true });

            return res.status(200).json({
                message: "Student updated successfully",
                student: updatedStudent
            });
        } catch (error) {
            // console.log("Update Error:", error);

            return res.status(500).json({
                message: "Update failed"
            });
        }
    });

router.delete("/student/:id", async(req, res) => {
    try {
        const deletedStudent = await User.findByIdAndDelete(req.params.id);

        if (!deletedStudent) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        return res.status(200).json({
            message: "Student deleted successfully"
        });
    } catch (error) {
        console.log("Delete Error:", error);

        return res.status(500).json({
            message: "Delete failed"
        });
    }
});


module.exports = router;