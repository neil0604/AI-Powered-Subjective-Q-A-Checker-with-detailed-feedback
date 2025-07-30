// models/quizModel.js
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    questionNumber: { type: Number, required: true },
    questionText: { type: String, required: true },
    answerText: { type: String, required: true },
});

const quizSchema = new mongoose.Schema({
    solutionPdfPath: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    questions: [questionSchema],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;