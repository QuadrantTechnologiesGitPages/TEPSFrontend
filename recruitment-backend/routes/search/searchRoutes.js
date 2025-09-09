const express = require('express');
const router = express.Router();
const multer = require('multer');
const searchService = require('../../services/search/searchService');
const resumeProcessor = require('../../services/search/resumeProcessor');
const intelligentSearch = require('../../services/search/intelligentSearch');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, TXT, and DOCX are allowed.'));
        }
    }
});

// Search candidates with natural language
// Search candidates with natural language
router.post('/query', async (req, res) => {
    try {
        const { query, filters = {}, top = 20 } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        console.log(`🔍 Searching for: "${query}"`);
        
        // Build search options with SEMANTIC search
        const searchOptions = {
            top,
            searchMode: 'all',
            queryType: 'semantic',  // ADD THIS
            semanticConfiguration: 'default',  // ADD THIS (or 'default' if that's what you named it)
            queryLanguage: 'en-us',  // ADD THIS
            includeTotalCount: true,
            select: [
                'candidateId', 'fullName', 'email', 'phone',
                'skills', 'yearsOfExperience', 'currentLocation',
                'visaStatus', 'status', 'resumeUrl', 'resumeText'
            ]
        };
        
        // Add filters if provided
        if (filters.location) {
            searchOptions.filter = `currentLocation eq '${filters.location}'`;
        }
        if (filters.visaStatus) {
            searchOptions.filter = searchOptions.filter 
                ? `${searchOptions.filter} and visaStatus eq '${filters.visaStatus}'`
                : `visaStatus eq '${filters.visaStatus}'`;
        }
        if (filters.minExperience) {
            searchOptions.filter = searchOptions.filter
                ? `${searchOptions.filter} and yearsOfExperience ge ${filters.minExperience}`
                : `yearsOfExperience ge ${filters.minExperience}`;
        }
        
        // Perform search
        const results = await searchService.searchCandidates(query, searchOptions);
        
        res.json({
            success: true,
            query,
            searchType: 'semantic',  // ADD THIS to confirm
            count: results.count || results.results.length,
            results: results.results
        });
        
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Upload and process resume
router.post('/resume/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const { candidateId, candidateName, email } = req.body;
        
        if (!candidateId) {
            return res.status(400).json({ error: 'Candidate ID is required' });
        }
        
        console.log(`📤 Processing resume upload for ${candidateName || candidateId}`);
        
        // Process the resume
        const result = await resumeProcessor.processAndIndexResume(
            req.file.buffer,
            req.file.originalname,
            {
                candidateId,
                fullName: candidateName,
                email
            }
        );
        
        res.json(result);
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get search suggestions (autocomplete)
router.get('/suggest', async (req, res) => {
    try {
        const { term } = req.query;
        
        if (!term || term.length < 2) {
            return res.json({ suggestions: [] });
        }
        
        const results = await searchService.searchCandidates(term + '*', {
            top: 5,
            searchMode: 'all',
            select: ['fullName', 'skills']
        });
        
        const suggestions = results.results.map(r => ({
            name: r.fullName,
            skills: r.skills
        }));
        
        res.json({ suggestions });
        
    } catch (error) {
        console.error('Suggest error:', error);
        res.json({ suggestions: [] });
    }
});

// Index or update a candidate
router.post('/index', async (req, res) => {
    try {
        const candidate = req.body;
        
        if (!candidate.candidateId && !candidate.id) {
            return res.status(400).json({ error: 'Candidate ID is required' });
        }
        
        const success = await searchService.indexCandidate(candidate);
        
        res.json({ 
            success,
            candidateId: candidate.candidateId || candidate.id
        });
        
    } catch (error) {
        console.error('Index error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

router.post('/match-jd', async (req, res) => {
    try {
        const { jobDescription, top = 20 } = req.body;
        
        if (!jobDescription || jobDescription.trim().length < 10) {
            return res.status(400).json({ 
                error: 'Please provide a detailed job description' 
            });
        }
        
        console.log('📄 Processing job description match request...');
        
        // Use intelligent search service
        const results = await intelligentSearch.searchWithJD(jobDescription, { top });
        
        if (results.success) {
            res.json({
                success: true,
                requirements: results.requirements,
                candidates: results.candidates,
                totalCount: results.totalCount
            });
        } else {
            res.status(500).json({
                success: false,
                error: results.error
            });
        }
        
    } catch (error) {
        console.error('JD matching error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Enhanced stats endpoint with more details
router.get('/dashboard', async (req, res) => {
    try {
        // Get total indexed candidates
        const totalResults = await searchService.searchCandidates('*', { 
            top: 0,
            includeTotalCount: true 
        });
        
        // Get candidates by status
        const activeResults = await searchService.searchCandidates('*', {
            filter: "status eq 'Active'",
            top: 0,
            includeTotalCount: true
        });
        
        // Test semantic search health
        let semanticHealthy = false;
        try {
            await searchService.searchCandidates('test', {
                queryType: 'semantic',
                top: 1
            });
            semanticHealthy = true;
        } catch (e) {
            console.error('Semantic search health check failed:', e.message);
        }
        
        res.json({
            success: true,
            stats: {
                totalCandidates: totalResults.count || 0,
                activeCandidates: activeResults.count || 0,
                indexName: 'candidates-index',
                searchEndpoint: process.env.AZURE_SEARCH_ENDPOINT,
                features: {
                    semanticSearch: semanticHealthy,
                    resumeStorage: true,
                    intelligentMatching: true
                },
                lastUpdated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Add this test route in searchRoutes.js
router.get('/test', async (req, res) => {
    try {
        // Search for everything
        const results = await searchService.searchCandidates('*', { top: 10 });
        res.json({
            success: true,
            message: 'Test search for all documents',
            count: results.results.length,
            candidates: results.results.map(r => ({
                id: r.candidateId,
                name: r.fullName,
                email: r.email
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get statistics
router.get('/stats', async (req, res) => {
    try {
        // Get total count
        const allResults = await searchService.searchCandidates('*', { 
            top: 0,
            includeTotalCount: true 
        });
        
        res.json({
            totalCandidates: allResults.count || 0,
            indexName: 'candidates-index',
            status: 'healthy'
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            error: error.message,
            status: 'error'
        });
    }
});


module.exports = router;