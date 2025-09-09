// checkIndexDetails.js
require('dotenv').config();
const { SearchIndexClient, AzureKeyCredential } = require('@azure/search-documents');

async function checkIndex() {
    const client = new SearchIndexClient(
        process.env.AZURE_SEARCH_ENDPOINT,
        new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
    );
    
    const index = await client.getIndex('candidates-index');
    console.log('Full index definition:');
    console.log(JSON.stringify(index, null, 2));
}

checkIndex();