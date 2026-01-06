# Build stage
FROM node:20-alpine AS build-stage

WORKDIR /app

# Enable corepack for pnpm support
RUN corepack enable

COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

# Build the app
RUN pnpm build

# Production stage
FROM nginx:stable-alpine AS production-stage

# Copy built assets from build-stage to nginx public folder
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
