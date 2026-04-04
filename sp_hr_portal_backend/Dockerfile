FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

# Keep prisma CLI available because npm start runs prisma migrate deploy.
RUN npm ci --include=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
