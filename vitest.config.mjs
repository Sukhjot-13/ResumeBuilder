import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformWithOxc } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The app keeps JSX inside .js files (Next.js convention). Teach the bundler's
// transformer to compile JSX in those files for tests.
const jsxLoader = {
  name: 'oxc-jsx-loader',
  enforce: 'pre',
  async transform(code, id) {
    const file = id.split('?')[0];
    if (
      id.includes('node_modules') ||
      !id.includes('/src/') ||
      !/\.(js|jsx)$/.test(file)
    ) {
      return null;
    }
    const result = await transformWithOxc(code, file, { lang: 'jsx' });
    if (result.errors && result.errors.length > 0) {
      throw new Error(`JSX transform failed for ${file}: ${result.errors.join(', ')}`);
    }
    return { code: result.code, map: result.map };
  },
};

export default defineConfig({
  plugins: [jsxLoader],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
