# Stage 1: Build Vite React app
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set Vite build args
ARG VITE_API_BASE_URL=http://localhost:5000/api
ARG VITE_CHAIN_ID=31337
ARG VITE_RPC_URL=http://127.0.0.1:8545

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CHAIN_ID=$VITE_CHAIN_ID
ENV VITE_RPC_URL=$VITE_RPC_URL

RUN npm run build

# Stage 2: Serve with high-performance Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
