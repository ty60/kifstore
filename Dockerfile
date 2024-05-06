FROM node:22.1-bullseye-slim

WORKDIR /usr/src/app
COPY package*.json .
COPY server.js .
COPY lib ./lib
COPY public ./public
COPY views ./views
RUN mkdir db

RUN npm install

EXPOSE 3000

CMD ["npm", "run", "startInDocker"]
