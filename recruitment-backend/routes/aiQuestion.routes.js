// recruitment-backend/routes/aiQuestion.routes.js
const express = require('express');
const router = express.Router();
const aiQuestionService = require('../services/aiQuestionService');
const db = require('../data/database');

/**
 * POST /api/ai-questions/generate
 * Generate interview questions for a candidate
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      candidateId,
      jdText,
      requirementId,
      interviewRound,
      interviewerRole,
      questionCount,
      difficulty
    } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID is required'
      });
    }

    const questions = await aiQuestionService.generateQuestions({
      candidateId,
      jdText,
      requirementId,
      interviewRound: interviewRound || 1,
      interviewerRole: interviewerRole || 'technical',
      questionCount: questionCount || 10,
      difficulty: difficulty || 'medium'
    });

    res.json(questions);

  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions'
    });
  }
});

/**
 * GET /api/ai-questions/skill-based/:skill
 * Get questions for specific skill assessment
 */
router.get('/skill-based/:skill', async (req, res) => {
  try {
    const { skill } = req.params;
    const { level = 'medium', count = 5 } = req.query;

    const questions = await aiQuestionService.getSkillBasedQuestions(
      skill,
      level,
      parseInt(count)
    );

    res.json({
      success: true,
      skill,
      level,
      questions
    });

  } catch (error) {
    console.error('Error getting skill questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate skill-based questions'
    });
  }
});

/**
 * GET /api/ai-questions/interview/:interviewId
 * Get questions for a scheduled interview
 */
router.get('/interview/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;

    // Get interview details
    const interviewQuery = `
      SELECT i.*, c.name as candidate_name, r.jd_text
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.id
      LEFT JOIN requirements r ON i.requirement_id = r.id
      WHERE i.id = $1
    `;
    
    const interview = await db.query(interviewQuery, [interviewId]);
    
    if (interview.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const interviewData = interview.rows[0];

    // Check if questions already exist for this interview
    const existingQuery = `
      SELECT * FROM interview_questions
      WHERE candidate_id = $1 AND interview_round = $2
      ORDER BY category, difficulty
    `;
    
    const existing = await db.query(existingQuery, [
      interviewData.candidate_id,
      interviewData.round_number || 1
    ]);

    if (existing.rows.length > 0) {
      // Return existing questions
      return res.json({
        success: true,
        candidateName: interviewData.candidate_name,
        questions: existing.rows,
        categories: aiQuestionService.categorizeQuestions(existing.rows)
      });
    }

    // Generate new questions
    const questions = await aiQuestionService.generateQuestions({
      candidateId: interviewData.candidate_id,
      jdText: interviewData.jd_text,
      requirementId: interviewData.requirement_id,
      interviewRound: interviewData.round_number || 1,
      interviewerRole: interviewData.interview_type || 'technical'
    });

    res.json(questions);

  } catch (error) {
    console.error('Error getting interview questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interview questions'
    });
  }
});

/**
 * POST /api/ai-questions/rate-answer
 * Get AI evaluation of a candidate's answer
 */
router.post('/rate-answer', async (req, res) => {
  try {
    const {
      question,
      answer,
      expectedAnswer,
      skill
    } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Question and answer are required'
      });
    }

    // Use GPT to evaluate the answer
    const evaluation = await aiQuestionService.evaluateAnswer({
      question,
      answer,
      expectedAnswer,
      skill
    });

    res.json({
      success: true,
      evaluation
    });

  } catch (error) {
    console.error('Error rating answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate answer'
    });
  }
});

/**
 * GET /api/ai-questions/templates/:category
 * Get question templates by category
 */
router.get('/templates/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { count = 10 } = req.query;

    const query = `
      SELECT DISTINCT question, category, difficulty, follow_up, expected_answer
      FROM interview_questions
      WHERE category = $1
      ORDER BY RANDOM()
      LIMIT $2
    `;
    
    const result = await db.query(query, [category, parseInt(count)]);

    res.json({
      success: true,
      category,
      questions: result.rows
    });

  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get question templates'
    });
  }
});

module.exports = router;