const { ChromaClient } = require('chromadb');

async function debugCollectionContent() {
    try {
        const client = new ChromaClient({ path: 'http://localhost:8000' });
        
        const collectionName = 'rag_test_manual_embeddings_bge_m3_latest';
        console.log(`🔍 Debugging collection: ${collectionName}`);
        
        const collection = await client.getCollection({ name: collectionName });
        const count = await collection.count();
        console.log(`📊 Total documents: ${count}`);
        
        if (count > 0) {
            console.log('\n📄 Retrieving all documents...');
            const allDocs = await collection.get({
                limit: count,
                include: ['documents', 'metadatas']
            });
            
            console.log(`Found ${allDocs.ids.length} documents:`);
            allDocs.ids.forEach((id, i) => {
                console.log(`\n--- Document ${i + 1} (ID: ${id}) ---`);
                console.log('Content preview:', allDocs.documents[i].substring(0, 200) + '...');
                console.log('Metadata:', JSON.stringify(allDocs.metadatas[i], null, 2));
            });
            
            // Test with specific content from our test document
            console.log('\n🔍 Testing search with content from the document...');
            const testQueries = [
                'test document',
                'RAG system',
                'BGE-M3',
                'embedding model',
                'ChromaDB'
            ];
            
            for (const query of testQueries) {
                try {
                    console.log(`\n Testing query: "${query}"`);
                    // We need to provide embeddings since we don't have an embedding function
                    // For now, let's try with empty embeddings to see what happens
                    const results = await collection.query({
                        queryTexts: [query],
                        nResults: 3,
                        include: ['documents', 'metadatas', 'distances']
                    });
                    
                    console.log(`   Results: ${results.ids[0].length} documents found`);
                    if (results.ids[0].length > 0) {
                        results.ids[0].forEach((id, i) => {
                            console.log(`   - ${id}: "${results.documents[0][i].substring(0, 100)}..." (distance: ${results.distances[0][i]})`);
                        });
                    }
                } catch (error) {
                    console.log(`   Error: ${error.message}`);
                }
            }
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

debugCollectionContent();