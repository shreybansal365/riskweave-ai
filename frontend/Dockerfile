FROM node:24.13.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@11.6.2
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_PUBLIC_DEMO_ACCESS_ENABLED=false
ENV VITE_PUBLIC_DEMO_ACCESS_ENABLED=$VITE_PUBLIC_DEMO_ACCESS_ENABLED

RUN npm run build

FROM nginx:1.28.2-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
