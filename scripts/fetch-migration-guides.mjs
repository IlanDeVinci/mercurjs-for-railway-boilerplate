import fs from "node:fs/promises";
import path from "node:path";

const guides = [
  {
    title: "Express 5 migration guide",
    url: "https://expressjs.com/en/guide/migrating-5.html",
  },
  {
    title: "Vite v6 migration guide",
    url: "https://v6.vite.dev/guide/migration",
  },
  {
    title: "Vite v7 migration guide",
    url: "https://vite.dev/guide/migration",
  },
  {
    title: "Tailwind CSS upgrade guide",
    url: "https://tailwindcss.com/docs/upgrade-guide",
  },
  {
    title: "Next.js v16 upgrade guide",
    url: "https://nextjs.org/docs/app/guides/upgrading/version-16",
  },
  {
    title: "Storybook migration guide (latest)",
    url: "https://storybook.js.org/docs/next/migration-guide",
  },
  {
    title: "React 19 upgrade guide",
    url: "https://react.dev/blog/2024/04/25/react-19-upgrade-guide",
  },
  {
    title: "React Router v7 changelog",
    url: "https://github.com/remix-run/react-router/blob/main/CHANGELOG.md#v700",
  },
  {
    title: "Zod v4 changelog",
    url: "https://zod.dev/v4/changelog",
  },
  {
    title: "date-fns v4 changelog",
    url: "https://date-fns.org/v4.0.0/docs/Change-Log#v4.0.0-2024-09-16",
  },
  {
    title: "i18next migration guide",
    url: "https://www.i18next.com/misc/migration-guide",
  },
  {
    title: "react-i18next changelog",
    url: "https://github.com/i18next/react-i18next/blob/master/CHANGELOG.md#1600",
  },
  {
    title: "@hookform/resolvers v5.0.0 release",
    url: "https://github.com/react-hook-form/resolvers/releases/tag/v5.0.0",
  },
  {
    title: "@stripe/react-stripe-js v5.0.0 release",
    url: "https://github.com/stripe/react-stripe-js/releases/tag/v5.0.0",
  },
  {
    title: "@stripe/stripe-js v8.0.0 release",
    url: "https://github.com/stripe/stripe-js/releases/tag/v8.0.0",
  },
  {
    title: "eslint-config-next v16 upgrade guide",
    url: "https://nextjs.org/docs/app/guides/upgrading/version-16",
  },
];

const outputPath = path.resolve(process.cwd(), "migration-guides.md");

const htmlToText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const fetchGuide = async (guide) => {
  const res = await fetch(guide.url, {
    headers: {
      "User-Agent": "migration-guide-fetcher/1.0",
      Accept: "text/html, text/plain;q=0.9, */*;q=0.8",
    },
  });
  const contentType = res.headers.get("content-type") || "";
  const body = await res.text();

  const text = contentType.includes("text/html") ? htmlToText(body) : body.trim();

  return {
    ...guide,
    status: res.status,
    contentType,
    text,
  };
};

const main = async () => {
  const results = [];

  for (const guide of guides) {
    try {
      const result = await fetchGuide(guide);
      results.push(result);
    } catch (error) {
      results.push({
        ...guide,
        status: "error",
        contentType: "",
        text: `Failed to fetch: ${error?.message || error}`,
      });
    }
  }

  const lines = [];
  lines.push("# Migration Guides");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  for (const result of results) {
    lines.push(`## ${result.title}`);
    lines.push("");
    lines.push(`Source: ${result.url}`);
    lines.push("");
    lines.push(`Status: ${result.status}`);
    lines.push("");
    if (result.contentType) {
      lines.push(`Content-Type: ${result.contentType}`);
      lines.push("");
    }
    lines.push(result.text || "(empty)");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  await fs.writeFile(outputPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${outputPath}`);
};

main();
