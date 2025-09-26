// recruitment-backend/services/interviewService.js
const db = require('../data/database');
const emailService = require('./emailService');
const communicationService = require('./communicationService');
const searchIndexer = require('./search/searchIndexer');
const searchService = require('./search/searchService');

class InterviewService {
  /**
   * Schedule interview for candidate
   */
  async scheduleInterview(interviewData, scheduledBy) {
    try {
      const {
        candidateId,
        caseId,
        bucketId,
        requirementId,
        interviewType,
        interviewRound,
        interviewers,
        scheduledDate,
        scheduledTime,
        timezone,
        duration,
        meetingLink,
        instructions
      } = interviewData;
      
      // Validate candidate exists
      const candidate = await this.getCandidateInfo(candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }
      
      // Check for scheduling conflicts
      const conflict = await this.checkScheduleConflict({
        candidateId,
        scheduledDate,
        scheduledTime,
        duration
      });
      
      if (conflict) {
        throw new Error(`Schedule conflict: ${conflict.reason}`);
      }
      
      // Create interview record
      const query = `
        INSERT INTO interviews (
          candidate_id, case_id, requirement_id, interview_round,
          interview_type, interviewer_names, scheduled_date, scheduled_time,
          timezone, duration_minutes, meeting_link, instructions,
          status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING id, interview_code
      `;
      
      const interviewCode = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      const result = await db.query(query, [
        candidateId,
        caseId,
        requirementId || bucketId,
        interviewRound || 1,
        interviewType,
        JSON.stringify(interviewers),
        scheduledDate,
        scheduledTime,
        timezone || 'EST',
        duration || 60,
        meetingLink || this.generateMeetingLink(interviewCode),
        instructions,
        'scheduled',
        scheduledBy
      ]);
      
      const interviewId = result.rows[0].id;
      
      // Create interview panel records
      await this.createInterviewPanel(interviewId, interviewers);
      
      // Send notifications
      await this.sendInterviewNotifications({
        interviewId,
        candidate,
        interviewers,
        scheduledDate,
        scheduledTime,
        meetingLink: result.rows[0].meeting_link
      });
      
      // Log activity
      await this.logActivity('interview_scheduled', candidateId, interviewId,
        `${interviewType} interview scheduled for ${scheduledDate}`, scheduledBy);
      
      // Trigger search indexing for this candidate
      try {
        const indexHandler = await searchIndexer.onInterviewChange();
        await indexHandler(interviewId);
      } catch (indexError) {
        console.error(`Failed to index interview ${interviewId}:`, indexError);
      }
      
      return {
        success: true,
        interviewId,
        interviewCode,
        message: 'Interview scheduled successfully',
        notifications: {
          candidate: true,
          interviewers: interviewers.length
        }
      };
      
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw error;
    }
  }

  /**
   * Get interview questions based on JD and candidate
   */
  async getInterviewQuestions(interviewId, options = {}) {
    try {
      // Get interview details
      const interview = await this.getInterviewById(interviewId);
      if (!interview) {
        throw new Error('Interview not found');
      }
      
      // Get candidate profile
      const candidate = await this.getCandidateInfo(interview.candidate_id);
      
      // Get requirement/JD if available
      const requirement = interview.requirement_id ? 
        await this.getRequirement(interview.requirement_id) : null;
      
      // Generate questions based on context
      const questions = await this.generateQuestions({
        candidateProfile: candidate,
        jobDescription: requirement?.jd_text,
        interviewType: interview.interview_type,
        interviewRound: interview.interview_round,
        difficulty: options.difficulty || this.calculateDifficulty(candidate),
        focusAreas: options.focusAreas || this.identifyFocusAreas(candidate, requirement)
      });
      
      // Update search index with question generation info
      try {
        const questionsHandler = await searchIndexer.onQuestionsGenerated();
        await questionsHandler(interview.candidate_id, questions.length);
      } catch (indexError) {
        console.error(`Failed to index questions for candidate ${interview.candidate_id}:`, indexError);
      }
      
      return {
        success: true,
        interview: {
          id: interview.id,
          type: interview.interview_type,
          round: interview.interview_round,
          candidate: candidate.name
        },
        questions,
        guidelines: this.getInterviewGuidelines(interview.interview_type)
      };
      
    } catch (error) {
      console.error('Error getting interview questions:', error);
      throw error;
    }
  }

  /**
   * Generate interview questions
   */
  async generateQuestions(context) {
    const { 
      candidateProfile, 
      jobDescription, 
      interviewType, 
      interviewRound,
      difficulty,
      focusAreas
    } = context;
    
    const questions = {
      technical: [],
      behavioral: [],
      situational: [],
      roleSpecific: []
    };
    
    // Technical Questions
    if (interviewType === 'technical' || interviewType === 'full') {
      questions.technical = this.generateTechnicalQuestions(
        candidateProfile.skills,
        difficulty,
        focusAreas
      );
    }
    
    // Behavioral Questions
    if (interviewType === 'behavioral' || interviewType === 'hr' || interviewType === 'full') {
      questions.behavioral = this.generateBehavioralQuestions(
        candidateProfile.years_experience,
        interviewRound
      );
    }
    
    // Situational Questions
    if (interviewType === 'managerial' || interviewRound > 1) {
      questions.situational = this.generateSituationalQuestions(
        jobDescription,
        candidateProfile.experience_level
      );
    }
    
    // Role-specific Questions
    if (jobDescription) {
      questions.roleSpecific = this.generateRoleSpecificQuestions(
        jobDescription,
        candidateProfile
      );
    }
    
    // Format with difficulty levels and expected answers
    const formattedQuestions = this.formatQuestions(questions, difficulty);
    
    // Calculate total question count for return
    const totalQuestions = Object.values(questions).reduce((total, category) => total + category.length, 0);
    formattedQuestions.length = totalQuestions;
    
    return formattedQuestions;
  }

  /**
   * Submit interview feedback
   */
  async submitFeedback(interviewId, feedbackData, submittedBy) {
    try {
      const {
        technicalRating,
        communicationRating,
        problemSolvingRating,
        cultureFitRating,
        overallRating,
        strengths,
        weaknesses,
        recommendations,
        detailedNotes,
        hiringDecision
      } = feedbackData;
      
      // Get interview details first
      const interview = await this.getInterviewById(interviewId);
      if (!interview) {
        throw new Error('Interview not found');
      }
      
      // Create feedback record
      const query = `
        INSERT INTO interview_feedback (
          interview_id, technical_rating, communication_rating,
          problem_solving_rating, culture_fit_rating, overall_rating,
          strengths, weaknesses, recommendation, detailed_notes,
          hiring_decision, submitted_by, submitted_at, average_rating
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
        RETURNING id
      `;
      
      // Calculate average rating
      const ratings = [technicalRating, communicationRating, problemSolvingRating, cultureFitRating, overallRating];
      const validRatings = ratings.filter(r => r != null && r > 0);
      const averageRating = validRatings.length > 0 ? 
        validRatings.reduce((a, b) => a + b, 0) / validRatings.length : null;
      
      const result = await db.query(query, [
        interviewId,
        technicalRating,
        communicationRating,
        problemSolvingRating,
        cultureFitRating,
        overallRating,
        JSON.stringify(strengths),
        JSON.stringify(weaknesses),
        recommendations,
        detailedNotes,
        hiringDecision,
        submittedBy,
        averageRating
      ]);
      
      // Update interview status
      await this.updateInterviewStatus(interviewId, 'feedback_received');
      
      // Check if all interviewers have submitted feedback
      const allFeedbackReceived = await this.checkAllFeedbackReceived(interviewId);
      
      if (allFeedbackReceived) {
        await this.processInterviewDecision(interviewId);
      }
      
      // Trigger search indexing for this candidate
      try {
        await searchService.indexCandidate(interview.candidate_id);
      } catch (indexError) {
        console.error(`Failed to index candidate ${interview.candidate_id}:`, indexError);
      }
      
      return {
        success: true,
        feedbackId: result.rows[0].id,
        allFeedbackReceived,
        message: 'Feedback submitted successfully'
      };
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Process interview decision when all feedback received
   */
  async processInterviewDecision(interviewId) {
    try {
      // Get all feedback
      const feedbacks = await db.query(
        'SELECT * FROM interview_feedback WHERE interview_id = $1',
        [interviewId]
      );
      
      // Calculate average ratings
      const avgRatings = this.calculateAverageRatings(feedbacks.rows);
      
      // Determine consensus decision
      const decision = this.determineConsensusDecision(feedbacks.rows);
      
      // Update interview with decision
      await db.query(
        `UPDATE interviews 
         SET status = $1, 
             final_decision = $2,
             average_rating = $3,
             completed_at = NOW()
         WHERE id = $4`,
        [
          decision === 'hire' ? 'selected' : decision === 'reject' ? 'rejected' : 'on_hold',
          decision,
          avgRatings.overall,
          interviewId
        ]
      );
      
      // Get interview details for notifications
      const interview = await this.getInterviewById(interviewId);
      
      // Notify candidate if final round
      if (interview.interview_round >= 2 || decision === 'hire') {
        await this.notifyCandidateDecision(interview, decision);
      }
      
      // Notify referrer if candidate was referred
      if (interview.referrer_email) {
        await this.notifyReferrer(interview, decision);
      }
      
      // Trigger search indexing with decision
      try {
        await searchService.indexCandidate(interview.candidate_id);
      } catch (indexError) {
        console.error(`Failed to index candidate ${interview.candidate_id}:`, indexError);
      }
      
      return {
        decision,
        averageRatings: avgRatings
      };
      
    } catch (error) {
      console.error('Error processing decision:', error);
      throw error;
    }
  }

  /**
   * Reschedule interview
   */
  async rescheduleInterview(interviewId, newSchedule, rescheduledBy) {
    try {
      const { scheduledDate, scheduledTime, reason } = newSchedule;
      
      // Get current interview
      const interview = await this.getInterviewById(interviewId);
      if (!interview) {
        throw new Error('Interview not found');
      }
      
      // Check for conflicts
      const conflict = await this.checkScheduleConflict({
        candidateId: interview.candidate_id,
        scheduledDate,
        scheduledTime,
        duration: interview.duration_minutes,
        excludeInterviewId: interviewId
      });
      
      if (conflict) {
        throw new Error(`Schedule conflict: ${conflict.reason}`);
      }
      
      // Update interview
      await db.query(
        `UPDATE interviews 
         SET scheduled_date = $1,
             scheduled_time = $2,
             status = 'rescheduled',
             reschedule_count = COALESCE(reschedule_count, 0) + 1,
             reschedule_reason = $3
         WHERE id = $4`,
        [scheduledDate, scheduledTime, reason, interviewId]
      );
      
      // Send reschedule notifications
      await this.sendRescheduleNotifications(interview, newSchedule);
      
      // Log activity
      await this.logActivity('interview_rescheduled', interview.candidate_id, interviewId,
        `Interview rescheduled to ${scheduledDate} ${scheduledTime}: ${reason}`, rescheduledBy);
      
      // Trigger search indexing
      try {
        const indexHandler = await searchIndexer.onInterviewChange();
        await indexHandler(interviewId);
      } catch (indexError) {
        console.error(`Failed to index interview ${interviewId}:`, indexError);
      }
      
      return {
        success: true,
        message: 'Interview rescheduled successfully'
      };
      
    } catch (error) {
      console.error('Error rescheduling interview:', error);
      throw error;
    }
  }

  /**
   * Cancel interview
   */
  async cancelInterview(interviewId, reason, cancelledBy) {
    try {
      // Get interview details first
      const interview = await this.getInterviewById(interviewId);
      if (!interview) {
        throw new Error('Interview not found');
      }
      
      await db.query(
        `UPDATE interviews 
         SET status = 'cancelled',
             cancelled_at = NOW(),
             cancellation_reason = $1
         WHERE id = $2`,
        [reason, interviewId]
      );
      
      // Send cancellation notifications
      await this.sendCancellationNotifications(interview, reason);
      
      // Log activity
      await this.logActivity('interview_cancelled', interview.candidate_id, interviewId,
        `Interview cancelled: ${reason}`, cancelledBy);
      
      // Trigger search indexing
      try {
        await searchService.indexCandidate(interview.candidate_id);
      } catch (indexError) {
        console.error(`Failed to index candidate ${interview.candidate_id}:`, indexError);
      }
      
      return {
        success: true,
        message: 'Interview cancelled'
      };
      
    } catch (error) {
      console.error('Error cancelling interview:', error);
      throw error;
    }
  }

  /**
   * Complete interview
   */
  async completeInterview(interviewId, completedBy) {
    try {
      const interview = await this.getInterviewById(interviewId);
      if (!interview) {
        throw new Error('Interview not found');
      }
      
      await db.query(
        `UPDATE interviews 
         SET status = 'completed',
             completed_at = NOW()
         WHERE id = $1`,
        [interviewId]
      );
      
      // Log activity
      await this.logActivity('interview_completed', interview.candidate_id, interviewId,
        'Interview completed', completedBy);
      
      // Trigger search indexing
      try {
        const indexHandler = await searchIndexer.onInterviewChange();
        await indexHandler(interviewId);
      } catch (indexError) {
        console.error(`Failed to index interview ${interviewId}:`, indexError);
      }
      
      return {
        success: true,
        message: 'Interview marked as completed'
      };
      
    } catch (error) {
      console.error('Error completing interview:', error);
      throw error;
    }
  }

  /**
   * Get upcoming interviews
   */
  async getUpcomingInterviews(filters = {}) {
    let query = `
      SELECT 
        i.*,
        c.name as candidate_name,
        c.email as candidate_email,
        c.phone as candidate_phone
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.id
      WHERE i.status IN ('scheduled', 'rescheduled')
        AND i.scheduled_date >= CURRENT_DATE
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (filters.interviewerId) {
      query += ` AND $${++paramCount} = ANY(i.interviewer_names::text[])`;
      params.push(filters.interviewerId);
    }
    
    if (filters.dateFrom) {
      query += ` AND i.scheduled_date >= $${++paramCount}`;
      params.push(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query += ` AND i.scheduled_date <= $${++paramCount}`;
      params.push(filters.dateTo);
    }
    
    query += ' ORDER BY i.scheduled_date, i.scheduled_time';
    
    const result = await db.query(query, params);
    
    return result.rows.map(interview => ({
      ...interview,
      isToday: this.isToday(interview.scheduled_date),
      isTomorrow: this.isTomorrow(interview.scheduled_date),
      daysUntil: this.daysUntil(interview.scheduled_date)
    }));
  }

  /**
   * Bulk update interview status
   */
  async bulkUpdateInterviewStatus(interviewIds, status, updatedBy) {
    try {
      const placeholders = interviewIds.map((_, index) => `$${index + 2}`).join(',');
      
      const query = `
        UPDATE interviews 
        SET status = $1,
            updated_at = NOW()
        WHERE id IN (${placeholders})
        RETURNING id, candidate_id
      `;
      
      const params = [status, ...interviewIds];
      const result = await db.query(query, params);
      
      // Trigger search indexing for all affected candidates
      const candidateIds = [...new Set(result.rows.map(r => r.candidate_id))];
      
      for (const candidateId of candidateIds) {
        try {
          await searchService.indexCandidate(candidateId);
        } catch (indexError) {
          console.error(`Failed to index candidate ${candidateId}:`, indexError);
        }
      }
      
      return {
        success: true,
        updated: result.rows.length,
        message: `${result.rows.length} interviews updated`
      };
      
    } catch (error) {
      console.error('Error bulk updating interviews:', error);
      throw error;
    }
  }

  /**
   * Generate technical questions based on skills
   */
  generateTechnicalQuestions(skills, difficulty, focusAreas) {
    const questions = [];
    const skillsArray = Array.isArray(skills) ? skills : [];
    
    // Map skills to question banks
    const questionBank = {
      'JavaScript': {
        easy: [
          {
            question: 'What is the difference between let, const, and var?',
            expectedAnswer: 'var has function scope, let/const have block scope, const cannot be reassigned',
            followUp: 'Can you modify a const object?'
          },
          {
            question: 'Explain closures in JavaScript',
            expectedAnswer: 'A closure gives access to outer function variables from inner function',
            followUp: 'Give a practical example'
          }
        ],
        medium: [
          {
            question: 'How does the event loop work in JavaScript?',
            expectedAnswer: 'Single-threaded, non-blocking, asynchronous behavior through callback queue',
            followUp: 'What is the difference between microtasks and macrotasks?'
          }
        ],
        hard: [
          {
            question: 'Implement a debounce function from scratch',
            expectedAnswer: 'Function that delays execution until after wait period of inactivity',
            codeRequired: true
          }
        ]
      },
      'React': {
        easy: [
          {
            question: 'What are React Hooks?',
            expectedAnswer: 'Functions that let you use state and lifecycle in functional components',
            followUp: 'Name the most common hooks'
          }
        ],
        medium: [
          {
            question: 'Explain the Virtual DOM and reconciliation',
            expectedAnswer: 'Virtual representation of UI, diffing algorithm for efficient updates',
            followUp: 'How does React decide what to re-render?'
          }
        ],
        hard: [
          {
            question: 'How would you optimize a React app with performance issues?',
            expectedAnswer: 'Memoization, lazy loading, code splitting, virtualization',
            scenarioBased: true
          }
        ]
      },
      'Python': {
        easy: [
          {
            question: 'What is the difference between list and tuple?',
            expectedAnswer: 'Lists are mutable, tuples are immutable',
            followUp: 'When would you use each?'
          }
        ],
        medium: [
          {
            question: 'Explain decorators in Python',
            expectedAnswer: 'Functions that modify behavior of other functions',
            codeRequired: true
          }
        ],
        hard: [
          {
            question: 'How does the GIL affect Python multithreading?',
            expectedAnswer: 'Global Interpreter Lock prevents true parallel execution of threads',
            followUp: 'How can you achieve parallelism in Python?'
          }
        ]
      }
    };
    
    // Select questions based on candidate skills and difficulty
    skillsArray.forEach(skill => {
      const skillQuestions = questionBank[skill];
      if (skillQuestions) {
        const difficultyQuestions = skillQuestions[difficulty] || skillQuestions.easy;
        questions.push(...difficultyQuestions.slice(0, 2));
      }
    });
    
    // Add general programming questions if needed
    if (questions.length < 5) {
      questions.push(
        {
          question: 'Explain your approach to debugging complex issues',
          expectedAnswer: 'Systematic approach: reproduce, isolate, test hypotheses, fix, verify',
          behavioral: true
        },
        {
          question: 'How do you ensure code quality?',
          expectedAnswer: 'Testing, code reviews, linting, documentation',
          openEnded: true
        }
      );
    }
    
    return questions;
  }

  /**
   * Helper methods remain the same
   */
  async getCandidateInfo(candidateId) {
    const result = await db.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidateId]
    );
    return result.rows[0];
  }
  
  async getInterviewById(interviewId) {
    const result = await db.query(
      'SELECT * FROM interviews WHERE id = $1',
      [interviewId]
    );
    return result.rows[0];
  }
  
  async checkScheduleConflict({ candidateId, scheduledDate, scheduledTime, duration, excludeInterviewId }) {
    const query = `
      SELECT * FROM interviews
      WHERE candidate_id = $1
        AND scheduled_date = $2
        AND status IN ('scheduled', 'rescheduled')
        ${excludeInterviewId ? 'AND id != $4' : ''}
    `;
    
    const params = [candidateId, scheduledDate, scheduledTime];
    if (excludeInterviewId) params.push(excludeInterviewId);
    
    const result = await db.query(query, params);
    
    if (result.rows.length > 0) {
      return {
        hasConflict: true,
        reason: 'Candidate already has an interview scheduled at this time'
      };
    }
    
    return null;
  }
  
  // All other helper methods remain unchanged...
  generateMeetingLink(interviewCode) {
    return `https://meet.quadrant.com/interview/${interviewCode}`;
  }
  
  calculateDifficulty(candidate) {
    const experience = candidate.years_experience || 0;
    if (experience < 3) return 'easy';
    if (experience < 7) return 'medium';
    return 'hard';
  }
  
  identifyFocusAreas(candidate, requirement) {
    const focusAreas = [];
    
    if (requirement) {
      const requiredSkills = this.extractSkillsFromJD(requirement.jd_text);
      const candidateSkills = candidate.skills || [];
      
      requiredSkills.forEach(skill => {
        if (!candidateSkills.includes(skill)) {
          focusAreas.push(skill);
        }
      });
    }
    
    return focusAreas;
  }
  
  extractSkillsFromJD(jdText) {
    const commonSkills = [
      'JavaScript', 'React', 'Node.js', 'Python', 'Java',
      'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB'
    ];
    
    return commonSkills.filter(skill => 
      jdText.toLowerCase().includes(skill.toLowerCase())
    );
  }
  
  formatQuestions(questions, difficulty) {
    const formatted = [];
    
    Object.entries(questions).forEach(([category, categoryQuestions]) => {
      if (categoryQuestions.length > 0) {
        formatted.push({
          category,
          difficulty,
          questions: categoryQuestions,
          estimatedTime: categoryQuestions.length * 5
        });
      }
    });
    
    return formatted;
  }
  
  getInterviewGuidelines(interviewType) {
    const guidelines = {
      technical: [
        'Start with ice-breaker questions',
        'Progress from easy to difficult',
        'Allow candidate to ask clarifying questions',
        'Provide hints if stuck for too long',
        'Evaluate problem-solving approach, not just the answer'
      ],
      behavioral: [
        'Use STAR method (Situation, Task, Action, Result)',
        'Look for specific examples, not general statements',
        'Ask follow-up questions for clarity',
        'Note communication skills and clarity'
      ],
      hr: [
        'Assess cultural fit',
        'Discuss career goals and aspirations',
        'Evaluate soft skills',
        'Discuss compensation expectations',
        'Answer candidate questions about company'
      ]
    };
    
    return guidelines[interviewType] || guidelines.technical;
  }
  
  generateBehavioralQuestions(yearsExperience, round) {
    const questions = [
      {
        question: 'Tell me about a challenging project you worked on',
        category: 'problem-solving',
        lookFor: ['Problem identification', 'Solution approach', 'Outcome', 'Learning']
      },
      {
        question: 'Describe a time you had to work with a difficult team member',
        category: 'teamwork',
        lookFor: ['Communication', 'Conflict resolution', 'Professionalism']
      },
      {
        question: 'How do you prioritize multiple tasks with competing deadlines?',
        category: 'time-management',
        lookFor: ['Organization', 'Decision making', 'Communication']
      }
    ];
    
    if (yearsExperience >= 5) {
      questions.push(
        {
          question: 'Describe your experience mentoring junior developers',
          category: 'leadership',
          lookFor: ['Teaching approach', 'Patience', 'Knowledge transfer']
        },
        {
          question: 'How have you contributed to improving team processes?',
          category: 'process-improvement',
          lookFor: ['Initiative', 'Impact', 'Collaboration']
        }
      );
    }
    
    return questions;
  }
  
  generateSituationalQuestions(jobDescription, experienceLevel) {
    return [
      {
        question: 'Production is down and you need to debug. Walk me through your approach.',
        scenario: true,
        evaluateCriteria: ['Systematic approach', 'Pressure handling', 'Communication']
      },
      {
        question: 'You disagree with a technical decision. How do you handle it?',
        scenario: true,
        evaluateCriteria: ['Professional disagreement', 'Data-driven arguments', 'Flexibility']
      }
    ];
  }
  
  generateRoleSpecificQuestions(jobDescription, candidateProfile) {
    const questions = [];
    const jdLower = jobDescription.toLowerCase();
    
    if (jdLower.includes('microservices')) {
      questions.push({
        question: 'Explain your experience with microservices architecture',
        roleSpecific: true,
        evaluateFor: 'Microservices knowledge'
      });
    }
    
    if (jdLower.includes('agile') || jdLower.includes('scrum')) {
      questions.push({
        question: 'Describe your experience working in Agile environments',
        roleSpecific: true,
        evaluateFor: 'Agile methodology'
      });
    }
    
    if (jdLower.includes('cloud') || jdLower.includes('aws')) {
      questions.push({
        question: 'What cloud services have you worked with?',
        roleSpecific: true,
        evaluateFor: 'Cloud experience'
      });
    }
    
    return questions;
  }
  
  async createInterviewPanel(interviewId, interviewers) {
    for (const interviewer of interviewers) {
      await db.query(
        `INSERT INTO interview_panel (interview_id, interviewer_email, role)
         VALUES ($1, $2, $3)`,
        [interviewId, interviewer.email, interviewer.role || 'interviewer']
      );
    }
  }
  
  async sendInterviewNotifications(data) {
    console.log('Sending interview notifications...');
  }
  
  calculateAverageRatings(feedbacks) {
    const ratings = {
      technical: 0,
      communication: 0,
      problemSolving: 0,
      cultureFit: 0,
      overall: 0
    };
    
    feedbacks.forEach(feedback => {
      ratings.technical += feedback.technical_rating || 0;
      ratings.communication += feedback.communication_rating || 0;
      ratings.problemSolving += feedback.problem_solving_rating || 0;
      ratings.cultureFit += feedback.culture_fit_rating || 0;
      ratings.overall += feedback.overall_rating || 0;
    });
    
    const count = feedbacks.length;
    Object.keys(ratings).forEach(key => {
      ratings[key] = ratings[key] / count;
    });
    
    return ratings;
  }
  
  determineConsensusDecision(feedbacks) {
    const decisions = feedbacks.map(f => f.hiring_decision);
    const hireCount = decisions.filter(d => d === 'hire').length;
    const rejectCount = decisions.filter(d => d === 'reject').length;
    
    if (hireCount > feedbacks.length / 2) return 'hire';
    if (rejectCount > feedbacks.length / 2) return 'reject';
    return 'on_hold';
  }
  
  isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  }
  
  isTomorrow(date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkDate = new Date(date);
    return tomorrow.toDateString() === checkDate.toDateString();
  }
  
  daysUntil(date) {
    const today = new Date();
    const checkDate = new Date(date);
    const diffTime = checkDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  async logActivity(action, candidateId, interviewId, description, performedBy) {
    await db.query(
      `INSERT INTO activity_logs (action, description, user_email, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [action, description, performedBy]
    );
  }
  
  async getRequirement(requirementId) {
    const result = await db.query(
      'SELECT * FROM requirements WHERE id = $1',
      [requirementId]
    );
    return result.rows[0];
  }
  
  async updateInterviewStatus(interviewId, status) {
    await db.query(
      'UPDATE interviews SET status = $1 WHERE id = $2',
      [status, interviewId]
    );
  }
  
  async checkAllFeedbackReceived(interviewId) {
    const interview = await this.getInterviewById(interviewId);
    const expectedCount = JSON.parse(interview.interviewer_names || '[]').length;
    
    const feedbackCount = await db.query(
      'SELECT COUNT(*) as count FROM interview_feedback WHERE interview_id = $1',
      [interviewId]
    );
    
    return feedbackCount.rows[0].count >= expectedCount;
  }
  
  async notifyCandidateDecision(interview, decision) {
    console.log(`Notifying candidate ${interview.candidate_id} of decision: ${decision}`);
  }
  
  async notifyReferrer(interview, decision) {
    console.log(`Notifying referrer of decision: ${decision}`);
  }
  
  async sendRescheduleNotifications(interview, newSchedule) {
    console.log('Sending reschedule notifications...');
  }
  
  async sendCancellationNotifications(interview, reason) {
    console.log('Sending cancellation notifications...');
  }
}

module.exports = new InterviewService();