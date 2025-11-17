import { NextResponse } from 'next/server';
import { parseResume } from '../../../services/resumeParsingService';

// Disable Next.js body parser for this route
export const bodyParser = false;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resumeFile');

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    const parsedData = await parseResume(file);
    return new Response(JSON.stringify(parsedData), { status: 200 });

  } catch (error) {
    console.error('Error in POST request:', error);
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}