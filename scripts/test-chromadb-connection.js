const { ChromaClient } = require('chromadb');

async function testConnection() {
    try {
        const client = new ChromaClient({ path: 'http://localhost:8000' });
        
        console.log('🔗 Testing ChromaDB connection...');
        const version = await client.version();
        console.log('✅ Connected to ChromaDB version:', version);
        
        console.log('\n📋 Listing collections...');
        const collections = await client.listCollections();
        console.log(`Found ${collections.length} collection(s):`);
        
        collections.forEach((col, i) => {
            console.log(`   ${i+1}. ${col.name} (metadata: ${JSON.stringify(col.metadata)})`);
        });
        
        // Look for our expected collection
        const expectedName = 'rag_test_manual_embeddings_bge_m3_latest';
        console.log(`\n🔍 Looking for collection: ${expectedName}`);
        
        try {
            const collection = await client.getCollection({ name: expectedName });
            const count = await collection.count();
            console.log(`✅ Found collection with ${count} documents`);
            
            if (count > 0) {
                console.log('\n📄 Testing sample query...');
                const results = await collection.query({
                    queryTexts: ['test document'],
                    nResults: 3
                });
                console.log('Query results:', results.ids[0].length, 'documents found');
            }
        } catch (error) {
            console.log(`❌ Collection ${expectedName} not found:`, error.message);
        }
        
    } catch (error) {
        console.log('❌ ChromaDB connection failed:', error.message);
    }
}

testConnection();