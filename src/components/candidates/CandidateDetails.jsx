import React from 'react';
import AvailabilityBadge from './AvailabilityBadge.jsx';

const CandidateDetails = ({ candidate, isOpen, onClose, onContactReferrer, onContactCandidate }) => {
  if (!isOpen) return null;

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className={`modal-overlay ${!isOpen ? 'closing' : ''}`} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="avatar" style={{ width: '60px', height: '60px', fontSize: '24px' }}>
              {getInitials(candidate.name)}
            </div>
            <div>
              <h2 className="modal-title">{candidate.name}</h2>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <AvailabilityBadge status={candidate.currentStatus} />
                <span className="badge badge-visa">{candidate.visa}</span>
                <span className="badge badge-exp">{candidate.yearsExp}</span>
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Contact Information */}
          <div className="detail-section">
            <h3>📞 Contact Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Email</div>
                <div className="detail-value">{candidate.email}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Phone</div>
                <div className="detail-value">{candidate.phone}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Location</div>
                <div className="detail-value">{candidate.location}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">LinkedIn</div>
                <div className="detail-value">
                  <a href={candidate.linkedIn} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
                    View Profile →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="detail-section">
            <h3>💼 Professional Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Experience</div>
                <div className="detail-value">{candidate.yearsExp}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Visa Status</div>
                <div className="detail-value">{candidate.visa}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Engagement Type</div>
                <div className="detail-value">{candidate.engagement}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Referred By</div>
                <div className="detail-value" style={{ fontWeight: '600' }}>{candidate.referredBy}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Vertical</div>
                <div className="detail-value">{candidate.vertical}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">SAP Category</div>
                <div className="detail-value">{candidate.sap}</div>
              </div>
            </div>
          </div>

          {/* Technical Skills */}
          <div className="detail-section">
            <h3>🛠️ Technical Skills</h3>
            <div className="skills" style={{ marginTop: '10px' }}>
              {candidate.skills.map((skill, index) => (
                <span key={index} className="skill-chip" style={{ padding: '8px 16px', fontSize: '14px' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Discussion Details */}
          <div className="detail-section">
            <h3>💬 Discussion Details</h3>
            <div className="detail-item" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
              <div className="detail-label">Last Discussion</div>
              <div className="detail-value" style={{ marginTop: '8px', marginBottom: '15px' }}>
                {candidate.lastDiscussion}
              </div>
              <div className="detail-label">Detailed Notes</div>
              <div className="detail-value" style={{ marginTop: '8px', lineHeight: '1.6' }}>
                {candidate.discussionDetails}
              </div>
              {candidate.nextFollowup && (
                <>
                  <div className="detail-label" style={{ marginTop: '15px' }}>Next Follow-up</div>
                  <div className="detail-value" style={{ marginTop: '8px', color: '#667eea', fontWeight: '600' }}>
                    {candidate.nextFollowup}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="detail-section">
            <h3>📋 Additional Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Priority Level</div>
                <div className="detail-value">
                  {candidate.priority === 1 && <span style={{ color: '#c00', fontWeight: '600' }}>High Priority</span>}
                  {candidate.priority === 2 && <span style={{ color: '#d68910', fontWeight: '600' }}>Medium Priority</span>}
                  {candidate.priority === 3 && <span style={{ color: '#27ae60', fontWeight: '600' }}>Normal Priority</span>}
                  {candidate.priority === 4 && <span style={{ color: '#718096' }}>Low Priority</span>}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Received Date</div>
                <div className="detail-value">{candidate.receivedDate}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Quadrant Relation</div>
                <div className="detail-value">{candidate.quadrantRelation}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Quadrant Email</div>
                <div className="detail-value">{candidate.quadrantEmail}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onContactReferrer}>
            📧 Contact Referrer ({candidate.referredBy})
          </button>
          <button className="btn btn-primary" onClick={onContactCandidate}>
            💬 Contact Candidate
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetails;