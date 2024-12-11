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
        expiresIn: "1h",
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
        const { user_name, user_email, user_password } = await req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user_password, salt);
        const createdUserData = await Users.create({
            user_name,
            user_email,
            user_password: hashedPassword,
        });
        return res.status(201).json({
            message: "User registered successfully",
            user: createdUserData,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Username or email already exists",
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
    if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    console.log(req.query.email)
    const query = { user_email: req.query.email };

    const user = await Users.find(query);
    let validation = false;
    if (user) {
        validation = user[0]?.user_role === req.query.role;
    }
    res.send({ validation });
})

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

// Create Lessons API
app.post("/create-lesson", verifyToken, async (req, res) => {
    if (req.body.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    const query = await Users.findOne({ user_email: req.body.email });
    if (query.user_role === "admin") {
        const data = await Lesson.create(req.body);
        return res.status(200).json(data);
    }
});

// Delete Lessons API
app.delete("/delete-lesson", verifyToken, async (req, res) => {
    if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    const query = await Users.findOne({ user_email: req.query.email });
    if(query.user_role === "admin") {
        const data = await Lesson.deleteOne({ _id: new ObjectId(req.query.id) });
        return res.status(200).json(data);
    }
});


// Get Lessons API
app.get("/lessons", verifyToken, async (req, res) => {
    if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    // const query = await Users.findOne({ user_email: req.body.email });
    // if (query.user_role === "admin") {
    const data = await Lesson.find({});
    return res.status(200).json(data);
    // }
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


app.get('/', (req, res) => {
    res.send("Hello World");
})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});