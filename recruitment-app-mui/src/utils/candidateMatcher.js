import Fuse from 'fuse.js';

// Parse natural language query
export const parseNaturalQuery = (query) => {
  const keywords = {
    skills: [
      '.net', 'java', 'python', 'react', 'node', 'aws', 'azure', 'docker', 
      'kubernetes', 'ml', 'machine learning', 'salesforce', 'data science',
      'devops', 'angular', 'vue', 'mongodb', 'sql', 'postgresql', 'django',
      'spring', 'microservices', 'terraform', 'jenkins'
    ],
    visa: ['h1b', 'opt', 'gc', 'green card', 'opt-ead', 'gc-ead', 'f1'],
    status: ['active', 'pending', 'inactive', 'in active'],
    location: [
      'seattle', 'bellevue', 'redmond', 'tacoma', 'portland', 
      'washington', 'oregon', 'texas', 'california', 'austin', 
      'dallas', 'new york', 'wa', 'tx', 'ca', 'or', 'ny'
    ],
  };

  const parsed = {
    skills: [],
    visa: [],
    status: [],
    location: [],
    referredBy: '',
    experience: '',
  };

  const lowerQuery = query.toLowerCase();

  // Extract skills
  keywords.skills.forEach(skill => {
    if (lowerQuery.includes(skill)) {
      parsed.skills.push(skill);
    }
  });

  // Extract visa types
  keywords.visa.forEach(visa => {
    if (lowerQuery.includes(visa)) {
      parsed.visa.push(visa.toUpperCase().replace('-', '-'));
    }
  });

  // Extract status
  if (lowerQuery.includes('active') && !lowerQuery.includes('inactive')) {
    parsed.status.push('Active');
  }
  if (lowerQuery.includes('pending')) {
    parsed.status.push('Pending Discussion');
  }
  if (lowerQuery.includes('inactive') || lowerQuery.includes('in active')) {
    parsed.status.push('In Active');
  }

  // Extract location
  keywords.location.forEach(loc => {
    if (lowerQuery.includes(loc)) {
      parsed.location.push(loc);
    }
  });

  // Extract referrer
  const referrerMatch = lowerQuery.match(/referred by (\w+)/);
  if (referrerMatch) {
    parsed.referredBy = referrerMatch[1];
  }

  // Extract experience
  const expMatch = lowerQuery.match(/(\d+\+?)\s*years?/);
  if (expMatch) {
    parsed.experience = expMatch[0];
  }

  return parsed;
};

// Search candidates based on query and filters
export const searchCandidates = (query, filters, candidates) => {
  let results = [...candidates];

  // Apply basic filters first
  if (filters.visa) {
    results = results.filter(c => c.visa === filters.visa);
  }
  if (filters.status) {
    results = results.filter(c => c.currentStatus === filters.status);
  }
  if (filters.location) {
    results = results.filter(c => c.state === filters.location);
  }
  if (filters.experience) {
    results = results.filter(c => {
      const exp = parseInt(c.yearsExp);
      switch(filters.experience) {
        case '0-2':
          return exp <= 2;
        case '3-5':
          return exp >= 3 && exp <= 5;
        case '5-8':
          return exp >= 5 && exp <= 8;
        case '8+':
          return exp >= 8;
        default:
          return true;
      }
    });
  }

  // Apply natural language search if query exists
  if (query && query.trim().length > 0) {
    const parsed = parseNaturalQuery(query);
    
    // Use Fuse.js for fuzzy search
    const fuseOptions = {
      keys: [
        'name',
        'skills',
        'visa',
        'currentStatus',
        'referredBy',
        'location',
        'yearsExp',
        'vertical',
        'discussionDetails',
        'lastDiscussion'
      ],
      threshold: 0.4,
      includeScore: true,
    };
    
    const fuse = new Fuse(results, fuseOptions);
    
    // Perform fuzzy search if query is more than 2 characters
    if (query.length > 2) {
      const fuseResults = fuse.search(query);
      results = fuseResults.map(r => r.item);
    }

    // Apply parsed filters for more specific matching
    if (parsed.skills.length > 0) {
      results = results.filter(c => 
        parsed.skills.some(skill => 
          c.skills.some(s => s.toLowerCase().includes(skill))
        )
      );
    }

    if (parsed.visa.length > 0) {
      results = results.filter(c => 
        parsed.visa.includes(c.visa.toUpperCase())
      );
    }

    if (parsed.status.length > 0) {
      results = results.filter(c => 
        parsed.status.includes(c.currentStatus)
      );
    }

    if (parsed.location.length > 0) {
      results = results.filter(c => 
        parsed.location.some(loc => 
          c.location.toLowerCase().includes(loc) || 
          c.state.toLowerCase().includes(loc)
        )
      );
    }

    if (parsed.referredBy) {
      results = results.filter(c => 
        c.referredBy.toLowerCase().includes(parsed.referredBy.toLowerCase())
      );
    }

    if (parsed.experience) {
      results = results.filter(c => {
        const candidateExp = parseInt(c.yearsExp);
        const searchExp = parseInt(parsed.experience);
        if (parsed.experience.includes('+')) {
          return candidateExp >= searchExp;
        }
        return Math.abs(candidateExp - searchExp) <= 1; // Allow 1 year variance
      });
    }
  }

  // Sort by priority (lower number = higher priority)
  results.sort((a, b) => a.priority - b.priority);

  // Return top 10 results
  return results.slice(0, 10);
};