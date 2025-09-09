require('dotenv').config();
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

class IntelligentSearchService {
    constructor() {
        this.searchClient = new SearchClient(
            process.env.AZURE_SEARCH_ENDPOINT,
            'candidates-index',
            new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
        );
    }

    // Parse job description and extract key requirements
    parseJobDescription(jobDescription) {
        const jd = jobDescription.toLowerCase();
        
        // Extract years of experience
        const expMatch = jd.match(/(\d+)\+?\s*years?/i);
        const minExperience = expMatch ? parseInt(expMatch[1]) : null;
        
        // Extract location mentions
        const locations = ['toronto', 'vancouver', 'montreal', 'remote', 'mississauga', 'ottawa', 'calgary'];
        const foundLocation = locations.find(loc => jd.includes(loc));
        
        // Extract visa requirements
        const visaKeywords = {
            'Citizen': ['citizen', 'citizenship'],
            'PR': ['pr', 'permanent resident', 'permanent residence'],
            'Work Permit': ['work permit', 'work visa', 'work authorization']
        };
        
        let visaRequirement = null;
        for (const [visa, keywords] of Object.entries(visaKeywords)) {
            if (keywords.some(keyword => jd.includes(keyword))) {
                visaRequirement = visa;
                break;
            }
        }
        
        // Extract skills (common tech terms)
        const techSkills = [
            'javascript', 'python', 'java', 'c#', 'react', 'angular', 'vue',
            'node', 'django', 'spring', 'aws', 'azure', 'gcp', 'docker', 
            'kubernetes', 'sql', 'mongodb', 'postgresql', 'machine learning', 
            'ai', 'devops', 'ci/cd', 'agile', 'typescript', '.net', 'golang',
            'rust', 'swift', 'kotlin', 'flutter', 'react native'
        ];
        
        const foundSkills = techSkills.filter(skill => jd.includes(skill));
        
        return {
            minExperience,
            location: foundLocation,
            visaRequirement,
            skills: foundSkills,
            originalJD: jobDescription
        };
    }

    // Search with semantic understanding
    async searchWithJD(jobDescription, options = {}) {
        try {
            console.log('\n🧠 AI-Powered Candidate Matching');
            console.log('================================');
            
            // Parse the JD
            const requirements = this.parseJobDescription(jobDescription);
            console.log('\n📋 Extracted Requirements:');
            console.log(`  Experience: ${requirements.minExperience ? requirements.minExperience + '+ years' : 'Not specified'}`);
            console.log(`  Location: ${requirements.location || 'Not specified'}`);
            console.log(`  Visa: ${requirements.visaRequirement || 'Not specified'}`);
            console.log(`  Skills: ${requirements.skills.length > 0 ? requirements.skills.join(', ') : 'Various'}`);
            
            // Build filter
            let filter = '';
            if (requirements.minExperience) {
                filter = `yearsOfExperience ge ${requirements.minExperience}`;
            }
            if (requirements.location) {
                const locationFilter = `currentLocation eq '${requirements.location.charAt(0).toUpperCase() + requirements.location.slice(1)}'`;
                filter = filter ? `${filter} and ${locationFilter}` : locationFilter;
            }
            if (requirements.visaRequirement) {
                const visaFilter = `visaStatus eq '${requirements.visaRequirement}'`;
                filter = filter ? `${filter} and ${visaFilter}` : visaFilter;
            }
            
            // Perform semantic search
            const searchOptions = {
                queryType: "semantic",
                queryLanguage: "en-us",
                top: options.top || 10,
                includeTotalCount: true,
                select: [
                    'candidateId', 'fullName', 'email', 'phone',
                    'skills', 'yearsOfExperience', 'currentLocation',
                    'visaStatus', 'resumeText'
                ]
            };
            
            if (filter) {
                searchOptions.filter = filter;
                console.log(`  Filter: ${filter}`);
            }
            
            console.log('\n🔍 Searching with AI understanding...');
            const results = await this.searchClient.search(jobDescription, searchOptions);
            
            const candidates = [];
            for await (const result of results.results) {
                // Calculate match score based on requirements
                const matchScore = this.calculateMatchScore(result.document, requirements);
                
                candidates.push({
                    ...result.document,
                    semanticScore: result.score,
                    matchScore: matchScore,
                    totalScore: (result.score || 0) * 0.7 + matchScore * 0.3, // Weighted score
                    matchReasons: this.getMatchReasons(result.document, requirements)
                });
            }
            
            // Sort by combined score
            candidates.sort((a, b) => b.totalScore - a.totalScore);
            
            console.log(`\n✅ Found ${candidates.length} matching candidates\n`);
            
            return {
                success: true,
                requirements,
                candidates,
                totalCount: results.count
            };
            
        } catch (error) {
            console.error('❌ Search error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Calculate custom match score
    calculateMatchScore(candidate, requirements) {
        let score = 0;
        let maxScore = 0;
        
        // Experience match (30% weight)
        if (requirements.minExperience) {
            maxScore += 0.3;
            if (candidate.yearsOfExperience >= requirements.minExperience) {
                score += 0.3;
            } else if (candidate.yearsOfExperience >= requirements.minExperience - 1) {
                score += 0.15; // Partial credit for close match
            }
        }
        
        // Location match (20% weight)
        if (requirements.location) {
            maxScore += 0.2;
            if (candidate.currentLocation?.toLowerCase() === requirements.location) {
                score += 0.2;
            }
        }
        
        // Visa match (20% weight)
        if (requirements.visaRequirement) {
            maxScore += 0.2;
            if (candidate.visaStatus === requirements.visaRequirement) {
                score += 0.2;
            }
        }
        
        // Skills match (30% weight)
        if (requirements.skills.length > 0) {
            maxScore += 0.3;
            const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
            const matchedSkills = requirements.skills.filter(skill => 
                candidateSkills.some(cs => cs.includes(skill))
            );
            score += (matchedSkills.length / requirements.skills.length) * 0.3;
        }
        
        // Normalize score if no requirements specified
        return maxScore > 0 ? score / maxScore : 0.5;
    }
    
    // Get human-readable match reasons
    getMatchReasons(candidate, requirements) {
        const reasons = [];
        
        if (requirements.minExperience) {
            if (candidate.yearsOfExperience >= requirements.minExperience) {
                reasons.push(`✅ ${candidate.yearsOfExperience} years experience (required: ${requirements.minExperience}+)`);
            } else {
                reasons.push(`⚠️ ${candidate.yearsOfExperience || 0} years experience (required: ${requirements.minExperience}+)`);
            }
        }
        
        if (requirements.location) {
            if (candidate.currentLocation?.toLowerCase() === requirements.location) {
                reasons.push(`✅ Located in ${candidate.currentLocation}`);
            }
        }
        
        if (requirements.visaRequirement) {
            if (candidate.visaStatus === requirements.visaRequirement) {
                reasons.push(`✅ ${candidate.visaStatus} status matches requirement`);
            }
        }
        
        const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
        const matchedSkills = requirements.skills.filter(skill => 
            candidateSkills.some(cs => cs.includes(skill))
        );
        
        if (matchedSkills.length > 0) {
            reasons.push(`✅ Matches ${matchedSkills.length}/${requirements.skills.length} required skills: ${matchedSkills.join(', ')}`);
        }
        
        if (reasons.length === 0) {
            reasons.push('📊 Matched based on semantic similarity');
        }
        
        return reasons;
    }
}

module.exports = new IntelligentSearchService();