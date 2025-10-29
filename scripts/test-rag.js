#!/usr/bin/env node

/**
 * 🔍 Script de Diagnostic RAG
 * Teste tous les composants du système RAG
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

async function testOllama() {
    log('info', 'Test 1: Vérification des modèles Ollama...');
    
    try {
        const { stdout } = await execAsync('curl -s http://localhost:11434/api/tags');
        const data = JSON.parse(stdout);
        const models = data.models || [];
        
        log('success', `Ollama accessible avec ${models.length} modèles`);
        
        const embeddingModels = models.filter(m => 
            m.name.includes('embed') || m.name.includes('bge')
        );
        
        const chatModels = models.filter(m => 
            m.name.includes('qwen') || m.name.includes('llama')
        );
        
        console.log('   📊 Modèles d\'embedding:', embeddingModels.map(m => m.name).join(', '));
        console.log('   🤖 Modèles de chat:', chatModels.map(m => m.name).join(', '));
        
        return true;
    } catch (error) {
        log('error', 'Ollama non accessible');
        return false;
    }
}

async function testChromaDB() {
    log('info', 'Test 2: Vérification de ChromaDB...');
    
    try {
        // Essayer v1 puis v2
        try {
            await execAsync('curl -s http://localhost:8000/api/v1/heartbeat');
        } catch {
            await execAsync('curl -s http://localhost:8000/api/v2/heartbeat');
        }
        
        log('success', 'ChromaDB accessible');
        return true;
    } catch (error) {
        log('error', 'ChromaDB non accessible');
        log('info', 'Essayez: docker compose -f docker-compose.chromadb.yml up -d');
        return false;
    }
}

async function testEmbedding() {
    log('info', 'Test 3: Test des embeddings BGE-M3...');
    
    try {
        const { stdout } = await execAsync(`curl -s http://localhost:11434/api/embeddings \\
            -H "Content-Type: application/json" \\
            -d '{"model": "bge-m3:latest", "prompt": "test embedding"}'`);
        
        const data = JSON.parse(stdout);
        
        if (data.embedding && Array.isArray(data.embedding)) {
            log('success', `BGE-M3 fonctionne (dimension: ${data.embedding.length})`);
            
            if (data.embedding.length !== 1024) {
                log('warning', 'BGE-M3 devrait avoir 1024 dimensions');
            }
            
            return true;
        } else {
            log('error', 'Réponse d\'embedding invalide');
            return false;
        }
    } catch (error) {
        log('error', 'Test d\'embedding échoué');
        console.log('   Erreur:', error.message);
        return false;
    }
}

async function testRAGModels() {
    log('info', 'Test 4: Vérification des modèles RAG...');
    
    try {
        const { stdout } = await execAsync('curl -s http://localhost:3000/api/rag/models');
        const data = JSON.parse(stdout);
        
        if (data.models && data.models.length > 0) {
            log('success', `${data.models.length} modèle(s) RAG trouvé(s)`);
            
            data.models.forEach((model, i) => {
                const embeddingModel = model.description?.match(/Embedding Model: (\S+)/)?.[1];
                console.log(`   ${i+1}. ${model.name} (embedding: ${embeddingModel})`);
            });
            
            return data.models;
        } else {
            log('warning', 'Aucun modèle RAG trouvé');
            return [];
        }
    } catch (error) {
        log('error', 'Impossible d\'accéder aux modèles RAG');
        return [];
    }
}

async function testRAGSearch(modelName) {
    log('info', `Test 5: Test de recherche RAG sur "${modelName}"...`);
    
    const queries = [
        'test',
        'maison',
        'comment',
        'python'
    ];
    
    for (const query of queries) {
        try {
            const { stdout } = await execAsync(`curl -s -X POST http://localhost:3000/api/rag/debug-search \\
                -H "Content-Type: application/json" \\
                -d '{"modelName": "${modelName}", "query": "${query}"}'`);
            
            const result = JSON.parse(stdout);
            
            if (result.success) {
                const status = result.resultsFound > 0 ? 'success' : 'warning';
                log(status, `Query "${query}": ${result.resultsFound} résultat(s)`);
                
                if (result.resultsFound > 0) {
                    console.log(`   🎯 Premier résultat: "${result.contexts[0].content.substring(0, 100)}..."`);
                    console.log(`   📊 Score: ${result.contexts[0].score}`);
                }
            } else {
                log('error', `Query "${query}" échouée: ${result.error}`);
            }
        } catch (error) {
            log('error', `Erreur lors de la recherche "${query}"`);
        }
    }
}

async function main() {
    console.log('🔍 === DIAGNOSTIC RAG COMPLET ===\\n');
    
    const ollamaOk = await testOllama();
    const chromaOk = await testChromaDB();
    const embeddingOk = await testEmbedding();
    const ragModels = await testRAGModels();
    
    console.log('\\n📋 === RÉSUMÉ ===');
    log(ollamaOk ? 'success' : 'error', `Ollama: ${ollamaOk ? 'OK' : 'ERREUR'}`);
    log(chromaOk ? 'success' : 'error', `ChromaDB: ${chromaOk ? 'OK' : 'ERREUR'}`);
    log(embeddingOk ? 'success' : 'error', `Embeddings: ${embeddingOk ? 'OK' : 'ERREUR'}`);
    log(ragModels.length > 0 ? 'success' : 'warning', `Modèles RAG: ${ragModels.length} trouvé(s)`);
    
    if (ragModels.length > 0 && ollamaOk && embeddingOk) {
        console.log('\\n🔍 === TEST DE RECHERCHE ===');
        for (const model of ragModels) {
            // Extraire le nom du modèle à partir de l'ID
            const modelName = model.id.replace('rag:', '');
            await testRAGSearch(modelName);
        }
    }
    
    console.log('\\n💡 === RECOMMANDATIONS ===');
    
    if (!ollamaOk) {
        console.log('   1. Démarrez Ollama: ollama serve');
        console.log('   2. Installez BGE-M3: ollama pull bge-m3:latest');
    }
    
    if (!chromaOk) {
        console.log('   1. Démarrez ChromaDB: docker compose -f docker-compose.chromadb.yml up -d');
    }
    
    if (ragModels.length === 0) {
        console.log('   1. Créez un modèle RAG via l\'interface web');
        console.log('   2. Spécifiez: modèle de base=qwen3:8b, embedding=bge-m3:latest');
    }
    
    console.log('\\n✅ Diagnostic terminé!');
}

if (require.main === module) {
    main();
}

module.exports = { testOllama, testChromaDB, testEmbedding, testRAGModels, testRAGSearch };