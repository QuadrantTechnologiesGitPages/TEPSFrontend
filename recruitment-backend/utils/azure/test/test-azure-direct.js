// test-azure-direct.js - Test Azure Search directly
require('dotenv').config();
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

async function debugSearch() {
    const client = new SearchClient(
        process.env.AZURE_SEARCH_ENDPOINT,
        'candidates-index',
        new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
    );
    
    console.log('🔍 TESTING AZURE SEARCH DIRECTLY\n');
    console.log('================================');
    console.log('Endpoint:', process.env.AZURE_SEARCH_ENDPOINT);
    console.log('Index: candidates-index\n');
    
    try {
        // Test 1: Check total documents
        console.log('📊 TEST 1: Checking total documents');
        console.log('─'.repeat(40));
        const allDocs = await client.search('*', {
            top: 0,
            includeTotalCount: true
        });
        console.log(`Total documents in index: ${allDocs.count}\n`);
        
        // Test 2: List all candidates with their key fields
        console.log('👥 TEST 2: All candidates overview');
        console.log('─'.repeat(40));
        const listAll = await client.search('*', {
            top: 30,
            select: ['candidateId', 'fullName', 'skills', 'currentLocation', 'yearsOfExperience']
        });
        
        let listCount = 0;
        for await (const result of listAll.results) {
            listCount++;
            const doc = result.document;
            console.log(`${listCount}. ${doc.fullName || 'No Name'}`);
            console.log(`   ID: ${doc.candidateId}`);
            console.log(`   Location: ${doc.currentLocation || 'N/A'}`);
            console.log(`   Experience: ${doc.yearsOfExperience || 0} years`);
            console.log(`   Skills: ${doc.skills ? doc.skills.slice(0, 3).join(', ') : 'N/A'}`);
            console.log('');
        }
        
        // Test 3: Your specific query with semantic search
        console.log('🎯 TEST 3: Your specific query - "DevOps engineer with Kubernetes experience only"');
        console.log('─'.repeat(40));
        const yourQuery = "DevOps engineer with Kubernetes experience only";
        
        const semanticResults = await client.search(yourQuery, {
            queryType: 'semantic',
            semanticConfiguration: 'default',
            queryLanguage: 'en-us',
            top: 5,
            includeTotalCount: true
        });
        
        console.log(`Query: "${yourQuery}"`);
        console.log(`Results found: ${semanticResults.count || 0}\n`);
        
        let semanticCount = 0;
        for await (const result of semanticResults.results) {
            semanticCount++;
            const doc = result.document;
            console.log(`Result ${semanticCount}:`);
            console.log(`  Name: ${doc.fullName}`);
            console.log(`  Email: ${doc.email}`);
            console.log(`  Location: ${doc.currentLocation || 'N/A'}`);
            console.log(`  Experience: ${doc.yearsOfExperience || 0} years`);
            console.log(`  Skills: ${doc.skills ? doc.skills.join(', ') : 'N/A'}`);
            console.log(`  Search Score: ${result.score?.toFixed(3) || 'N/A'}`);
            
            // Check for semantic metadata
            if (result['@search.rerankerScore'] !== undefined) {
                console.log(`  🧠 Reranker Score: ${result['@search.rerankerScore'].toFixed(3)}`);
            }
            if (result['@search.captions']) {
                console.log(`  📝 Caption: ${result['@search.captions'][0]?.text || 'N/A'}`);
            }
            console.log('');
        }
        
        if (semanticCount === 0) {
            console.log('❌ No results found for semantic search\n');
        }
        
        // Test 4: Same query with simple search for comparison
        console.log('🔍 TEST 4: Same query with simple keyword search');
        console.log('─'.repeat(40));
        const simpleResults = await client.search(yourQuery, {
            searchMode: 'all',
            top: 5
        });
        
        let simpleCount = 0;
        for await (const result of simpleResults.results) {
            simpleCount++;
            console.log(`${simpleCount}. ${result.document.fullName} (Score: ${result.score?.toFixed(3)})`);
        }
        
        if (simpleCount === 0) {
            console.log('❌ No results found for simple search\n');
        }
        
        // Test 5: Search for just "Kubernetes"
        console.log('\n🔧 TEST 5: Searching for just "Kubernetes"');
        console.log('─'.repeat(40));
        const kubernetesSearch = await client.search('Kubernetes', {
            searchMode: 'all',
            top: 5,
            select: ['fullName', 'skills']
        });
        
        let k8sCount = 0;
        for await (const result of kubernetesSearch.results) {
            k8sCount++;
            const doc = result.document;
            console.log(`${k8sCount}. ${doc.fullName}`);
            const k8sSkills = doc.skills ? doc.skills.filter(s => s.toLowerCase().includes('kubernetes')) : [];
            if (k8sSkills.length > 0) {
                console.log(`   ✓ Has Kubernetes in skills`);
            }
        }
        
        if (k8sCount === 0) {
            console.log('❌ No candidates with Kubernetes found\n');
        } else {
            console.log(`\n✅ Found ${k8sCount} candidates with Kubernetes\n`);
        }
        
        // Test 6: Check what's in resumeText field
        console.log('📄 TEST 6: Checking resumeText content');
        console.log('─'.repeat(40));
        const resumeCheck = await client.search('*', {
            top: 3,
            select: ['fullName', 'resumeText']
        });
        
        for await (const result of resumeCheck.results) {
            const doc = result.document;
            console.log(`${doc.fullName}:`);
            if (doc.resumeText) {
                console.log(`  Resume preview: "${doc.resumeText.substring(0, 150)}..."`);
            } else {
                console.log('  ❌ No resumeText field');
            }
            console.log('');
        }
        
        // Test 7: Test semantic search with different queries
        console.log('🧪 TEST 7: Testing various semantic queries');
        console.log('─'.repeat(40));
        const testQueries = [
            'senior developer with 8 years experience',
            'React developer in Toronto',
            'Python machine learning',
            'full stack developer'
        ];
        
        for (const query of testQueries) {
            const testResult = await client.search(query, {
                queryType: 'semantic',
                semanticConfiguration: 'default',
                queryLanguage: 'en-us',
                top: 1
            });
            
            let found = false;
            for await (const result of testResult.results) {
                found = true;
                console.log(`"${query}" → Found: ${result.document.fullName}`);
            }
            
            if (!found) {
                console.log(`"${query}" → No results`);
            }
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.details) {
            console.error('Details:', JSON.stringify(error.details, null, 2));
        }
    }
    
    console.log('\n================================');
    console.log('✅ Test Complete\n');
}

debugSearch().catch(console.error);