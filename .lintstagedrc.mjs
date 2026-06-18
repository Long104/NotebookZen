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

const buildPrettierCommand = (filenames) => {
  const files = filenames.map((f) => `"${f}"`).join(" ");
  return `prettier --write ${files}`;
};

const config = {
  "frontend/**/*.{ts,tsx}": (filenames) => {
    return [buildEslintCommand("frontend", filenames), buildPrettierCommand(filenames)];
  },
  "backend/**/*.js": (filenames) => {
    return [buildEslintCommand("backend", filenames), buildPrettierCommand(filenames)];
  },
  "*.{json,md,yml,yaml}": (filenames) => buildPrettierCommand(filenames),
  "*.{css,scss,postcss}": (filenames) => buildPrettierCommand(filenames),
};

export default config;
