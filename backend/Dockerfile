FROM node:20-bookworm-slim

WORKDIR /app

# Enable pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 9000

CMD ["sh", "-c", "HOST=0.0.0.0 PORT=${PORT:-9000} pnpm run dev"]
