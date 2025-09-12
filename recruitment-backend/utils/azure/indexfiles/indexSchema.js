// indexSchema.js - Save this in: recruitment-backend/utils/azure/indexSchema.js
// Fixed schema without problematic scoring profile

const candidateIndexSchema = {
    name: "candidates-index",
    fields: [
        // Primary key
        {
            name: "candidateId",
            type: "Edm.String",
            key: true,
            searchable: false,
            filterable: true,
            sortable: true
        },
        
        // Basic Information
        {
            name: "fullName",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            sortable: true,
            facetable: false,
            analyzerName: "en.lucene"
        },
        {
            name: "email",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            sortable: false
        },
        {
            name: "phone",
            type: "Edm.String",
            searchable: false,
            filterable: false,
            sortable: false
        },
        
        // Professional Information
        {
            name: "jobTitle",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
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
            name: "experienceLevel",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
        
        // Location
        {
            name: "currentLocation",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
        {
            name: "preferredLocations",
            type: "Collection(Edm.String)",
            searchable: true,
            filterable: true,
            facetable: false
        },
        
        // Work Authorization
        {
            name: "visaStatus",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
        {
            name: "workAuthorization",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
        
        // Availability & Preferences
        {
            name: "availability",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
        {
            name: "expectedSalary",
            type: "Edm.Int32",
            searchable: false,
            filterable: true,
            sortable: true,
            facetable: true
        },
        {
            name: "openToRemote",
            type: "Edm.Boolean",
            searchable: false,
            filterable: true,
            facetable: true
        },
        {
            name: "willingToRelocate",
            type: "Edm.Boolean",
            searchable: false,
            filterable: true,
            facetable: true
        },
        
        // Education & Certifications
        {
            name: "education",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: true
        },
        {
            name: "certifications",
            type: "Collection(Edm.String)",
            searchable: true,
            filterable: true,
            facetable: false
        },
        
        // Current Employment
        {
            name: "currentEmployer",
            type: "Edm.String",
            searchable: true,
            filterable: true,
            facetable: false
        },
        {
            name: "currentRole",
            type: "Edm.String",
            searchable: true,
            filterable: false,
            facetable: false
        },
        
        // THE MOST IMPORTANT FIELD - For Semantic Search
        {
            name: "resumeText",
            type: "Edm.String",
            searchable: true,
            filterable: false,
            sortable: false,
            analyzerName: "en.lucene"
        },
        
        // Supporting Documents
        {
            name: "resumeUrl",
            type: "Edm.String",
            searchable: false,
            filterable: false,
            sortable: false
        },
        {
            name: "linkedinUrl",
            type: "Edm.String",
            searchable: false,
            filterable: false,
            sortable: false
        },
        
        // Metadata
        {
            name: "status",
            type: "Edm.String",
            searchable: false,
            filterable: true,
            facetable: true
        },
        {
            name: "source",
            type: "Edm.String",
            searchable: false,
            filterable: true,
            facetable: true
        },
        {
            name: "recruiterNotes",
            type: "Edm.String",
            searchable: true,
            filterable: false,
            sortable: false
        },
        {
            name: "tags",
            type: "Collection(Edm.String)",
            searchable: true,
            filterable: true,
            facetable: true
        },
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
        }
    ],
    
    // Simple scoring profile without magnitude function
    scoringProfiles: [
        {
            name: "skillBoost",
            text: {
                weights: {
                    resumeText: 2,
                    skills: 5,
                    jobTitle: 3,
                    experienceLevel: 2,
                    fullName: 1
                }
            }
        }
    ],
    
    // Default scoring profile
    defaultScoringProfile: "skillBoost",
    
    // CORS settings
    corsOptions: {
        allowedOrigins: ["*"],
        maxAgeInSeconds: 300
    }
};

module.exports = candidateIndexSchema;