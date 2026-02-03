const { FlatCompat } = require("@eslint/eslintrc");

const legacyConfig = require("./.eslintrc.json");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const srcFiles = ["src/**/*.{js,jsx,ts,tsx}"];

module.exports = [
  ...compat.config(legacyConfig).map((config) => ({
    ...config,
    files: srcFiles,
  })),
];
