import mongoose from "mongoose";
const vocabularySchema = new mongoose.Schema(
    {
        vocabulary_word: {
            type: String,
            required: true,
            trim: true
        },
        vocabulary_pronunciation: {
            type: String,
            required: true
        },
        vocabulary_meaning:{
            type: String,
            required: true
        },
        vocabulary_whenToSay: {
            type: String,
            required: true
        },
        vocabulary_lesson: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true
        }],
        vocabulary_addedBy: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);
export const Vocabulary = mongoose.model('Vocabulary', vocabularySchema);


