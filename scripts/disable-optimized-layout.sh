#!/bin/bash

# Script pour désactiver le layout optimisé et revenir à l'ancien
# Usage: ./scripts/disable-optimized-layout.sh

echo "🔄 Désactivation du layout optimisé..."
echo ""

# Vérifier si le backup existe
if [ ! -f "app/layout-old.tsx" ]; then
    echo "❌ Erreur: Aucune sauvegarde trouvée (app/layout-old.tsx)"
    echo "   Impossible de restaurer l'ancien layout"
    exit 1
fi

# Sauvegarder le layout optimisé
if [ -f "app/layout.tsx" ]; then
    echo "📦 Sauvegarde du layout optimisé..."
    cp app/layout.tsx app/layout-optimized-backup.tsx
    echo "✅ Sauvegardé dans app/layout-optimized-backup.tsx"
fi

# Restaurer l'ancien layout
echo "🔄 Restauration de l'ancien layout..."
mv app/layout-old.tsx app/layout.tsx
echo "✅ Ancien layout restauré !"

echo ""
echo "ℹ️  L'ancien layout est maintenant actif"
echo ""
echo "🎉 Redémarrez le serveur: npm run dev"
