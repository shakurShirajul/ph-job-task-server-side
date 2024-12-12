import mongoose from "mongoose";

const tutorialSchema = new mongoose.Schema(
    {
        tutorial_title: {
            type: String,
            required: true,
        },
        tutorial_link: {
            type: String,
            required: true
        },
        tutorial_addedBy: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);
export const Tutorial = mongoose.model('Tutorial', tutorialSchema);


