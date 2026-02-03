FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./server.js
COPY public ./public

EXPOSE 4010

CMD ["node", "server.js"]
