const { MetadataStorage } = require("@mikro-orm/core");

process.env.PGSSLMODE ||= "disable";

process.env.DATABASE_URL ||=
  "postgres://postgres:postgres@localhost:5433/mercurjs?sslmode=disable";
process.env.JWT_SECRET ||= "supersecret";
process.env.COOKIE_SECRET ||= "supersecret";
process.env.STORE_CORS ||= "http://localhost:3000";
process.env.ADMIN_CORS ||= "http://localhost:5173";
process.env.VENDOR_CORS ||= "http://localhost:5174";
process.env.AUTH_CORS ||=
  "http://localhost:3000,http://localhost:5173,http://localhost:5174";
process.env.MEILI_HOST ||= "http://localhost:7700";
process.env.MEILI_INDEX_PRODUCTS ||= "products";

MetadataStorage.clear();
