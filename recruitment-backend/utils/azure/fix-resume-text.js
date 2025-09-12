// fix-resume-text.js - Add resumeText to all candidates for better semantic search
require('dotenv').config();
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

async function fixResumeText() {
    const client = new SearchClient(
        process.env.AZURE_SEARCH_ENDPOINT,
        'candidates-index',
        new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
    );
    
    console.log('🔧 FIXING RESUME TEXT FOR ALL CANDIDATES\n');
    console.log('========================================\n');
    
    try {
        // First, get all candidates
        console.log('📊 Fetching all candidates...');
        const allCandidates = await client.search('*', {
            top: 50,
            select: ['candidateId', 'fullName', 'email', 'skills', 'currentLocation', 'yearsOfExperience', 'visaStatus']
        });
        
        const updates = [];
        
        for await (const result of allCandidates.results) {
            const doc = result.document;
            
            // Build comprehensive resumeText
            const resumeText = buildResumeText(doc);
            
            // Prepare update document
            const updateDoc = {
                candidateId: doc.candidateId,
                fullName: doc.fullName,
                email: doc.email,
                skills: doc.skills || [],
                currentLocation: doc.currentLocation || '',
                yearsOfExperience: doc.yearsOfExperience || 0,
                visaStatus: doc.visaStatus || '',
                resumeText: resumeText  // The key addition!
            };
            
            updates.push(updateDoc);
            console.log(`✓ Prepared update for ${doc.fullName}`);
        }
        
        console.log(`\n📤 Updating ${updates.length} candidates with resumeText...`);
        
        // Upload the updates
        const uploadResult = await client.uploadDocuments(updates);
        
        let succeeded = 0;
        let failed = 0;
        
        uploadResult.results.forEach(r => {
            if (r.succeeded) succeeded++;
            else failed++;
        });
        
        console.log(`\n✅ Successfully updated: ${succeeded}`);
        if (failed > 0) {
            console.log(`❌ Failed to update: ${failed}`);
        }
        
        // Wait for indexing
        console.log('\n⏳ Waiting for indexing to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test semantic search again
        console.log('\n🧪 Testing semantic search with updated resumeText...\n');
        
        const testQueries = [
            'DevOps engineer with Kubernetes experience',
            'senior developer with 8 years experience',
            'React developer in Toronto',
            'Python machine learning engineer',
            'full stack developer available immediately'
        ];
        
        for (const query of testQueries) {
            console.log(`Testing: "${query}"`);
            
            const results = await client.search(query, {
                queryType: 'semantic',
                semanticConfiguration: 'default',
                queryLanguage: 'en-us',
                top: 3,
                select: ['fullName', 'currentLocation', 'yearsOfExperience']
            });
            
            let count = 0;
            for await (const result of results.results) {
                count++;
                const doc = result.document;
                const score = result['@search.rerankerScore'] || result.score;
                console.log(`  ${count}. ${doc.fullName} - ${doc.currentLocation} (${doc.yearsOfExperience}y) - Score: ${score?.toFixed(2)}`);
            }
            
            if (count === 0) {
                console.log('  ❌ No results');
            }
            console.log('');
        }
        
        console.log('========================================');
        console.log('✅ Resume text fix complete!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.details) {
            console.error('Details:', error.details);
        }
    }
}

function buildResumeText(candidate) {
    const parts = [];
    
    // Name and title
    if (candidate.fullName) {
        parts.push(`${candidate.fullName} is a professional`);
    }
    
    // Experience level and role inference
    const years = candidate.yearsOfExperience || 0;
    let level = '';
    let roles = [];
    
    if (years >= 8) {
        level = 'Senior';
        parts.push(`Senior professional with ${years} years of experience`);
    } else if (years >= 5) {
        level = 'Mid-level';
        parts.push(`Mid-level professional with ${years} years of experience`);
    } else if (years >= 2) {
        level = 'Junior';
        parts.push(`Junior professional with ${years} years of experience`);
    } else {
        level = 'Entry-level';
        parts.push(`Entry-level professional`);
    }
    
    // Analyze skills to determine roles
    const skills = candidate.skills || [];
    const skillsLower = skills.map(s => s.toLowerCase());
    
    // DevOps detection
    if (skillsLower.some(s => /kubernetes|docker|terraform|jenkins|ci.*cd|devops/.test(s))) {
        roles.push('DevOps Engineer');
        parts.push('DevOps engineer with infrastructure and deployment expertise');
    }
    
    // Frontend detection
    if (skillsLower.some(s => /react|angular|vue|frontend|css|html/.test(s))) {
        roles.push('Frontend Developer');
        parts.push('Frontend developer specializing in modern web applications');
    }
    
    // Backend detection
    if (skillsLower.some(s => /node|java|python|spring|django|backend|api|microservice/.test(s))) {
        roles.push('Backend Developer');
        parts.push('Backend developer with server-side programming expertise');
    }
    
    // Full Stack detection
    if (roles.includes('Frontend Developer') && roles.includes('Backend Developer')) {
        roles.push('Full Stack Developer');
        parts.push('Full stack developer capable of end-to-end development');
    }
    
    // Data Science / ML detection
    if (skillsLower.some(s => /tensorflow|pytorch|machine.*learning|data.*science|ml|ai/.test(s))) {
        roles.push('Data Scientist');
        roles.push('Machine Learning Engineer');
        parts.push('Data scientist and machine learning specialist');
    }
    
    // Cloud Architect detection
    if (skillsLower.some(s => /aws|azure|gcp|cloud|architect/.test(s))) {
        roles.push('Cloud Architect');
        parts.push('Cloud architect with multi-cloud platform experience');
    }
    
    // SRE detection
    if (skillsLower.some(s => /sre|reliability|monitoring|prometheus|grafana/.test(s))) {
        roles.push('Site Reliability Engineer');
        parts.push('Site reliability engineer focused on system stability');
    }
    
    // Mobile detection
    if (skillsLower.some(s => /react.*native|flutter|swift|kotlin|android|ios/.test(s))) {
        roles.push('Mobile Developer');
        parts.push('Mobile developer for iOS and Android platforms');
    }
    
    // Add location
    if (candidate.currentLocation) {
        parts.push(`Located in ${candidate.currentLocation}`);
        parts.push(`Based in ${candidate.currentLocation}`);
        parts.push(`Currently in ${candidate.currentLocation}`);
    }
    
    // Add skills with context
    if (skills.length > 0) {
        parts.push(`Technical skills include ${skills.join(', ')}`);
        parts.push(`Experienced with ${skills.slice(0, 5).join(', ')}`);
        
        // Add technology-specific descriptions
        if (skillsLower.includes('kubernetes')) {
            parts.push('Kubernetes expert with container orchestration experience');
        }
        if (skillsLower.includes('react')) {
            parts.push('React developer building modern user interfaces');
        }
        if (skillsLower.includes('python')) {
            parts.push('Python programmer with scripting and automation skills');
        }
    }
    
    // Add visa status context
    if (candidate.visaStatus) {
        parts.push(`Visa status: ${candidate.visaStatus}`);
        if (candidate.visaStatus === 'Citizen') {
            parts.push('Canadian citizen, no sponsorship required');
        } else if (candidate.visaStatus === 'PR') {
            parts.push('Permanent resident of Canada');
        }
    }
    
    // Add role combinations
    if (roles.length > 0) {
        parts.push(`Suitable for ${roles.join(', ')} positions`);
    }
    
    // Add experience descriptions
    parts.push(`${years} years of professional experience`);
    if (level) {
        parts.push(`${level} level candidate`);
    }
    
    return parts.join('. ');
}

// Run the fix
fixResumeText().catch(console.error);