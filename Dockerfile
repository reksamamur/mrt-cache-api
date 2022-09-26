FROM node:alpine
RUN mkdir -p /src
WORKDIR /src
COPY package*.json ./
RUN npm i
COPY . .
CMD ["npm", "start"]