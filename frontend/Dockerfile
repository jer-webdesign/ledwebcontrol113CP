# frontend/Dockerfile

# --- Stage 1: Build static assets ---
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files and install dependencies first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile || npm install

# Copy source code
COPY . .

# Clean dist folder before build to avoid stale files
RUN rm -rf dist


# Run build script (creates dist and copies all necessary files)
RUN npm run build

# Move index.html from dist/src/pages to dist/ if it exists
RUN if [ -f dist/src/pages/index.html ]; then cp dist/src/pages/index.html dist/index.html; fi

# Diagnostic: Show dist folder contents after build
RUN ls -l dist

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/

# Copy built assets from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# --- Optional: Build dist locally for development ---
# Uncomment below to copy dist to host after build
# FROM build AS build-local
# WORKDIR /app
# RUN cp -r dist /app/dist-local