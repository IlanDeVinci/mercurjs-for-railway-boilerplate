const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
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
