// server.js
// Main entry point for the backend

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import uploadRoutes from './routes/uploadRoutes.js';

// --- Basic Setup ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors({
    origin: 'http://localhost:5173', // Adjust for your frontend URL in production
    credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in the .env file.");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

// --- API Routes ---
app.get('/', (req, res) => {
    res.send('Q&A Checker API is running...');
});

app.use('/api', uploadRoutes);


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
