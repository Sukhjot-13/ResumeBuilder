import mammoth from 'mammoth';
import { extractText as extractPdfText } from 'unpdf';
import { callAI } from '@/lib/ai/client';
import { sanitizeJobDescription } from '@/lib/sanitize';

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
 * Type detection is content-based (magic bytes), never trusting client-supplied MIME types.
 * @param {Buffer} fileBuffer - The resume file content.
 * @returns {Promise<object>} The parsed resume data.
 */
export async function parseResume(fileBuffer) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error("No file provided");
  }

  // Content-based type detection
  const header = fileBuffer.subarray(0, 4).toString('latin1');
  let fileType;
  if (header.startsWith('%PDF')) {
    fileType = 'application/pdf';
  } else if (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b) {
    fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; // ZIP-based (.docx)
  } else {
    throw new Error('Unsupported file type');
  }

  const rawText = await extractText(fileBuffer, fileType);
  // Sanitize + bound the extracted text before it enters the prompt
  // (self-targeted injection hardening, caps token usage)
  const safeText = sanitizeJobDescription(rawText);

  const prompt = `
    [TASK]
    You are an expert resume parsing AI. Read the following raw text from a user's resume and extract all structured data.
    Your output MUST be a JSON object in the exact schema provided.
    If a field is not present, return an empty array or null.
    - 'responsibilities' should be an array of strings.
    - 'start_date' and 'end_date' MUST be in YYYY-MM format (e.g. "2023-07"); use YYYY-MM for all dates.

    [RAW RESUME TEXT]
    ${safeText}

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
          "start_date": "YYYY-MM",
          "end_date": "YYYY-MM",
          "is_current": false,
          "responsibilities": ["...", "..."]
        }
      ],
      "education": [
        {
          "institution": "...",
          "degree": "...",
          "field_of_study": "...",
          "start_date": "YYYY-MM",
          "end_date": "YYYY-MM",
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
