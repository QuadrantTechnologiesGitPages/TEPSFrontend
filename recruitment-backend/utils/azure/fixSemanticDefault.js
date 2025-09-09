require('dotenv').config();
const { SearchIndexClient, AzureKeyCredential } = require('@azure/search-documents');

async function fixSemanticDefault() {
    try {
        const indexClient = new SearchIndexClient(
            process.env.AZURE_SEARCH_ENDPOINT,
            new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
        );
        
        console.log('🔧 Fixing semantic default configuration...');
        
        // Get current index
        const index = await indexClient.getIndex('candidates-index');
        
        // Set the default configuration
        index.semanticSearch.defaultConfigurationName = "default";  // ← THE FIX!
        
        console.log('Setting defaultConfigurationName to "default"...');
        
        // Update the index
        await indexClient.createOrUpdateIndex(index);
        
        console.log('✅ Default semantic configuration set!');
        
        // Wait for update to propagate
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test it
        const { SearchClient } = require('@azure/search-documents');
        const searchClient = new SearchClient(
            process.env.AZURE_SEARCH_ENDPOINT,
            'candidates-index',
            new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
        );
        
        console.log('\n🧠 Testing semantic search...');
        const results = await searchClient.search("python developer", {
            queryType: "semantic",
            queryLanguage: "en-us",
            top: 1,
            select: ["fullName", "skills"]
        });
        
        for await (const result of results.results) {
            console.log('✅ SUCCESS! Found:', result.document.fullName);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

fixSemanticDefault();