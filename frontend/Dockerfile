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

# Use 127.0.0.1 (not "localhost") — BusyBox wget resolves localhost to IPv6
# ::1 first, but nginx listens on IPv4 0.0.0.0:80, which would 'connection
# refused'. Hits the lightweight /healthz route from nginx.conf.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
