import mongoose from "mongoose";

const vocabularySchema = new mongoose.Schema(
    {
        word: {
            type: String,
            required: true,
            trim: true
        },
        pronunciation: {
            type: String,
            required: true
        },
        whenToSay: {
            type: String,
            required: true
        },
        lesson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true
        },
        adminEmail: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);
export const Vocabulary = mongoose.model('Vocabulary', vocabularySchema);


