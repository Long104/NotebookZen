/**
 * lint-staged config — runs on staged files before commit.
 *
 * - Frontend (TS/TSX):  eslint --fix → prettier --write
 * - Backend (JS):       eslint --fix → prettier --write
 * - Other assets:       prettier --write only
 *
 * ESLint uses --config because its flat config discovery starts from CWD
 * (project root), not from each file's directory.
 */

const buildEslintCommand = (packageDir, filenames) => {
  const files = filenames.map((f) => `"${f}"`).join(" ");
  return `eslint --config ${packageDir}/eslint.config.mjs --fix ${files}`;
};

const config = {
  "frontend/**/*.{ts,tsx}": (filenames) => {
    return [buildEslintCommand("frontend", filenames), "prettier --write"];
  },
  "backend/**/*.js": (filenames) => {
    return [buildEslintCommand("backend", filenames), "prettier --write"];
  },
  "*.{json,md,yml,yaml}": ["prettier --write"],
  "*.{css,scss,postcss}": ["prettier --write"],
};

export default config;
