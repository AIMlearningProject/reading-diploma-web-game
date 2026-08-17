# ---------- Stage 1: Build ----------
FROM node:20-bookworm-slim AS build

RUN apt-get update && apt-get install -y git

WORKDIR /app

ARG USE_REMOTE=0

# If USE_REMOTE=0 copy local repo
# If USE_REMOTE=1 skip copy and clone repo instead
COPY backend/ backend/
COPY frontend/ frontend/

RUN if [ "$USE_REMOTE" = "1" ]; then \
        rm -rf /app/* && \
        git clone https://github.com/AIMlearningProject/reading-diploma-web-game.git /app; \
    fi

RUN npm ci --prefix backend --omit=dev --ignore-scripts && \
    npm ci --prefix frontend --omit=dev;

COPY . .

# ---------- Stage 2: Runtime ----------
FROM node:20-bookworm-slim

WORKDIR /app

COPY --from=build /app /app

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "/app/backend/scripts/entrypoint.js"]
