FROM node:20-alpine

# Установить docker CLI и docker compose plugin (для управления контейнерами)
RUN apk add --no-cache docker-cli docker-cli-compose git

WORKDIR /app
COPY server.mjs .

EXPOSE 9000

CMD ["node", "server.mjs"]
