require('dotenv').config();
const { SearchIndexClient, AzureKeyCredential } = require('@azure/search-documents');

async function fixSemanticDefault() {
    try {
        const indexClient = new SearchIndexClient(
            process.env.AZURE_SEARCH_ENDPOINT,
            new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
        );
        
        console.log('🔧 Fixing semantic default configuration...\n');
        console.log('================================================\n');
        
        // Get current index
        console.log('📥 Fetching current index configuration...');
        const index = await indexClient.getIndex('candidates-index');
        
        // Check if semantic search exists, if not create it
        if (!index.semanticSearch) {
            console.log('⚠️  No semantic search configuration found. Creating...');
            index.semanticSearch = {
                configurations: [],
                defaultConfigurationName: null
            };
        }
        
        // Log current state
        console.log('\n📊 Current Semantic Configuration:');
        if (index.semanticSearch.configurations && index.semanticSearch.configurations.length > 0) {
            index.semanticSearch.configurations.forEach(config => {
                console.log(`   - Configuration: "${config.name}"`);
            });
        } else {
            console.log('   - No configurations found');
        }
        console.log(`   - Current Default: "${index.semanticSearch.defaultConfigurationName || 'None'}"`);
        
        // Find the configuration name (usually "default" or "candidates-semantic-config")
        let configName = "default";
        
        // If you created a configuration with a different name in the portal, 
        // it should be listed in the configurations array
        if (index.semanticSearch.configurations && index.semanticSearch.configurations.length > 0) {
            // Use the first available configuration
            configName = index.semanticSearch.configurations[0].name;
            console.log(`\n🎯 Found existing configuration: "${configName}"`);
        } else {
            console.log('\n⚠️  No configurations found in index.');
            console.log('   Please create a semantic configuration in Azure Portal first!');
            console.log('\n📝 To create in Azure Portal:');
            console.log('   1. Go to your search service');
            console.log('   2. Click on "Indexes" → "candidates-index"');
            console.log('   3. Click "Semantic configurations" tab');
            console.log('   4. Click "+ Add semantic configuration"');
            console.log('   5. Name it "default"');
            console.log('   6. Set Title field: fullName');
            console.log('   7. Set Content fields: resumeText, skills, jobTitle');
            console.log('   8. Set Keyword fields: tags, experienceLevel');
            console.log('   9. Save the configuration');
            return;
        }
        
        // Set the default configuration
        index.semanticSearch.defaultConfigurationName = configName;
        
        console.log(`\n🔄 Setting defaultConfigurationName to "${configName}"...`);
        
        // Update the index
        await indexClient.createOrUpdateIndex(index);
        
        console.log('✅ Default semantic configuration set successfully!');
        
        // Wait for update to propagate
        console.log('\n⏳ Waiting for changes to propagate...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify the update
        console.log('\n🔍 Verifying configuration...');
        const updatedIndex = await indexClient.getIndex('candidates-index');
        console.log(`   ✓ Default is now: "${updatedIndex.semanticSearch.defaultConfigurationName}"`);
        
        // Test semantic search
        const { SearchClient } = require('@azure/search-documents');
        const searchClient = new SearchClient(
            process.env.AZURE_SEARCH_ENDPOINT,
            'candidates-index',
            new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
        );
        
        console.log('\n🧠 Testing semantic search...');
        console.log('================================================\n');
        
        try {
            const results = await searchClient.search("experienced developer", {
                queryType: "semantic",
                semanticConfigurationName: configName,  // Explicitly use the config
                queryLanguage: "en-us",
                top: 3,
                select: ["candidateId", "fullName", "jobTitle", "skills", "yearsOfExperience"],
                includeTotalCount: true
            });
            
            let count = 0;
            console.log('Search Results:');
            for await (const result of results.results) {
                count++;
                console.log(`\n   Result ${count}:`);
                console.log(`   - Name: ${result.document.fullName || 'N/A'}`);
                console.log(`   - Title: ${result.document.jobTitle || 'N/A'}`);
                console.log(`   - Experience: ${result.document.yearsOfExperience || 0} years`);
                console.log(`   - Skills: ${result.document.skills ? result.document.skills.join(', ') : 'N/A'}`);
                console.log(`   - Score: ${result.score}`);
            }
            
            if (count === 0) {
                console.log('   ⚠️  No results found. You may need to add candidates to the index first.');
                console.log('\n💡 TIP: Run your data upload script to add candidates to the index.');
            } else {
                console.log(`\n✅ SUCCESS! Semantic search is working. Found ${count} results.`);
            }
            
        } catch (searchError) {
            console.error('\n❌ Search test failed:', searchError.message);
            
            if (searchError.message.includes('semantic')) {
                console.log('\n⚠️  Semantic search error. Possible issues:');
                console.log('   1. Semantic configuration not created in Azure Portal');
                console.log('   2. Configuration name mismatch');
                console.log('   3. Semantic search not enabled for your search service');
                console.log('\n📝 Please verify in Azure Portal:');
                console.log('   - Your search service tier supports semantic search (Standard tier or higher)');
                console.log('   - Semantic configuration exists in the index');
            }
        }
        
        console.log('\n================================================');
        console.log('🎉 Configuration update complete!\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        if (error.statusCode === 404) {
            console.log('\n⚠️  Index "candidates-index" not found.');
            console.log('   Please create the index first.');
        } else if (error.statusCode === 403) {
            console.log('\n⚠️  Authentication failed.');
            console.log('   Please check your AZURE_SEARCH_ADMIN_KEY in .env file.');
        } else {
            console.log('\n⚠️  Unexpected error. Full details:');
            console.log(error);
        }
    }
}

// Run the fix
fixSemanticDefault();