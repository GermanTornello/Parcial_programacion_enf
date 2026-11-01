# 1) Compilar TypeScript con todas las dependencias
FROM node:24-slim AS build
WORKDIR /app
# mongodb-memory-server (solo para los tests) no descarga MongoDB al instalar; sin telemetría de scarf
ENV MONGOMS_DISABLE_POSTINSTALL=1 SCARF_ANALYTICS=false
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Imagen final: solo el código compilado y las dependencias de producción
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production SCARF_ANALYTICS=false
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3003
CMD ["node", "dist/main.js"]
