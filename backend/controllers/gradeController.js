// controllers/gradeController.js
import PDFParser from "pdf2json"; // Using the stable pdf2json library
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai"; // Using Gemini
import Quiz from '../models/quizModel.js';
import Submission from '../models/submissionModel.js';
import dotenv from 'dotenv';

dotenv.config();

// --- Initialize the Gemini Client ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use a stable and available model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// --- NEW PDF Reading Function ---
// This function wraps the pdf2json library in a Promise
// and cleans the output text.
function readPdfText(filePath) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1);

        pdfParser.on("pdfParser_dataError", errData => {
            console.error("PDF Parsing Error:", errData.parserError);
            reject(new Error(errData.parserError));
        });

        pdfParser.on("pdfParser_dataReady", () => {
            let fullText = pdfParser.getRawTextContent();
            // --- FIX: Remove page break artifacts ---
            fullText = fullText.replace(/----------------Page\s\(\d+\)\sBreak----------------/g, '').trim();
            resolve(fullText);
        });

        pdfParser.loadPDF(filePath);
    });
}


// --- Helper Functions ---
const parseSolutionText = (text) => {
    const questions = [];
    const questionBlocks = text.split(/(?=\d+\.\s)/).filter(block => block.trim() !== '');
    questionBlocks.forEach((block) => {
        const answerMatch = block.match(/Answer[:–\s]+([\s\S]*)/i);
        if (answerMatch) {
            const questionText = block.substring(0, answerMatch.index).trim();
            const answerText = answerMatch[1].trim();
            const questionNumberMatch = questionText.match(/^(\d+)\./);
            if (questionNumberMatch) {
                questions.push({
                    questionNumber: parseInt(questionNumberMatch[1], 10),
                    questionText: questionText,
                    answerText: answerText,
                });
            }
        }
    });
    return questions;
};

// --- REWRITTEN Student Answer Parsing Function ---
const parseStudentText = (text, solutionQuestions) => {
    const answers = [];
    const studentBlocks = text.split(/(?=\d+\.\s)/).filter(block => block.trim() !== '');

    // Create a map of question number to text block for easy lookup
    const studentBlockMap = new Map();
    studentBlocks.forEach(block => {
        const match = block.match(/^(\d+)\./);
        if (match) {
            studentBlockMap.set(parseInt(match[1], 10), block.trim());
        }
    });

    solutionQuestions.forEach(solQuestion => {
        const studentBlock = studentBlockMap.get(solQuestion.questionNumber);
        let studentAnswer = "No answer provided.";

        if (studentBlock) {
            // Try to find the answer text marked with "Answer:"
            // The 's' flag allows '.' to match newline characters for multi-line answers.
            const answerMatch = studentBlock.match(/Answer[:–\s]+(.*)/is);
            
            if (answerMatch && answerMatch[1]) {
                // If "Answer:" is found, this is the most reliable way to get the answer.
                studentAnswer = answerMatch[1].trim();
            } else {
                // Fallback: if "Answer:" is not found, remove the original question text.
                // This is less reliable but a good backup.
                const answerPart = studentBlock.replace(solQuestion.questionText, '').trim();
                
                // Only update the answer if the replacement actually changed the string.
                // This prevents returning the whole block if the replacement fails.
                if (answerPart && answerPart !== studentBlock) { 
                    studentAnswer = answerPart;
                }
            }
        }
        
        answers.push({
            questionNumber: solQuestion.questionNumber,
            studentAnswer: studentAnswer,
        });
    });

    return answers;
};

// --- UPDATED AI SCORING FUNCTION WITH RETRY LOGIC ---
async function getAIScoreAndFeedback(correctAnswer, studentAnswer) {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const prompt = `
                Please act as an expert grader. Compare the following student's answer to the correct solution.
                Provide a score from 0 to 100 based on semantic similarity, correctness, and completeness.
                Also, provide concise, constructive feedback for the student.

                Correct Solution: "${correctAnswer}"
                Student's Answer: "${studentAnswer}"

                Your entire response MUST be a valid JSON object with two keys: "score" (a number from 0-100) and "feedback" (a string).
                Example: {"score": 85, "feedback": "Your answer is mostly correct but could include more detail on..."}
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedResult = JSON.parse(jsonString);

            return {
                score: Number(parsedResult.score) || 0,
                feedback: parsedResult.feedback || "Could not generate feedback.",
            };

        } catch (error) {
            // Check if it's a 503 error and if we have retries left
            if (error.status === 503 && i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 2000; // Exponential backoff: 2s, 4s
                console.log(`Model is overloaded. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // If it's not a 503 or we've run out of retries, throw the error
                console.error("Error with Gemini API:", error);
                // We still return a default score object so the whole process doesn't halt
                return { score: 0, feedback: "Error during AI grading." };
            }
        }
    }
    // This part is reached only if all retries fail
    return { score: 0, feedback: "AI model is currently unavailable after multiple retries." };
}


// --- Main Controller Logic (No changes here) ---
export const uploadAndGrade = async (req, res) => {
    if (!req.files || !req.files.solution || !req.files.student) {
        return res.status(400).json({ message: 'Both solution and student PDF files are required.' });
    }
    const solutionFile = req.files.solution[0];
    const studentFile = req.files.student[0];
    let submission;
    try {
        const quiz = new Quiz({
            solutionPdfPath: solutionFile.path,
            fileName: solutionFile.originalname,
        });
        submission = new Submission({
            quizId: quiz._id,
            studentPdfPath: studentFile.path,
            fileName: studentFile.originalname,
            status: 'processing',
        });
        await quiz.save();
        await submission.save();
        res.status(202).json({
            message: 'Files uploaded successfully! Grading is in progress.',
            submissionId: submission._id,
        });

        const solutionDataText = await readPdfText(solutionFile.path);
        const studentDataText = await readPdfText(studentFile.path);

        const solutionQuestions = parseSolutionText(solutionDataText);
        if (solutionQuestions.length === 0) throw new Error("Could not parse questions from the solution PDF.");
        
        quiz.questions = solutionQuestions;
        await quiz.save();
        
        const studentAnswers = parseStudentText(studentDataText, solutionQuestions);
        const gradedResults = [];
        let totalScore = 0;
        for (const solQuestion of solutionQuestions) {
            const studentAns = studentAnswers.find(sa => sa.questionNumber === solQuestion.questionNumber);
            const studentAnswerText = studentAns ? studentAns.studentAnswer : "No answer provided.";
            const { score, feedback } = await getAIScoreAndFeedback(solQuestion.answerText, studentAnswerText);
            gradedResults.push({
                questionNumber: solQuestion.questionNumber,
                studentAnswer: studentAnswerText,
                correctAnswer: solQuestion.answerText,
                score: score,
                feedback: feedback,
            });
            totalScore += score;
        }
        submission.status = 'completed';
        submission.results = gradedResults;
        submission.overallScore = gradedResults.length > 0 ? Math.round(totalScore / gradedResults.length) : 0;
        await submission.save();
        console.log(`Grading completed for submission ID: ${submission._id}`);
    } catch (error) {
        console.error('An error occurred during the grading process:', error);
        if (submission) {
            submission.status = 'failed';
            await submission.save();
        }
    }
};

export const getResults = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const submission = await Submission.findById(submissionId).populate({
            path: 'quizId',
            select: 'fileName'
        });
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found.' });
        }
        res.status(200).json(submission);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ message: 'Server error while fetching results.' });
    }
};
