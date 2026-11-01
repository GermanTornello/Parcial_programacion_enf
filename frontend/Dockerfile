FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_USUARIOS_URL=http://localhost:3001
ARG VITE_SOLICITUDES_URL=http://localhost:3002
ARG VITE_RESENAS_URL=http://localhost:3003
ENV VITE_USUARIOS_URL=$VITE_USUARIOS_URL
ENV VITE_SOLICITUDES_URL=$VITE_SOLICITUDES_URL
ENV VITE_RESENAS_URL=$VITE_RESENAS_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
