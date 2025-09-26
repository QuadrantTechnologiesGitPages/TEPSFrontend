    // updateSearchIndex.js
    require('dotenv').config();
    const searchService = require('./services/search/searchService');

    async function updateIndex() {
    try {
        console.log('Starting Azure Search index update...');
        const result = await searchService.createOrUpdateIndex();
        console.log('Result:', result);
        process.exit(0);
    } catch (error) {
        console.error('Failed to update index:', error);
        process.exit(1);
    }
    }

    updateIndex();