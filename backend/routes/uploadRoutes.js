// routes/uploadRoutes.js
import express from 'express';
import multer from 'multer';
import { uploadAndGrade, getResults } from '../controllers/gradeController.js';
import path from 'path';

const router = express.Router();

// --- Multer Configuration for File Storage ---
// This stores the uploaded files on the server's local filesystem.
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // The folder where files will be saved
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to ensure only PDFs are uploaded
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDFs are allowed.'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// --- Route Definitions ---
// POST /api/upload: Handles the upload of solution and student PDFs
router.post('/upload', upload.fields([{ name: 'solution', maxCount: 1 }, { name: 'student', maxCount: 1 }]), uploadAndGrade);

// GET /api/results/:submissionId: Fetches the grading results for a submission
router.get('/results/:submissionId', getResults);

export default router;