const express = require("express");
const router = express.Router();

const Feedback = require("../models/Feedback");


// ADD FEEDBACK
router.post("/", async(req, res) => {

    try {

        const { name, message } = req.body;

        if (!name || !message) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const feedback = new Feedback({
            name,
            message,
        });

        await feedback.save();

        res.json({
            message: "Feedback submitted successfully",
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error",
        });
    }
});



// GET ALL FEEDBACKS
router.get("/", async(req, res) => {

    try {

        const feedbacks = await Feedback.find().sort({
            createdAt: -1,
        });

        res.json(feedbacks);

    } catch (error) {

        res.status(500).json({
            message: "Error fetching feedbacks",
        });
    }
});



// DELETE FEEDBACK
router.delete("/:id", async(req, res) => {

    try {

        await Feedback.findByIdAndDelete(req.params.id);

        res.json({
            message: "Feedback deleted successfully",
        });

    } catch (error) {

        res.status(500).json({
            message: "Delete failed",
        });
    }
});

module.exports = router;