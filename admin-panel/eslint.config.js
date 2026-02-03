const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const legacyConfig = require("./.eslintrc.json");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const srcFiles = ["src/**/*.{js,jsx,ts,tsx}"];

module.exports = [
  ...compat.config(legacyConfig).map((config) => ({
    ...config,
    files: srcFiles,
  })),
];
