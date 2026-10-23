# Etapa 1: compila TypeScript a JavaScript
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Etapa 2: imagen final, solo con dependencias de producción
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# npm instala el binario de Claude Code para Linux con glibc y con musl (~280 MB cada uno).
# En Alpine solo se usa el de musl, así que se borra el otro, sea x64 (Intel) o arm64 (ARM).
RUN npm ci --omit=dev \
 && find node_modules/@anthropic-ai -maxdepth 1 -type d -name 'claude-agent-sdk-linux-*' ! -name '*-musl' -exec rm -rf {} +
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
USER node
CMD ["node", "dist/main.js"]
