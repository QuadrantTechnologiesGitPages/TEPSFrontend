📁 /routes - Endpoint Layer Plan
✅ Keep & Enhance:

auth.routes.js - Good as is, handles OAuth perfectly
search/searchRoutes.js - Excellent for candidate search, ready for recruitment flow
formTemplate.routes.js - Good foundation for intake forms
response.routes.js - Working well for form submissions

🔧 Need Major Enhancement:

candidate.routes.js

ADD: /api/candidates/verify-phone endpoint for verification data
ADD: /api/candidates/from-email endpoint for email-based creation
ADD: Quality validation before creation
MODIFY: Create candidate should check all required fields


form.routes.js

INTEGRATE: With case workflow (auto-trigger on case creation)
ADD: Bulk form sending for multiple candidates



🆕 New Routes Needed:

case.routes.js - Complete case management endpoints
email.routes.js - Webhook endpoint for receiving emails
interview.routes.js - Interview scheduling and feedback

❌ Deprecate:

webhook.routes.js - Merge relevant parts into new email.routes.js


📁 /services - Business Logic Layer Plan
✅ Keep As Is:

oauthService.js - Perfect for authentication
search/searchService.js - Great for Azure Search operations
search/intelligentSearch.js - Excellent JD matching

🔧 Need Enhancement:

candidateService.js

ADD: createFromEmail() method
ADD: validateCompleteness() method
ADD: calculateGoldStatus() method
INTEGRATE: With case workflow engine


emailService.js

TRANSFORM: From mailto to actual email sending
ADD: SendGrid/SMTP integration
ADD: Template management for acknowledgments


responseService.js

INTEGRATE: Auto-trigger case status updates
ADD: Parse responses to update primary_data/secondary_data


formTemplateService.js

ADD: Intake form specific template
ADD: Progressive form fields based on case stage



🆕 New Services Needed:

caseService.js - Case lifecycle management
workflowEngine.js - Status automation engine
verificationService.js - Phone verification handling
resumeParserService.js - Extract data from resumes
shortlistService.js - Candidate bucketing for placement

⚠️ Needs Activation:

communicationService.js

CONFIGURE: Twilio credentials for SMS/WhatsApp
ACTIVATE: Email sending (not just mailto)
ADD: Bulk communication methods



❌ Not Needed Yet:

search/resumeProcessor.js - Replace with better parser
candidateSearchSync.js - Merge into candidateService


📁 /data & /utils - Data Layer Plan
✅ Working Well:

database.js - PostgreSQL connection is solid
create-postgres-schema.sql - Schema is comprehensive

🔧 Enhancement Needed:

/repositories/candidate.repository.js (Empty file)

IMPLEMENT: Separate data access layer
ADD: Complex queries for case management
ADD: Verification data storage methods



🆕 New Utilities Needed:

/utils/statusMachine.js - Define status transitions
/utils/validators.js - Field validation rules
/utils/resumeParser.js - Resume parsing utility


📁 /utils/azure - Azure Integration Plan
✅ Keep:

All Azure Search configurations working well
Index schema is good

🔧 Enhance:

Add more semantic configurations for better matching

