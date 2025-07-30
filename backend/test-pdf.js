// test-pdf.js
import fs from 'fs';
import pdf from 'pdf-parse';

// --- IMPORTANT ---
// Make sure you have a PDF file named 'solution.pdf'
// in the same 'backend' folder as this script.
const pdfPath = './solution.pdf';

async function testPdfParser() {
    console.log(`Attempting to read PDF from: ${pdfPath}`);

    if (!fs.existsSync(pdfPath)) {
        console.error("ERROR: The file 'solution.pdf' was not found in the backend folder.");
        console.error("Please create the sample PDF and place it here to run the test.");
        return;
    }

    try {
        const fileBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(fileBuffer);

        console.log("\n--- SUCCESS! ---");
        console.log("The PDF was read successfully.");
        console.log("\nTotal Pages:", data.numpages);
        console.log("PDF Version:", data.version);
        console.log("\n--- Extracted Text (First 200 chars) ---");
        console.log(data.text.substring(0, 200) + '...');
        console.log("\n-----------------------------------------");

    } catch (error) {
        console.error("\n--- TEST FAILED ---");
        console.error("An error occurred while parsing the PDF:");
        console.error(error);
    }
}

testPdfParser();
