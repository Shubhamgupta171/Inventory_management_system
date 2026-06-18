# syntax=docker/dockerfile:1

# --------------------------------------------------------------------------- #
# Stage 1 — build the React app with Vite.
# VITE_API_URL is baked in at build time (the browser, not the container,
# calls the API, so it must be a URL reachable from the user's browser).
# --------------------------------------------------------------------------- #
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --------------------------------------------------------------------------- #
# Stage 2 — serve the static build with nginx (tiny, production-grade).
# --------------------------------------------------------------------------- #
FROM nginx:1.27-alpine AS runtime

# SPA-aware nginx config (history fallback + asset caching).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -qO- http://localhost:80/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
