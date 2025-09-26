// recruitment-backend/services/search/searchService.js
const { SearchClient, SearchIndexClient, AzureKeyCredential } = require('@azure/search-documents');
const db = require('../../data/database');
require('dotenv').config();
class SearchService {
  constructor() {
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const apiKey = process.env.AZURE_SEARCH_ADMIN_KEY;
    const indexName = process.env.SEARCH_INDEX_NAME || 'candidates-index';

    this.credential = new AzureKeyCredential(apiKey);
    this.searchClient = new SearchClient(endpoint, indexName, this.credential);
    this.indexClient = new SearchIndexClient(endpoint, this.credential);
    this.indexName = indexName;
  }

  /**
   * Create or update the search index with new schema
   */
  async createOrUpdateIndex() {
    try {
      const indexDefinition = {
        name: this.indexName,
        fields: [
          // Core candidate fields
          { name: 'id', type: 'Edm.String', key: true, filterable: true },
          { name: 'candidate_id', type: 'Edm.Int32', filterable: true, facetable: true },
          { name: 'name', type: 'Edm.String', searchable: true, filterable: true, sortable: true },
          { name: 'email', type: 'Edm.String', searchable: true, filterable: true },
          { name: 'phone', type: 'Edm.String', searchable: true, filterable: true },
          { name: 'status', type: 'Edm.String', filterable: true, facetable: true },
          
          // Professional details
          { name: 'skills', type: 'Collection(Edm.String)', searchable: true, filterable: true, facetable: true },
          { name: 'experience_years', type: 'Edm.Int32', filterable: true, sortable: true, facetable: true },
          { name: 'current_location', type: 'Edm.String', searchable: true, filterable: true, facetable: true },
          { name: 'preferred_locations', type: 'Collection(Edm.String)', searchable: true, filterable: true },
          { name: 'current_company', type: 'Edm.String', searchable: true, filterable: true, facetable: true },
          { name: 'current_role', type: 'Edm.String', searchable: true, filterable: true },
          { name: 'education', type: 'Edm.String', searchable: true },
          { name: 'certifications', type: 'Collection(Edm.String)', searchable: true, filterable: true },
          
          // Resume and text content
          { name: 'resume_text', type: 'Edm.String', searchable: true },
          { name: 'resume_url', type: 'Edm.String', filterable: true },
          { name: 'linkedin_url', type: 'Edm.String', filterable: true },
          
          // Shortlist and bucket info
          { name: 'bucket_ids', type: 'Collection(Edm.String)', filterable: true },
          { name: 'bucket_names', type: 'Collection(Edm.String)', searchable: true, filterable: true },
          { name: 'shortlist_count', type: 'Edm.Int32', filterable: true, sortable: true },
          { name: 'bucket_match_scores', type: 'Collection(Edm.Double)', filterable: true },
          
          // Interview data
          { name: 'interview_count', type: 'Edm.Int32', filterable: true, sortable: true },
          { name: 'last_interview_date', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
          { name: 'interview_status', type: 'Edm.String', filterable: true, facetable: true },
          { name: 'interview_ratings', type: 'Collection(Edm.Double)', filterable: true },
          { name: 'average_rating', type: 'Edm.Double', filterable: true, sortable: true },
          { name: 'technical_rating', type: 'Edm.Double', filterable: true, sortable: true },
          { name: 'communication_rating', type: 'Edm.Double', filterable: true, sortable: true },
          { name: 'interview_rounds_completed', type: 'Edm.Int32', filterable: true },
          
          // Placement and submission tracking
          { name: 'vendor_submissions', type: 'Collection(Edm.String)', filterable: true },
          { name: 'client_submissions', type: 'Collection(Edm.String)', filterable: true },
          { name: 'vendor_submission_count', type: 'Edm.Int32', filterable: true, sortable: true },
          { name: 'client_submission_count', type: 'Edm.Int32', filterable: true, sortable: true },
          { name: 'placement_status', type: 'Edm.String', filterable: true, facetable: true },
          { name: 'current_client', type: 'Edm.String', searchable: true, filterable: true },
          { name: 'current_vendor', type: 'Edm.String', searchable: true, filterable: true },
          { name: 'bill_rate', type: 'Edm.Double', filterable: true, sortable: true },
          { name: 'pay_rate', type: 'Edm.Double', filterable: true, sortable: true },
          { name: 'is_placed', type: 'Edm.Boolean', filterable: true, facetable: true },
          { name: 'placement_date', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
          
          // AI Question data
          { name: 'questions_generated', type: 'Edm.Int32', filterable: true },
          { name: 'question_categories', type: 'Collection(Edm.String)', filterable: true },
          { name: 'assessed_skills', type: 'Collection(Edm.String)', searchable: true, filterable: true },
          
          // Availability and preferences
          { name: 'availability_date', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
          { name: 'visa_status', type: 'Edm.String', filterable: true, facetable: true },
          { name: 'willing_to_relocate', type: 'Edm.Boolean', filterable: true },
          { name: 'expected_rate', type: 'Edm.Double', filterable: true, sortable: true },
          { name: 'work_authorization', type: 'Edm.String', filterable: true, facetable: true },
          
          // Metadata
          { name: 'created_at', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
          { name: 'updated_at', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
          { name: 'last_contacted', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
          { name: 'source', type: 'Edm.String', filterable: true, facetable: true },
          { name: 'referrer_email', type: 'Edm.String', filterable: true },
          { name: 'tags', type: 'Collection(Edm.String)', searchable: true, filterable: true, facetable: true },
          
          // Scoring and matching
          { name: 'match_score', type: 'Edm.Double', sortable: true },
          { name: 'relevance_score', type: 'Edm.Double', sortable: true },
          { name: 'engagement_score', type: 'Edm.Double', sortable: true },
          
          // Communication tracking
          { name: 'email_sent_count', type: 'Edm.Int32', filterable: true },
          { name: 'email_opened', type: 'Edm.Boolean', filterable: true },
          { name: 'responded', type: 'Edm.Boolean', filterable: true },
          { name: 'response_rate', type: 'Edm.Double', filterable: true, sortable: true }
        ],
        suggesters: [
          {
            name: 'sg',
            searchMode: 'analyzingInfixMatching',
            sourceFields: ['name', 'skills', 'current_company', 'current_role', 'bucket_names']
          }
        ],
        scoringProfiles: [
          {
            name: 'candidateScoring',
            text: {
              weights: {
                name: 1.5,
                skills: 3,
                resume_text: 2,
                current_role: 1.5,
                education: 1,
                bucket_names: 1.2
              }
            },
            functions: [
              {
                type: 'magnitude',
                fieldName: 'experience_years',
                boost: 2,
                interpolation: 'linear',
                magnitude: {
                  boostingRangeStart: 2,
                  boostingRangeEnd: 15,
                  constantBoostBeyondRange: false
                }
              },
              {
                type: 'magnitude',
                fieldName: 'average_rating',
                boost: 3,
                interpolation: 'linear',
                magnitude: {
                  boostingRangeStart: 3,
                  boostingRangeEnd: 5,
                  constantBoostBeyondRange: false
                }
              },
              {
                type: 'freshness',
                fieldName: 'updated_at',
                boost: 1.5,
                interpolation: 'logarithmic',
                freshness: {
                  boostingDuration: 'P30D'
                }
              }
            ]
          }
        ],
        corsOptions: {
          allowedOrigins: ['*'],
          maxAgeInSeconds: 300
        },
        semantic: {
          configurations: [
            {
              name: 'my-semantic-config',
              prioritizedFields: {
                titleField: { fieldName: 'name' },
                prioritizedContentFields: [
                  { fieldName: 'resume_text' },
                  { fieldName: 'skills' },
                  { fieldName: 'current_role' }
                ],
                prioritizedKeywordsFields: [
                  { fieldName: 'skills' },
                  { fieldName: 'certifications' },
                  { fieldName: 'assessed_skills' }
                ]
              }
            }
          ]
        }
      };

      // Create or update the index
      await this.indexClient.createOrUpdateIndex(indexDefinition);
      console.log('✅ Azure Search index created/updated successfully');
      
      return { success: true, indexName: this.indexName };

    } catch (error) {
      console.error('Error creating/updating index:', error);
      throw error;
    }
  }

  /**
   * Index a candidate with all their related data
   */
  async indexCandidate(candidateId) {
    try {
      // Fetch comprehensive candidate data
      const candidateQuery = `
        SELECT 
          c.*,
          cd.skills,
          cd.experience_years,
          cd.education,
          cd.certifications,
          cd.current_location,
          cd.preferred_locations,
          cd.current_company,
          cd.current_role,
          cd.visa_status,
          cd.availability_date,
          cd.expected_rate,
          cd.willing_to_relocate,
          cd.resume_text,
          cd.resume_url,
          cd.linkedin_url,
          cd.work_authorization
        FROM candidates c
        LEFT JOIN candidate_details cd ON c.id = cd.candidate_id
        WHERE c.id = $1
      `;
      
      const candidateResult = await db.query(candidateQuery, [candidateId]);
      
      if (candidateResult.rows.length === 0) {
        throw new Error(`Candidate ${candidateId} not found`);
      }
      
      const candidate = candidateResult.rows[0];
      
      // Fetch shortlist/bucket information
      const bucketQuery = `
        SELECT 
          sb.bucket_id,
          sb.name as bucket_name,
          sc.match_score
        FROM shortlist_candidates sc
        JOIN shortlist_buckets sb ON sc.bucket_id = sb.id
        WHERE sc.candidate_id = $1 AND sb.is_active = true
      `;
      
      const buckets = await db.query(bucketQuery, [candidateId]);
      
      // Fetch interview data
      const interviewQuery = `
        SELECT 
          i.*,
          if.average_rating,
          if.technical_rating,
          if.communication_rating,
          if.problem_solving_rating,
          if.culture_fit_rating
        FROM interviews i
        LEFT JOIN interview_feedback if ON i.id = if.interview_id
        WHERE i.candidate_id = $1
        ORDER BY i.scheduled_date DESC
      `;
      
      const interviews = await db.query(interviewQuery, [candidateId]);
      
      // Fetch submission data
      const vendorSubmissionQuery = `
        SELECT 
          v.company_name,
          vs.status,
          vs.submitted_at
        FROM vendor_submissions vs
        JOIN vendors v ON vs.vendor_id = v.id
        WHERE vs.candidate_id = $1
      `;
      
      const vendorSubs = await db.query(vendorSubmissionQuery, [candidateId]);
      
      const clientSubmissionQuery = `
        SELECT 
          c.company_name,
          cs.status,
          cs.bill_rate,
          cs.submitted_at
        FROM client_submissions cs
        JOIN clients c ON cs.client_id = c.id
        WHERE cs.candidate_id = $1
      `;
      
      const clientSubs = await db.query(clientSubmissionQuery, [candidateId]);
      
      // Fetch placement data
      const placementQuery = `
        SELECT 
          p.*,
          c.company_name as client_name,
          v.company_name as vendor_name
        FROM placements p
        JOIN clients c ON p.client_id = c.id
        LEFT JOIN vendors v ON p.vendor_id = v.id
        WHERE p.candidate_id = $1 AND p.status = 'active'
        LIMIT 1
      `;
      
      const placement = await db.query(placementQuery, [candidateId]);
      
      // Fetch AI questions data
      const questionsQuery = `
        SELECT 
          COUNT(DISTINCT id) as question_count,
          array_agg(DISTINCT category) as categories,
          array_agg(DISTINCT skill) as assessed_skills
        FROM interview_questions
        WHERE candidate_id = $1
      `;
      
      const questions = await db.query(questionsQuery, [candidateId]);
      
      // Calculate metrics
      const interviewRatings = interviews.rows
        .filter(i => i.average_rating)
        .map(i => parseFloat(i.average_rating));
      
      const averageRating = interviewRatings.length > 0 
        ? interviewRatings.reduce((a, b) => a + b, 0) / interviewRatings.length 
        : null;
      
      const technicalRatings = interviews.rows
        .filter(i => i.technical_rating)
        .map(i => parseFloat(i.technical_rating));
      
      const avgTechnicalRating = technicalRatings.length > 0
        ? technicalRatings.reduce((a, b) => a + b, 0) / technicalRatings.length
        : null;
      
      const communicationRatings = interviews.rows
        .filter(i => i.communication_rating)
        .map(i => parseFloat(i.communication_rating));
      
      const avgCommunicationRating = communicationRatings.length > 0
        ? communicationRatings.reduce((a, b) => a + b, 0) / communicationRatings.length
        : null;
      
      // Build the document for Azure Search
      const document = {
        id: `candidate_${candidateId}`,
        candidate_id: candidateId,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        status: candidate.status,
        
        // Professional details
        skills: candidate.skills || [],
        experience_years: candidate.experience_years,
        current_location: candidate.current_location,
        preferred_locations: candidate.preferred_locations || [],
        current_company: candidate.current_company,
        current_role: candidate.current_role,
        education: candidate.education,
        certifications: candidate.certifications || [],
        
        // Resume
        resume_text: candidate.resume_text || '',
        resume_url: candidate.resume_url,
        linkedin_url: candidate.linkedin_url,
        
        // Shortlist info
        bucket_ids: buckets.rows.map(b => b.bucket_id),
        bucket_names: buckets.rows.map(b => b.bucket_name),
        shortlist_count: buckets.rows.length,
        bucket_match_scores: buckets.rows.map(b => b.match_score || 0),
        
        // Interview info
        interview_count: interviews.rows.length,
        last_interview_date: interviews.rows[0]?.scheduled_date,
        interview_status: interviews.rows[0]?.status,
        interview_ratings: interviewRatings,
        average_rating: averageRating,
        technical_rating: avgTechnicalRating,
        communication_rating: avgCommunicationRating,
        interview_rounds_completed: interviews.rows.filter(i => i.status === 'completed').length,
        
        // Submissions
        vendor_submissions: vendorSubs.rows.map(v => v.company_name),
        client_submissions: clientSubs.rows.map(c => c.company_name),
        vendor_submission_count: vendorSubs.rows.length,
        client_submission_count: clientSubs.rows.length,
        
        // Placement
        placement_status: placement.rows[0]?.status || 'not_placed',
        current_client: placement.rows[0]?.client_name,
        current_vendor: placement.rows[0]?.vendor_name,
        bill_rate: placement.rows[0]?.bill_rate || clientSubs.rows[0]?.bill_rate,
        pay_rate: placement.rows[0]?.pay_rate,
        is_placed: placement.rows.length > 0,
        placement_date: placement.rows[0]?.start_date,
        
        // AI Questions
        questions_generated: parseInt(questions.rows[0]?.question_count || 0),
        question_categories: questions.rows[0]?.categories || [],
        assessed_skills: questions.rows[0]?.assessed_skills?.filter(s => s) || [],
        
        // Availability
        availability_date: candidate.availability_date,
        visa_status: candidate.visa_status,
        willing_to_relocate: candidate.willing_to_relocate || false,
        expected_rate: candidate.expected_rate,
        work_authorization: candidate.work_authorization,
        
        // Metadata
        created_at: candidate.created_at,
        updated_at: candidate.updated_at || new Date(),
        last_contacted: candidate.last_contacted,
        source: candidate.source || 'Direct',
        referrer_email: candidate.referrer_email,
        tags: candidate.tags || [],
        
        // Scoring
        match_score: buckets.rows[0]?.match_score || 0,
        relevance_score: 0,
        engagement_score: 0,
        
        // Communication
        email_sent_count: 0,
        email_opened: false,
        responded: false,
        response_rate: 0
      };

      // Upload to Azure Search
      const result = await this.searchClient.uploadDocuments([document]);
      console.log(`✅ Indexed candidate ${candidateId} to Azure Search`);
      
      return { success: true, candidateId, result };

    } catch (error) {
      console.error(`Error indexing candidate ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk index all candidates
   */
  async bulkIndexAllCandidates() {
    try {
      const query = 'SELECT id FROM candidates ORDER BY id';
      const result = await db.query(query);
      
      console.log(`Starting bulk index of ${result.rows.length} candidates...`);
      
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < result.rows.length; i += batchSize) {
        const batch = result.rows.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      let indexed = 0;
      let failed = 0;
      
      for (const batch of batches) {
        const documents = [];
        
        for (const row of batch) {
          try {
            await this.indexCandidate(row.id);
            indexed++;
          } catch (error) {
            console.error(`Failed to index candidate ${row.id}:`, error.message);
            failed++;
          }
        }
        
        console.log(`Progress: ${indexed + failed}/${result.rows.length} (${failed} failed)`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`✅ Bulk indexing complete: ${indexed} indexed, ${failed} failed`);
      
      return {
        success: true,
        total: result.rows.length,
        indexed,
        failed
      };

    } catch (error) {
      console.error('Error in bulk indexing:', error);
      throw error;
    }
  }

  /**
   * Update partial document (for incremental updates)
   */
  async updatePartialDocument(candidateId, updates) {
    try {
      const documentId = `candidate_${candidateId}`;
      
      // Merge update
      const document = {
        id: documentId,
        ...updates
      };
      
      await this.searchClient.mergeOrUploadDocuments([document]);
      console.log(`✅ Updated candidate ${candidateId} in Azure Search`);
      
      return { success: true, candidateId };

    } catch (error) {
      console.error(`Error updating candidate ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Delete candidate from index
   */
  async deleteFromIndex(candidateId) {
    try {
      await this.searchClient.deleteDocuments([{ id: `candidate_${candidateId}` }]);
      console.log(`✅ Deleted candidate ${candidateId} from Azure Search`);
      
      return { success: true, candidateId };

    } catch (error) {
      console.error(`Error deleting candidate ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Search with new fields
   */
  async searchCandidates(searchText, filters = {}) {
    try {
      let filterQuery = [];
      
      // Build filter query
      if (filters.skills && filters.skills.length > 0) {
        const skillFilters = filters.skills.map(s => `skills/any(s: s eq '${s}')`);
        filterQuery.push(`(${skillFilters.join(' or ')})`);
      }
      
      if (filters.bucketIds && filters.bucketIds.length > 0) {
        const bucketFilters = filters.bucketIds.map(b => `bucket_ids/any(b: b eq '${b}')`);
        filterQuery.push(`(${bucketFilters.join(' or ')})`);
      }
      
      if (filters.minRating) {
        filterQuery.push(`average_rating ge ${filters.minRating}`);
      }
      
      if (filters.isPlaced !== undefined) {
        filterQuery.push(`is_placed eq ${filters.isPlaced}`);
      }
      
      if (filters.visaStatus) {
        filterQuery.push(`visa_status eq '${filters.visaStatus}'`);
      }
      
      if (filters.minExperience) {
        filterQuery.push(`experience_years ge ${filters.minExperience}`);
      }
      
      if (filters.maxExperience) {
        filterQuery.push(`experience_years le ${filters.maxExperience}`);
      }
      
      const searchOptions = {
        filter: filterQuery.length > 0 ? filterQuery.join(' and ') : undefined,
        facets: ['skills', 'visa_status', 'current_location', 'bucket_names', 'placement_status'],
        highlightFields: 'name,skills,current_role,resume_text',
        scoringProfile: 'candidateScoring',
        top: 50,
        skip: filters.skip || 0,
        includeTotalCount: true,
        queryType: 'semantic',
        semanticConfiguration: 'my-semantic-config'
      };
      
      const results = await this.searchClient.search(searchText || '*', searchOptions);
      
      const candidates = [];
      for await (const result of results.results) {
        candidates.push({
          ...result.document,
          searchScore: result.score,
          highlights: result.highlights
        });
      }
      
      return {
        success: true,
        candidates,
        totalCount: results.count,
        facets: results.facets
      };

    } catch (error) {
      console.error('Error searching candidates:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();