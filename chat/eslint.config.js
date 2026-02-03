import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const srcFiles = ["src/**/*.{js,jsx}"];

export default [
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
