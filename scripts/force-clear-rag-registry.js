#!/usr/bin/env node

/**
 * 🧹 Script pour forcer le nettoyage du registre RAG en mémoire
 * Ce script modifie directement les fichiers de stockage persistant
 */

const fs = require('fs').promises;
const path = require('path');

async function findAndClearRAGStorage() {
    console.log('🧹 Nettoyage forcé du registre RAG...\n');
    
    // Emplacements possibles des fichiers de stockage RAG
    const possibleLocations = [
        '.rag_models.json',
        'rag-models.json', 
        'rag_models.json',
        '.rag-storage.json',
        'lib/rag/storage/models.json',
        'storage/rag-models.json',
        'lib/rag/models-storage.json',
        'data/rag-models.json'
    ];
    
    let deletedFiles = 0;
    
    for (const location of possibleLocations) {
        try {
            await fs.access(location);
            await fs.unlink(location);
            console.log(`✅ Supprimé: ${location}`);
            deletedFiles++;
        } catch (error) {
            // Fichier n'existe pas ou erreur d'accès
        }
    }
    
    // Créer un fichier vide pour forcer le reset
    const emptyStorage = {
        models: [],
        version: "1.0.0",
        lastModified: new Date().toISOString()
    };
    
    try {
        await fs.writeFile('.rag_models.json', JSON.stringify(emptyStorage, null, 2));
        console.log('✅ Fichier de stockage vide créé');
    } catch (error) {
        console.log('⚠️  Impossible de créer le fichier de stockage vide');
    }
    
    // Rechercher récursivement d'autres fichiers RAG
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync('find . -name "*rag*" -name "*.json" -not -path "./node_modules/*" 2>/dev/null || true');
        const additionalFiles = stdout.trim().split('\n').filter(f => f && f.length > 2);
        
        for (const file of additionalFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                if (content.includes('ragModel') || content.includes('embeddingModel') || content.includes('collectionName')) {
                    await fs.unlink(file);
                    console.log(`✅ Supprimé fichier RAG détecté: ${file}`);
                    deletedFiles++;
                }
            } catch (error) {
                // Ignore
            }
        }
    } catch (error) {
        // Ignore find errors
    }
    
    console.log(`\n📊 ${deletedFiles} fichier(s) supprimé(s)`);
    
    // Redémarrer le serveur de développement si possible
    console.log('\n🔄 Pour appliquer les changements:');
    console.log('   1. Redémarrez votre serveur Next.js');
    console.log('   2. Ou visitez: http://localhost:3000/api/rag/models');
    console.log('   3. Créez un nouveau modèle RAG\n');
}

if (require.main === module) {
    findAndClearRAGStorage();
}