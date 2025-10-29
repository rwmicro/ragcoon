const { ChromaClient } = require('chromadb');

async function testManualVectorSearch() {
    try {
        console.log('🔍 Testing manual vector search...\n');
        
        const client = new ChromaClient({ path: 'http://localhost:8000' });
        const collectionName = 'rag_test_manual_embeddings_bge_m3_latest';
        
        console.log(`Getting collection: ${collectionName}`);
        const collection = await client.getCollection({ name: collectionName });
        
        // First, let's see what's actually in the collection
        const count = await collection.count();
        console.log(`Collection has ${count} documents`);
        
        // Get all documents to see what we have
        const allDocs = await collection.get({
            limit: count,
            include: ['documents', 'metadatas', 'embeddings']
        });
        
        console.log(`\nAll documents:`);
        allDocs.ids.forEach((id, i) => {
            console.log(`  ${id}: "${allDocs.documents[i].substring(0, 100)}..."`);
            console.log(`    Embedding dimension: ${allDocs.embeddings[i].length}`);
            console.log(`    First few embedding values: [${allDocs.embeddings[i].slice(0, 5).map(x => x.toFixed(4)).join(', ')}...]`);
        });
        
        // Generate a test embedding using the same method as our RAG system
        console.log(`\n🔍 Generating query embedding for "test document"...`);
        
        const embeddingResponse = await fetch('http://localhost:11434/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'bge-m3:latest',
                prompt: 'test document'
            })
        });
        
        if (!embeddingResponse.ok) {
            throw new Error(`Embedding generation failed: ${embeddingResponse.status}`);
        }
        
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.embedding;
        
        console.log(`Generated embedding with ${queryEmbedding.length} dimensions`);
        console.log(`First few values: [${queryEmbedding.slice(0, 5).map(x => x.toFixed(4)).join(', ')}...]`);
        
        // Now test the search
        console.log(`\n🔍 Testing vector search...`);
        
        const searchResult = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: 5,
            include: ['documents', 'metadatas', 'distances']
        });
        
        console.log(`Search returned ${searchResult.ids[0]?.length || 0} results`);
        
        if (searchResult.ids[0] && searchResult.ids[0].length > 0) {
            searchResult.ids[0].forEach((id, i) => {
                console.log(`  Result ${i + 1}:`);
                console.log(`    ID: ${id}`);
                console.log(`    Distance: ${searchResult.distances[0][i]}`);
                console.log(`    Content: "${searchResult.documents[0][i].substring(0, 100)}..."`);
            });
        } else {
            console.log(`  No results found`);
            
            // Let's try with a higher similarity threshold
            console.log(`\n🔍 Trying with higher nResults (10)...`);
            const searchResult2 = await collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: 10,
                include: ['documents', 'metadatas', 'distances']
            });
            
            console.log(`Search with higher limit returned ${searchResult2.ids[0]?.length || 0} results`);
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Stack:', error.stack);
    }
}

testManualVectorSearch();