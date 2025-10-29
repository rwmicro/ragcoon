#!/usr/bin/env node

/**
 * 🔍 Script de Debug ChromaDB - Vérification des collections et embeddings
 */

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

async function testChromaDBAPI() {
    log('info', 'Test de l\'API ChromaDB...');
    
    try {
        // Test v1 heartbeat
        try {
            const { stdout: v1 } = await execAsync('curl -s http://localhost:8000/api/v1/heartbeat');
            console.log('   v1 heartbeat:', v1);
        } catch (error) {
            console.log('   v1 heartbeat: Non disponible');
        }
        
        // Test v2 heartbeat  
        try {
            const { stdout: v2 } = await execAsync('curl -s http://localhost:8000/api/v2/heartbeat');
            console.log('   v2 heartbeat:', v2);
        } catch (error) {
            console.log('   v2 heartbeat: Non disponible');
        }
        
        // Test version
        try {
            const { stdout: version } = await execAsync('curl -s http://localhost:8000/api/v1/version');
            console.log('   Version:', version);
        } catch (error) {
            // Ignore
        }
        
        return true;
    } catch (error) {
        log('error', 'ChromaDB API non accessible');
        return false;
    }
}

async function testChromaDBCollections() {
    log('info', 'Vérification des collections ChromaDB...');
    
    try {
        // Essayer de lister les collections avec l'API v2
        const { stdout } = await execAsync('curl -s http://localhost:8000/api/v1/collections');
        const collections = JSON.parse(stdout);
        
        if (Array.isArray(collections)) {
            log('success', `${collections.length} collection(s) trouvée(s)`);
            collections.forEach((col, i) => {
                console.log(`   ${i+1}. ${col.name || col.id} (${col.count || 0} documents)`);
            });
            return collections;
        } else {
            log('warning', 'Format de réponse inattendu');
            console.log('   Réponse:', collections);
        }
    } catch (error) {
        log('error', 'Impossible de lister les collections');
        console.log('   Erreur:', error.message);
    }
    
    return [];
}

async function testChromaDBWithJS() {
    log('info', 'Test avec la bibliothèque JavaScript ChromaDB...');
    
    try {
        // Simulation du code de vector-store.ts
        const testCode = `
        const { ChromaClient } = require('chromadb');
        
        async function testConnection() {
            try {
                const client = new ChromaClient({ path: 'http://localhost:8000' });
                const version = await client.version();
                console.log('✅ Connexion JS réussie, version:', version);
                
                const collections = await client.listCollections();
                console.log('📋 Collections trouvées:', collections.length);
                
                collections.forEach(col => {
                    console.log('   -', col.name);
                });
                
                return true;
            } catch (error) {
                console.log('❌ Erreur JS:', error.message);
                return false;
            }
        }
        
        testConnection();
        `;
        
        // Écrire et exécuter le test temporaire
        const fs = require('fs').promises;
        await fs.writeFile('/tmp/test-chromadb.js', testCode);
        
        const { stdout, stderr } = await execAsync('cd /home/user/Documents/projects/rag-chat-interface && node /tmp/test-chromadb.js');
        
        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.log('Stderr:', stderr);
        }
        
        // Nettoyer
        await fs.unlink('/tmp/test-chromadb.js');
        
        return true;
    } catch (error) {
        log('error', 'Test JavaScript échoué');
        console.log('   Erreur:', error.message);
        return false;
    }
}

async function searchForRAGCollections() {
    log('info', 'Recherche des collections RAG attendues...');
    
    const expectedCollections = [
        'rag_test_kabyle_bge_m3_latest',
        'rag_test-kabyle_bge_m3_latest',
        'rag_testkabyle_bge_m3_latest'
    ];
    
    for (const colName of expectedCollections) {
        try {
            const { stdout } = await execAsync(`curl -s "http://localhost:8000/api/v1/collections/${colName}"`);
            const result = JSON.parse(stdout);
            
            if (!result.error) {
                log('success', `Collection trouvée: ${colName}`);
                console.log('   Détails:', result);
            } else {
                log('info', `Collection non trouvée: ${colName}`);
            }
        } catch (error) {
            log('info', `Collection non trouvée: ${colName}`);
        }
    }
}

async function main() {
    console.log('🔍 === DEBUG CHROMADB DÉTAILLÉ ===\\n');
    
    await testChromaDBAPI();
    console.log('');
    
    const collections = await testChromaDBCollections();
    console.log('');
    
    await testChromaDBWithJS();
    console.log('');
    
    await searchForRAGCollections();
    
    console.log('\\n💡 === DIAGNOSTIC ===');
    
    if (collections.length === 0) {
        console.log('❌ Aucune collection ChromaDB trouvée');
        console.log('   ➡️ Le modèle RAG n\'a probablement pas été indexé correctement');
        console.log('   ➡️ Recréez le modèle RAG via l\'interface web');
    } else {
        console.log('✅ Collections ChromaDB présentes');
        console.log('   ➡️ Vérifiez si les noms de collections correspondent');
    }
    
    console.log('\\n🛠️ === ACTIONS RECOMMANDÉES ===');
    console.log('1. Si aucune collection: Recréer le modèle RAG');
    console.log('2. Si collections présentes: Vérifier les noms et embeddings');
    console.log('3. Vérifier les logs du serveur Next.js pendant la création');
    
    console.log('\\n✅ Debug terminé!');
}

if (require.main === module) {
    main();
}

module.exports = { testChromaDBAPI, testChromaDBCollections, testChromaDBWithJS };