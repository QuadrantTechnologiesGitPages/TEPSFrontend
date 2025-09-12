// recruitment-backend/routes/search/searchRoutes.js - FIXED VERSION
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

// 🔥 FIXED: Natural language search with proper semantic configuration
router.post('/query', async (req, res) => {
    try {
        const { query, filters = {}, top = 20 } = req.body;
        
        if (!query || !query.trim()) {
            return res.status(400).json({ 
                success: false,
                error: 'Query is required' 
            });
        }
        
        console.log(`🔍 Semantic search for: "${query}"`);
        
        // 🔥 FIX: Use the EXACT semantic configuration name from Azure Portal
        const searchOptions = {
            top,
            searchMode: 'all',
            queryType: 'semantic',
            semanticConfiguration: 'default', // Must match your Azure config name
            queryLanguage: 'en-us',
            includeTotalCount: true,
            // 🔥 Add semantic-specific options
            queryAnswer: 'extractive',
            queryCaption: 'extractive',
            queryRerankerScore: true,
            // Select all fields you want returned
            select: [
                'candidateId', 'fullName', 'email', 'phone',
                'skills', 'yearsOfExperience', 'currentLocation',
                'visaStatus', 'status', 'resumeUrl', 'resumeText'
            ],
            // 🔥 For better semantic search, use the full query as-is
            searchText: query
        };
        
        // Add filters if provided
        const filterConditions = [];
        if (filters.location) {
            filterConditions.push(`currentLocation eq '${filters.location}'`);
        }
        if (filters.visaStatus) {
            filterConditions.push(`visaStatus eq '${filters.visaStatus}'`);
        }
        if (filters.minExperience) {
            filterConditions.push(`yearsOfExperience ge ${filters.minExperience}`);
        }
        if (filters.status !== undefined && filters.status !== 'all') {
            filterConditions.push(`status eq '${filters.status || 'Active'}'`);
        }
        
        if (filterConditions.length > 0) {
            searchOptions.filter = filterConditions.join(' and ');
        }
        
        // Perform semantic search
        const results = await searchService.searchCandidates(query, searchOptions);
        
        // 🔥 Process and enrich results with semantic scores
        const enrichedResults = results.results.map((result, index) => {
            const doc = result.document || result;
            
            // Add semantic score if available
            if (result['@search.rerankerScore']) {
                doc.rerankerScore = result['@search.rerankerScore'];
            }
            
            // Add captions if available
            if (result['@search.captions']) {
                doc.captions = result['@search.captions'];
            }
            
            // Calculate a combined score
            doc.score = result.score || result['@search.score'] || 0;
            
            // Add match reasons based on query terms
            doc.matchReasons = generateMatchReasons(query, doc);
            
            return doc;
        });
        
        // Sort by reranker score if available, otherwise by regular score
        enrichedResults.sort((a, b) => {
            const scoreA = a.rerankerScore || a.score || 0;
            const scoreB = b.rerankerScore || b.score || 0;
            return scoreB - scoreA;
        });
        
        console.log(`✅ Found ${enrichedResults.length} candidates with semantic search`);
        
        res.json({
            success: true,
            query,
            searchType: 'semantic',
            count: results.count || enrichedResults.length,
            results: enrichedResults
        });
        
    } catch (error) {
        console.error('❌ Search error:', error);
        
        // Provide detailed error info
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.details || null,
            searchType: 'semantic'
        });
    }
});

// Helper function to generate match reasons
function generateMatchReasons(query, candidate) {
    const reasons = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    // Check skills match
    if (candidate.skills && Array.isArray(candidate.skills)) {
        const matchedSkills = candidate.skills.filter(skill => 
            queryWords.some(word => skill.toLowerCase().includes(word))
        );
        if (matchedSkills.length > 0) {
            reasons.push(`Has skills: ${matchedSkills.join(', ')}`);
        }
    }
    
    // Check location match
    if (candidate.currentLocation && queryLower.includes(candidate.currentLocation.toLowerCase())) {
        reasons.push(`Located in ${candidate.currentLocation}`);
    }
    
    // Check experience match
    if (candidate.yearsOfExperience) {
        const expMatch = queryLower.match(/(\d+)\+?\s*years?/);
        if (expMatch) {
            const requiredYears = parseInt(expMatch[1]);
            if (candidate.yearsOfExperience >= requiredYears) {
                reasons.push(`${candidate.yearsOfExperience} years of experience`);
            }
        }
    }
    
    // Check visa status match
    if (candidate.visaStatus && queryLower.includes(candidate.visaStatus.toLowerCase())) {
        reasons.push(`Visa status: ${candidate.visaStatus}`);
    }
    
    // If semantic search provided captions, use them
    if (candidate.captions && candidate.captions.length > 0) {
        reasons.push(candidate.captions[0].text);
    }
    
    // Default reason if none found
    if (reasons.length === 0) {
        reasons.push('Matches search criteria');
    }
    
    return reasons;
}

// 🔥 FIXED: Job Description matching with proper semantic search
router.post('/match-jd', async (req, res) => {
    try {
        const { jobDescription, top = 20 } = req.body;
        
        if (!jobDescription || jobDescription.trim().length < 10) {
            return res.status(400).json({ 
                success: false,
                error: 'Please provide a detailed job description' 
            });
        }
        
        console.log('📄 Processing JD match with semantic search...');
        
        // Extract key requirements from JD
        const requirements = extractRequirements(jobDescription);
        
        // Build semantic search query from JD
        const searchQuery = buildSearchQueryFromJD(jobDescription);
        
        // Perform semantic search
        const searchOptions = {
            top,
            searchMode: 'all',
            queryType: 'semantic',
            semanticConfiguration: 'default',
            queryLanguage: 'en-us',
            includeTotalCount: true,
            queryAnswer: 'extractive',
            queryCaption: 'extractive',
            queryRerankerScore: true,
            select: [
                'candidateId', 'fullName', 'email', 'phone',
                'skills', 'yearsOfExperience', 'currentLocation',
                'visaStatus', 'status', 'resumeText'
            ]
        };
        
        // Add filters based on extracted requirements
        const filterConditions = [];
        if (requirements.minExperience) {
            filterConditions.push(`yearsOfExperience ge ${requirements.minExperience}`);
        }
        if (requirements.location) {
            filterConditions.push(`currentLocation eq '${requirements.location}'`);
        }
        if (requirements.visaRequirement) {
            filterConditions.push(`visaStatus eq '${requirements.visaRequirement}'`);
        }
        
        if (filterConditions.length > 0) {
            searchOptions.filter = filterConditions.join(' and ');
        }
        
        // Search with the full JD text for semantic matching
        const results = await searchService.searchCandidates(searchQuery, searchOptions);
        
        // Score and rank candidates based on JD match
        const scoredCandidates = results.results.map(result => {
            const candidate = result.document || result;
            
            // Use semantic reranker score if available
            if (result['@search.rerankerScore']) {
                candidate.rerankerScore = result['@search.rerankerScore'];
                candidate.totalScore = result['@search.rerankerScore'] / 4; // Normalize to 0-1
            } else {
                candidate.totalScore = result.score || result['@search.score'] || 0;
            }
            
            // Add match reasons specific to JD
            candidate.matchReasons = generateJDMatchReasons(requirements, candidate);
            
            return candidate;
        });
        
        // Sort by total score
        scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
        
        console.log(`✅ Found ${scoredCandidates.length} matching candidates for JD`);
        
        res.json({
            success: true,
            requirements,
            candidates: scoredCandidates,
            totalCount: results.count || scoredCandidates.length
        });
        
    } catch (error) {
        console.error('❌ JD matching error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Extract requirements from job description
function extractRequirements(jd) {
    const requirements = {
        skills: [],
        minExperience: null,
        location: null,
        visaRequirement: null
    };
    
    // Extract skills (common patterns)
    const skillPatterns = [
        /(?:experience|knowledge|proficient|skilled|expertise)\s+(?:in|with)\s+([^,.]+)/gi,
        /(?:React|Angular|Vue|Node\.?js|Python|Java|C\+\+|JavaScript|TypeScript|AWS|Azure|Docker|Kubernetes)/gi
    ];
    
    skillPatterns.forEach(pattern => {
        const matches = jd.match(pattern);
        if (matches) {
            requirements.skills.push(...matches);
        }
    });
    
    // Extract experience requirement
    const expMatch = jd.match(/(\d+)\+?\s*years?\s*(?:of\s+)?experience/i);
    if (expMatch) {
        requirements.minExperience = parseInt(expMatch[1]);
    }
    
    // Extract location
    const locationMatch = jd.match(/(?:location|based in|office in)\s*:?\s*([A-Za-z\s]+)(?:[,\.]|$)/i);
    if (locationMatch) {
        requirements.location = locationMatch[1].trim();
    }
    
    // Extract visa requirements
    const visaPatterns = ['citizen', 'green card', 'h1b', 'opt', 'work permit', 'permanent resident'];
    visaPatterns.forEach(pattern => {
        if (jd.toLowerCase().includes(pattern)) {
            requirements.visaRequirement = pattern;
        }
    });
    
    return requirements;
}

// Build search query from JD
function buildSearchQueryFromJD(jd) {
    // Extract the most important terms from the JD
    // Remove common words and focus on technical terms
    const importantTerms = [];
    
    // Extract job title if present
    const titleMatch = jd.match(/(?:looking for|seeking|hiring)\s+(?:a\s+)?([^.\n]+)/i);
    if (titleMatch) {
        importantTerms.push(titleMatch[1]);
    }
    
    // Extract key technical skills
    const techSkills = jd.match(/(?:React|Angular|Vue|Node\.?js|Python|Java|JavaScript|TypeScript|AWS|Azure|Docker|Kubernetes|MongoDB|SQL|PostgreSQL|MySQL)/gi);
    if (techSkills) {
        importantTerms.push(...new Set(techSkills));
    }
    
    // If we have important terms, use them; otherwise use first 200 chars of JD
    if (importantTerms.length > 0) {
        return importantTerms.join(' ');
    } else {
        return jd.substring(0, 200);
    }
}

// Generate match reasons for JD
function generateJDMatchReasons(requirements, candidate) {
    const reasons = [];
    
    // Check skills match
    if (requirements.skills.length > 0 && candidate.skills) {
        const candidateSkillsLower = candidate.skills.map(s => s.toLowerCase());
        const matchedSkills = requirements.skills.filter(skill => 
            candidateSkillsLower.some(cs => cs.includes(skill.toLowerCase()))
        );
        if (matchedSkills.length > 0) {
            reasons.push(`Matches required skills: ${matchedSkills.slice(0, 3).join(', ')}`);
        }
    }
    
    // Check experience match
    if (requirements.minExperience && candidate.yearsOfExperience >= requirements.minExperience) {
        reasons.push(`Has ${candidate.yearsOfExperience} years experience (required: ${requirements.minExperience}+)`);
    }
    
    // Check location match
    if (requirements.location && candidate.currentLocation === requirements.location) {
        reasons.push(`Located in ${requirements.location}`);
    }
    
    // Check visa match
    if (requirements.visaRequirement && candidate.visaStatus) {
        if (candidate.visaStatus.toLowerCase().includes(requirements.visaRequirement)) {
            reasons.push(`Visa status matches requirement`);
        }
    }
    
    return reasons.length > 0 ? reasons : ['Potential match based on profile'];
}

// Test endpoint to verify Azure Search connection
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Testing Azure Search connection...');
        
        // Test basic search
        const results = await searchService.searchCandidates('*', { 
            top: 5,
            includeTotalCount: true 
        });
        
        // Test semantic search
        let semanticWorks = false;
        try {
            const semanticTest = await searchService.searchCandidates('developer', {
                queryType: 'semantic',
                semanticConfiguration: 'default',
                queryLanguage: 'en-us',
                top: 1
            });
            semanticWorks = true;
        } catch (e) {
            console.error('Semantic search test failed:', e.message);
        }
        
        res.json({
            success: true,
            message: 'Azure Search connection test',
            totalDocuments: results.count || results.results.length,
            semanticSearchEnabled: semanticWorks,
            sampleCandidates: results.results.slice(0, 3).map(r => ({
                id: r.candidateId,
                name: r.fullName,
                email: r.email,
                skills: r.skills
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get search statistics
router.get('/stats', async (req, res) => {
    try {
        const allResults = await searchService.searchCandidates('*', { 
            top: 0,
            includeTotalCount: true 
        });
        
        res.json({
            success: true,
            totalCandidates: allResults.count || 0,
            indexName: 'candidates-index',
            status: 'healthy',
            semanticSearchEnabled: true
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            status: 'error'
        });
    }
});

module.exports = router;