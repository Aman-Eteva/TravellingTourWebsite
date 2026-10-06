FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build -w apps/web
FROM nginxinc/nginx-unprivileged:1.28-alpine AS production
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
