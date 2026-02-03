import { defineConfig, loadEnv } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const normalizeRedisUrl = (value?: string) => {
  if (!value) {
    return value;
  }

  try {
    const hadTrailingSlash = /\/$/.test(value);
    const url = new URL(value);

    if (
      (url.protocol === "redis:" || url.protocol === "rediss:") &&
      (url.hostname === "localhost" || url.hostname === "::1")
    ) {
      url.hostname = "127.0.0.1";
      let normalized = url.toString();
      if (!hadTrailingSlash) {
        normalized = normalized.replace(/\/$/, "");
      }
      return normalized;
    }
  } catch {
    // If the URL can't be parsed, leave it unchanged.
  }

  return value;
};

const redisUrl = normalizeRedisUrl(process.env.REDIS_URL);

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    ...(redisUrl ? { redisUrl } : {}),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      // @ts-expect-error: vendorCors is not a valid config
      vendorCors: process.env.VENDOR_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: false,
  },
  plugins: [
    {
      resolve: "@mercurjs/b2c-core",
      options: {},
    },
    {
      resolve: "@mercurjs/commission",
      options: {},
    },
    {
      resolve: "@mercurjs/reviews",
      options: {},
    },
    {
      resolve: "@mercurjs/requests",
      options: {},
    },
    {
      resolve: "@mercurjs/resend",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          ...(process.env.MINIO_ENDPOINT &&
          process.env.MINIO_ACCESS_KEY &&
          process.env.MINIO_SECRET_KEY
            ? [
                {
                  resolve: "./src/modules/minio-file",
                  id: "minio",
                  options: {
                    endPoint: process.env.MINIO_ENDPOINT,
                    accessKey: process.env.MINIO_ACCESS_KEY,
                    secretKey: process.env.MINIO_SECRET_KEY,
                    bucket: process.env.MINIO_BUCKET, // Optional, defaults to 'medusa-media'
                  },
                },
              ]
            : [
                {
                  resolve: "@medusajs/medusa/file-local",
                  id: "local",
                  options: {
                    upload_dir: "static",
                    backend_url: `${process.env.BACKEND_URL || "http://localhost:9000"}/static`,
                  },
                },
              ]),
        ],
      },
    },
    ...(redisUrl
      ? [
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
              redisUrl,
            },
          },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: {
              redis: {
                url: redisUrl,
              },
            },
          },
        ]
      : []),
    ...(process.env.STRIPE_SECRET_API_KEY && process.env.STRIPE_WEBHOOK_SECRET
      ? [
          {
            resolve: "@medusajs/medusa/payment",
            options: {
              providers: [
                {
                  resolve:
                    "@mercurjs/payment-stripe-connect/providers/stripe-connect",
                  id: "stripe-connect",
                  options: {
                    apiKey: process.env.STRIPE_SECRET_API_KEY,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                  },
                },
              ],
            },
          },
        ]
      : []),
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          ...(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
            ? [
                {
                  resolve: "@mercurjs/resend/providers/resend",
                  id: "resend",
                  options: {
                    channels: ["email"],
                    api_key: process.env.RESEND_API_KEY,
                    from: process.env.RESEND_FROM_EMAIL,
                  },
                },
              ]
            : []),
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: {
              channels: ["feed", "seller_feed"],
            },
          },
        ],
      },
    },
  ],
});
