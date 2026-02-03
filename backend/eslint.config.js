const { FlatCompat } = require("@eslint/eslintrc");
const tsParser = require("@typescript-eslint/parser");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const srcFiles = ["src/**/*.{js,jsx,ts,tsx}"];

module.exports = [
  ...compat
    .extends("eslint:recommended", "plugin:@typescript-eslint/recommended")
    .map((config) => ({
      ...config,
      files: srcFiles,
      languageOptions: {
        ...config.languageOptions,
        parser: tsParser,
        parserOptions: {
          ...config.languageOptions?.parserOptions,
          ecmaVersion: "latest",
          sourceType: "module",
        },
      },
    })),
];
