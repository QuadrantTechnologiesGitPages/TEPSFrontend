// src/modules/benchSales/components/CaseManagement/CaseNotes.jsx
import React, { useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';

const CaseNotes = ({ notes = [], caseId, onAddNote }) => {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    onAddNote(newNote);
    setNewNote('');
    setShowAddNote(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="case-notes">
      <div className="notes-header">
        <h3>Case Notes ({notes.length})</h3>
        <button 
          className="btn-add-note"
          onClick={() => setShowAddNote(!showAddNote)}
        >
          + Add Note
        </button>
      </div>

      {showAddNote && (
        <div className="add-note-form">
          <textarea
            placeholder="Enter your note here..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows="4"
            autoFocus
          />
          <div className="note-form-actions">
            <button onClick={() => setShowAddNote(false)} className="btn-cancel">
              Cancel
            </button>
            <button onClick={handleAddNote} className="btn-save-note">
              Save Note
            </button>
          </div>
        </div>
      )}

      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="no-notes">
            <p>No notes added yet</p>
          </div>
        ) : (
          notes.map((note, index) => (
            <div key={note.id || index} className="note-item">
              <div className="note-header">
                <span className="note-author">{note.user}</span>
                <span className="note-time">{formatDate(note.timestamp)}</span>
              </div>
              <div className="note-content">
                {note.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CaseNotes;