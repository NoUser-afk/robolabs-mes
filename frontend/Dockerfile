FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache openssl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY robopulse.locations.conf /etc/nginx/includes/robopulse.locations.conf
COPY docker-entrypoint.d/10-generate-self-signed-cert.sh /docker-entrypoint.d/10-generate-self-signed-cert.sh
RUN chmod +x /docker-entrypoint.d/10-generate-self-signed-cert.sh
COPY --from=build /app/dist /usr/share/nginx/html
