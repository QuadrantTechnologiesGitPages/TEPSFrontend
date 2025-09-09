// Fix the import - use the existing database module correctly
const path = require('path');
const Database = require('better-sqlite3');
const searchService = require('../../services/search/searchService');

async function migrateExistingCandidates() {
    try {
        console.log('🚀 Starting candidate migration to Azure Search...');
        
        // Initialize storage
        await searchService.initializeStorage();
        
        // Connect to your existing database
        console.log('📊 Fetching candidates from database...');
        const dbPath = path.join(__dirname, '../../recruitment.db');
        const db = new Database(dbPath);
        
        // Check if candidates table exists
        const tableCheck = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='candidates'
        `).get();
        
        let candidates = [];
        
        if (tableCheck) {
            // Get candidates from candidates table
            candidates = db.prepare('SELECT * FROM candidates').all();
            console.log(`Found ${candidates.length} candidates in candidates table`);
        } else {
            console.log('No candidates table found, checking responses...');
            
            // Try to get candidates from responses if no candidates table
            const responsesCheck = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='responses'
            `).get();
            
            if (responsesCheck) {
                // Create candidates from form responses
                const responses = db.prepare(`
                    SELECT * FROM responses 
                    WHERE status != 'Deleted'
                    LIMIT 100
                `).all();
                
                console.log(`Found ${responses.length} responses to convert`);
                
                // Convert responses to candidate format
                candidates = responses.map(r => {
                    let data = {};
                    try {
                        data = JSON.parse(r.data || '{}');
                    } catch (e) {
                        console.log('Error parsing response data');
                    }
                    
                    return {
                        id: `resp-${r.id}`,
                        name: data.name || data.fullName || 'Unknown',
                        email: data.email || '',
                        phone: data.phone || data.phoneNumber || '',
                        skills: data.skills || '',
                        years_experience: data.experience || data.yearsOfExperience || 0,
                        current_location: data.location || data.city || '',
                        visa_status: data.visaStatus || '',
                        status: 'Active',
                        created_at: r.submitted_at,
                        updated_at: r.submitted_at
                    };
                });
            }
        }
        
        if (candidates.length === 0) {
            console.log('📝 No existing candidates found. Creating sample candidates...');
            
            // Create sample candidates for testing
            candidates = [
                {
                    id: 'sample-001',
                    name: 'John Smith',
                    email: 'john.smith@email.com',
                    phone: '416-555-0001',
                    skills: 'JavaScript, React, Node.js, AWS',
                    years_experience: 5,
                    current_location: 'Toronto',
                    visa_status: 'Citizen',
                    status: 'Active',
                    resumeText: 'Senior Full Stack Developer with 5 years experience in React and Node.js. Worked on scalable cloud applications using AWS.',
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: 'sample-002',
                    name: 'Sarah Johnson',
                    email: 'sarah.j@email.com',
                    phone: '647-555-0002',
                    skills: 'Python, Django, Machine Learning, Azure',
                    years_experience: 7,
                    current_location: 'Vancouver',
                    visa_status: 'PR',
                    status: 'Active',
                    resumeText: 'Data Scientist with expertise in Machine Learning and Python. Built recommendation systems and predictive models.',
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: 'sample-003',
                    name: 'Mike Chen',
                    email: 'mike.chen@email.com',
                    phone: '905-555-0003',
                    skills: 'Java, Spring Boot, Kubernetes, DevOps',
                    years_experience: 6,
                    current_location: 'Mississauga',
                    visa_status: 'Work Permit',
                    status: 'Active',
                    resumeText: 'DevOps Engineer specializing in Kubernetes and CI/CD pipelines. Experience with microservices architecture.',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];
        }
        
        // Index candidates to Azure Search
        console.log(`\n📤 Uploading ${candidates.length} candidates to Azure Search...`);
        
        // Process in batches of 100
        const batchSize = 100;
        for (let i = 0; i < candidates.length; i += batchSize) {
            const batch = candidates.slice(i, i + batchSize);
            await searchService.bulkIndexCandidates(batch);
            console.log(`   Batch ${Math.floor(i/batchSize) + 1} completed`);
        }
        
        // Test search
        console.log('\n🔍 Testing search functionality...');
        const testSearches = [
            'developer',
            'React',
            'Toronto',
            'Python'
        ];
        
        for (const query of testSearches) {
            const results = await searchService.searchCandidates(query, { top: 3 });
            console.log(`   Search "${query}": Found ${results.count || results.results.length} results`);
        }
        
        console.log('\n✅ Migration complete!');
        console.log(`📊 Total candidates in search index: ${candidates.length}`);
        
        db.close();
        return true;
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    migrateExistingCandidates()
        .then(() => {
            console.log('\n🎉 Ready for resume upload functionality!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Failed:', error);
            process.exit(1);
        });
}

module.exports = migrateExistingCandidates;