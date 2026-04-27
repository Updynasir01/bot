FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p uploads
EXPOSE 5000
CMD ["sh", "-c", "node src/models/migrate.js && node src/models/seed.js && node src/server.js"]
