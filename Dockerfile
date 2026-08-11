FROM node:20-bookworm-slim

WORKDIR /app

COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm install --prefix backend --ignore-scripts && npm install --prefix frontend --ignore-scripts

COPY . .

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "/app/backend/scripts/entrypoint.js"]
