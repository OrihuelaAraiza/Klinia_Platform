#!/bin/bash
# Script de inicio para Azure App Service (Linux)
# Este script se ejecuta antes de iniciar la aplicación

echo "Starting Klinia API..."

# Generar Prisma Client si no existe
if [ ! -d "node_modules/.prisma" ]; then
  echo "Generating Prisma Client..."
  npx prisma generate
fi

# Ejecutar migraciones (opcional, descomenta si quieres migraciones automáticas)
# echo "Running database migrations..."
# npx prisma migrate deploy

# Iniciar la aplicación
echo "Starting Node.js application..."
exec npm start

