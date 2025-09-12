// recruitment-app-mui/src/modules/benchSales/services/candidateSearchService.js

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class CandidateSearchService {
  /**
   * Natural language search for candidates
   * @param {string} query - Natural language search query
   * @param {Object} options - Additional search options
   * @returns {Promise<{success: boolean, candidates: Array, count: number, error?: string}>}
   */
  async searchCandidates(query, options = {}) {
    try {
      const { filters = {}, top = 20 } = options;
      
      const response = await fetch(`${API_BASE}/search/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query, 
          filters,
          top 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Search failed with status ${response.status}`);
      }
      
      if (data.success && data.results) {
        // Normalize the response
        const candidates = this.normalizeCandidates(data.results);
        
        return {
          success: true,
          candidates,
          count: data.count || candidates.length,
          searchType: data.searchType || 'semantic',
          query: data.query
        };
      } else {
        return {
          success: false,
          candidates: [],
          count: 0,
          error: data.error || 'No results found'
        };
      }
    } catch (error) {
      console.error('Search service error:', error);
      return {
        success: false,
        candidates: [],
        count: 0,
        error: error.message || 'Failed to search candidates'
      };
    }
  }

  /**
   * Match candidates against a job description
   * @param {string} jobDescription - Full job description text
   * @param {Object} options - Additional options
   * @returns {Promise<{success: boolean, candidates: Array, requirements: Object, error?: string}>}
   */
  async matchJobDescription(jobDescription, options = {}) {
    try {
      const { top = 20 } = options;
      
      const response = await fetch(`${API_BASE}/search/match-jd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobDescription, 
          top 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `JD matching failed with status ${response.status}`);
      }
      
      if (data.success) {
        const candidates = this.normalizeCandidates(data.candidates || data.results || []);
        
        return {
          success: true,
          candidates,
          requirements: data.requirements || {},
          count: data.totalCount || candidates.length
        };
      } else {
        return {
          success: false,
          candidates: [],
          requirements: {},
          error: data.error || 'No matching candidates found'
        };
      }
    } catch (error) {
      console.error('JD match service error:', error);
      return {
        success: false,
        candidates: [],
        requirements: {},
        error: error.message || 'Failed to match job description'
      };
    }
  }

  /**
   * Quick search with just keywords
   * @param {string} keywords - Space-separated keywords
   * @param {number} limit - Maximum results
   * @returns {Promise<{success: boolean, candidates: Array, error?: string}>}
   */
  async quickSearch(keywords, limit = 10) {
    return this.searchCandidates(keywords, { top: limit });
  }

  /**
   * Search by specific skill
   * @param {string} skill - Skill name
   * @returns {Promise<{success: boolean, candidates: Array, error?: string}>}
   */
  async searchBySkill(skill) {
    return this.searchCandidates(skill, { 
      filters: { skillSearch: true },
      top: 50 
    });
  }

  /**
   * Search by location
   * @param {string} location - Location name
   * @returns {Promise<{success: boolean, candidates: Array, error?: string}>}
   */
  async searchByLocation(location) {
    return this.searchCandidates(`candidates in ${location}`, {
      filters: { location },
      top: 50
    });
  }

  /**
   * Advanced search with multiple criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<{success: boolean, candidates: Array, error?: string}>}
   */
  async advancedSearch(criteria) {
    const {
      skills = [],
      location = '',
      minExperience = 0,
      maxExperience = 20,
      visaStatus = '',
      availability = ''
    } = criteria;
    
    // Build natural language query from criteria
    const queryParts = [];
    
    if (skills.length > 0) {
      queryParts.push(`${skills.join(' ')} developer`);
    }
    
    if (minExperience > 0) {
      queryParts.push(`with ${minExperience}+ years experience`);
    }
    
    if (location) {
      queryParts.push(`in ${location}`);
    }
    
    if (visaStatus) {
      queryParts.push(`${visaStatus} visa status`);
    }
    
    if (availability === 'immediate') {
      queryParts.push('available immediately');
    }
    
    const query = queryParts.join(' ') || '*';
    
    return this.searchCandidates(query, {
      filters: {
        location,
        visaStatus,
        minExperience,
        maxExperience
      },
      top: 50
    });
  }

  /**
   * Get search suggestions (autocomplete)
   * @param {string} term - Partial search term
   * @returns {Promise<Array<string>>}
   */
  async getSuggestions(term) {
    try {
      const response = await fetch(`${API_BASE}/search/suggest?term=${encodeURIComponent(term)}`);
      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }

  /**
   * Normalize candidate data to ensure consistent structure
   * @private
   */
  normalizeCandidates(results) {
    if (!Array.isArray(results)) return [];
    
    return results.map(result => {
      // Handle both nested and direct structures
      const candidate = result.document || result;
      
      return {
        // Core fields
        candidateId: candidate.candidateId || candidate.id || '',
        fullName: candidate.fullName || candidate.name || 'Unknown',
        email: candidate.email || '',
        phone: candidate.phone || '',
        
        // Professional info
        skills: Array.isArray(candidate.skills) ? candidate.skills : [],
        yearsOfExperience: parseInt(candidate.yearsOfExperience) || 0,
        currentLocation: candidate.currentLocation || '',
        visaStatus: candidate.visaStatus || '',
        
        // Additional info
        resumeText: candidate.resumeText || '',
        resumeUrl: candidate.resumeUrl || '',
        status: candidate.status || 'Active',
        currentEmployer: candidate.currentEmployer || '',
        availability: candidate.availability || '',
        expectedSalary: candidate.expectedSalary || '',
        
        // Search metadata
        score: result.score || result['@search.score'] || 0,
        rerankerScore: result['@search.rerankerScore'] || result.rerankerScore,
        captions: result['@search.captions'] || result.captions || [],
        matchReasons: candidate.matchReasons || this.generateMatchReasons(candidate, result),
        
        // For JD matching
        totalScore: candidate.totalScore || result.totalScore || result.score || 0
      };
    });
  }

  /**
   * Generate match reasons if not provided
   * @private
   */
  generateMatchReasons(candidate, searchResult) {
    const reasons = [];
    
    // If we have captions from semantic search, use them
    if (searchResult['@search.captions'] && searchResult['@search.captions'].length > 0) {
      reasons.push(searchResult['@search.captions'][0].text);
      return reasons;
    }
    
    // Otherwise generate basic reasons
    if (candidate.skills && candidate.skills.length > 0) {
      reasons.push(`Skills: ${candidate.skills.slice(0, 3).join(', ')}`);
    }
    
    if (candidate.yearsOfExperience > 0) {
      reasons.push(`${candidate.yearsOfExperience} years experience`);
    }
    
    if (candidate.currentLocation) {
      reasons.push(`Located in ${candidate.currentLocation}`);
    }
    
    return reasons.length > 0 ? reasons : ['Matches search criteria'];
  }

  /**
   * Test if the search service is working
   * @returns {Promise<{working: boolean, message: string}>}
   */
  async testConnection() {
    try {
      const result = await this.searchCandidates('*', { top: 1 });
      return {
        working: result.success,
        message: result.success ? 
          `Service working. Found ${result.count} total candidates.` : 
          `Service error: ${result.error}`
      };
    } catch (error) {
      return {
        working: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export default new CandidateSearchService();