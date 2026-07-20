# FarmGraph Rakshak web — static export served by nginx.
# Build context must be the REPO ROOT (npm workspaces + shared data/).
FROM node:20-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --no-audit --no-fund
COPY packages ./packages
COPY data ./data
COPY apps/web ./apps/web
RUN npm run build --workspace apps/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/out /usr/share/nginx/html
EXPOSE 80
