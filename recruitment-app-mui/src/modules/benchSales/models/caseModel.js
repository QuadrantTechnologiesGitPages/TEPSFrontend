// src/modules/benchSales/models/caseModel.js

export const CaseStatus = {
  INTAKE: 'Intake',
  VERIFICATION_PENDING: 'Verification Pending',
  VERIFICATION_IN_PROGRESS: 'Verification In Progress',
  VERIFIED: 'Verified',
  SEARCHING: 'Searching',
  SHORTLISTED: 'Shortlisted',
  SUBMITTED: 'Submitted',
  ON_HOLD: 'On Hold',
  PLACED: 'Placed',
  CLOSED: 'Closed'
};

export const VerificationStatus = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  PARTIAL: 'Partial'
};

export const Priority = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

export class Case {
  constructor(candidate) {
    // Original candidate data
    this.candidateId = candidate.id || Date.now();
    this.name = candidate.name;
    this.email = candidate.email;
    this.phone = candidate.phone;
    this.skills = candidate.skills || [];
    this.visa = candidate.visa;
    this.location = candidate.location;
    this.referredBy = candidate.referredBy;
    this.linkedIn = candidate.linkedIn;
    this.yearsExp = candidate.yearsExp;
    
    // Case management fields
    this.caseId = this.generateCaseId();
    this.status = CaseStatus.INTAKE;
    this.priority = candidate.priority || Priority.MEDIUM;
    this.assignedTo = null;
    this.createdDate = new Date().toISOString();
    this.modifiedDate = new Date().toISOString();
    
    // Verification tracking
    this.verification = {
      status: VerificationStatus.NOT_STARTED,
      linkedIn: { verified: false, date: null, notes: '' },
      education: { verified: false, date: null, notes: '' },
      experience: { verified: false, date: null, notes: '' },
      references: { verified: false, date: null, notes: '' }
    };
    
    // SLA tracking
    this.sla = {
      deadline: this.calculateSLADeadline(),
      breached: false,
      warningsSent: []
    };
    
    // Activity tracking
    this.activities = [];
    this.notes = [];
    
    // Additional metadata
    this.lastDiscussion = candidate.lastDiscussion || '';
    this.discussionDetails = candidate.discussionDetails || '';
    this.nextFollowup = candidate.nextFollowup || null;
    this.tags = [];
  }
  
  generateCaseId() {
    const timestamp = Date.now().toString().slice(-6);
    return `CASE-${timestamp}`;
  }
  
  calculateSLADeadline(hoursFromNow = 72) {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hoursFromNow);
    return deadline.toISOString();
  }
  
  addActivity(type, description, user) {
    this.activities.push({
      id: Date.now(),
      type,
      description,
      user,
      timestamp: new Date().toISOString()
    });
    this.modifiedDate = new Date().toISOString();
  }
  
  addNote(content, user) {
    this.notes.push({
      id: Date.now(),
      content,
      user,
      timestamp: new Date().toISOString()
    });
    this.modifiedDate = new Date().toISOString();
  }
  
  updateStatus(newStatus, user) {
    const oldStatus = this.status;
    this.status = newStatus;
    this.addActivity('status_change', `Status changed from ${oldStatus} to ${newStatus}`, user);
  }
  
  updateVerification(field, verified, notes, user) {
    this.verification[field] = {
      verified,
      date: new Date().toISOString(),
      notes
    };
    
    // Check if all verifications are complete
    const allVerified = ['linkedIn', 'education', 'experience'].every(
      f => this.verification[f].verified
    );
    
    if (allVerified) {
      this.verification.status = VerificationStatus.COMPLETED;
      this.updateStatus(CaseStatus.VERIFIED, user);
    } else {
      this.verification.status = VerificationStatus.IN_PROGRESS;
    }
    
    this.addActivity('verification', `${field} verification ${verified ? 'completed' : 'failed'}`, user);
  }
}