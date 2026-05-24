import mammoth from 'mammoth';
import { extractText as extractPdfText } from 'unpdf';
import { callAI } from '@/lib/ai/client';

/**
 * Extracts text from a file buffer.
 * @param {Buffer} fileBuffer - The file buffer.
 * @param {string} fileType - The MIME type of the file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractText(fileBuffer, fileType) {
  if (fileType === 'application/pdf') {
    try {
      const uint8Array = new Uint8Array(fileBuffer);
      const { text } = await extractPdfText(uint8Array);
      return text;
    } catch (error) {
      console.error('Error in PDF parsing:', error);
      throw new Error('Error processing PDF file');
    }
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
    return value;
  }
  throw new Error('Unsupported file type');
}

/**
 * Parses a resume file and returns structured data.
 * @param {File} file - The resume file to parse.
 * @returns {Promise<object>} The parsed resume data.
 */
export async function parseResume(file) {
  if (!file) {
    throw new Error("No file provided");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const rawText = await extractText(fileBuffer, file.type);

  const prompt = `
    [TASK]
    You are an expert resume parsing AI. Read the following raw text from a user's resume and extract all structured data.
    Your output MUST be a JSON object in the exact schema provided.
    If a field is not present, return an empty array or null.
    - 'responsibilities' should be an array of strings.
    - 'start_date' and 'end_date' should be in YYYY-MM-DD format if possible, otherwise just text.

    [RAW RESUME TEXT]
    ${rawText}

    [OUTPUT JSON SCHEMA]
    {
      "profile": {
        "full_name": "...",
        "email": "...",
        "phone": "...",
        "location": "...",
        "website": "...",
        "headline": "...",
        "generic_summary": "..."
      },
      "work_experience": [
        {
          "job_title": "...",
          "company": "...",
          "start_date": "YYYY-MM-DD",
          "end_date": "YYYY-MM-DD",
          "is_current": false,
          "responsibilities": ["...", "..."]
        }
      ],
      "education": [
        {
          "institution": "...",
          "degree": "...",
          "field_of_study": "...",
          "start_date": "YYYY-MM-DD",
          "end_date": "YYYY-MM-DD",
          "relevant_coursework": "...",
          "bullets": ["...", "..."]
        }
      ],
      "skills": [
        { "skill_name": "...", "category": "..." }
      ],
      "additional_info": {
        "languages": [],
        "certifications": [],
        "awards_activities": []
      }
    }
  `;

  return callAI('RESUME_PARSING', prompt, { parseJson: true });
}
