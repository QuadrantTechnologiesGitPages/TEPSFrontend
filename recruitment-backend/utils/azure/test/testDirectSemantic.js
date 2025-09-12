require('dotenv').config();
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

async function testDirect() {
    const client = new SearchClient(
        process.env.AZURE_SEARCH_ENDPOINT,
        'candidates-index',
        new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
    );
    
    try {
        // Try different semantic config approaches
        console.log('Testing semantic search approaches...\n');
        
        // Approach 1: With semanticConfiguration parameter
        try {
            console.log('1. Testing with semanticConfiguration: "default"');
            const result1 = await client.search("python developer", {
                queryType: "semantic",
                semanticConfiguration: "default",
                queryLanguage: "en-us",
                top: 1
            });
            console.log('✅ Approach 1 works!');
        } catch (e) {
            console.log('❌ Approach 1 failed:', e.message);
        }
        
        // Approach 2: Without semanticConfiguration (relies on default)
        try {
            console.log('\n2. Testing without semanticConfiguration parameter');
            const result2 = await client.search("python developer", {
                queryType: "semantic",
                queryLanguage: "en-us",
                top: 1
            });
            console.log('✅ Approach 2 works!');
        } catch (e) {
            console.log('❌ Approach 2 failed:', e.message);
        }
        
        // Approach 3: With semantic_configuration (underscore)
        try {
            console.log('\n3. Testing with semantic_configuration: "default"');
            const result3 = await client.search("python developer", {
                queryType: "semantic",
                semantic_configuration: "default",
                queryLanguage: "en-us",
                top: 1
            });
            console.log('✅ Approach 3 works!');
        } catch (e) {
            console.log('❌ Approach 3 failed:', e.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testDirect();