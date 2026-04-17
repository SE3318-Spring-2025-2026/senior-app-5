FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx @nestjs/cli build
EXPOSE 3001
CMD ["node", "dist/src/main.js"]