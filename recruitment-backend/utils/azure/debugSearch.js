require('dotenv').config();
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

async function debugSearch() {
    const client = new SearchClient(
        process.env.AZURE_SEARCH_ENDPOINT,
        'candidates-index',
        new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
    );
    
    console.log('🔍 DEBUGGING AZURE SEARCH\n');
    console.log('Endpoint:', process.env.AZURE_SEARCH_ENDPOINT);
    console.log('Index: candidates-index\n');
    
    try {
        // Test 1: Get ALL documents
        console.log('TEST 1: Searching for * (everything)');
        const allDocs = await client.search('*', {
            top: 10,
            includeTotalCount: true
        });
        
        let count = 0;
        console.log('Documents found:');
        for await (const doc of allDocs.results) {
            count++;
            console.log(`  ${count}. ID: ${doc.document.candidateId}, Name: ${doc.document.fullName}`);
        }
        console.log(`Total documents in index: ${count}\n`);
        
        // Test 2: Get specific fields
        console.log('TEST 2: Checking document structure');
        const sampleSearch = await client.search('*', {
            top: 1,
            select: ['candidateId', 'fullName', 'email', 'skills', 'status']
        });
        
        for await (const result of sampleSearch.results) {
            console.log('Sample document structure:');
            console.log(JSON.stringify(result.document, null, 2));
        }
        
        // Test 3: Test semantic search
        console.log('\nTEST 3: Testing semantic search for "developer"');
        const semanticSearch = await client.search('developer', {
            queryType: 'semantic',
            semanticConfiguration: 'default',
            queryLanguage: 'en-us',
            top: 5
        });
        
        let semanticCount = 0;
        for await (const result of semanticSearch.results) {
            semanticCount++;
            console.log(`  Found: ${result.document.fullName} (Score: ${result.score})`);
        }
        console.log(`Semantic search returned ${semanticCount} results\n`);
        
        // Test 4: Simple keyword search
        console.log('TEST 4: Simple keyword search for "developer"');
        const simpleSearch = await client.search('developer', {
            searchMode: 'all',
            top: 5
        });
        
        let simpleCount = 0;
        for await (const result of simpleSearch.results) {
            simpleCount++;
            console.log(`  Found: ${result.document.fullName}`);
        }
        console.log(`Simple search returned ${simpleCount} results\n`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.details) {
            console.error('Details:', error.details);
        }
    }
}

debugSearch();