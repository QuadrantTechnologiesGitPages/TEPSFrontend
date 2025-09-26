// recruitment-backend/services/aiQuestionService.js
const OpenAI = require('openai');
const db = require('../data/database');

class AIQuestionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.questionCategories = {
      technical: 'Technical Skills Assessment',
      behavioral: 'Behavioral & Situational',
      experience: 'Experience & Past Projects',
      cultural: 'Culture Fit & Team Dynamics',
      problemSolving: 'Problem Solving & Analytical'
    };
  }

  /**
   * Generate interview questions based on candidate and JD
   */
  async generateQuestions(params) {
    try {
      const {
        candidateId,
        jdText,
        requirementId,
        interviewRound = 1,
        interviewerRole = 'technical',
        questionCount = 10,
        difficulty = 'medium'
      } = params;

      // Get candidate details
      const candidate = await this.getCandidateDetails(candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Get previous interview history if any
      const previousQuestions = await this.getPreviousQuestions(candidateId);

      // Build the context for GPT
      const context = this.buildContext({
        candidate,
        jdText,
        interviewRound,
        interviewerRole,
        previousQuestions,
        difficulty
      });

      // Generate questions using GPT-4
      const questions = await this.callOpenAI(context, questionCount);

      // Store questions in database
      const storedQuestions = await this.storeQuestions({
        candidateId,
        requirementId,
        questions,
        interviewRound,
        generatedFor: interviewerRole
      });

      return {
        success: true,
        candidateName: candidate.name,
        experience: candidate.experience,
        questions: storedQuestions,
        categories: this.categorizeQuestions(storedQuestions)
      };

    } catch (error) {
      console.error('Error generating questions:', error);
      throw error;
    }
  }

  /**
   * Build context for GPT from candidate and JD
   */
  buildContext(params) {
    const {
      candidate,
      jdText,
      interviewRound,
      interviewerRole,
      previousQuestions,
      difficulty
    } = params;

    let context = `You are an expert interviewer helping to assess a candidate.

CANDIDATE PROFILE:
- Name: ${candidate.name}
- Experience: ${candidate.experience || 'Not specified'} years
- Current Role: ${candidate.current_role || 'Not specified'}
- Skills: ${candidate.skills ? candidate.skills.join(', ') : 'Not specified'}
- Education: ${candidate.education || 'Not specified'}
- Key Achievements: ${candidate.achievements || 'Not specified'}

JOB REQUIREMENTS:
${jdText || 'General technical position'}

INTERVIEW CONTEXT:
- Round: ${interviewRound} ${interviewRound === 1 ? '(Screening)' : interviewRound === 2 ? '(Technical)' : '(Final)'}
- Interviewer Type: ${interviewerRole}
- Difficulty Level: ${difficulty}
`;

    if (previousQuestions && previousQuestions.length > 0) {
      context += `\nPREVIOUSLY ASKED (avoid repeating these):
${previousQuestions.map(q => `- ${q.question}`).join('\n')}`;
    }

    return context;
  }

  /**
   * Call OpenAI to generate questions
   */
  async callOpenAI(context, questionCount) {
    const prompt = `${context}

Generate ${questionCount} interview questions that are:
1. Specific to the candidate's experience level
2. Relevant to the JD requirements
3. Mix of different types (technical, behavioral, situational)
4. Include follow-up probes for each question
5. Provide expected answer guidelines

Format as JSON array with structure:
{
  "question": "The main question",
  "category": "technical|behavioral|experience|cultural|problemSolving",
  "difficulty": "easy|medium|hard",
  "followUp": "Follow-up probe question",
  "expectedAnswer": "Key points to look for in the answer",
  "redFlags": "Warning signs in responses",
  "time": "Estimated minutes needed"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert technical interviewer." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.questions || result;

    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fallback to template questions if API fails
      return this.getFallbackQuestions(questionCount);
    }
  }

  /**
   * Get candidate details from database
   */
  async getCandidateDetails(candidateId) {
    const query = `
      SELECT 
        c.*,
        cd.skills,
        cd.education,
        cd.experience_years as experience,
        cd.current_company,
        cd.current_role
      FROM candidates c
      LEFT JOIN candidate_details cd ON c.id = cd.candidate_id
      WHERE c.id = $1
    `;
    
    const result = await db.query(query, [candidateId]);
    return result.rows[0];
  }

  /**
   * Get previously asked questions for this candidate
   */
  async getPreviousQuestions(candidateId) {
    const query = `
      SELECT question, category
      FROM interview_questions
      WHERE candidate_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const result = await db.query(query, [candidateId]);
    return result.rows;
  }

  /**
   * Store generated questions in database
   */
  async storeQuestions(params) {
    const { candidateId, requirementId, questions, interviewRound, generatedFor } = params;
    const storedQuestions = [];

    for (const q of questions) {
      const query = `
        INSERT INTO interview_questions (
          candidate_id, requirement_id, question, category,
          difficulty, follow_up, expected_answer, red_flags,
          estimated_time, interview_round, generated_for,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *
      `;
      
      const values = [
        candidateId,
        requirementId,
        q.question,
        q.category,
        q.difficulty,
        q.followUp,
        q.expectedAnswer,
        q.redFlags,
        q.time || 5,
        interviewRound,
        generatedFor
      ];
      
      const result = await db.query(query, values);
      storedQuestions.push(result.rows[0]);
    }

    return storedQuestions;
  }

  /**
   * Categorize questions by type
   */
  categorizeQuestions(questions) {
    const categorized = {};
    
    for (const q of questions) {
      if (!categorized[q.category]) {
        categorized[q.category] = [];
      }
      categorized[q.category].push(q);
    }
    
    return categorized;
  }

  /**
   * Get suggested questions for specific skill
   */
  async getSkillBasedQuestions(skill, level = 'medium', count = 5) {
    const prompt = `Generate ${count} interview questions specifically for assessing ${skill} skills at ${level} level.
    
Format each question with:
- Main question
- What to look for in the answer
- Follow-up probe
- Red flags to watch for`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a technical interviewer." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return this.parseQuestionResponse(response.choices[0].message.content);

    } catch (error) {
      console.error('Error generating skill questions:', error);
      return this.getSkillTemplateQuestions(skill, level, count);
    }
  }

  /**
   * Fallback template questions if AI fails
   */
  getFallbackQuestions(count) {
    const templates = [
      {
        question: "Tell me about a challenging project you've worked on recently.",
        category: "experience",
        difficulty: "medium",
        followUp: "What was your specific role and contribution?",
        expectedAnswer: "Clear problem description, approach taken, outcome achieved",
        redFlags: "Vague details, no specific contribution, blaming others",
        time: 5
      },
      {
        question: "How do you approach debugging a complex issue?",
        category: "problemSolving",
        difficulty: "medium",
        followUp: "Can you give a specific example?",
        expectedAnswer: "Systematic approach, tools used, root cause analysis",
        redFlags: "No clear methodology, gives up easily",
        time: 5
      },
      {
        question: "Describe a time you had to work with a difficult team member.",
        category: "behavioral",
        difficulty: "medium",
        followUp: "How did you resolve the situation?",
        expectedAnswer: "Professional approach, communication, positive outcome",
        redFlags: "Blame-focused, no resolution, unprofessional",
        time: 5
      },
      {
        question: "What interests you most about this role?",
        category: "cultural",
        difficulty: "easy",
        followUp: "How does this align with your career goals?",
        expectedAnswer: "Genuine interest, research about company, career alignment",
        redFlags: "Generic answer, no research, only interested in benefits",
        time: 3
      },
      {
        question: "Walk me through your approach to learning a new technology.",
        category: "technical",
        difficulty: "medium",
        followUp: "What was the last new technology you learned?",
        expectedAnswer: "Structured learning approach, hands-on practice, continuous learning",
        redFlags: "No recent learning, passive approach",
        time: 5
      }
    ];

    // Return requested number of questions
    return templates.slice(0, Math.min(count, templates.length));
  }

  /**
   * Get skill-specific template questions
   */
  getSkillTemplateQuestions(skill, level, count) {
    const skillTemplates = {
      'JavaScript': [
        "Explain the difference between var, let, and const.",
        "How does the event loop work in JavaScript?",
        "What are closures and how do they work?"
      ],
      'React': [
        "Explain the React component lifecycle.",
        "What are hooks and how do they differ from class components?",
        "How would you optimize a React application's performance?"
      ],
      'Python': [
        "What are decorators in Python?",
        "Explain the GIL and its implications.",
        "How does memory management work in Python?"
      ],
      'SQL': [
        "What's the difference between different types of JOINs?",
        "How would you optimize a slow query?",
        "Explain indexing strategies in databases."
      ],
      'default': [
        `How would you rate your ${skill} skills and why?`,
        `What's the most complex thing you've done with ${skill}?`,
        `How do you stay updated with ${skill} best practices?`
      ]
    };

    const questions = skillTemplates[skill] || skillTemplates.default;
    return questions.slice(0, count).map(q => ({
      question: q,
      category: 'technical',
      difficulty: level,
      skill: skill
    }));
  }
}

module.exports = new AIQuestionService();