FROM node:20-slim

WORKDIR /app
COPY ./services/webapp/package*.json ./
RUN npm ci --only=production
COPY ./services/webapp .

EXPOSE 3000
CMD [ "npm", "run", "start:server" ]