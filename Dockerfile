FROM node:lts-buster

COPY package-lock.json package.json ./
RUN npm i

COPY . .

EXPOSE 3000
CMD node src/index.js
