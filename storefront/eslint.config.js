const { FlatCompat } = require("@eslint/eslintrc")
const js = require("@eslint/js")

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

const srcFiles = ["src/**/*.{js,jsx,ts,tsx}"]

module.exports = [
  ...compat
    .extends(
      "next/core-web-vitals",
      "next/typescript",
      "plugin:storybook/recommended"
    )
    .map((config) => ({
      ...config,
      files: srcFiles,
    })),
]
