const searchService = require('./search/searchService');

class CandidateSearchSync {
    // Sync when new candidate is created
    async onCandidateCreated(candidate) {
        try {
            console.log(`🔄 Syncing new candidate to search: ${candidate.name}`);
            await searchService.indexCandidate(candidate);
            return true;
        } catch (error) {
            console.error('Failed to sync candidate to search:', error);
            return false;
        }
    }
    
    // Sync when candidate is updated
    async onCandidateUpdated(candidate) {
        try {
            console.log(`🔄 Updating candidate in search: ${candidate.name}`);
            await searchService.indexCandidate(candidate);
            return true;
        } catch (error) {
            console.error('Failed to update candidate in search:', error);
            return false;
        }
    }
    
    // Remove from search when deleted
    async onCandidateDeleted(candidateId) {
        try {
            console.log(`🗑️ Removing candidate from search: ${candidateId}`);
            const searchClient = searchService.searchClient;
            await searchClient.deleteDocuments([{ candidateId: candidateId.toString() }]);
            return true;
        } catch (error) {
            console.error('Failed to remove candidate from search:', error);
            return false;
        }
    }
    
    // Bulk sync operation
    async syncAllCandidates() {
        try {
            console.log('🔄 Starting full candidate sync...');
            // This would get all candidates from your database
            // and sync them to search
            const migrateScript = require('../../utils/azure/migrateExistingCandidates');
            await migrateScript();
            return true;
        } catch (error) {
            console.error('Full sync failed:', error);
            return false;
        }
    }
}

module.exports = new CandidateSearchSync();