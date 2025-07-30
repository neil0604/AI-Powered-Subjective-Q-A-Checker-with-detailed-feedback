# AI-Powered PDF Q&A Checker

## Overview

The AI-Powered PDF Q&A Checker is a full-stack MERN application designed to automate the grading process for question-and-answer assessments. Users can upload a solution key PDF and a student's answer PDF, and the application will leverage the power of Google's Gemini AI to provide a per-question score, detailed feedback, and an overall grade.

This project solves the time-consuming problem of manual grading by providing instant, consistent, and intelligent feedback based on the semantic meaning of the answers, not just keyword matching.

---

## Features

-   **Dual PDF Upload:** Simple interface to upload both the solution key and the student's answer sheet.
-   **Intelligent Text Extraction:** Robust PDF parsing to accurately extract questions and answers, handling common formatting issues and artifacts.
-   **AI-Powered Semantic Grading:** Utilizes the Google Gemini API (`gemini-1.5-flash`) to compare the student's answer to the solution based on meaning and context.
-   **Detailed Feedback Generation:** The AI provides constructive, per-question feedback alongside a numerical score (0-100).
-   **Asynchronous Processing:** The backend processes files and grades in the background, allowing the user to receive a submission ID and poll for results without waiting.
-   **Dynamic Results Dashboard:** A clean, responsive UI to display the final report, including an overall score and a detailed breakdown of each question.
-   **Robust Error Handling:** Includes automatic retries with exponential backoff for API calls to handle temporary server overloads.

---

## Tech Stack

-   **Frontend:** React (with Vite), Tailwind CSS
-   **Backend:** Node.js, Express.js
-   **Database:** MongoDB (with Mongoose)
-   **AI Model:** Google Gemini API (`@google/generative-ai`)
-   **File Handling:** Multer (for uploads), `pdf2json` (for PDF text extraction)

---

## How It Works

1.  **File Upload:** The user uploads two PDF files via the React frontend.
2.  **Backend Processing:** The Express server receives the files using `multer` and stores them temporarily. It immediately sends a `submissionId` back to the client.
3.  **PDF Parsing:** The server uses the `pdf2json` library to extract the raw text from both PDFs. Custom parsing functions then separate the text into a structured list of questions and answers.
4.  **AI Grading Loop:** For each question, the backend sends the solution answer and the student's answer to the Gemini API.
5.  **Scoring & Feedback:** The Gemini model returns a JSON object containing a score and textual feedback for that specific question.
6.  **Database Storage:** All results, scores, and feedback are saved to the MongoDB database under the unique `submissionId`.
7.  **Frontend Polling & Display:** The React app periodically polls the backend using the `submissionId`. Once the status is "completed," it fetches the final results and displays them on the dashboard.

---

## Setup and Installation

To run this project locally, you will need two terminal windows.

### Backend Setup

1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `npm install`
3.  Create a `.env` file in the `backend` root and add your secret keys:
    ```
    PORT=5001
    MONGO_URI="your_mongodb_atlas_connection_string"
    GEMINI_API_KEY="your_google_gemini_api_key"
    ```
4.  Create an `uploads` directory in the `backend` root: `mkdir uploads`
5.  Start the server: `node server.js`

### Frontend Setup

1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev`
4.  Open your browser and navigate to the local URL provided by Vite (usually `http://localhost:5173`).

---

## API Endpoints

-   `POST /api/upload`: Accepts `solution` and `student` PDF files. Initiates the grading process and returns a `submissionId`.
-   `GET /api/results/:submissionId`: Retrieves the status and final results for a given submission.
