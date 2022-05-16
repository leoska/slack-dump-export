# Import container with nodejs v14
FROM node:14.19-buster

# Create app directory
WORKDIR /app

# Bundle app source
COPY ./package.json ./package.json
COPY ./.babelrc.json ./.babelrc.json
COPY ./nodemon.json ./nodemon.json

# If you are building your code for production
# RUN npm ci --only=production
RUN npm install

EXPOSE 25565
CMD [ "npm", "run", "watch" ]