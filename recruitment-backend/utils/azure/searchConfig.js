require('dotenv').config();
const { SearchClient, SearchIndexClient, SearchIndexerClient, AzureKeyCredential } = require("@azure/search-documents");

// Validate environment variables
const requiredEnvVars = [
    'AZURE_SEARCH_ENDPOINT',
    'AZURE_SEARCH_ADMIN_KEY',
    'AZURE_SEARCH_QUERY_KEY',
    'AZURE_STORAGE_CONNECTION_STRING'
];

// Optional but recommended
const optionalEnvVars = [
    'AZURE_SEMANTIC_CONFIG'
];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
    }
});

// Check optional vars
optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.warn(`⚠️ Optional variable ${varName} not set. Some features may be limited.`);
    }
});

// Create clients
const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
const adminKey = new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY);
const queryKey = new AzureKeyCredential(process.env.AZURE_SEARCH_QUERY_KEY);
const semanticConfig = process.env.AZURE_SEMANTIC_CONFIG || 'default';

const indexClient = new SearchIndexClient(endpoint, adminKey);
const indexerClient = new SearchIndexerClient(endpoint, adminKey);

// We'll create searchClient after index exists
let searchClient = null;

module.exports = {
    endpoint,
    adminKey,
    queryKey,
    semanticConfig,  // Export the semantic config
    indexClient,
    indexerClient,
    getSearchClient: () => searchClient,
    setSearchClient: (client) => { searchClient = client; },
    indexName: process.env.SEARCH_INDEX_NAME || 'candidates-index'
};