import fs from 'fs/promises';
import path from 'path';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

const dataFilePath = path.join(process.cwd(), 'data.json');

export const GET = withErrorHandler(async () => {
  const data = await fs.readFile(dataFilePath, 'utf-8');
  const jsonData = JSON.parse(data);
  return ok(jsonData);
});

export const POST = withErrorHandler(async (request) => {
  const newData = await request.json();
  await fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2));
  return ok(null, 'Data updated successfully');
});
