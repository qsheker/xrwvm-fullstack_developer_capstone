FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY app.js dealership.js review.js ./
COPY data ./data
USER node
EXPOSE 3030
CMD ["node", "app.js"]
