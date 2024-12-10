import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { database } from "./database/mongodb.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import verifyToken from "./middlewares/verifyToken.js";

import { Users } from "./models/users.js"

const app = express();
const PORT = process.env.PORT || 5000;

database();

///Middlewares
app.use(express.json());
app.use(
    cors({
        origin: ["http://localhost:5173"],
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

        console.log(user_email, user_password);
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
       
        console.log(user_name, user_email, user_password);

        // if (!validator.isEmail(user_email)) {
        //     return res.status(400).json({ message: "Invalid email format" });
        // }

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
        // Check for MongoDB duplicate key error (e.g., unique constraint on user_name)
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Username or email already exists",
            });
        }

        // Send generic error response
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


app.get('/', (req, res) => {
    res.send("Hello World");
})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});