const { loadEnv } = require("@medusajs/utils");
loadEnv("test", process.cwd());

process.env.PGSSLMODE ||= "disable";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5433/mercurjs?sslmode=disable";
process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_PORT ||= "5433";
process.env.DB_USERNAME ||= "postgres";
process.env.DB_PASSWORD ||= "postgres";
process.env.JWT_SECRET ||= "supersecret";
process.env.COOKIE_SECRET ||= "supersecret";
process.env.STORE_CORS ||= "http://localhost:3000";
process.env.ADMIN_CORS ||= "http://localhost:5173";
process.env.VENDOR_CORS ||= "http://localhost:5174";
process.env.AUTH_CORS ||=
  "http://localhost:3000,http://localhost:5173,http://localhost:5174";

module.exports = {
  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          // @swc/core@1.5.x doesn't understand `es2023` yet, but it can emit for `es2022`.
          target: "es2022",
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  setupFiles: ["./integration-tests/setup.js"],
};

if (process.env.TEST_TYPE === "integration:http") {
  module.exports.testMatch = ["**/integration-tests/http/*.spec.[jt]s"];
} else if (process.env.TEST_TYPE === "integration:modules") {
  module.exports.testMatch = ["**/src/modules/*/__tests__/**/*.[jt]s"];
} else if (process.env.TEST_TYPE === "unit") {
  module.exports.testMatch = ["**/src/**/__tests__/**/*.unit.spec.[jt]s"];
}
