// App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// --- Helper Components ---

const FileUploader = ({ onUploadSuccess }) => {
    const [solutionFile, setSolutionFile] = useState(null);
    const [studentFile, setStudentFile] = useState(null);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e, fileType) => {
        const file = e.target.files[0];
        if (file && file.type !== 'application/pdf') {
            setError('Invalid file type. Please upload a PDF.');
            return;
        }
        if (file && file.size > 10 * 1024 * 1024) { // 10MB limit
            setError('File is too large. Maximum size is 10MB.');
            return;
        }
        setError('');
        if (fileType === 'solution') {
            setSolutionFile(file);
        } else {
            setStudentFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!solutionFile || !studentFile) {
            setError('Please upload both the solution and student PDF files.');
            return;
        }
        setError('');
        setIsUploading(true);

        const formData = new FormData();
        formData.append('solution', solutionFile);
        formData.append('student', studentFile);

        try {
            const response = await axios.post('http://localhost:5001/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadSuccess(response.data.submissionId);
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred during upload.');
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Upload PDFs to Grade</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="solution" className="block text-sm font-medium text-gray-700 mb-2">
                        Solution Key (PDF)
                    </label>
                    <input
                        id="solution"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, 'solution')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                    />
                </div>
                <div>
                    <label htmlFor="student" className="block text-sm font-medium text-gray-700 mb-2">
                        Student's Answers (PDF)
                    </label>
                    <input
                        id="student"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, 'student')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
                    />
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isUploading ? 'Uploading...' : 'Grade Now'}
                </button>
            </form>
        </div>
    );
};

const GradingProgress = ({ submissionId }) => (
    <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Grading in Progress</h2>
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-6">
            Our AI is working hard to grade the submission. This might take a moment. Please don't close this page.
        </p>
        <p className="text-sm text-gray-400 mt-2">Submission ID: {submissionId}</p>
    </div>
);

const ScoreCircle = ({ score }) => {
    const getColor = (s) => {
        if (s >= 85) return 'text-green-500';
        if (s >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };
    return (
        <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${getColor(score).replace('text-', 'border-')} mx-auto`}>
            <span className={`text-3xl font-bold ${getColor(score)}`}>{score}%</span>
        </div>
    );
};

const ResultsDashboard = ({ results, onReset }) => (
    <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-4xl">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Grading Report</h2>
                <p className="text-gray-500">Student File: {results.fileName}</p>
            </div>
            <button onClick={onReset} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                Grade Another
            </button>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-xl mb-8 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Overall Score</h3>
            <ScoreCircle score={results.overallScore} />
        </div>

        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Per-Question Breakdown</h3>
            {results.results.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-700">Question {item.questionNumber}</h4>
                        <span className={`text-lg font-bold ${item.score >= 85 ? 'text-green-600' : item.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            Score: {item.score}/100
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-green-50 p-3 rounded-md border border-green-200">
                            <p className="font-semibold text-green-800 mb-1">Correct Answer:</p>
                            <p className="text-gray-600">{item.correctAnswer}</p>
                        </div>
                         <div className="bg-red-50 p-3 rounded-md border border-red-200">
                            <p className="font-semibold text-red-800 mb-1">Student's Answer:</p>
                            <p className="text-gray-600">{item.studentAnswer}</p>
                        </div>
                    </div>
                    <div className="mt-4 bg-blue-50 p-3 rounded-md border border-blue-200">
                         <p className="font-semibold text-blue-800 mb-1">AI Feedback:</p>
                         <p className="text-gray-700">{item.feedback}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);


// --- Main App Component ---

function App() {
    const [submissionId, setSubmissionId] = useState(null);
    const [results, setResults] = useState(null);
    const [appState, setAppState] = useState('upload'); // 'upload', 'grading', 'results'
    const [error, setError] = useState('');

    const handleUploadSuccess = (id) => {
        setSubmissionId(id);
        setAppState('grading');
    };
    
    const handleReset = () => {
        setSubmissionId(null);
        setResults(null);
        setAppState('upload');
        setError('');
    };

    const fetchResults = useCallback(async () => {
        if (!submissionId) return;
        try {
            const res = await axios.get(`http://localhost:5001/api/results/${submissionId}`);
            if (res.data.status === 'completed') {
                setResults(res.data);
                setAppState('results');
            } else if (res.data.status === 'failed') {
                setError('Grading failed. Please try again.');
                setAppState('upload');
            }
        } catch (err) {
            console.error("Error fetching results:", err);
            setError('Could not fetch results. Please check the submission ID.');
            setAppState('upload');
        }
    }, [submissionId]);

    useEffect(() => {
        if (appState === 'grading') {
            const interval = setInterval(() => {
                fetchResults();
            }, 5000); // Poll every 5 seconds

            return () => clearInterval(interval);
        }
    }, [appState, fetchResults]);

    const renderContent = () => {
        switch (appState) {
            case 'grading':
                return <GradingProgress submissionId={submissionId} />;
            case 'results':
                return <ResultsDashboard results={results} onReset={handleReset} />;
            case 'upload':
            default:
                return <FileUploader onUploadSuccess={handleUploadSuccess} />;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-4 font-sans">
            <div className="text-center mb-10">
                <h1 className="text-5xl font-extrabold text-gray-800">AI Q&A Checker</h1>
                <p className="text-gray-600 mt-2">Instantly grade PDF-based question papers with the power of AI.</p>
            </div>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
            {renderContent()}
        </div>
    );
}

export default App;
