#!/usr/bin/env node

/**
 * 🧪 Test direct de création de collection ChromaDB
 */

async function testDirectCollectionCreation() {
    console.log('🧪 Test de création directe de collection ChromaDB...\n');
    
    try {
        // Importer ChromaDB dans le contexte du projet
        process.chdir('/home/user/Documents/projects/rag-chat-interface');
        
        const { ChromaClient } = require('chromadb');
        
        console.log('1. Connexion à ChromaDB...');
        const client = new ChromaClient({ path: 'http://localhost:8000' });
        
        const version = await client.version();
        console.log('✅ Connecté à ChromaDB version:', version);
        
        console.log('\n2. Test de création de collection...');
        const testCollectionName = 'test_collection_' + Date.now();
        
        const collection = await client.createCollection({
            name: testCollectionName,
            metadata: {
                description: 'Test collection',
                embedding_dimension: 1024
            }
        });
        
        console.log('✅ Collection créée:', collection.name);
        
        console.log('\n3. Test d\'ajout de documents...');
        
        // Générer des embeddings de test
        const testEmbeddings = [
            Array(1024).fill(0).map(() => Math.random() - 0.5),
            Array(1024).fill(0).map(() => Math.random() - 0.5)
        ];
        
        await collection.add({
            ids: ['doc1', 'doc2'],
            documents: ['Document test 1', 'Document test 2'],
            embeddings: testEmbeddings,
            metadatas: [
                { source: 'test1' },
                { source: 'test2' }
            ]
        });
        
        console.log('✅ Documents ajoutés à la collection');
        
        console.log('\n4. Test de recherche...');
        
        const results = await collection.query({
            queryEmbeddings: [testEmbeddings[0]],
            nResults: 2
        });
        
        console.log('✅ Recherche réussie:', results.documents.length, 'résultats');
        console.log('   Documents trouvés:', results.documents[0]);
        
        console.log('\n5. Nettoyage...');
        await client.deleteCollection({ name: testCollectionName });
        console.log('✅ Collection supprimée');
        
        console.log('\n🎉 Test réussi ! ChromaDB fonctionne correctement.');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error('Détails:', error);
        return false;
    }
}

async function listCollections() {
    try {
        process.chdir('/home/user/Documents/projects/rag-chat-interface');
        const { ChromaClient } = require('chromadb');
        
        const client = new ChromaClient({ path: 'http://localhost:8000' });
        const collections = await client.listCollections();
        
        console.log('📋 Collections existantes:');
        if (collections.length === 0) {
            console.log('   Aucune collection trouvée');
        } else {
            collections.forEach((col, i) => {
                console.log(`   ${i+1}. ${col.name} (métadonnées: ${JSON.stringify(col.metadata)})`);
            });
        }
        
        return collections;
    } catch (error) {
        console.error('❌ Erreur lors de la liste des collections:', error.message);
        return [];
    }
}

async function main() {
    console.log('🔬 === TEST CHROMADB DIRECT ===\n');
    
    await listCollections();
    console.log('');
    
    const success = await testDirectCollectionCreation();
    
    if (success) {
        console.log('\n💡 ChromaDB fonctionne. Le problème vient probablement du code RAG.');
    } else {
        console.log('\n💡 ChromaDB a des problèmes. Vérifiez la configuration.');
    }
}

if (require.main === module) {
    main();
}

module.exports = { testDirectCollectionCreation, listCollections };