FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts
COPY . .
# WASM должен быть доступен при сборке и в runtime
RUN mkdir -p public && cp node_modules/@matrix-org/matrix-sdk-crypto-wasm/pkg/*.wasm public/
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-limits.conf /etc/nginx/conf.d/limits.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
