// recruitment-backend/services/candidateSearchSync.js - UPDATED
const searchService = require('./search/searchService');

class CandidateSearchSync {
    // Sync when new candidate is created
    async onCandidateCreated(candidate) {
        try {
            console.log(`🔄 Syncing new candidate to search: ${candidate.name}`);
            
            // Format candidate data for Azure Search
            const searchDocument = this.formatCandidateForSearch(candidate);
            
            // Index the candidate
            const success = await searchService.indexCandidate(searchDocument);
            
            if (success) {
                console.log(`✅ Successfully indexed candidate: ${candidate.name} (ID: ${candidate.id})`);
            } else {
                console.error(`⚠️ Failed to index candidate: ${candidate.name}`);
            }
            
            return success;
        } catch (error) {
            console.error('Failed to sync candidate to search:', error);
            // Log but don't throw - we don't want to fail the main operation
            return false;
        }
    }
    
    // Sync when candidate is updated
    async onCandidateUpdated(candidate) {
        try {
            console.log(`🔄 Updating candidate in search: ${candidate.name}`);
            
            // Format candidate data for Azure Search
            const searchDocument = this.formatCandidateForSearch(candidate);
            
            // Update the candidate in search (same as index, it will merge/update)
            const success = await searchService.indexCandidate(searchDocument);
            
            if (success) {
                console.log(`✅ Successfully updated candidate in search: ${candidate.name} (ID: ${candidate.id})`);
            } else {
                console.error(`⚠️ Failed to update candidate in search: ${candidate.name}`);
            }
            
            return success;
        } catch (error) {
            console.error('Failed to update candidate in search:', error);
            return false;
        }
    }
    
    // Remove from search when deleted (optional - you might want to keep inactive candidates searchable)
    async onCandidateDeleted(candidateId) {
        try {
            console.log(`🗑️ Removing candidate from search: ${candidateId}`);
            
            const searchClient = searchService.searchClient;
            
            // Delete the document from Azure Search
            const result = await searchClient.deleteDocuments([{ 
                candidateId: candidateId.toString() 
            }]);
            
            console.log(`✅ Successfully removed candidate from search: ${candidateId}`);
            return true;
        } catch (error) {
            console.error('Failed to remove candidate from search:', error);
            return false;
        }
    }
    
    // Format candidate data for Azure Search
    formatCandidateForSearch(candidate) {
        return {
            // Map database fields to search index fields
            candidateId: candidate.id?.toString(),
            fullName: candidate.name || '',
            email: candidate.email || '',
            phone: candidate.phone || '',
            skills: this.parseSkills(candidate.skills),
            yearsOfExperience: this.parseExperience(candidate.years_experience),
            currentLocation: candidate.current_location || '',
            visaStatus: candidate.visa_status || '',
            resumeText: candidate.resume_text || '',  // If you store resume text in DB
            resumeUrl: candidate.resume_url || '',
            status: candidate.status || 'Active',
            createdAt: new Date(candidate.created_at || Date.now()),
            updatedAt: new Date(candidate.updated_at || Date.now()),
            
            // Additional fields that might be useful for search
            education: candidate.education || '',
            currentEmployer: candidate.current_employer || '',
            availability: candidate.availability || '',
            expectedSalary: candidate.expected_salary || '',
            source: candidate.source || '',
            notes: candidate.notes || ''
        };
    }
    
    // Parse skills - handle various formats
    parseSkills(skills) {
        if (!skills) return [];
        
        // If already an array, return it
        if (Array.isArray(skills)) return skills;
        
        // If it's a JSON string, try to parse it
        if (typeof skills === 'string') {
            // First try to parse as JSON
            try {
                const parsed = JSON.parse(skills);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                // If not JSON, split by comma or semicolon
                return skills
                    .split(/[,;]/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
            }
        }
        
        return [];
    }
    
    // Parse years of experience to a number
    parseExperience(experience) {
        if (!experience) return 0;
        
        // If it's already a number, return it
        if (typeof experience === 'number') return experience;
        
        // If it's a string like "5", parse it
        if (typeof experience === 'string') {
            // Extract number from strings like "5 years", "5-7 years", etc.
            const match = experience.match(/\d+/);
            if (match) {
                return parseInt(match[0]);
            }
            
            // Handle ranges like "5-7 years" - take the lower bound
            const rangeMatch = experience.match(/(\d+)-(\d+)/);
            if (rangeMatch) {
                return parseInt(rangeMatch[1]);
            }
            
            // Handle text like "0-2 years" -> 0, "10+ years" -> 10
            if (experience.includes('0-2')) return 0;
            if (experience.includes('2-5')) return 2;
            if (experience.includes('5-8')) return 5;
            if (experience.includes('8-10')) return 8;
            if (experience.includes('10+')) return 10;
        }
        
        return 0;
    }
    
    // Bulk sync operation - useful for initial migration or recovery
    async syncAllCandidates() {
        try {
            console.log('🔄 Starting full candidate sync to Azure Search...');
            
            // This would get all candidates from your database
            const Database = require('../utils/database');
            const candidates = await Database.getCandidates({ limit: 1000 });
            
            console.log(`📊 Found ${candidates.length} candidates to sync`);
            
            // Format all candidates for search
            const searchDocuments = candidates.map(candidate => 
                this.formatCandidateForSearch(candidate)
            );
            
            // Bulk index to Azure Search
            const result = await searchService.bulkIndexCandidates(searchDocuments);
            
            console.log('✅ Full sync completed');
            return true;
        } catch (error) {
            console.error('Full sync failed:', error);
            return false;
        }
    }
    
    // Sync a batch of candidates
    async syncCandidateBatch(candidateIds) {
        try {
            console.log(`🔄 Syncing batch of ${candidateIds.length} candidates...`);
            
            const Database = require('../utils/database');
            const candidates = [];
            
            // Fetch each candidate
            for (const id of candidateIds) {
                const candidate = await Database.getCandidateById(id);
                if (candidate) {
                    candidates.push(candidate);
                }
            }
            
            // Format for search
            const searchDocuments = candidates.map(candidate => 
                this.formatCandidateForSearch(candidate)
            );
            
            // Bulk index
            const result = await searchService.bulkIndexCandidates(searchDocuments);
            
            console.log(`✅ Batch sync completed for ${candidates.length} candidates`);
            return result;
        } catch (error) {
            console.error('Batch sync failed:', error);
            return false;
        }
    }
    
    // Verify if a candidate exists in search
    async verifyCandidateInSearch(candidateId) {
        try {
            const results = await searchService.searchCandidates(
                `candidateId:${candidateId}`,
                { top: 1 }
            );
            
            return results.results.length > 0;
        } catch (error) {
            console.error('Failed to verify candidate in search:', error);
            return false;
        }
    }
}

module.exports = new CandidateSearchSync();