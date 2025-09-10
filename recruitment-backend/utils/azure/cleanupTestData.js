require('dotenv').config();
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

async function cleanupTestData() {
    const client = new SearchClient(
        process.env.AZURE_SEARCH_ENDPOINT,
        'candidates-index',
        new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
    );
    
    try {
        console.log('🧹 Removing test candidates from Azure Search...');
        
        // Delete test candidates
        const result = await client.deleteDocuments([
            { candidateId: 'test-001' },
            { candidateId: 'test-002' }
        ]);
        
        console.log('✅ Test candidates removed');
        
        // Wait for deletion to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify cleanup
        const searchResults = await client.search('*', {
            top: 10,
            includeTotalCount: true
        });
        
        let count = 0;
        console.log('\n📊 Remaining candidates in Azure Search:');
        for await (const doc of searchResults.results) {
            count++;
            console.log(`  - ${doc.document.fullName} (${doc.document.candidateId})`);
        }
        console.log(`\nTotal: ${count} candidates`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

cleanupTestData();