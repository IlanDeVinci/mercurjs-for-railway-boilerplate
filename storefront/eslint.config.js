const { FlatCompat } = require("@eslint/eslintrc")
const { defineConfig, globalIgnores } = require("eslint/config")
const js = require("@eslint/js")

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

const srcFiles = ["src/**/*.{js,jsx,ts,tsx}"]
const storyFiles = ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)"]

module.exports = defineConfig([
  globalIgnores(["!.storybook"], "Include Storybook Directory"),
  ...compat
    .extends("next/core-web-vitals", "next/typescript")
    .map((config) => ({
      ...config,
      files: srcFiles,
    })),
  ...compat.extends("plugin:storybook/recommended").map((config) => ({
    ...config,
    files: storyFiles,
  })),
])
