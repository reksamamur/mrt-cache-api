FROM node:alpine
RUN mkdir -p /src
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "start"]