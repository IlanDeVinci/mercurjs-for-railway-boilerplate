FROM node:20-bookworm-slim

WORKDIR /app

# Enable pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 9000

CMD ["pnpm", "dev"]
