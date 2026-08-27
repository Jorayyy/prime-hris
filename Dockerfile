FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY src/socket-server.ts ./socket-server.ts
COPY tsconfig.json ./

CMD ["npx", "tsx", "socket-server.ts"]
