#!/bin/bash
# create-complete-candidates.sh
# Creates 20 candidates with ALL fields populated for proper semantic search

echo "🚀 Creating 20 complete candidates with all fields..."
echo "================================================"

# 1. Senior DevOps Engineer - Toronto
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Michael Chen",
    "email": "michael.chen@email.com",
    "phone": "416-555-0101",
    "jobTitle": "Senior DevOps Engineer",
    "current_location": "Toronto",
    "visa_status": "Citizen",
    "years_experience": "10",
    "experienceLevel": "Senior",
    "skills": "Kubernetes, Docker, Terraform, Jenkins, AWS, Azure, Python, Bash, Ansible, Prometheus",
    "education": "Bachelor in Computer Science",
    "current_employer": "Tech Solutions Inc",
    "currentRole": "Lead DevOps Engineer",
    "availability": "2 weeks",
    "expected_salary": "140000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "AWS Certified Solutions Architect, Kubernetes Administrator",
    "preferredLocations": "Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/michaelchen",
    "source": "Direct Application",
    "tags": "senior, devops, kubernetes, available-soon",
    "recruiterNotes": "Strong candidate with excellent DevOps experience. Has led multiple cloud migrations.",
    "notes": "Michael Chen is a Senior DevOps Engineer with 10 years of experience specializing in Kubernetes and cloud infrastructure. Currently working as Lead DevOps Engineer at Tech Solutions Inc in Toronto. Expert in Kubernetes, Docker, Terraform, AWS, and Azure. Looking for senior DevOps positions. Available in 2 weeks. Open to remote work but prefers to stay in Toronto. Canadian citizen with no visa requirements."
  }'
echo "✓ Created: Michael Chen - Senior DevOps Engineer"

# 2. Junior React Developer - Vancouver
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Emily Zhang",
    "email": "emily.zhang@email.com",
    "phone": "604-555-0102",
    "jobTitle": "Junior Frontend Developer",
    "current_location": "Vancouver",
    "visa_status": "PR",
    "years_experience": "2",
    "experienceLevel": "Junior",
    "skills": "React, JavaScript, TypeScript, CSS, HTML, Redux, Next.js, Tailwind CSS",
    "education": "Diploma in Web Development",
    "current_employer": "StartUp Tech",
    "currentRole": "Frontend Developer",
    "availability": "Immediate",
    "expected_salary": "70000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "React Developer Certification",
    "preferredLocations": "Vancouver, Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/emilyzhang",
    "source": "Referral",
    "tags": "junior, react, frontend, immediate",
    "recruiterNotes": "Eager to learn, strong React skills for junior level",
    "notes": "Emily Zhang is a Junior Frontend Developer with 2 years of experience. Currently working at StartUp Tech in Vancouver. Specializes in React, JavaScript, and modern frontend technologies. Looking for junior to mid-level frontend positions. Available immediately. Open to remote work and willing to relocate. Permanent resident of Canada."
  }'
echo "✓ Created: Emily Zhang - Junior Frontend Developer"

# 3. Senior Full Stack Developer - Toronto
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "David Kumar",
    "email": "david.kumar@email.com",
    "phone": "416-555-0103",
    "jobTitle": "Senior Full Stack Developer",
    "current_location": "Toronto",
    "visa_status": "Citizen",
    "years_experience": "8",
    "experienceLevel": "Senior",
    "skills": "React, Node.js, Python, Django, PostgreSQL, MongoDB, AWS, Docker, GraphQL",
    "education": "Master in Computer Science",
    "current_employer": "Financial Corp",
    "currentRole": "Senior Developer",
    "availability": "1 month",
    "expected_salary": "130000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "AWS Certified Developer",
    "preferredLocations": "Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/davidkumar",
    "source": "LinkedIn",
    "tags": "senior, fullstack, react, node, python",
    "recruiterNotes": "Excellent full stack developer with fintech experience",
    "notes": "David Kumar is a Senior Full Stack Developer with 8 years of experience. Expert in React, Node.js, Python, and cloud technologies. Currently at Financial Corp in Toronto. Looking for senior full stack positions. Available in 1 month. Canadian citizen, open to remote."
  }'
echo "✓ Created: David Kumar - Senior Full Stack Developer"

# 4. Mid-level Data Scientist - Montreal
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Sophie Tremblay",
    "email": "sophie.tremblay@email.com",
    "phone": "514-555-0104",
    "jobTitle": "Data Scientist",
    "current_location": "Montreal",
    "visa_status": "Citizen",
    "years_experience": "5",
    "experienceLevel": "Mid-level",
    "skills": "Python, TensorFlow, PyTorch, SQL, Spark, Tableau, Machine Learning, Deep Learning",
    "education": "Master in Data Science",
    "current_employer": "AI Research Lab",
    "currentRole": "Data Scientist",
    "availability": "3 weeks",
    "expected_salary": "110000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "Google Cloud ML Engineer",
    "preferredLocations": "Montreal, Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/sophietremblay",
    "source": "Direct Application",
    "tags": "mid-level, data-science, python, ml",
    "recruiterNotes": "Strong ML background, published research papers",
    "notes": "Sophie Tremblay is a Data Scientist with 5 years of experience in machine learning and deep learning. Currently at AI Research Lab in Montreal. Expert in Python, TensorFlow, and data analysis. Available in 3 weeks. Canadian citizen, open to remote and relocation."
  }'
echo "✓ Created: Sophie Tremblay - Data Scientist"

# 5. Senior Java Backend Developer - Ottawa
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Robert Wilson",
    "email": "robert.wilson@email.com",
    "phone": "613-555-0105",
    "jobTitle": "Senior Backend Developer",
    "current_location": "Ottawa",
    "visa_status": "Citizen",
    "years_experience": "12",
    "experienceLevel": "Senior",
    "skills": "Java, Spring Boot, Microservices, Kafka, Redis, PostgreSQL, AWS, Docker, Kubernetes",
    "education": "Bachelor in Software Engineering",
    "current_employer": "Government Services",
    "currentRole": "Technical Lead",
    "availability": "1 month",
    "expected_salary": "135000",
    "openToRemote": false,
    "willingToRelocate": false,
    "certifications": "Oracle Java Certified Professional",
    "preferredLocations": "Ottawa",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/robertwilson",
    "source": "Referral",
    "tags": "senior, java, backend, microservices",
    "recruiterNotes": "Government clearance, strong Java expertise",
    "notes": "Robert Wilson is a Senior Backend Developer with 12 years of experience. Technical Lead at Government Services in Ottawa. Expert in Java, Spring Boot, and microservices. Available in 1 month. Canadian citizen, prefers Ottawa location only."
  }'
echo "✓ Created: Robert Wilson - Senior Backend Developer"

# 6. Junior Python Developer - Calgary
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Ahmed Hassan",
    "email": "ahmed.hassan@email.com",
    "phone": "403-555-0106",
    "jobTitle": "Junior Python Developer",
    "current_location": "Calgary",
    "visa_status": "Work Permit",
    "years_experience": "1",
    "experienceLevel": "Junior",
    "skills": "Python, Django, Flask, PostgreSQL, Git, Linux, REST APIs",
    "education": "Bachelor in Computer Science",
    "current_employer": "Tech Startup",
    "currentRole": "Junior Developer",
    "availability": "2 weeks",
    "expected_salary": "65000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "Python Institute PCEP",
    "preferredLocations": "Calgary, Toronto, Vancouver, Remote",
    "workAuthorization": "Work Permit",
    "linkedinUrl": "https://linkedin.com/in/ahmedhassan",
    "source": "Job Board",
    "tags": "junior, python, django, available-soon",
    "recruiterNotes": "New grad with internship experience, needs visa support",
    "notes": "Ahmed Hassan is a Junior Python Developer with 1 year of experience. Currently at Tech Startup in Calgary. Skilled in Python, Django, and Flask. Available in 2 weeks. On work permit, requires visa sponsorship. Open to remote and relocation."
  }'
echo "✓ Created: Ahmed Hassan - Junior Python Developer"

# 7. Senior Mobile Developer - Toronto
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Jennifer Park",
    "email": "jennifer.park@email.com",
    "phone": "416-555-0107",
    "jobTitle": "Senior Mobile Developer",
    "current_location": "Toronto",
    "visa_status": "PR",
    "years_experience": "9",
    "experienceLevel": "Senior",
    "skills": "React Native, Swift, Kotlin, Flutter, iOS, Android, Firebase, GraphQL",
    "education": "Bachelor in Computer Engineering",
    "current_employer": "Mobile Solutions Inc",
    "currentRole": "Lead Mobile Developer",
    "availability": "Immediate",
    "expected_salary": "125000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "Google Android Developer, Apple iOS Developer",
    "preferredLocations": "Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/jenniferpark",
    "source": "LinkedIn",
    "tags": "senior, mobile, react-native, immediate",
    "recruiterNotes": "Published apps with 1M+ downloads",
    "notes": "Jennifer Park is a Senior Mobile Developer with 9 years of experience. Lead Mobile Developer at Mobile Solutions Inc in Toronto. Expert in React Native, Swift, and Kotlin. Available immediately. Permanent resident, open to remote."
  }'
echo "✓ Created: Jennifer Park - Senior Mobile Developer"

# 8. Mid-level Cloud Architect - Vancouver
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "James Martinez",
    "email": "james.martinez@email.com",
    "phone": "604-555-0108",
    "jobTitle": "Cloud Solutions Architect",
    "current_location": "Vancouver",
    "visa_status": "Citizen",
    "years_experience": "6",
    "experienceLevel": "Mid-level",
    "skills": "AWS, Azure, Terraform, CloudFormation, Python, Go, Kubernetes, Docker",
    "education": "Bachelor in Computer Science",
    "current_employer": "Cloud Consulting Group",
    "currentRole": "Cloud Architect",
    "availability": "1 month",
    "expected_salary": "120000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "AWS Solutions Architect Professional, Azure Solutions Architect",
    "preferredLocations": "Vancouver, Seattle, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/jamesmartinez",
    "source": "Referral",
    "tags": "mid-level, cloud, aws, azure, architect",
    "recruiterNotes": "Multi-cloud expertise, consulting background",
    "notes": "James Martinez is a Cloud Solutions Architect with 6 years of experience. Currently at Cloud Consulting Group in Vancouver. Expert in AWS, Azure, and infrastructure as code. Available in 1 month. Canadian citizen, open to remote and relocation."
  }'
echo "✓ Created: James Martinez - Cloud Solutions Architect"

# 9. Senior Angular Developer - Mississauga
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Maria Rodriguez",
    "email": "maria.rodriguez@email.com",
    "phone": "905-555-0109",
    "jobTitle": "Senior Frontend Developer",
    "current_location": "Mississauga",
    "visa_status": "PR",
    "years_experience": "11",
    "experienceLevel": "Senior",
    "skills": "Angular, TypeScript, RxJS, NgRx, JavaScript, CSS, SASS, Jest, Cypress",
    "education": "Master in Software Engineering",
    "current_employer": "Enterprise Solutions",
    "currentRole": "Senior Angular Developer",
    "availability": "2 weeks",
    "expected_salary": "125000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "Angular Expert Certification",
    "preferredLocations": "Mississauga, Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/mariarodriguez",
    "source": "Direct Application",
    "tags": "senior, angular, frontend, available-soon",
    "recruiterNotes": "Angular expert, mentors junior developers",
    "notes": "Maria Rodriguez is a Senior Frontend Developer with 11 years of experience specializing in Angular. Senior Angular Developer at Enterprise Solutions in Mississauga. Expert in Angular, TypeScript, and modern frontend practices. Available in 2 weeks. Permanent resident, open to remote."
  }'
echo "✓ Created: Maria Rodriguez - Senior Frontend Developer"

# 10. Junior QA Engineer - Halifax
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Kevin Thompson",
    "email": "kevin.thompson@email.com",
    "phone": "902-555-0110",
    "jobTitle": "Junior QA Engineer",
    "current_location": "Halifax",
    "visa_status": "Citizen",
    "years_experience": "2",
    "experienceLevel": "Junior",
    "skills": "Selenium, Cypress, Postman, JIRA, Python, JavaScript, API Testing",
    "education": "Diploma in Software Testing",
    "current_employer": "QA Services Ltd",
    "currentRole": "QA Analyst",
    "availability": "Immediate",
    "expected_salary": "60000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "ISTQB Foundation Level",
    "preferredLocations": "Halifax, Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/kevinthompson",
    "source": "Job Board",
    "tags": "junior, qa, testing, immediate",
    "recruiterNotes": "Good automation skills for junior level",
    "notes": "Kevin Thompson is a Junior QA Engineer with 2 years of experience. QA Analyst at QA Services Ltd in Halifax. Skilled in Selenium, Cypress, and API testing. Available immediately. Canadian citizen, open to remote and relocation."
  }'
echo "✓ Created: Kevin Thompson - Junior QA Engineer"

# 11. Senior .NET Developer - Winnipeg
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Patricia Brown",
    "email": "patricia.brown@email.com",
    "phone": "204-555-0111",
    "jobTitle": "Senior .NET Developer",
    "current_location": "Winnipeg",
    "visa_status": "Citizen",
    "years_experience": "13",
    "experienceLevel": "Senior",
    "skills": "C#, .NET Core, ASP.NET, Azure, SQL Server, Entity Framework, Microservices",
    "education": "Bachelor in Computer Science",
    "current_employer": "Insurance Corp",
    "currentRole": "Technical Lead",
    "availability": "1 month",
    "expected_salary": "130000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "Microsoft Certified Azure Developer",
    "preferredLocations": "Winnipeg, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/patriciabrown",
    "source": "LinkedIn",
    "tags": "senior, dotnet, azure, technical-lead",
    "recruiterNotes": "Insurance domain expert, team lead experience",
    "notes": "Patricia Brown is a Senior .NET Developer with 13 years of experience. Technical Lead at Insurance Corp in Winnipeg. Expert in C#, .NET Core, and Azure. Available in 1 month. Canadian citizen, open to remote but prefers Winnipeg."
  }'
echo "✓ Created: Patricia Brown - Senior .NET Developer"

# 12. Mid-level UI/UX Designer Developer - Toronto
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Lisa Chen",
    "email": "lisa.chen@email.com",
    "phone": "416-555-0112",
    "jobTitle": "UI/UX Designer & Developer",
    "current_location": "Toronto",
    "visa_status": "PR",
    "years_experience": "4",
    "experienceLevel": "Mid-level",
    "skills": "Figma, React, Vue.js, CSS, JavaScript, Adobe XD, Sketch, Tailwind CSS",
    "education": "Bachelor in Design",
    "current_employer": "Design Studio",
    "currentRole": "UI/UX Developer",
    "availability": "3 weeks",
    "expected_salary": "95000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "Google UX Design Certificate",
    "preferredLocations": "Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/lisachen",
    "source": "Referral",
    "tags": "mid-level, ui-ux, design, react, frontend",
    "recruiterNotes": "Unique blend of design and development skills",
    "notes": "Lisa Chen is a UI/UX Designer & Developer with 4 years of experience. Currently at Design Studio in Toronto. Expert in both design tools and frontend development. Available in 3 weeks. Permanent resident, open to remote."
  }'
echo "✓ Created: Lisa Chen - UI/UX Designer & Developer"

# 13. Senior Blockchain Developer - Edmonton
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Daniel O'"'"'Brien",
    "email": "daniel.obrien@email.com",
    "phone": "780-555-0113",
    "jobTitle": "Senior Blockchain Developer",
    "current_location": "Edmonton",
    "visa_status": "Citizen",
    "years_experience": "7",
    "experienceLevel": "Senior",
    "skills": "Solidity, Web3.js, Ethereum, Smart Contracts, Node.js, React, Truffle, Hardhat",
    "education": "Master in Computer Science",
    "current_employer": "Crypto Solutions",
    "currentRole": "Blockchain Lead",
    "availability": "2 weeks",
    "expected_salary": "140000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "Certified Blockchain Developer",
    "preferredLocations": "Edmonton, Toronto, Vancouver, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/danielobrien",
    "source": "Direct Application",
    "tags": "senior, blockchain, web3, solidity",
    "recruiterNotes": "DeFi experience, launched successful NFT projects",
    "notes": "Daniel O'"'"'Brien is a Senior Blockchain Developer with 7 years of experience. Blockchain Lead at Crypto Solutions in Edmonton. Expert in Solidity, Web3, and smart contracts. Available in 2 weeks. Canadian citizen, open to remote and relocation."
  }'
echo "✓ Created: Daniel O'Brien - Senior Blockchain Developer"

# 14. Junior Data Analyst - Quebec City
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Nicolas Leblanc",
    "email": "nicolas.leblanc@email.com",
    "phone": "418-555-0114",
    "jobTitle": "Junior Data Analyst",
    "current_location": "Quebec City",
    "visa_status": "Citizen",
    "years_experience": "1",
    "experienceLevel": "Junior",
    "skills": "SQL, Python, Excel, Tableau, Power BI, R, Statistics",
    "education": "Bachelor in Statistics",
    "current_employer": "Analytics Firm",
    "currentRole": "Data Analyst",
    "availability": "Immediate",
    "expected_salary": "55000",
    "openToRemote": false,
    "willingToRelocate": false,
    "certifications": "Microsoft Data Analyst Associate",
    "preferredLocations": "Quebec City",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/nicolasleblanc",
    "source": "University Recruitment",
    "tags": "junior, data-analyst, sql, tableau, immediate",
    "recruiterNotes": "Recent grad, strong analytical skills, bilingual",
    "notes": "Nicolas Leblanc is a Junior Data Analyst with 1 year of experience. Data Analyst at Analytics Firm in Quebec City. Skilled in SQL, Python, and data visualization. Available immediately. Canadian citizen, prefers Quebec City only."
  }'
echo "✓ Created: Nicolas Leblanc - Junior Data Analyst"

# 15. Senior Security Engineer - Ottawa
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Sarah Johnson",
    "email": "sarah.johnson@email.com",
    "phone": "613-555-0115",
    "jobTitle": "Senior Security Engineer",
    "current_location": "Ottawa",
    "visa_status": "Citizen",
    "years_experience": "10",
    "experienceLevel": "Senior",
    "skills": "SIEM, Penetration Testing, Python, Bash, Metasploit, Burp Suite, AWS Security",
    "education": "Master in Cybersecurity",
    "current_employer": "Security Consultants",
    "currentRole": "Security Architect",
    "availability": "1 month",
    "expected_salary": "135000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "CISSP, CEH, AWS Security",
    "preferredLocations": "Ottawa, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/sarahjohnson",
    "source": "LinkedIn",
    "tags": "senior, security, cybersecurity, penetration-testing",
    "recruiterNotes": "Government clearance, incident response expert",
    "notes": "Sarah Johnson is a Senior Security Engineer with 10 years of experience. Security Architect at Security Consultants in Ottawa. Expert in penetration testing and cloud security. Available in 1 month. Canadian citizen with security clearance."
  }'
echo "✓ Created: Sarah Johnson - Senior Security Engineer"

# 16. Mid-level PHP Developer - London
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Thomas Anderson",
    "email": "thomas.anderson@email.com",
    "phone": "519-555-0116",
    "jobTitle": "PHP Developer",
    "current_location": "London",
    "visa_status": "PR",
    "years_experience": "5",
    "experienceLevel": "Mid-level",
    "skills": "PHP, Laravel, Symfony, MySQL, Redis, Docker, Vue.js, REST APIs",
    "education": "Diploma in Web Development",
    "current_employer": "Web Agency",
    "currentRole": "PHP Developer",
    "availability": "2 weeks",
    "expected_salary": "85000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "Zend PHP Certification",
    "preferredLocations": "London, Toronto, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/thomasanderson",
    "source": "Job Board",
    "tags": "mid-level, php, laravel, backend, available-soon",
    "recruiterNotes": "E-commerce platform experience",
    "notes": "Thomas Anderson is a PHP Developer with 5 years of experience. Currently at Web Agency in London, Ontario. Expert in PHP, Laravel, and modern web development. Available in 2 weeks. Permanent resident, open to remote and relocation."
  }'
echo "✓ Created: Thomas Anderson - PHP Developer"

# 17. Senior Machine Learning Engineer - Toronto
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Priya Patel",
    "email": "priya.patel@email.com",
    "phone": "416-555-0117",
    "jobTitle": "Senior Machine Learning Engineer",
    "current_location": "Toronto",
    "visa_status": "Work Permit",
    "years_experience": "8",
    "experienceLevel": "Senior",
    "skills": "Python, TensorFlow, PyTorch, Kubernetes, MLOps, Kubeflow, AWS SageMaker",
    "education": "PhD in Machine Learning",
    "current_employer": "AI Research Company",
    "currentRole": "ML Engineer Lead",
    "availability": "1 month",
    "expected_salary": "150000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "AWS Machine Learning Specialty",
    "preferredLocations": "Toronto, Remote",
    "workAuthorization": "Work Permit",
    "linkedinUrl": "https://linkedin.com/in/priyapatel",
    "source": "Referral",
    "tags": "senior, machine-learning, mlops, python, ai",
    "recruiterNotes": "Published ML papers, conference speaker, needs visa support",
    "notes": "Priya Patel is a Senior Machine Learning Engineer with 8 years of experience. ML Engineer Lead at AI Research Company in Toronto. Expert in deep learning and MLOps. Available in 1 month. On work permit, requires visa sponsorship."
  }'
echo "✓ Created: Priya Patel - Senior Machine Learning Engineer"

# 18. Junior Full Stack Developer - Saskatoon
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Ryan Williams",
    "email": "ryan.williams@email.com",
    "phone": "306-555-0118",
    "jobTitle": "Junior Full Stack Developer",
    "current_location": "Saskatoon",
    "visa_status": "Citizen",
    "years_experience": "2",
    "experienceLevel": "Junior",
    "skills": "JavaScript, React, Node.js, Express, MongoDB, PostgreSQL, Git",
    "education": "Bachelor in Computer Science",
    "current_employer": "Local Tech Company",
    "currentRole": "Junior Developer",
    "availability": "Immediate",
    "expected_salary": "65000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "Full Stack Web Development Certificate",
    "preferredLocations": "Saskatoon, Calgary, Vancouver, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/ryanwilliams",
    "source": "Direct Application",
    "tags": "junior, fullstack, javascript, immediate",
    "recruiterNotes": "Bootcamp grad with internship experience",
    "notes": "Ryan Williams is a Junior Full Stack Developer with 2 years of experience. Junior Developer at Local Tech Company in Saskatoon. Skilled in JavaScript, React, and Node.js. Available immediately. Canadian citizen, open to remote and relocation."
  }'
echo "✓ Created: Ryan Williams - Junior Full Stack Developer"

# 19. Senior Data Engineer - Calgary
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Amanda White",
    "email": "amanda.white@email.com",
    "phone": "403-555-0119",
    "jobTitle": "Senior Data Engineer",
    "current_location": "Calgary",
    "visa_status": "PR",
    "years_experience": "9",
    "experienceLevel": "Senior",
    "skills": "Apache Spark, Kafka, Airflow, Python, Scala, Databricks, Snowflake, AWS",
    "education": "Master in Data Engineering",
    "current_employer": "Energy Analytics Corp",
    "currentRole": "Lead Data Engineer",
    "availability": "3 weeks",
    "expected_salary": "135000",
    "openToRemote": true,
    "willingToRelocate": false,
    "certifications": "Databricks Certified Data Engineer",
    "preferredLocations": "Calgary, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/amandawhite",
    "source": "LinkedIn",
    "tags": "senior, data-engineer, spark, kafka, big-data",
    "recruiterNotes": "Oil & gas industry experience, big data expert",
    "notes": "Amanda White is a Senior Data Engineer with 9 years of experience. Lead Data Engineer at Energy Analytics Corp in Calgary. Expert in Apache Spark, Kafka, and big data technologies. Available in 3 weeks. Permanent resident, open to remote."
  }'
echo "✓ Created: Amanda White - Senior Data Engineer"

# 20. Mid-level Site Reliability Engineer - Victoria
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-email: admin@test.com" \
  -d '{
    "name": "Christopher Lee",
    "email": "christopher.lee@email.com",
    "phone": "250-555-0120",
    "jobTitle": "Site Reliability Engineer",
    "current_location": "Victoria",
    "visa_status": "Citizen",
    "years_experience": "6",
    "experienceLevel": "Mid-level",
    "skills": "Kubernetes, Prometheus, Grafana, Python, Go, Terraform, AWS, GCP",
    "education": "Bachelor in Computer Engineering",
    "current_employer": "SaaS Platform Inc",
    "currentRole": "SRE",
    "availability": "1 month",
    "expected_salary": "115000",
    "openToRemote": true,
    "willingToRelocate": true,
    "certifications": "Google Cloud Professional DevOps Engineer",
    "preferredLocations": "Victoria, Vancouver, Seattle, Remote",
    "workAuthorization": "Authorized",
    "linkedinUrl": "https://linkedin.com/in/christopherlee",
    "source": "Referral",
    "tags": "mid-level, sre, kubernetes, monitoring, devops",
    "recruiterNotes": "99.99% uptime achievement, on-call experience",
    "notes": "Christopher Lee is a Site Reliability Engineer with 6 years of experience. SRE at SaaS Platform Inc in Victoria. Expert in Kubernetes, monitoring, and reliability engineering. Available in 1 month. Canadian citizen, open to remote and relocation."
  }'
echo "✓ Created: Christopher Lee - Site Reliability Engineer"

echo ""
echo "================================================"
echo "✅ Successfully created 20 complete candidates!"
echo ""
echo "Now sync them to Azure Search:"
echo "curl -X POST http://localhost:5000/api/candidates/sync-search -H 'Content-Type: application/json' -H 'x-user-email: admin@test.com' -d '{\"syncAll\": true}'"