const candidateIndexSchema = {
    name: "candidates-index",
    fields: [
        // Key field
        {
            name: "candidateId",
            type: "Edm.String",
            key: true,
            searchable: false,
            filterable: true
        },
        
        // Basic Information
        {
            name: "fullName",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            sortable: true,
            facetable: false,
            analyzerName: "en.microsoft"
        },
        {
            name: "email",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: false
        },
        {
            name: "phone",
            type: "Edm.String",
            searchable: true,
            filterable: false
        },
        
        // Professional Information
        {
            name: "skills",
            type: "Collection(Edm.String)",
            searchable: true,
            filterable: true,
            facetable: true
        },
        {
            name: "yearsOfExperience",
            type: "Edm.Int32",
            searchable: false,
            filterable: true,
            sortable: true,
            facetable: true
        },
        {
            name: "currentLocation",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
        {
            name: "visaStatus",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
        
        // Resume Content
        {
            name: "resumeText",
            type: "Edm.String",
            searchable: true,
            filterable: false,
            analyzerName: "en.microsoft"
        },
        {
            name: "resumeUrl",
            type: "Edm.String",
            searchable: false,
            filterable: false
        },
        
        // Metadata
        {
            name: "createdAt",
            type: "Edm.DateTimeOffset",
            searchable: false,
            filterable: true,
            sortable: true
        },
        {
            name: "updatedAt",
            type: "Edm.DateTimeOffset",
            searchable: false,
            filterable: true,
            sortable: true
        },
        {
            name: "status",
            type: "Edm.String",
            searchable: false,
            filterable: true,
            facetable: true
        }
    ],
    
    // Scoring profiles for relevance tuning
    scoringProfiles: [
        {
            name: "skillBoost",
            text: {
                weights: {
                    skills: 5,
                    resumeText: 2,
                    fullName: 1
                }
            }
        }
    ],
    
    // Semantic search configuration
    semantic: {
        configurations: [
            {
                name: "semantic-config",
                prioritizedFields: {
                    titleField: {
                        fieldName: "fullName"
                    },
                    prioritizedContentFields: [
                        { fieldName: "resumeText" },
                        { fieldName: "skills" }
                    ]
                }
            }
        ]
    },
    
    // CORS settings
    corsOptions: {
        allowedOrigins: ["*"],
        maxAgeInSeconds: 60
    }
};

module.exports = candidateIndexSchema;