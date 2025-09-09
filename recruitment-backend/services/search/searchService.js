const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');
const { BlobServiceClient } = require('@azure/storage-blob');
const { getSearchClient, indexName, endpoint, adminKey, semanticConfig } = require('../../utils/azure/searchConfig');  // Import semanticConfig


class SearchService {
    constructor() {
        this.searchClient = new SearchClient(
            endpoint,
            indexName,
            adminKey
        );
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING
        );
        this.containerName = 'resumes';
         this.semanticConfig = semanticConfig;
    }

    // Initialize blob container for resumes
    async initializeStorage() {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            await containerClient.createIfNotExists({ access: 'blob' });
            console.log('✅ Resume storage container ready');
            return true;
        } catch (error) {
            console.error('Error initializing storage:', error);
            return false;
        }
    }

    // Add or update a candidate in search index
    async indexCandidate(candidate) {
        try {
            const document = {
                candidateId: candidate.id?.toString() || candidate.candidateId,
                fullName: candidate.name || candidate.fullName || '',
                email: candidate.email || '',
                phone: candidate.phone || '',
                skills: this.parseSkills(candidate.skills),
                yearsOfExperience: parseInt(candidate.years_experience) || 0,
                currentLocation: candidate.current_location || candidate.location || '',
                visaStatus: candidate.visa_status || '',
                resumeText: candidate.resumeText || '',
                resumeUrl: candidate.resumeUrl || '',
                status: candidate.status || 'Active',
                createdAt: new Date(candidate.created_at || Date.now()),
                updatedAt: new Date(candidate.updated_at || Date.now())
            };

            const result = await this.searchClient.uploadDocuments([document]);
            return result.results[0].succeeded;
        } catch (error) {
            console.error('Error indexing candidate:', error);
            throw error;
        }
    }

    // Bulk index multiple candidates
    async bulkIndexCandidates(candidates) {
        try {
            const documents = candidates.map(candidate => ({
                candidateId: candidate.id?.toString() || candidate.candidateId,
                fullName: candidate.name || candidate.fullName || '',
                email: candidate.email || '',
                phone: candidate.phone || '',
                skills: this.parseSkills(candidate.skills),
                yearsOfExperience: parseInt(candidate.years_experience) || 0,
                currentLocation: candidate.current_location || candidate.location || '',
                visaStatus: candidate.visa_status || '',
                resumeText: candidate.resumeText || '',
                resumeUrl: candidate.resumeUrl || '',
                status: candidate.status || 'Active',
                createdAt: new Date(candidate.created_at || Date.now()),
                updatedAt: new Date(candidate.updated_at || Date.now())
            }));

            const result = await this.searchClient.uploadDocuments(documents);
            const succeeded = result.results.filter(r => r.succeeded).length;
            console.log(`✅ Indexed ${succeeded}/${candidates.length} candidates`);
            return result;
        } catch (error) {
            console.error('Error bulk indexing:', error);
            throw error;
        }
    }

    // Parse skills from string or array
    parseSkills(skills) {
        if (!skills) return [];
        if (Array.isArray(skills)) return skills;
        if (typeof skills === 'string') {
            try {
                return JSON.parse(skills);
            } catch {
                return skills.split(',').map(s => s.trim()).filter(s => s);
            }
        }
        return [];
    }

    // Search candidates
// Search candidates
async searchCandidates(query, options = {}) {
    try {
        const searchOptions = {
            top: options.top || 50,
            skip: options.skip || 0,
            includeTotalCount: true,
            queryType: 'semantic',
            queryLanguage: 'en-us',
            ...options  // Allow override
        };

        console.log('Searching with options:', searchOptions);
        
        const searchResults = await this.searchClient.search(query, searchOptions);
        const results = [];
        
        // Properly iterate through async results
        for await (const result of searchResults.results) {
            console.log('Found candidate:', result.document.fullName, 'Score:', result.score);
            results.push({
                ...result.document,
                score: result.score,
                rerankerScore: result.rerankerScore, // Semantic reranker score
                highlights: result.highlights
            });
        }

        // // Sort by score (highest first)
        // results.sort((a, b) => {
        //     const scoreA = b.rerankerScore || b.score || 0;
        //     const scoreB = a.rerankerScore || a.score || 0;
        //     return scoreB - scoreA;
        // });

        console.log(`Found ${results.length} results for query: "${query}"`);
        
        return {
            results: results, // Limit results
            count: results.length
        };
    } catch (error) {
        console.error('Search error details:', error);
        throw error;
    }
}
}

module.exports = new SearchService();