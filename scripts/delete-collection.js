const { ChromaClient } = require('chromadb');

async function deleteCollection() {
    try {
        const client = new ChromaClient({ path: 'http://localhost:8000' });
        
        // Supprimer la collection corrompue
        await client.deleteCollection({ name: 'rag_test_fixed_embedding_bge_m3_latest' });
        console.log('✅ Collection corrompue supprimée');
        
        const collections = await client.listCollections();
        console.log('Collections restantes:', collections.length);
        
    } catch (error) {
        console.log('Erreur:', error.message);
    }
}

deleteCollection();