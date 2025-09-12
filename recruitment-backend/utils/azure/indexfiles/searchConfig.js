// searchConfig.js - Save this in: recruitment-backend/utils/azure/searchConfig.js

require('dotenv').config();
const { SearchClient, SearchIndexClient, AzureKeyCredential } = require("@azure/search-documents");

// Validate environment variables
const requiredEnvVars = [
    'AZURE_SEARCH_ENDPOINT',
    'AZURE_SEARCH_ADMIN_KEY'
];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
    }
});

// Create clients
const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
const adminKey = new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY);

const indexClient = new SearchIndexClient(endpoint, adminKey);

// We'll create searchClient after index exists
let searchClient = null;

module.exports = {
    endpoint,
    adminKey,
    indexClient,
    getSearchClient: () => searchClient,
    setSearchClient: (client) => { searchClient = client; },
    indexName: 'candidates-index'
};