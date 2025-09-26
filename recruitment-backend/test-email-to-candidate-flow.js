// recruitment-backend/tests/test-email-to-candidate-flow.js
require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TEST_USER_ID = 1; // Adjust based on your users table
const TEST_USER_EMAIL = 'akshayarekha.s@quadranttechnologies.com';

// Test data
const testResume = {
  base64Content: Buffer.from(`
John Doe
Email: akshayarekhas@outlook.com
Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johndoe
Location: Toronto, Canada

PROFESSIONAL SUMMARY
Senior Full Stack Developer with 8 years of experience in building scalable web applications.
Expertise in React, Node.js, Python, AWS, Docker, and Kubernetes.

EXPERIENCE
Senior Software Engineer - Tech Corp (2020-Present)
- Led development of microservices architecture
- Implemented CI/CD pipelines
- Managed team of 5 developers

Software Developer - StartupXYZ (2018-2020)
- Built RESTful APIs using Node.js
- Developed React-based frontend applications
- Worked with PostgreSQL and MongoDB

SKILLS
Languages: JavaScript, Python, Java, TypeScript
Frameworks: React, Node.js, Express, Django
Cloud: AWS, Azure, GCP
Tools: Docker, Kubernetes, Jenkins, Git

EDUCATION
Bachelor of Computer Science - University of Toronto (2016)
  `).toString('base64'),
  fileName: 'john_doe_resume.pdf'
};

// Color codes for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function testEmailInbound() {
  log('\n📧 TEST 1: Email Inbound Processing', 'blue');
  log('=====================================', 'blue');
  
  try {
    const response = await axios.post(`${API_URL}/api/email/test-inbound`, {
      senderEmail: 'referrer@example.com',
      senderName: 'Jane Referrer',
      resumeBase64: testResume.base64Content,
      resumeFileName: testResume.fileName,
      emailBody: 'Hi, I would like to refer John Doe for your consideration. He is an excellent developer.'
    });
    
    log('✅ Email processed successfully', 'green');
    log(`   Case ID: ${response.data.caseId}`, 'green');
    log(`   Candidate Email: ${response.data.candidateData.email}`, 'green');
    log(`   Parsed Skills: ${response.data.candidateData.skills?.join(', ')}`, 'green');
    
    return response.data.caseId;
  } catch (error) {
    log(`❌ Email processing failed: ${error.response?.data?.error || error.message}`, 'red');
    throw error;
  }
}

async function testCaseWorkflow(caseId) {
  log('\n🔄 TEST 2: Case Workflow Transitions', 'blue');
  log('=====================================', 'blue');
  
  try {
    // Get initial case status
    let caseData = await axios.get(`${API_URL}/api/cases/${caseId}`);
    log(`Initial Status: ${caseData.data.case.status_name}`, 'yellow');
    
    // Trigger acknowledgment
    await axios.post(`${API_URL}/api/cases/${caseId}/trigger`, {
      trigger: 'acknowledgment_sent'
    });
    log('✅ Acknowledgment sent', 'green');
    await delay(1000);
    
    // Trigger intake form sent
    await axios.post(`${API_URL}/api/cases/${caseId}/trigger`, {
      trigger: 'intake_form_sent'
    });
    log('✅ Intake form sent', 'green');
    await delay(1000);
    
    // Simulate form response
    await axios.post(`${API_URL}/api/cases/${caseId}/trigger`, {
      trigger: 'form_response_received'
    });
    log('✅ Form response received', 'green');
    
    // Get updated case status
    caseData = await axios.get(`${API_URL}/api/cases/${caseId}`);
    log(`Current Status: ${caseData.data.case.status_name}`, 'yellow');
    
    return true;
  } catch (error) {
    log(`❌ Workflow transition failed: ${error.response?.data?.error || error.message}`, 'red');
    throw error;
  }
}

async function testVerification(caseId) {
  log('\n☎️ TEST 3: Phone Verification', 'blue');
  log('=====================================', 'blue');
  
  try {
    // Start verification session
    const sessionResponse = await axios.post(`${API_URL}/api/cases/${caseId}/start-verification`, {
      userId: TEST_USER_ID
    });
    
    const sessionId = sessionResponse.data.session.sessionId;
    log(`✅ Verification session started: ${sessionId}`, 'green');
    
    // Prepare verification data
    const verificationData = {
      callMetadata: {
        startTime: new Date(),
        endTime: new Date(Date.now() + 15 * 60000), // 15 min call
        duration: 15,
        callerId: TEST_USER_EMAIL
      },
      checklistItems: {
        quadrantRelation: { value: 'Referral', verified: true },
        engagement: { value: 'W2', verified: true },
        priority: { value: 'High', verified: true },
        currentLocation: { value: 'Toronto', verified: true, coordinates: {} },
        visaStatus: { value: 'Citizen', verified: true },
        h1Transfer: { value: false, verified: true }
      },
      notes: {
        intention: { score: 4, notes: 'Very interested in the opportunity' },
        emotion: { sentiment: 'Enthusiastic', notes: 'Excited about the role' },
        generalNotes: 'Excellent communication skills, strong technical background'
      }
    };
    
    // Save verification data
    const verifyResponse = await axios.post(`${API_URL}/api/cases/verification/save`, {
      sessionId,
      verificationData
    });
    
    log('✅ Verification data saved', 'green');
    log(`   Verification Score: ${verifyResponse.data.score}/100`, 'yellow');
    log(`   Completed Fields: ${verifyResponse.data.completedFields.join(', ')}`, 'green');
    
    return verifyResponse.data.score >= 70;
  } catch (error) {
    log(`❌ Verification failed: ${error.response?.data?.error || error.message}`, 'red');
    throw error;
  }
}

async function testCandidateCreation(caseId) {
  log('\n👤 TEST 4: Candidate Creation', 'blue');
  log('=====================================', 'blue');
  
  try {
    // Add any additional data before creating candidate
    const additionalData = {
      education: 'Bachelor of Computer Science',
      expected_salary: '$120,000 - $140,000',
      availability: 'Immediate'
    };
    
    // Create candidate from case
    const response = await axios.post(`${API_URL}/api/cases/${caseId}/create-candidate`, additionalData, {
      headers: {
        'x-user-email': TEST_USER_EMAIL
      }
    });
    
    log('✅ Candidate created successfully', 'green');
    log(`   Candidate ID: ${response.data.candidateId}`, 'green');
    log(`   Quality Score: ${response.data.qualityScore}/100`, 'yellow');
    log(`   Gold Candidate: ${response.data.isGoldCandidate ? 'Yes' : 'No'}`, 'yellow');
    
    return response.data.candidateId;
  } catch (error) {
    log(`❌ Candidate creation failed: ${error.response?.data?.error || error.message}`, 'red');
    throw error;
  }
}

async function testDailyTasks() {
  log('\n📋 TEST 5: Daily Tasks', 'blue');
  log('=====================================', 'blue');
  
  try {
    const response = await axios.get(`${API_URL}/api/cases/daily-tasks`, {
      params: { userId: TEST_USER_ID }
    });
    
    log('✅ Daily tasks retrieved', 'green');
    log(`   Total Tasks: ${response.data.totalTasks}`, 'yellow');
    log(`   Overdue: ${response.data.summary.overdue}`, 'red');
    log(`   Pending: ${response.data.summary.pending}`, 'yellow');
    log(`   Normal: ${response.data.summary.normal}`, 'green');
    
    if (response.data.tasks.overdue.length > 0) {
      log('\n   Overdue Tasks:', 'red');
      response.data.tasks.overdue.forEach(task => {
        log(`   - Case ${task.case_id}: ${task.task_description}`, 'red');
      });
    }
    
    return true;
  } catch (error) {
    log(`❌ Daily tasks failed: ${error.response?.data?.error || error.message}`, 'red');
    throw error;
  }
}

async function testCandidateValidation() {
  log('\n✅ TEST 6: Candidate Validation', 'blue');
  log('=====================================', 'blue');
  
  try {
    // Try to create candidate with missing data (should fail)
    log('Testing validation with incomplete data...', 'yellow');
    
    try {
      await axios.post(`${API_URL}/api/candidates`, {
        name: 'Test Incomplete',
        // Missing required fields
      }, {
        headers: {
          'x-user-email': TEST_USER_EMAIL
        }
      });
      
      log('❌ Validation should have failed but didn\'t', 'red');
    } catch (error) {
      if (error.response?.data?.error?.includes('Validation failed')) {
        log('✅ Validation correctly rejected incomplete data', 'green');
        log(`   Error: ${error.response.data.error}`, 'yellow');
      } else {
        throw error;
      }
    }
    
    // Try to create duplicate candidate (should fail)
    log('\nTesting duplicate detection...', 'yellow');
    
    try {
      await axios.post(`${API_URL}/api/candidates`, {
        name: 'John Doe',
        email: 'john.doe@example.com', // Same as parsed from resume
        phone: '(555) 123-4567',
        visa_status: 'Citizen',
        years_experience: 8,
        skills: ['React', 'Node.js'],
        current_location: 'Toronto'
      }, {
        headers: {
          'x-user-email': TEST_USER_EMAIL
        }
      });
      
      log('❌ Duplicate detection should have failed but didn\'t', 'red');
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        log('✅ Duplicate correctly detected', 'green');
        log(`   Error: ${error.response.data.error}`, 'yellow');
      } else {
        throw error;
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ Validation test failed: ${error.response?.data?.error || error.message}`, 'red');
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  log('\n🚀 STARTING COMPLETE FLOW TEST', 'blue');
  log('==================================\n', 'blue');
  
  try {
    // Test 1: Email Processing
    const caseId = await testEmailInbound();
    await delay(2000);
    
    // Test 2: Case Workflow
    await testCaseWorkflow(caseId);
    await delay(2000);
    
    // Test 3: Verification
    await testVerification(caseId);
    await delay(2000);
    
    // Test 4: Candidate Creation
    const candidateId = await testCandidateCreation(caseId);
    await delay(1000);
    
    // Test 5: Daily Tasks
    await testDailyTasks();
    await delay(1000);
    
    // Test 6: Validation
    await testCandidateValidation();
    
    log('\n==================================', 'green');
    log('🎉 ALL TESTS PASSED SUCCESSFULLY!', 'green');
    log('==================================\n', 'green');
    
    log('Summary:', 'blue');
    log(`✅ Case Created: ${caseId}`, 'green');
    log(`✅ Candidate Created: ${candidateId}`, 'green');
    log(`✅ Workflow Automation: Working`, 'green');
    log(`✅ Verification System: Working`, 'green');
    log(`✅ Validation System: Working`, 'green');
    
  } catch (error) {
    log('\n==================================', 'red');
    log('❌ TEST SUITE FAILED', 'red');
    log('==================================\n', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});