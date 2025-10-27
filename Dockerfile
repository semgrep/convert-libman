FROM node:current-alpine

WORKDIR /app

COPY convert-libman.js .

RUN chmod +x convert-libman.js

ENTRYPOINT ["node", "convert-libman.js", "/convert/libman.json", "/convert"]