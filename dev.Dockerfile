FROM node:16-alpine

WORKDIR /app

VOLUME ["/app"]

COPY package*.json /app/

RUN npm install --also=dev

ENTRYPOINT /usr/local/bin/npm run start -- --host=0.0.0.0 --port=80 --disable-host-check --serve-path="/"
