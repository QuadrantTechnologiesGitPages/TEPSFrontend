// recruitment-backend/services/search/searchService.js - FIXED VERSION
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');
const { BlobServiceClient } = require('@azure/storage-blob');

class SearchService {
    constructor() {
        // Initialize Azure Search client
        this.searchClient = new SearchClient(
            process.env.AZURE_SEARCH_ENDPOINT,
            'candidates-index',
            new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
        );
        
        // Initialize Azure Storage
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING
        );
        this.containerName = 'resumes';
        
        console.log('✅ Search Service initialized with semantic search support');
    }
    
    /**
     * 🔥 FIXED: Search candidates with proper semantic search
     */
    async searchCandidates(query, options = {}) {
        try {
            console.log(`🔍 Searching for: "${query}" with options:`, {
                queryType: options.queryType || 'simple',
                semanticConfiguration: options.semanticConfiguration,
                top: options.top
            });
            
            // Build search options with semantic configuration
            const searchOptions = {
                top: options.top || 20,
                includeTotalCount: true,
                ...options // Spread all options to preserve semantic settings
            };
            
            // 🔥 FIX: Ensure semantic search is properly configured
            if (options.queryType === 'semantic') {
                // Use the exact configuration name from Azure Portal
                searchOptions.semanticConfiguration = options.semanticConfiguration || 'default';
                searchOptions.queryType = 'semantic';
                searchOptions.queryLanguage = options.queryLanguage || 'en-us';
                
                // Add semantic-specific features if not already present
                if (!searchOptions.queryAnswer) {
                    searchOptions.queryAnswer = 'extractive';
                }
                if (!searchOptions.queryCaption) {
                    searchOptions.queryCaption = 'extractive';
                }
            }
            
            // Use the searchText if provided, otherwise use query
            const searchText = options.searchText || query;
            
            // Perform the search
            const searchResults = await this.searchClient.search(searchText, searchOptions);
            
            // Collect results
            const results = [];
            let count = 0;
            
            for await (const result of searchResults.results) {
                // Include all metadata from Azure Search
                const enrichedResult = {
                    ...result.document,
                    score: result.score,
                    '@search.score': result.score
                };
                
                // 🔥 Include semantic search metadata if available
                if (result['@search.rerankerScore'] !== undefined) {
                    enrichedResult['@search.rerankerScore'] = result['@search.rerankerScore'];
                    enrichedResult.rerankerScore = result['@search.rerankerScore'];
                }
                
                if (result['@search.captions']) {
                    enrichedResult['@search.captions'] = result['@search.captions'];
                    enrichedResult.captions = result['@search.captions'];
                }
                
                if (result['@search.answers']) {
                    enrichedResult['@search.answers'] = result['@search.answers'];
                    enrichedResult.answers = result['@search.answers'];
                }
                
                results.push({
                    document: enrichedResult,
                    score: result.score,
                    '@search.score': result.score,
                    '@search.rerankerScore': result['@search.rerankerScore'],
                    '@search.captions': result['@search.captions']
                });
                count++;
            }
            
            // Get total count if available
            const totalCount = searchResults.count !== undefined ? searchResults.count : count;
            
            console.log(`✅ Search complete: Found ${count} results (Total: ${totalCount})`);
            
            // Log semantic search success
            if (options.queryType === 'semantic' && results.length > 0 && results[0]['@search.rerankerScore'] !== undefined) {
                console.log('✅ Semantic reranking applied successfully');
            }
            
            return {
                results,
                count: totalCount,
                searchType: options.queryType || 'simple'
            };
            
        } catch (error) {
            console.error('❌ Search error:', error);
            
            // Provide detailed error information
            if (error.details) {
                console.error('Error details:', error.details);
            }
            
            // If semantic search fails, try falling back to simple search
            if (options.queryType === 'semantic' && !options.fallbackAttempted) {
                console.log('⚠️ Falling back to simple search...');
                return this.searchCandidates(query, {
                    ...options,
                    queryType: 'simple',
                    fallbackAttempted: true
                });
            }
            
            throw error;
        }
    }
    
    /**
     * Index a single candidate
     */
    async indexCandidate(candidate) {
        try {
            // Ensure candidateId is a string
            if (!candidate.candidateId) {
                candidate.candidateId = candidate.id?.toString() || `temp-${Date.now()}`;
            } else {
                candidate.candidateId = candidate.candidateId.toString();
            }
            
            // Format the document for Azure Search
            const document = {
                candidateId: candidate.candidateId,
                fullName: candidate.fullName || candidate.name || '',
                email: candidate.email || '',
                phone: candidate.phone || '',
                skills: Array.isArray(candidate.skills) ? candidate.skills : 
                        (typeof candidate.skills === 'string' ? candidate.skills.split(',').map(s => s.trim()) : []),
                yearsOfExperience: parseInt(candidate.yearsOfExperience || candidate.years_experience || 0),
                currentLocation: candidate.currentLocation || candidate.current_location || '',
                visaStatus: candidate.visaStatus || candidate.visa_status || '',
                resumeText: candidate.resumeText || candidate.resume_text || '',
                resumeUrl: candidate.resumeUrl || candidate.resume_url || '',
                status: candidate.status || 'Active',
                createdAt: new Date(candidate.createdAt || candidate.created_at || Date.now()),
                updatedAt: new Date(candidate.updatedAt || candidate.updated_at || Date.now())
            };
            
            // Upload to Azure Search
            const result = await this.searchClient.uploadDocuments([document]);
            
            if (result.results[0].succeeded) {
                console.log(`✅ Indexed candidate: ${document.fullName} (${document.candidateId})`);
                return true;
            } else {
                console.error(`❌ Failed to index candidate: ${result.results[0].errorMessage}`);
                return false;
            }
            
        } catch (error) {
            console.error('Error indexing candidate:', error);
            throw error;
        }
    }
    
    /**
     * Bulk index multiple candidates
     */
    async bulkIndexCandidates(candidates) {
        try {
            if (!candidates || candidates.length === 0) {
                console.log('No candidates to index');
                return { success: true, indexed: 0 };
            }
            
            // Format all documents
            const documents = candidates.map(candidate => {
                const candidateId = candidate.candidateId || candidate.id?.toString() || `temp-${Date.now()}-${Math.random()}`;
                
                return {
                    candidateId: candidateId.toString(),
                    fullName: candidate.fullName || candidate.name || '',
                    email: candidate.email || '',
                    phone: candidate.phone || '',
                    skills: Array.isArray(candidate.skills) ? candidate.skills : 
                            (typeof candidate.skills === 'string' ? candidate.skills.split(',').map(s => s.trim()) : []),
                    yearsOfExperience: parseInt(candidate.yearsOfExperience || candidate.years_experience || 0),
                    currentLocation: candidate.currentLocation || candidate.current_location || '',
                    visaStatus: candidate.visaStatus || candidate.visa_status || '',
                    resumeText: candidate.resumeText || candidate.resume_text || '',
                    resumeUrl: candidate.resumeUrl || candidate.resume_url || '',
                    status: candidate.status || 'Active',
                    createdAt: new Date(candidate.createdAt || candidate.created_at || Date.now()),
                    updatedAt: new Date(candidate.updatedAt || candidate.updated_at || Date.now())
                };
            });
            
            // Upload in batches of 100
            const batchSize = 100;
            let totalIndexed = 0;
            
            for (let i = 0; i < documents.length; i += batchSize) {
                const batch = documents.slice(i, i + batchSize);
                const result = await this.searchClient.uploadDocuments(batch);
                
                const succeeded = result.results.filter(r => r.succeeded).length;
                totalIndexed += succeeded;
                
                console.log(`✅ Indexed batch: ${succeeded}/${batch.length} documents`);
                
                // Log any failures
                const failed = result.results.filter(r => !r.succeeded);
                if (failed.length > 0) {
                    console.error(`⚠️ Failed to index ${failed.length} documents:`, 
                        failed.map(f => f.errorMessage));
                }
            }
            
            console.log(`✅ Bulk indexing complete: ${totalIndexed}/${documents.length} documents`);
            
            return {
                success: true,
                indexed: totalIndexed,
                total: documents.length
            };
            
        } catch (error) {
            console.error('Error in bulk indexing:', error);
            throw error;
        }
    }
    
    /**
     * Delete a candidate from the index
     */
    async deleteCandidate(candidateId) {
        try {
            const result = await this.searchClient.deleteDocuments([{
                candidateId: candidateId.toString()
            }]);
            
            console.log(`✅ Deleted candidate from index: ${candidateId}`);
            return true;
            
        } catch (error) {
            console.error('Error deleting candidate:', error);
            return false;
        }
    }
    
    /**
     * Initialize storage container for resumes
     */
    async initializeStorage() {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const exists = await containerClient.exists();
            
            if (!exists) {
                await containerClient.create({ access: 'blob' });
                console.log('✅ Resume storage container created');
            } else {
                console.log('✅ Resume storage container exists');
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing storage:', error);
            return false;
        }
    }
    
    /**
     * Upload resume to blob storage
     */
    async uploadResume(fileName, fileBuffer, candidateId) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blobName = `${candidateId}/${fileName}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            
            await blockBlobClient.upload(fileBuffer, fileBuffer.length);
            
            const resumeUrl = blockBlobClient.url;
            console.log(`✅ Resume uploaded: ${resumeUrl}`);
            
            return resumeUrl;
            
        } catch (error) {
            console.error('Error uploading resume:', error);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new SearchService();