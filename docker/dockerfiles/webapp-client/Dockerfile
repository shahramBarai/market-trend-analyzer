FROM node:lts-alpine3.17

EXPOSE 3000

WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

COPY ./services/webapp/*.json ./

RUN npm install

COPY ./services/webapp .

CMD [ "npm", "run", "start:client" ]