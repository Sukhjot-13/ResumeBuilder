import mammoth from 'mammoth';
import { extractText as extractPdfText } from 'unpdf';
import { callAI } from '@/lib/ai/client';
import { sanitizeJobDescription } from '@/lib/sanitize';
import { RESUME_SCHEMA_FOR_PROMPT } from '@/lib/resumeSchema';
import { FACTUAL_ACCURACY_RULES, JSON_OUTPUT_RULES } from '@/lib/ai/promptRules';

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
      return Array.isArray(text) ? text.join('\n') : text;
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

    ${FACTUAL_ACCURACY_RULES}
    ${JSON_OUTPUT_RULES}

    [PARSING RULES]
    1. Extract faithfully. Do not tailor, embellish, summarize away facts or turn duties into unsupported achievements. Preserve names, contact details, titles, qualifications, wording and supplied numbers.
    2. Join wrapped lines belonging to one bullet and associate each bullet with the correct role. Keep distinct roles at the same employer as separate records and preserve the source order.
    3. Return dates as YYYY-MM only when both year and month are supported by the source; normalize named months without changing their meaning. For year-only, missing or ambiguous dates, use an empty string. Never guess a month or substitute today's date.
    4. Set is_current to true only when the source identifies an ongoing role or study, including explicitly expected graduation. For an end date stated as Present/current without a specific month, use an empty end_date. Preserve a supplied expected graduation month while marking ongoing education is_current: true.
    5. Include is_current for both work_experience and education. Use false when ongoing status is not supported by the source; do not infer status from a missing end date alone.
    6. Keep responsibilities and education bullets as arrays of strings, skills as objects with skill_name/category, and additional-info lists as arrays of strings.
    7. Leave unsupported fields empty using the types specified above. Do not invent a summary, headline, skill category, certification or coursework when absent.

    [RAW RESUME TEXT]
    ${JSON.stringify(safeText)}

    [OUTPUT JSON SCHEMA]
    ${RESUME_SCHEMA_FOR_PROMPT}
  `;

  return callAI('RESUME_PARSING', prompt, { parseJson: true });
}
