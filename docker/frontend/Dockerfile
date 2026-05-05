# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set build arguments (not persisted in the final runner image)
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY

WORKDIR /app
COPY package*.json ./
# Using legacy-peer-deps to handle potential React 19 dependency conflicts
RUN npm ci --legacy-peer-deps
COPY . .

# Pass arguments to environment ONLY during the build process
RUN SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
    VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY \
    npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine AS runner
RUN rm -rf /usr/share/nginx/html/*
# Copy compiled build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom Nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
