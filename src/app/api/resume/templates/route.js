import { ok, withErrorHandler } from '@/lib/apiResponse';

const TEMPLATES = [
  { id: 'standard', name: 'Professional', component: 'Professional' },
  { id: 'modern', name: 'Modern', component: 'Modern' },
  { id: 'classic', name: 'Classic', component: 'ClassicTemplate' },
  { id: 'classic2', name: 'Classic 2', component: 'ClassicTemplate2' },
  { id: 'creative', name: 'Creative', component: 'Creative' },
  { id: 'simple', name: 'Simple', component: 'Simple' },
];

export const GET = withErrorHandler(async () => {
  return ok(TEMPLATES.map(({ id, name }) => ({ id, name })));
});
