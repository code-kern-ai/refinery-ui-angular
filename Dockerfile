FROM node:14-alpine as build

WORKDIR /app
COPY package*.json /app/
RUN npm install
COPY . /app
RUN npm run build-prod

FROM nginx
COPY --from=build /app/dist/out/ /usr/share/nginx/html
COPY /nginx.conf /etc/nginx/conf.d/default.conf
