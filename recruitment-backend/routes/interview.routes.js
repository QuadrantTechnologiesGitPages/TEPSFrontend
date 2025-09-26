// recruitment-backend/routes/interview.routes.js
const express = require('express');
const router = express.Router();
const interviewService = require('../services/interviewService');

/**
 * POST /api/interviews/schedule
 * Schedule an interview
 */
router.post('/schedule', async (req, res) => {
  try {
    const interviewData = req.body;
    const scheduledBy = req.headers['x-user-email'] || 'system';
    
    // Validate required fields
    if (!interviewData.candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID is required'
      });
    }
    
    if (!interviewData.scheduledDate || !interviewData.scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'Schedule date and time are required'
      });
    }
    
    const result = await interviewService.scheduleInterview(interviewData, scheduledBy);
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/interviews/upcoming
 * Get upcoming interviews
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { interviewerId, dateFrom, dateTo } = req.query;
    
    const filters = {
      interviewerId,
      dateFrom,
      dateTo
    };
    
    const interviews = await interviewService.getUpcomingInterviews(filters);
    
    // Group by date
    const grouped = {};
    interviews.forEach(interview => {
      const date = interview.scheduled_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(interview);
    });
    
    res.json({
      success: true,
      count: interviews.length,
      interviews: grouped,
      summary: {
        today: interviews.filter(i => i.isToday).length,
        tomorrow: interviews.filter(i => i.isTomorrow).length,
        thisWeek: interviews.filter(i => i.daysUntil <= 7).length
      }
    });
    
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/interviews/:id
 * Get interview details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await interviewService.getInterviewById(id);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }
    
    res.json({
      success: true,
      interview
    });
    
  } catch (error) {
    console.error('Error fetching interview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/interviews/:id/questions
 * Get interview questions
 */
router.get('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const { difficulty, focusAreas } = req.query;
    
    const options = {
      difficulty,
      focusAreas: focusAreas ? focusAreas.split(',') : undefined
    };
    
    const result = await interviewService.getInterviewQuestions(id, options);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/interviews/:id/feedback
 * Submit interview feedback
 */
router.post('/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const feedbackData = req.body;
    const submittedBy = req.headers['x-user-email'] || 'system';
    
    // Validate ratings
    const ratingFields = [
      'technicalRating',
      'communicationRating',
      'overallRating'
    ];
    
    for (const field of ratingFields) {
      if (feedbackData[field] && (feedbackData[field] < 1 || feedbackData[field] > 5)) {
        return res.status(400).json({
          success: false,
          error: `${field} must be between 1 and 5`
        });
      }
    }
    
    const result = await interviewService.submitFeedback(id, feedbackData, submittedBy);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/interviews/:id/reschedule
 * Reschedule interview
 */
router.put('/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, scheduledTime, reason } = req.body;
    const rescheduledBy = req.headers['x-user-email'] || 'system';
    
    if (!scheduledDate || !scheduledTime || !reason) {
      return res.status(400).json({
        success: false,
        error: 'New date, time, and reason are required'
      });
    }
    
    const result = await interviewService.rescheduleInterview(
      id,
      { scheduledDate, scheduledTime, reason },
      rescheduledBy
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error rescheduling interview:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/interviews/:id/cancel
 * Cancel interview
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const cancelledBy = req.headers['x-user-email'] || 'system';
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required'
      });
    }
    
    const result = await interviewService.cancelInterview(id, reason, cancelledBy);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error cancelling interview:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/interviews/candidate/:candidateId
 * Get all interviews for a candidate
 */
router.get('/candidate/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const interviews = await db.query(
      `SELECT i.*, 
              f.overall_rating as feedback_rating,
              f.hiring_decision
       FROM interviews i
       LEFT JOIN interview_feedback f ON i.id = f.interview_id
       WHERE i.candidate_id = $1
       ORDER BY i.scheduled_date DESC`,
      [candidateId]
    );
    
    res.json({
      success: true,
      count: interviews.rows.length,
      interviews: interviews.rows
    });
    
  } catch (error) {
    console.error('Error fetching candidate interviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/interviews/bulk-schedule
 * Schedule interviews for multiple candidates
 */
router.post('/bulk-schedule', async (req, res) => {
  try {
    const { candidateIds, interviewData } = req.body;
    const scheduledBy = req.headers['x-user-email'] || 'system';
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Candidate IDs array is required'
      });
    }
    
    const results = [];
    
    for (const candidateId of candidateIds) {
      try {
        const result = await interviewService.scheduleInterview(
          { ...interviewData, candidateId },
          scheduledBy
        );
        results.push({ candidateId, ...result });
      } catch (error) {
        results.push({ 
          candidateId, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    res.json({
      success: true,
      scheduled: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
    
  } catch (error) {
    console.error('Error bulk scheduling:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/interviews/feedback/:interviewId
 * Get all feedback for an interview
 */
router.get('/feedback/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    const feedbacks = await db.query(
      `SELECT f.*, u.user_name as interviewer_name
       FROM interview_feedback f
       LEFT JOIN users u ON f.submitted_by = u.user_email
       WHERE f.interview_id = $1
       ORDER BY f.submitted_at`,
      [interviewId]
    );
    
    // Calculate consensus
    const avgRatings = interviewService.calculateAverageRatings(feedbacks.rows);
    const consensus = interviewService.determineConsensusDecision(feedbacks.rows);
    
    res.json({
      success: true,
      count: feedbacks.rows.length,
      feedbacks: feedbacks.rows,
      summary: {
        averageRatings: avgRatings,
        consensusDecision: consensus
      }
    });
    
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/interviews/stats/overview
 * Get interview statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN final_decision = 'hire' THEN 1 ELSE 0 END) as hired,
        SUM(CASE WHEN final_decision = 'reject' THEN 1 ELSE 0 END) as rejected,
        AVG(average_rating)::DECIMAL(3,2) as avg_rating
      FROM interviews
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    res.json({
      success: true,
      stats: stats.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;