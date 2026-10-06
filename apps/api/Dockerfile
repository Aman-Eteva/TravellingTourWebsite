FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm ci && npx prisma generate && npm run build -w apps/api

FROM build AS development
EXPOSE 4000
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && exec node apps/api/dist/apps/api/src/server.js"]

FROM node:22-bookworm-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/scripts/create-admin.mjs ./scripts/create-admin.mjs
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node apps/api/dist/apps/api/src/server.js"]
