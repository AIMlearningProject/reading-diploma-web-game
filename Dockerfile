# ---------- Stage 1: Build ----------
FROM node:20-bookworm-slim AS build

RUN apt-get update && apt-get install -y git
WORKDIR /app

RUN git clone https://github.com/AIMlearningProject/reading-diploma-web-game.git /app;

# installs backend and frontend
RUN npm ci --prefix backend --omit=dev --ignore-scripts && \
    npm ci --prefix frontend;

RUN npm run build --prefix frontend;

# removes unnecessary files
RUN rm -rf /app/.git && \
    rm -f /app/.gitignore && \
    rm -f /app/backend/*eslint*;

RUN find /app -maxdepth 3 -type f -iname "README.md" -delete;

# ---------- Stage 2: Runtime ----------
FROM node:20-bookworm-slim
WORKDIR /app

# Copies only what is needed for runtime
COPY --from=build /app/backend /app/backend

COPY --from=build /app/frontend/dist /app/frontend/dist
COPY --from=build /app/frontend/package.json /app/frontend/package.json
COPY --from=build /app/frontend/package-lock.json /app/frontend/package-lock.json

# Removes devDependendencies as they are not needed in runtime env
RUN npm ci --prefix frontend --omit=dev;

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "/app/backend/scripts/entrypoint.js"]
