
-- ============================================
-- REFERENCE TABLES (Create these first)
-- ============================================

-- Status Master (for all statuses)
CREATE TABLE IF NOT EXISTS status_master (
    id SERIAL PRIMARY KEY,
    status_category VARCHAR(50),
    status_name VARCHAR(100),
    status_order INTEGER,
    is_terminal BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    timezone VARCHAR(50)
);

-- Visa Types
CREATE TABLE IF NOT EXISTS visa_types (
    id SERIAL PRIMARY KEY,
    visa_type VARCHAR(50),
    visa_description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Skills Master
CREATE TABLE IF NOT EXISTS skills_master (
    id SERIAL PRIMARY KEY,
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    skill_category VARCHAR(50),
    is_primary BOOLEAN DEFAULT false
);

-- Priority
CREATE TABLE IF NOT EXISTS priorities (
    id SERIAL PRIMARY KEY,
    priority_name VARCHAR(50),
    priority_level INTEGER
);

-- Engagement Types
CREATE TABLE IF NOT EXISTS engagement_types (
    id SERIAL PRIMARY KEY,
    engagement_type VARCHAR(50)
);

-- Referrers
CREATE TABLE IF NOT EXISTS referrers (
    id SERIAL PRIMARY KEY,
    referrer_name VARCHAR(255),
    referrer_email VARCHAR(255),
    referrer_phone VARCHAR(50),
    company VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- USER MANAGEMENT
-- ============================================

-- Users table (NEW)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    user_dept VARCHAR(100),
    user_role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth tokens (FROM EXISTING - Table #1)
-- Enhanced with foreign key to users table
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255),
    user_id INTEGER REFERENCES users(id),  -- Added link to users
    provider VARCHAR(50),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, provider)  -- Prevent duplicate provider tokens
);

-- ============================================
-- DATA COLLECTION TABLES (NEW)
-- ============================================

-- Primary Data
CREATE TABLE IF NOT EXISTS primary_data (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    dob DATE,
    resume_id INTEGER,  -- Will reference resumes table
    location_id INTEGER REFERENCES locations(id),
    linkedin_id INTEGER,
    engagement_type_id INTEGER REFERENCES engagement_types(id),
    quadrant_relation_id INTEGER,
    referrer_id INTEGER REFERENCES referrers(id),
    visa_status_id INTEGER REFERENCES visa_types(id),
    priority_id INTEGER REFERENCES priorities(id),
    is_h1_transfer BOOLEAN DEFAULT false,
    current_employer_name VARCHAR(255),
    years_of_experience INTEGER,
    rate_expectation VARCHAR(50),
    is_relocating BOOLEAN DEFAULT false,
    availability_date DATE,
    professional_references JSONB,  -- Fixed case
    additional_documents JSONB,
    skills TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Secondary Data
CREATE TABLE IF NOT EXISTS secondary_data (
    id SERIAL PRIMARY KEY,
    primary_data_id INTEGER REFERENCES primary_data(id),  -- Added link
    skype_id VARCHAR(100),
    last_project_location VARCHAR(255),
    interview_availability JSONB,
    us_arrival_date DATE,
    arrival_visa_type VARCHAR(50),
    ssn_digits VARCHAR(255),
    emergency_contact JSONB,
    intake_form_completed BOOLEAN DEFAULT false,
    verified_by_user_id INTEGER REFERENCES users(id),
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CORE ENTITIES
-- ============================================

-- Cases table (NEW)
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    case_status_id INTEGER REFERENCES status_master(id),
    pdata_id INTEGER REFERENCES primary_data(id),
    candidate_id INTEGER,  -- Forward reference, constraint added later
    is_case_forwarded BOOLEAN DEFAULT false,
    forwarded_to_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    closure_reason TEXT
);

-- Candidates table (ENHANCED FROM EXISTING)
CREATE TABLE IF NOT EXISTS candidate (
    id SERIAL PRIMARY KEY,
    -- Core fields from old system
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    linkedin_url TEXT,
    current_location VARCHAR(255),
    visa_status VARCHAR(50),
    years_experience INTEGER,
    skills TEXT[],  -- PostgreSQL array
    education VARCHAR(100),
    current_employer VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    source VARCHAR(50),
    source_id VARCHAR(100),
    referred_by VARCHAR(255),
    availability VARCHAR(50),
    expected_salary VARCHAR(50),
    notes TEXT,
    resume_url TEXT,
    resume_text TEXT,  -- For Azure Search
    resume_data JSONB, -- Structured resume data
    resume_parsed_at TIMESTAMP,
    -- New fields from new schema
    pdata_id INTEGER REFERENCES primary_data(id),
    sdata_id INTEGER REFERENCES secondary_data(id),
    candidate_status_id INTEGER REFERENCES status_master(id),
    candidate_rating INTEGER CHECK (candidate_rating >= 1 AND candidate_rating <= 5),
    candidate_comments TEXT,
    quality_score INTEGER DEFAULT 0,
    is_indexed BOOLEAN DEFAULT false,  -- Azure Search sync status
    created_from_case_id INTEGER REFERENCES cases(id),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
);

-- Add foreign key to cases after candidate is created
ALTER TABLE cases ADD CONSTRAINT fk_cases_candidate 
    FOREIGN KEY (candidate_id) REFERENCES candidate(id);

-- Candidate activities (FROM EXISTING)
CREATE TABLE IF NOT EXISTS candidate_activities (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidate(id),
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    performed_by VARCHAR(255),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changes JSONB
);

-- ============================================
-- FORM MANAGEMENT (FROM EXISTING + ENHANCED)
-- ============================================

-- Field Library (FROM EXISTING - Table #9)
-- This was missing from new schema but needed
CREATE TABLE IF NOT EXISTS field_library (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_options JSONB,  -- Changed from TEXT to JSONB
    validation_rules JSONB,  -- Changed from TEXT to JSONB
    placeholder TEXT,
    help_text TEXT,
    is_required BOOLEAN DEFAULT false,
    is_system_field BOOLEAN DEFAULT false,  -- Added for core fields
    field_category VARCHAR(50),  -- Added for grouping
    display_order INTEGER,  -- Added for ordering
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Form templates (FROM EXISTING - Table #5)
CREATE TABLE IF NOT EXISTS form_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL,
    settings JSONB,
    template_category VARCHAR(50),  -- Added for categorization
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Form Tokens (FROM EXISTING - Table #7)
-- Separate table for token management
CREATE TABLE IF NOT EXISTS form_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    template_id INTEGER REFERENCES form_templates(id),
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    max_uses INTEGER DEFAULT 1,  -- Added for multi-use tokens
    current_uses INTEGER DEFAULT 0,  -- Added to track usage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forms (FROM EXISTING - Table #2)
CREATE TABLE IF NOT EXISTS forms (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE,
    token_id INTEGER REFERENCES form_tokens(id),  -- Link to token management
    template_id INTEGER REFERENCES form_templates(id),
    case_id INTEGER REFERENCES cases(id),
    candidate_email VARCHAR(255),
    candidate_name VARCHAR(255),
    sender_email VARCHAR(255),
    sender_user_id INTEGER REFERENCES users(id),  -- Added user link
    fields JSONB,  -- Template fields at time of creation
    status VARCHAR(50) DEFAULT 'pending',
    -- Tracking dates
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_date TIMESTAMP,
    opened_date TIMESTAMP,
    completed_date TIMESTAMP,
    -- Response storage
    response_data JSONB,
    -- Email tracking (simplified from removed email_tracking table)
    email_status VARCHAR(50),
    email_opened_count INTEGER DEFAULT 0,
    last_opened_at TIMESTAMP,
    -- Expiration
    expires_at TIMESTAMP,
    -- Metadata
    ip_address VARCHAR(50),
    user_agent TEXT
);

-- Candidate responses (FROM EXISTING - Table #6)
CREATE TABLE IF NOT EXISTS candidate_responses (
    id SERIAL PRIMARY KEY,
    form_token VARCHAR(255),
    form_id INTEGER REFERENCES forms(id),  -- Added direct link
    template_id INTEGER REFERENCES form_templates(id),
    candidate_email VARCHAR(255),
    candidate_name VARCHAR(255),
    candidate_phone VARCHAR(50),
    response_data JSONB NOT NULL,
    -- Tracking
    ip_address VARCHAR(50),
    user_agent TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Processing
    processed BOOLEAN DEFAULT false,
    processed_by VARCHAR(255),
    processed_by_user_id INTEGER REFERENCES users(id),  -- Added user link
    processed_at TIMESTAMP,
    -- Links to created records
    case_created BOOLEAN DEFAULT false,
    case_id INTEGER REFERENCES cases(id),
    candidate_id INTEGER REFERENCES candidate(id),
    primary_data_id INTEGER REFERENCES primary_data(id),  -- Added link
    -- Additional
    quality_score INTEGER,  -- Added for response quality
    notes TEXT,
    deleted BOOLEAN DEFAULT false
);

-- ============================================
-- DOCUMENTS (NEW)
-- ============================================

-- Resume table
CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    file_url TEXT,
    original_filename VARCHAR(255),
    file_size INTEGER,  -- Added
    mime_type VARCHAR(100),  -- Added
    parsed_data JSONB,
    parser_version VARCHAR(20),
    parsing_status VARCHAR(50),
    parsing_error TEXT,  -- Added for error tracking
    is_gold_candidate BOOLEAN DEFAULT false,
    azure_blob_name VARCHAR(255),  -- Added for Azure storage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key reference from primary_data
ALTER TABLE primary_data ADD CONSTRAINT fk_primary_data_resume 
    FOREIGN KEY (resume_id) REFERENCES resumes(id);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidate(id),
    document_type VARCHAR(50),
    document_name VARCHAR(255),  -- Added
    document_url TEXT,
    file_size INTEGER,  -- Added
    mime_type VARCHAR(100),  -- Added
    azure_blob_name VARCHAR(255),  -- Added for Azure storage
    uploaded_by VARCHAR(255),
    uploaded_by_user_id INTEGER REFERENCES users(id),  -- Added user link
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INTERVIEW MANAGEMENT (NEW)
-- ============================================

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidate(id),
    case_id INTEGER REFERENCES cases(id),  -- Added case link
    requirement_id INTEGER,
    interview_round INTEGER DEFAULT 1,
    interview_type VARCHAR(50),
    interviewer_name VARCHAR(255),
    scheduled_date DATE,
    scheduled_time TIME,
    timezone VARCHAR(50),
    duration_minutes INTEGER,
    meeting_link TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    completed_at TIMESTAMP,  -- Added
    cancelled_at TIMESTAMP,  -- Added
    cancellation_reason TEXT,  -- Added
    created_by_user_id INTEGER REFERENCES users(id),  -- Added
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interview Feedback
CREATE TABLE IF NOT EXISTS interview_feedback (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER REFERENCES interviews(id),
    technical_rating INTEGER CHECK (technical_rating >= 1 AND technical_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    strengths JSONB,
    improvements JSONB,
    recommendation VARCHAR(50),
    detailed_notes TEXT,
    submitted_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOGGING TABLES (FROM EXISTING + NEW)
-- ============================================

-- Activity logs (FROM EXISTING)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id),
    candidate_id INTEGER REFERENCES candidate(id),  -- Added
    form_token VARCHAR(255),
    action VARCHAR(100),
    description TEXT,
    user_email VARCHAR(255),
    user_id INTEGER REFERENCES users(id),  -- Added user link
    ip_address VARCHAR(50),  -- Added
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications (FROM EXISTING)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),  -- Added user link
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    priority VARCHAR(20) DEFAULT 'normal',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User indexes
CREATE INDEX idx_users_email ON users(user_email);
CREATE INDEX idx_users_active ON users(is_active);

-- OAuth indexes
CREATE INDEX idx_oauth_user_email ON oauth_tokens(user_email);
CREATE INDEX idx_oauth_provider ON oauth_tokens(provider);

-- Candidate indexes
CREATE INDEX idx_candidate_email ON candidate(email);
CREATE INDEX idx_candidate_status ON candidate(status);
CREATE INDEX idx_candidate_indexed ON candidate(is_indexed);
CREATE INDEX idx_candidate_created_at ON candidate(created_at);

-- Form indexes
CREATE INDEX idx_forms_token ON forms(token);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_forms_case_id ON forms(case_id);
CREATE INDEX idx_forms_candidate_email ON forms(candidate_email);

-- Response indexes
CREATE INDEX idx_responses_form_token ON candidate_responses(form_token);
CREATE INDEX idx_responses_processed ON candidate_responses(processed);
CREATE INDEX idx_responses_candidate_id ON candidate_responses(candidate_id);

-- Case indexes
CREATE INDEX idx_cases_status ON cases(case_status_id);
CREATE INDEX idx_cases_user ON cases(user_id);
CREATE INDEX idx_cases_candidate ON cases(candidate_id);

-- Activity log indexes
CREATE INDEX idx_activity_created ON activity_logs(created_at);
CREATE INDEX idx_activity_user ON activity_logs(user_email);
CREATE INDEX idx_activity_case ON activity_logs(case_id);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications(user_email);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default statuses
INSERT INTO status_master (status_category, status_name, status_order) VALUES
-- Candidate statuses
('candidate', 'Active', 1),
('candidate', 'Inactive', 2),
('candidate', 'Placed', 3),
('candidate', 'On Hold', 4),
('candidate', 'Rejected', 5),
-- Case statuses
('case', 'Created', 1),
('case', 'In Progress', 2),
('case', 'Pending Review', 3),
('case', 'Approved', 4),
('case', 'Closed', 5),
-- Form statuses
('form', 'Created', 1),
('form', 'Sent', 2),
('form', 'Opened', 3),
('form', 'Completed', 4),
('form', 'Expired', 5)
ON CONFLICT DO NOTHING;

-- Insert visa types
INSERT INTO visa_types (visa_type, visa_description) VALUES
('Citizen', 'US Citizen'),
('Green Card', 'Permanent Resident'),
('H1B', 'H1B Visa'),
('OPT', 'Optional Practical Training'),
('CPT', 'Curricular Practical Training'),
('TN', 'TN Visa'),
('E3', 'E3 Visa'),
('L1', 'L1 Visa'),
('H4 EAD', 'H4 with EAD')
ON CONFLICT DO NOTHING;

-- Insert engagement types
INSERT INTO engagement_types (engagement_type) VALUES
('W2'),
('C2C'),
('1099'),
('FTE'),
('Contract-to-Hire')
ON CONFLICT DO NOTHING;

-- Insert priorities
INSERT INTO priorities (priority_name, priority_level) VALUES
('Critical', 1),
('High', 2),
('Medium', 3),
('Low', 4)
ON CONFLICT DO NOTHING;

-- Insert default field library entries
INSERT INTO field_library (field_name, field_type, field_label, is_system_field, field_category, display_order) VALUES
('name', 'text', 'Full Name', true, 'personal', 1),
('email', 'email', 'Email Address', true, 'personal', 2),
('phone', 'tel', 'Phone Number', true, 'personal', 3),
('linkedin_url', 'url', 'LinkedIn Profile', false, 'personal', 4),
('current_location', 'text', 'Current Location', false, 'personal', 5),
('visa_status', 'select', 'Visa Status', true, 'professional', 6),
('years_experience', 'number', 'Years of Experience', false, 'professional', 7),
('skills', 'textarea', 'Technical Skills', false, 'professional', 8),
('availability', 'select', 'Availability', false, 'professional', 9),
('expected_salary', 'text', 'Expected Salary', false, 'professional', 10)
ON CONFLICT DO NOTHING;

-- Create default form template
INSERT INTO form_templates (name, description, fields, is_default, created_by) VALUES
(
    'Default Candidate Information Form',
    'Standard form for collecting candidate information',
    '[
        {"id": "name", "type": "text", "label": "Full Name", "required": true, "order": 1},
        {"id": "email", "type": "email", "label": "Email", "required": true, "order": 2},
        {"id": "phone", "type": "tel", "label": "Phone Number", "required": true, "order": 3},
        {"id": "linkedin_url", "type": "url", "label": "LinkedIn Profile", "required": false, "order": 4},
        {"id": "current_location", "type": "text", "label": "Current Location", "required": true, "order": 5},
        {"id": "visa_status", "type": "select", "label": "Visa Status", "required": true, "order": 6, 
         "options": ["Citizen", "Green Card", "H1B", "OPT", "Other"]},
        {"id": "years_experience", "type": "number", "label": "Years of Experience", "required": true, "order": 7},
        {"id": "skills", "type": "textarea", "label": "Technical Skills", "required": true, "order": 8},
        {"id": "availability", "type": "select", "label": "Availability", "required": true, "order": 9,
         "options": ["Immediate", "2 weeks", "1 month", "More than 1 month"]}
    ]'::jsonb,
    true,
    'system'
)
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Schema Phase 1.1 completed successfully!';
    RAISE NOTICE '📊 Tables created:';
    RAISE NOTICE '  - Reference tables: 7';
    RAISE NOTICE '  - User management: 2';
    RAISE NOTICE '  - Data collection: 2';
    RAISE NOTICE '  - Core entities: 3';
    RAISE NOTICE '  - Form management: 6';
    RAISE NOTICE '  - Documents: 2';
    RAISE NOTICE '  - Interviews: 2';
    RAISE NOTICE '  - Logging: 2';
    RAISE NOTICE '  - Total: 26 tables';
END $$;



-- Add to your schema
CREATE TABLE IF NOT EXISTS shortlist_buckets (
  id SERIAL PRIMARY KEY,
  bucket_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  requirement_id VARCHAR(50),
  jd_text TEXT,
  client_name VARCHAR(255),
  created_by VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bucket_candidates (
  id SERIAL PRIMARY KEY,
  bucket_id INTEGER REFERENCES shortlist_buckets(id),
  candidate_id INTEGER REFERENCES candidate(id),
  added_by VARCHAR(255),
  match_score FLOAT,
  match_reasons TEXT[],
  priority VARCHAR(20) DEFAULT 'normal',
  notes TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bucket_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS bucket_shares (
  id SERIAL PRIMARY KEY,
  bucket_id INTEGER REFERENCES shortlist_buckets(id),
  shared_with VARCHAR(255),
  shared_by VARCHAR(255),
  permissions VARCHAR(20) DEFAULT 'read',
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_submissions (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidate(id),
  vendor_id VARCHAR(50),
  bucket_id INTEGER REFERENCES shortlist_buckets(id),
  submitted_by VARCHAR(255),
  rate VARCHAR(50),
  status VARCHAR(50),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_bucket_active ON shortlist_buckets(is_active);
CREATE INDEX idx_bucket_expires ON shortlist_buckets(expires_at);
CREATE INDEX idx_bucket_candidates_bucket ON bucket_candidates(bucket_id);
CREATE INDEX idx_bucket_candidates_candidate ON bucket_candidates(candidate_id);


-- Update interviews table
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_code VARCHAR(50);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interviewer_names JSONB;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS final_decision VARCHAR(20);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2);

-- Update interview_feedback table  
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS problem_solving_rating INTEGER;
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS culture_fit_rating INTEGER;
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS strengths JSONB;
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS weaknesses JSONB;
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS hiring_decision VARCHAR(20);
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(255);
ALTER TABLE interview_feedback ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

-- Interview panel table
CREATE TABLE IF NOT EXISTS interview_panel (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER REFERENCES interviews(id),
  interviewer_email VARCHAR(255),
  role VARCHAR(50),
  has_submitted_feedback BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requirements table for JDs
CREATE TABLE IF NOT EXISTS requirements (
  id SERIAL PRIMARY KEY,
  requirement_code VARCHAR(50) UNIQUE,
  client_name VARCHAR(255),
  jd_text TEXT,
  required_skills TEXT[],
  nice_to_have_skills TEXT[],
  min_experience INTEGER,
  max_experience INTEGER,
  location VARCHAR(255),
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_date ON interviews(scheduled_date);
CREATE INDEX idx_feedback_interview ON interview_feedback(interview_id);

-- Interview questions table
CREATE TABLE IF NOT EXISTS interview_questions (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(id),
  requirement_id INTEGER,
  question TEXT NOT NULL,
  category VARCHAR(50),
  difficulty VARCHAR(20),
  follow_up TEXT,
  expected_answer TEXT,
  red_flags TEXT,
  estimated_time INTEGER DEFAULT 5,
  interview_round INTEGER DEFAULT 1,
  generated_for VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_candidate ON interview_questions(candidate_id);
CREATE INDEX idx_questions_category ON interview_questions(category);
-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tier VARCHAR(20), -- premium, standard, basic
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  industry VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor submissions
CREATE TABLE IF NOT EXISTS vendor_submissions (
  id SERIAL PRIMARY KEY,
  submission_id VARCHAR(50) UNIQUE,
  candidate_id INTEGER REFERENCES candidates(id),
  vendor_id INTEGER REFERENCES vendors(id),
  requirement_id INTEGER,
  status VARCHAR(50),
  rate_card JSONB,
  available_from DATE,
  notes TEXT,
  submitted_by VARCHAR(255),
  submitted_at TIMESTAMP,
  last_updated TIMESTAMP
);

-- Client submissions
CREATE TABLE IF NOT EXISTS client_submissions (
  id SERIAL PRIMARY KEY,
  submission_id VARCHAR(50) UNIQUE,
  candidate_id INTEGER REFERENCES candidates(id),
  client_id INTEGER REFERENCES clients(id),
  vendor_submission_id INTEGER REFERENCES vendor_submissions(id),
  requirement_id INTEGER,
  status VARCHAR(50),
  bill_rate DECIMAL(10,2),
  proposed_start_date DATE,
  end_client VARCHAR(255),
  location VARCHAR(255),
  notes TEXT,
  submitted_by VARCHAR(255),
  submitted_at TIMESTAMP
);

-- Placement offers
CREATE TABLE IF NOT EXISTS placement_offers (
  id SERIAL PRIMARY KEY,
  offer_id VARCHAR(50) UNIQUE,
  candidate_id INTEGER REFERENCES candidates(id),
  client_submission_id INTEGER REFERENCES client_submissions(id),
  offer_amount DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  location VARCHAR(255),
  position_title VARCHAR(255),
  terms JSONB,
  status VARCHAR(50),
  response_date TIMESTAMP,
  response_details JSONB,
  created_by VARCHAR(255),
  responded_by VARCHAR(255),
  created_at TIMESTAMP
);

-- Final placements
CREATE TABLE IF NOT EXISTS placements (
  id SERIAL PRIMARY KEY,
  placement_id VARCHAR(50) UNIQUE,
  candidate_id INTEGER REFERENCES candidates(id),
  client_id INTEGER REFERENCES clients(id),
  vendor_id INTEGER REFERENCES vendors(id),
  offer_id INTEGER REFERENCES placement_offers(id),
  start_date DATE,
  end_date DATE,
  bill_rate DECIMAL(10,2),
  pay_rate DECIMAL(10,2),
  position_title VARCHAR(255),
  location VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP
);

-- Status history tracking
CREATE TABLE IF NOT EXISTS submission_status_history (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER,
  submission_type VARCHAR(20), -- vendor or client
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  changed_at TIMESTAMP
);

-- Placement activities log
CREATE TABLE IF NOT EXISTS placement_activities (
  id SERIAL PRIMARY KEY,
  activity_type VARCHAR(50),
  candidate_id INTEGER,
  vendor_id INTEGER,
  client_id INTEGER,
  submission_id INTEGER,
  performed_by VARCHAR(255),
  details TEXT,
  created_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_vendor_subs_candidate ON vendor_submissions(candidate_id);
CREATE INDEX idx_vendor_subs_vendor ON vendor_submissions(vendor_id);
CREATE INDEX idx_client_subs_candidate ON client_submissions(candidate_id);
CREATE INDEX idx_client_subs_client ON client_submissions(client_id);
CREATE INDEX idx_offers_candidate ON placement_offers(candidate_id);
CREATE INDEX idx_placements_candidate ON placements(candidate_id);

-- Search indexing logs table
CREATE TABLE IF NOT EXISTS search_index_logs (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(50),
  candidate_id INTEGER,
  details JSONB,
  indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_logs_candidate ON search_index_logs(candidate_id);
CREATE INDEX idx_search_logs_operation ON search_index_logs(operation);
CREATE INDEX idx_search_logs_date ON search_index_logs(indexed_at);