FROM node:20-bookworm-slim

WORKDIR /app

# Enable pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 9000

CMD ["sh", "-c", "pnpm run dev -- --host 0.0.0.0 --port ${PORT:-9000}"]
