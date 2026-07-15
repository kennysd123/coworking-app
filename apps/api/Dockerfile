# ============================
# Stage 1: Build
# ============================
FROM node:22-alpine AS builder

WORKDIR /app

# Instala pnpm
RUN corepack enable && corepack prepare pnpm@11.13.0 --activate

# Copia manifiestos primero para aprovechar caché de capas Docker
COPY apps/api/package.json apps/api/pnpm-lock.yaml apps/api/pnpm-workspace.yaml ./

# Instala TODAS las dependencias (incluye devDependencies, necesarias para compilar)
RUN pnpm install --frozen-lockfile

# Copia configuración y código fuente de la API
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json ./
COPY apps/api/src ./src

# Compila TypeScript -> JavaScript (genera dist/)
RUN pnpm run build

# ============================
# Stage 2: Production
# ============================
FROM node:22-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.13.0 --activate

# Copia manifiestos e instala SOLO dependencias de producción (más liviano)
COPY apps/api/package.json apps/api/pnpm-lock.yaml apps/api/pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copia el build ya compilado desde el stage anterior
COPY --from=builder /app/dist ./dist

# Railway inyecta la variable PORT dinámicamente; exponemos 3000 como default local
EXPOSE 3000

CMD ["node", "dist/main"]