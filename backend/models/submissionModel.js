// models/submissionModel.js
import mongoose from 'mongoose';

const gradedAnswerSchema = new mongoose.Schema({
    questionNumber: { type: Number, required: true },
    studentAnswer: { type: String, required: true },
    correctAnswer: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    feedback: { type: String, default: '' },
});

const submissionSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    studentPdfPath: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
    },
    overallScore: {
        type: Number,
        default: 0,
    },
    results: [gradedAnswerSchema],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
