import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { database } from "./database/mongodb.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import verifyToken from "./middlewares/verifyToken.js";
import { ObjectId } from "mongodb";
import { Users } from "./models/users.js"
import { Lesson } from "./models/lessons.js";
import { Vocabulary } from "./models/vocabularies.js";
import { Tutorial } from "./models/tutorials.js";

const app = express();
const PORT = process.env.PORT || 5000;

database();

///Middlewares
app.use(express.json());
app.use(
    cors({
        origin: ["http://localhost:5173"],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    })
);
app.use(cookieParser());

// Authentication Related API
app.post("/jwt", async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
    });
    res
        .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true, data: token });
});

app.post("/validate-token", async (req, res) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized" });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).send({
                message: "Unauthorized",
            });
        }
        const userData = await Users.find({ user_email: decoded.email });
        res.status(200).json(userData);
    });
});


// Login API
app.post('/login', async (req, res) => {
    try {
        const { user_email, user_password } = await req.body;

        const userData = await Users.findOne({ user_email });

        if (userData) {
            const hashedPassword = userData.user_password;
            const passwordValidated = await bcrypt.compare(
                user_password,
                hashedPassword
            );
            if (passwordValidated) {
                return res.status(200).json({ message: "Password Matched", userData });
            }
            return res.status(400).json({
                message: "Password doesn't Match",
            });
        }
        return res.status(404).json({
            message: "User Not Found",
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
})

// Registartion API
app.post("/register", async (req, res) => {
    try {
        const { user_name, user_email, user_password, user_image } = await req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user_password, salt);
        const createdUserData = await Users.create({
            user_name,
            user_email,
            user_password: hashedPassword,
            user_image
        });

        return res.status(201).json({
            message: "User registered successfully",
            user: createdUserData,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Email already exists",
            });
        }
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

// Logout API
app.post("/logout", async (req, res) => {
    res
        .clearCookie("token", { maxAge: 0, sameSite: "none", secure: true })
        .send({ success: true });
});

// Checking Admin Or User API
app.get('/users/checking', verifyToken, async (req, res) => {
    try {

        if (req.query.email !== req.user.email) {
            return res.status(403).send({ message: 'Forbidden access. Emails do not match.' });
        }

        const user = await Users.findOne({ user_email: req.query.email });

        if (!user) {
            return res.status(404).send({ message: 'User not found.' });
        }

        const validation = user.user_role === req.query.role;

        res.status(200).send({ validation });

    } catch (error) {
        console.error('Error checking user role:', error);
        res.status(500).send({ message: 'Internal server error. Please try again later.' });
    }
});


// Get all users API
app.get("/users", verifyToken, async (req, res) => {
    if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    const query = await Users.findOne({ user_email: req.query.email });
    if (query.user_role === "admin") {
        const data = await Users.find({ user_email: { $ne: req.query.email } }, { user_password: 0 });
        return res.status(200).json(data);
    }
});


/* All Vocabulary API */

// Create Vocabulary API
app.post("/create-vocabulary", verifyToken, async (req, res) => {
    if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    const { vocabulary_word, vocabulary_pronunciation, vocabulary_meaning, vocabulary_whenToSay, vocabulary_lessonId, } = req.body;


    try {
        // Create a new vocabulary
        const newVocabulary = new Vocabulary({
            vocabulary_word,
            vocabulary_pronunciation,
            vocabulary_meaning,
            vocabulary_whenToSay,
            vocabulary_lesson: vocabulary_lessonId,
            vocabulary_addedBy: req.query.email,
        });

        // Save the vocabulary
        const savedVocabulary = await Vocabulary.create(newVocabulary);

        // Find the lesson and update its vocabularies
        const updatedLesson = await Lesson.findByIdAndUpdate(
            vocabulary_lessonId,
            { $push: { lesson_vocabularies: savedVocabulary._id } }, // Add vocabulary ID to lesson_vocabularies
            { new: true } // Return the updated lesson
        );

        if (!updatedLesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }

        res.status(201).json({
            message: "Vocabulary created and added to the lesson successfully",
            vocabulary: savedVocabulary,
            lesson: updatedLesson
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get ALL Vocabulary API
app.get("/vocabularies", verifyToken, async (req, res) => {
    if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    const data = await Vocabulary.find({});
    return res.status(200).json(data);
});

// Delete Vocabulary API
app.delete("/delete-vocabulary", verifyToken, async (req, res) => {
    try {
        if (req.query.email !== req.user.email) {
            return res.status(403).send({ message: "Forbidden access: Email mismatch." });
        }
        const user = await Users.findOne({ user_email: req.query.email });
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }
        if (user.user_role !== "admin") {
            return res.status(403).send({ message: "Forbidden access: Insufficient privileges." });
        }
        const result = await Vocabulary.deleteOne({ _id: new ObjectId(req.query.id) });
        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Vocabulary not found or already deleted." });
        }
        return res.status(200).json({
            message: "Vocabulary deleted successfully.",
            deletedVocabularyId: req.query.id,
        });
    } catch (error) {
        console.error("Error deleting vocabulary:", error);
        return res.status(500).send({ message: "An error occurred while deleting the vocabulary." });
    }
});

// Edit Vocabulary API
app.patch('/edit-vocabulary', verifyToken, async (req, res) => {
    try {
        if (req.query.email !== req.user.email) {
            return res.status(403).send({ message: "Forbidden access: Email mismatch." });
        }
        const user = await Users.findOne({ user_email: req.query.email });
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }
        if (user.user_role !== "admin") {
            return res.status(403).send({ message: "Forbidden access: Insufficient privileges." });
        }
        const { id } = req.query;
        const updatedData = req.body;

        if (!id) {
            return res.status(400).send({ message: "Vocabulary ID is required." });
        }
        const updatedVocabulary = await Vocabulary.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true }
        );

        if (!updatedVocabulary) {
            return res.status(404).send({ message: "Vocabulary not found." });
        }
        res.status(200).send({
            message: "Vocabulary updated successfully.",
            data: updatedVocabulary,
        });
    } catch (error) {
        console.error("Error updating vocabulary:", error);
        res.status(500).send({
            message: "An error occurred while updating the vocabulary.",
            error: error.message,
        });
    }
});


/* All Lessons API */

// Create Lessons API
app.post("/create-lesson", verifyToken, async (req, res) => {
    try {
        if (req.body.email !== req.user.email) {
            return res.status(403).json({ message: "Forbidden access: email mismatch." });
        }
        const user = await Users.findOne({ user_email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        if (user.user_role !== "admin") {
            return res.status(403).json({ message: "Access denied. Only admins can create lessons." });
        }
        const { lesson_title, lesson_number } = req.body;

        if (!lesson_title || !lesson_number) {
            return res.status(400).json({ message: "Lesson title and number are required." });
        }

        if (isNaN(lesson_number) || lesson_number <= 0) {
            return res.status(400).json({ message: "Lesson number must be a positive number." });
        }
        const existingLesson = await Lesson.findOne({ lesson_number });
        if (existingLesson) {
            return res.status(400).json({ message: `Lesson number ${lesson_number} already exists. Please use a unique number.` });
        }
        const newLesson = await Lesson.create(req.body);
        return res.status(200).json({
            message: "Lesson created successfully.",
            data: newLesson,
        });
    } catch (error) {
        console.error("Error creating lesson:", error);
        return res.status(500).json({
            message: "An error occurred while creating the lesson. Please try again later.",
            error: error.message,
        });
    }
});
// Get Lessons API
app.get("/lessons", verifyToken, async (req, res) => {
    try {
        if (req.query.email !== req.user.email) {
            return res.status(403).json({ message: "Forbidden access: email mismatch." });
        }
        const lessons = await Lesson.find({});
        return res.status(200).json({
            message: "Lessons retrieved successfully.",
            lessons
        });
    } catch (error) {
        console.error("Error fetching lessons:", error);
        return res.status(500).json({
            message: "An error occurred while fetching lessons. Please try again later.",
            error: error.message,
        });
    }
});
// Delete Lessons API
app.delete("/delete-lesson", verifyToken, async (req, res) => {
    try {
        if (req.query.email !== req.user.email) {
            return res.status(403).json({ message: "Forbidden access: User email mismatch." });
        }

        const user = await Users.findOne({ user_email: req.query.email });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        if (user.user_role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Only admins can delete lessons." });
        }
        const deleteResult = await Lesson.deleteOne({ _id: new ObjectId(req.query.id) });
        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ message: "Lesson not found or already deleted." });
        }
        return res.status(200).json({ message: "Lesson deleted successfully.", data: deleteResult });
    } catch (error) {
        console.error("Error deleting lesson:", error);
        return res.status(500).json({ message: "An error occurred while deleting the lesson.", error: error.message });
    }
});

// Edit Lessons API
app.patch("/edit-lesson", verifyToken, async (req, res) => {
    try {
        if (req.query.email !== req.user.email) {
            return res.status(403).json({ message: "Forbidden access" });
        }

        const user = await Users.findOne({ user_email: req.query.email });
        if (!user || user.user_role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        const updateData = req.body;

        const duplicate = await Lesson.findOne({ lesson_number: req.body.lesson_number });

        const result = await Lesson.findByIdAndUpdate(
            req.query.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in edit-lesson API:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


// Update User Role API
app.patch("/update-role", verifyToken, async (req, res) => {
    if (req.body.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    const query = await Users.findOne({ user_email: req.body.email });
    if (query.user_role === "admin") {
        const data = await Users.updateOne({ _id: new ObjectId(req.body.id) }, { $set: { user_role: req.body.role } });
        return res.status(200).json(data);
    }
});


// Add Tutorial API
app.post('/add-tutorial', verifyToken, async (req, res) => {
    try {
        if (req.query.email !== req.user.email) {
            return res.status(403).json({ message: "Forbidden access" });
        }

        const user = await Users.findOne({ user_email: req.query.email });
        if (!user || user.user_role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }
        const { tutorial_title, tutorial_link } = req.body;
        if (!tutorial_title || !tutorial_link) {
            return res.status(400).json({ message: "Tutorial title and link are required" });
        }
        const newTutorial = {
            tutorial_title,
            tutorial_link,
            tutorial_addedBy: req.query.email,
        };
        const responseTutorial = await Tutorial.create(newTutorial);
        return res.status(201).json({
            message: "Tutorial added successfully",
            tutorial: responseTutorial
        });
    } catch (error) {
        console.error("Error in add-tutorial API:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Get Tutorial API
app.get('/tutorials', verifyToken, async (req, res) => {
    try {
        if (req.query.email !== req.user.email) {
            return res.status(403).json({ message: "Forbidden access" });
        }
        const tutorial = await Tutorial.find({});
        return res.status(201).json(tutorial);
    } catch (error) {
        console.error("Error in add-tutorial API:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
app.get('/', (req, res) => {
    res.send("Hello World");
})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});