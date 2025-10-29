async function testEmbeddingGeneration() {
    try {
        console.log('🔍 Testing embedding generation...\n');
        
        // Test via the API
        const testQueries = [
            'test document',
            'RAG system',
            'hello world'
        ];
        
        for (const query of testQueries) {
            console.log(`Testing embedding for: "${query}"`);
            
            // Test BGE-M3
            const bgeResponse = await fetch('http://localhost:11434/api/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'bge-m3:latest',
                    prompt: query
                })
            });
            
            if (bgeResponse.ok) {
                const bgeData = await bgeResponse.json();
                console.log(`  BGE-M3: ${bgeData.embedding.length} dimensions, first few: [${bgeData.embedding.slice(0, 5).map(x => x.toFixed(4)).join(', ')}...]`);
            } else {
                console.log(`  BGE-M3: Error ${bgeResponse.status}`);
            }
            
            // Test nomic-embed-text
            const nomicResponse = await fetch('http://localhost:11434/api/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nomic-embed-text',
                    prompt: query
                })
            });
            
            if (nomicResponse.ok) {
                const nomicData = await nomicResponse.json();
                console.log(`  Nomic: ${nomicData.embedding.length} dimensions, first few: [${nomicData.embedding.slice(0, 5).map(x => x.toFixed(4)).join(', ')}...]`);
            } else {
                console.log(`  Nomic: Error ${nomicResponse.status}`);
            }
            
            console.log('');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testEmbeddingGeneration();