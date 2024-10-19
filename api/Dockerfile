FROM node:18.17.1-alpine

COPY package* .

RUN npm install

COPY . .

CMD [ "npm", "run", "build" ]