const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const srcFiles = ["src/**/*.{js,jsx}"];

module.exports = [
  ...compat.extends("eslint:recommended").map((config) => ({
    ...config,
    files: srcFiles,
    languageOptions: {
      ...config.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
    },
  })),
];
