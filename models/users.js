import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    user_name : {
        type : String,
        required: true,
    },
    user_email : {
        type: String,
        required: true,
        unique: true
    },
    user_image :{
        type: String,
        required: true,
    },
    user_role : {
        type: String,
        default: "user",
    },
    user_join: {
        type: Date,
        default: Date.now,
    },
    user_password : {
        type: String,
        required: true,
    }
})

export const Users = mongoose.model("users", userSchema)