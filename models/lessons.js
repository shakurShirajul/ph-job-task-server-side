import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
    {
        lesson_title: {
            type: String,
            required: true,
            trim: true
        },
        lesson_number: {
            type: String,
            required: true,
            unique: true
        },
        lesson_vocabulary: {
            type: Number,
            default: 0
        },
        lesson_vocabularies: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vocabulary'
        }]
    },
    {
        timestamps: true
    }
);


lessonSchema.pre('save', function (next) {
    this.lesson_vocabulary = this.lesson_vocabularies.length; 
    next();
});


export const Lesson = mongoose.model('Lesson', lessonSchema);

