const { indexClient, setSearchClient, indexName } = require('./searchConfig');
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');
const candidateIndexSchema = require('./indexSchema');

async function createSearchIndex() {
    try {
        console.log('🔍 Creating Azure Search Index...');
        
        // Check if index already exists
        try {
            await indexClient.getIndex(indexName);
            console.log(`⚠️ Index '${indexName}' already exists. Deleting...`);
            await indexClient.deleteIndex(indexName);
            console.log('✅ Old index deleted');
        } catch (error) {
            console.log(`📝 Index '${indexName}' doesn't exist. Creating new...`);
        }
        
        // Create the index
        const result = await indexClient.createIndex(candidateIndexSchema);
        console.log(`✅ Index '${result.name}' created successfully!`);
        
        // Create search client for the new index
        const searchClient = new SearchClient(
            process.env.AZURE_SEARCH_ENDPOINT,
            indexName,
            new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
        );
        setSearchClient(searchClient);
        
        // Test with a sample document
        console.log('📝 Testing index with sample document...');
        const testDoc = {
            candidateId: "test-001",
            fullName: "Test Candidate",
            email: "test@example.com",
            skills: ["JavaScript", "React", "Node.js"],
            yearsOfExperience: 5,
            currentLocation: "Toronto",
            visaStatus: "Citizen",
            resumeText: "Experienced full-stack developer with 5 years building web applications.",
            status: "Active",
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const uploadResult = await searchClient.uploadDocuments([testDoc]);
        console.log('✅ Test document uploaded:', uploadResult.results[0].succeeded);
        
        // Wait a moment for indexing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test search
        const searchResults = await searchClient.search("developer", {
            select: ["candidateId", "fullName", "skills"],
            top: 5
        });
        
        console.log('🔍 Test search results:');
        for await (const result of searchResults.results) {
            console.log(`   - ${result.document.fullName} (${result.document.candidateId})`);
        }
        
        console.log('\n✅ PHASE 1 COMPLETE!');
        return searchClient;
        
    } catch (error) {
        console.error('❌ Error creating index:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createSearchIndex()
        .then(() => {
            console.log('\n🎉 Index ready for Phase 2!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Failed:', error);
            process.exit(1);
        });
}

module.exports = createSearchIndex;