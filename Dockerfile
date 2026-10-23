FROM node:20-alpine
RUN apk add --no-cache git ffmpeg
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "index.js"]
