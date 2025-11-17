import { getGeminiFlashModel } from './geminiService';

/**
 * Generates tailored resume content based on a user's resume, a job description, and special instructions.
 * @param {object} resume - The user's resume data.
 * @param {string} jobDescription - The job description to tailor the resume for.
 * @param {string} specialInstructions - Any special instructions from the user.
 * @returns {Promise<object>} The tailored resume data and metadata.
 */
export async function generateTailoredContent(resume, jobDescription, specialInstructions) {
  // Construct the prompt for the Gemini API
  let prompt = `
    [TASK]
    You are an expert ATS-friendly resume writer. Your task is to rewrite the user's resume to be tailored for a specific job description.
    You will receive the user's generic resume data and the job description.
    Your output MUST be a JSON object containing two keys: "resume" and "metadata".
    The "resume" key should contain the tailored resume data, following the same schema as the user's resume data.
    The "metadata" key should contain the "jobTitle" and "companyName".

    [USER'S GENERIC RESUME DATA]
    ${JSON.stringify(resume, null, 2)}

    [JOB DESCRIPTION]
    ${jobDescription}

    [INSTRUCTIONS]
    1. Rewrite the 'generic_summary' to be a 'tailored_summary' that highlights the user's most relevant skills and experience for the job.
    2. For each 'work_experience' item, rewrite the 'responsibilities' to be 3-5 bullet points that showcase achievements and align with the job description.
    3. Select the most relevant skills from the user's 'skills' list and include them in the 'skills' array.
    4. Extract the specific job title from the [JOB DESCRIPTION] and use it for the "jobTitle" field in the "metadata".
    5. Extract the company name from the [JOB DESCRIPTION] and use it for the "companyName" field in the "metadata".
    6. If you cannot find the company name in the [JOB DESCRIPTION], default to "Unknown Company".
    7. Ensure the output is a valid JSON object with the specified schema.
    8. When making any changes, especially adding keywords to job descriptions, ensure they are extremely relevant to the job description. Do not add irrelevant keywords.
    9. Pay close attention to any [SPECIAL INSTRUCTIONS] provided by the user and follow them carefully.
    10. The output JSON schema should be as follows:
    {
      "resume": {
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
            "relevant_coursework": "..."
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
      },
      "metadata": {
        "jobTitle": "...",
        "companyName": "..."
      }
    }
  `;

  // Add special instructions to the prompt if they exist
  if (specialInstructions) {
    prompt += `
    [SPECIAL INSTRUCTIONS]
    ${specialInstructions}
    `;
  }

  // Call the Gemini API to generate the tailored content
  const model = getGeminiFlashModel();
  const result = await model.generateContent(prompt);
  let text = result.response.text().replace(/```json/g, "").replace(/```/g, "");
  const lastBraceIndex = text.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    text = text.substring(0, lastBraceIndex + 1);
  }

  // Parse the JSON response and return it
  try {
    const tailoredData = JSON.parse(text);
    return tailoredData;
  } catch (e) {
    console.error('Error parsing JSON:', e);
    throw new Error(`AI parsing error: ${text}`);
  }
}