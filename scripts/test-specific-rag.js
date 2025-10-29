const { RagPipeline } = require('../lib/rag/rag-pipeline');

async function testSpecificRagModel() {
    try {
        console.log('🔍 Testing specific RAG model search...\n');
        
        const ragPipeline = new RagPipeline();
        await ragPipeline.initialize();
        
        const modelName = 'test-manual-embeddings';
        console.log(`Testing model: ${modelName}`);
        
        // Test queries that should match our test document content
        const testQueries = [
            'test document',
            'RAG system', 
            'BGE-M3',
            'embedding model',
            'ChromaDB',
            'technical details',
            'qwen3:8b'
        ];
        
        for (const query of testQueries) {
            try {
                console.log(`\n🔍 Testing query: "${query}"`);
                
                const result = await ragPipeline.searchRagModel(
                    modelName,
                    query,
                    5,
                    'vector'
                );
                
                console.log(`   ✅ Found ${result.results.length} results in ${result.searchTime}ms`);
                
                if (result.results.length > 0) {
                    result.results.forEach((res, i) => {
                        console.log(`   ${i+1}. Score: ${res.score.toFixed(3)} - "${res.content.substring(0, 100)}..."`);
                    });
                } else {
                    console.log('   ⚠️  No results found');
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        
        // Test hybrid search as well
        console.log('\n🔍 Testing hybrid search...');
        try {
            const result = await ragPipeline.searchRagModel(
                modelName,
                'test document RAG system',
                3,
                'hybrid'
            );
            
            console.log(`   ✅ Hybrid search found ${result.results.length} results in ${result.searchTime}ms`);
            result.results.forEach((res, i) => {
                console.log(`   ${i+1}. Score: ${res.score.toFixed(3)} - "${res.content.substring(0, 100)}..."`);
            });
            
        } catch (error) {
            console.log(`   ❌ Hybrid search error: ${error.message}`);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testSpecificRagModel();