#!/usr/bin/env node

/**
 * 🔄 Script de Reset Complet RAG + ChromaDB (Version Node.js)
 * Usage: node scripts/reset-rag.js
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Couleurs pour les messages
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(level, message) {
    const color = colors[level] || colors.reset;
    const emoji = {
        info: 'ℹ️ ',
        success: '✅',
        warning: '⚠️ ',
        error: '❌'
    }[level] || '';
    
    console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function checkFile(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function deleteFile(filePath) {
    try {
        await fs.unlink(filePath);
        return true;
    } catch {
        return false;
    }
}

async function deleteDirectory(dirPath) {
    try {
        await fs.rm(dirPath, { recursive: true, force: true });
        return true;
    } catch {
        return false;
    }
}

async function findRAGStorageFiles() {
    const searchPatterns = [
        'rag-models.json',
        'rag_models.json',
        '.rag-storage.json',
        'lib/rag/storage/models.json',
        'storage/rag-models.json'
    ];
    
    const foundFiles = [];
    
    for (const pattern of searchPatterns) {
        if (await checkFile(pattern)) {
            foundFiles.push(pattern);
        }
    }
    
    // Recherche récursive pour d'autres fichiers RAG
    try {
        const { stdout } = await execAsync('find . -name "*rag*models*.json" -not -path "./node_modules/*" 2>/dev/null || true');
        const additionalFiles = stdout.trim().split('\n').filter(f => f && !foundFiles.includes(f));
        foundFiles.push(...additionalFiles);
    } catch {
        // Ignore errors in find command
    }
    
    return foundFiles;
}

async function resetChromaDB() {
    log('info', 'Arrêt de ChromaDB...');
    
    try {
        // Essayer docker compose puis docker-compose
        try {
            await execAsync('docker compose -f docker-compose.chromadb.yml down -v');
        } catch {
            await execAsync('docker-compose -f docker-compose.chromadb.yml down -v');
        }
        log('success', 'ChromaDB arrêté et volumes supprimés');
    } catch (error) {
        log('warning', 'ChromaDB n\'était pas en cours d\'exécution ou erreur lors de l\'arrêt');
    }
    
    // Supprimer le dossier de données
    if (await checkFile('chromadb_data')) {
        await deleteDirectory('chromadb_data');
        log('success', 'Dossier chromadb_data supprimé');
    }
    
    // Redémarrer ChromaDB
    log('info', 'Redémarrage de ChromaDB...');
    try {
        try {
            await execAsync('docker compose -f docker-compose.chromadb.yml up -d');
        } catch {
            await execAsync('docker-compose -f docker-compose.chromadb.yml up -d');
        }
        log('success', 'ChromaDB redémarré');
        
        // Attendre que ChromaDB soit prêt
        log('info', 'Attente du démarrage de ChromaDB...');
        for (let i = 0; i < 15; i++) {
            try {
                await execAsync('curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1 || curl -s http://localhost:8000/heartbeat > /dev/null 2>&1');
                log('success', 'ChromaDB est opérationnel !');
                return true;
            } catch {
                process.stdout.write('.');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('');
        log('warning', 'ChromaDB met du temps à démarrer, mais continuez...');
        return true;
        
    } catch (error) {
        log('error', `Erreur lors du redémarrage de ChromaDB: ${error.message}`);
        return false;
    }
}

async function resetRAGModels() {
    log('info', 'Suppression des modèles RAG stockés...');
    
    const storageFiles = await findRAGStorageFiles();
    let deletedCount = 0;
    
    for (const file of storageFiles) {
        if (await deleteFile(file)) {
            log('success', `Fichier supprimé: ${file}`);
            deletedCount++;
        }
    }
    
    if (deletedCount === 0) {
        log('info', 'Aucun fichier de stockage RAG trouvé');
    } else {
        log('success', `${deletedCount} fichier(s) de stockage RAG supprimé(s)`);
    }
}

async function resetRAGRegistry() {
    log('info', 'Reset du registre RAG en mémoire...');
    
    try {
        // Essayer de faire un appel à l'API pour déclencher un reload
        await execAsync('curl -s http://localhost:3000/api/rag/models > /dev/null 2>&1 || true');
        log('success', 'Registre RAG notifié');
    } catch {
        log('info', 'Impossible de notifier le registre RAG (serveur peut-être arrêté)');
    }
}

async function verifyReset() {
    log('info', 'Vérification du reset...');
    
    const checks = [
        {
            name: 'ChromaDB',
            test: () => execAsync('curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1 || curl -s http://localhost:8000/heartbeat > /dev/null 2>&1')
        },
        {
            name: 'Dossier chromadb_data absent',
            test: async () => {
                const exists = await checkFile('chromadb_data');
                if (exists) throw new Error('Still exists');
            }
        }
    ];
    
    for (const check of checks) {
        try {
            await check.test();
            log('success', `${check.name}: OK`);
        } catch {
            log('warning', `${check.name}: Problème détecté`);
        }
    }
}

async function main() {
    console.log('🔄 === RESET COMPLET RAG + CHROMADB ===\n');
    
    // Vérifier qu'on est dans le bon répertoire
    if (!(await checkFile('docker-compose.chromadb.yml'))) {
        log('error', 'docker-compose.chromadb.yml non trouvé. Exécutez ce script depuis la racine du projet.');
        process.exit(1);
    }
    
    try {
        // Étape 1: Reset ChromaDB
        const chromaSuccess = await resetChromaDB();
        
        // Étape 2: Reset modèles RAG
        await resetRAGModels();
        
        // Étape 3: Reset registre
        await resetRAGRegistry();
        
        // Étape 4: Vérifications
        await verifyReset();
        
        console.log('');
        log('success', '=== RESET TERMINÉ AVEC SUCCÈS ===');
        console.log('');
        console.log('📋 Prochaines étapes :');
        console.log('   1. Aller sur http://localhost:3000');
        console.log('   2. Créer un nouveau modèle RAG');
        console.log('   3. Spécifier explicitement:');
        console.log('      - Modèle de base: qwen3:8b');
        console.log('      - Modèle d\'embedding: bge-m3:latest');
        console.log('   4. Uploader vos documents');
        console.log('');
        console.log('🔍 Vérifications rapides :');
        console.log('   - ChromaDB: http://localhost:8000/api/v1/heartbeat');
        console.log('   - Interface: http://localhost:3000');
        console.log('   - Modèles RAG: http://localhost:3000/api/rag/models');
        console.log('');
        
    } catch (error) {
        log('error', `Erreur durant le reset: ${error.message}`);
        process.exit(1);
    }
}

// Gestion des signaux pour un arrêt propre
process.on('SIGINT', () => {
    console.log('\n');
    log('warning', 'Reset interrompu par l\'utilisateur');
    process.exit(1);
});

if (require.main === module) {
    main();
}

module.exports = { resetChromaDB, resetRAGModels, main };