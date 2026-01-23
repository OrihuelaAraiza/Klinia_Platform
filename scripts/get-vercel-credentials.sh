#!/bin/bash

# Script para obtener las credenciales de Vercel necesarias para GitHub Actions
# Ejecuta: bash scripts/get-vercel-credentials.sh

echo "🔍 Obteniendo credenciales de Vercel..."
echo ""

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI no está instalado"
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel@latest
fi

# Verificar si está autenticado
if ! vercel whoami &> /dev/null; then
    echo "🔐 No estás autenticado en Vercel"
    echo "📝 Ejecutando: vercel login"
    vercel login
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CREDENCIALES DE VERCEL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Obtener información del usuario/org
echo "👤 Información de la cuenta:"
vercel whoami
echo ""

# Obtener información del proyecto si está vinculado
if [ -f ".vercel/project.json" ]; then
    echo "📁 Proyecto vinculado encontrado:"
    cat .vercel/project.json | grep -E "(orgId|projectId)" || echo "   No se encontró información del proyecto"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 INSTRUCCIONES PARA CONFIGURAR GITHUB SECRETS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. VERCEL_TOKEN:"
echo "   → Ve a: https://vercel.com/account/tokens"
echo "   → Crea un nuevo token"
echo "   → Cópialo y agrégalo como secret en GitHub"
echo ""
echo "2. VERCEL_ORG_ID:"
echo "   → Ve a: https://vercel.com/account"
echo "   → Busca el 'Team ID' o 'Organization ID'"
echo "   → O ejecuta: vercel teams ls"
echo ""
echo "3. VERCEL_PROJECT_ID:"
echo "   → Ve a tu proyecto en Vercel Dashboard"
echo "   → Settings → General"
echo "   → Copia el 'Project ID'"
echo ""
echo "4. Configurar en GitHub:"
echo "   → https://github.com/OrihuelaAraiza/Klinia_Platform/settings/secrets/actions"
echo "   → New repository secret"
echo "   → Agrega cada uno de los 3 secrets"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Intentar obtener más información si el proyecto está vinculado
if [ -f ".vercel/project.json" ]; then
    echo "💡 Información adicional del proyecto vinculado:"
    cat .vercel/project.json
    echo ""
fi

echo "✅ Script completado"
echo "📚 Para más detalles, consulta: SETUP_VERCEL_SECRETS.md"
