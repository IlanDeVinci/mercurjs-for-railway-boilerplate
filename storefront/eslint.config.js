const { FlatCompat } = require("@eslint/eslintrc")

const compat = new FlatCompat({
  baseDirectory: __dirname,
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
