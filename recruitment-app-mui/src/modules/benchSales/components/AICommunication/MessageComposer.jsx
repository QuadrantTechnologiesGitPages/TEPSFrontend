// recruitment-app-mui/src/modules/benchSales/components/AICommunication/MessageComposer.jsx

import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

const MessageComposer = ({ 
  channel, 
  messageData, 
  onMessageChange, 
  onGenerateWithAI, 
  aiGenerating,
  candidateContext 
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const fileInputRef = useRef(null);

  const aiPromptSuggestions = [
    'Write a professional introduction email for this candidate',
    'Create a follow-up message about interview scheduling',
    'Draft a congratulations message for placement',
    'Compose an update on application status',
    'Write a message to the referrer about candidate progress',
    'Create a rejection message with encouragement',
    'Draft a message requesting additional documents',
    'Write an invitation for technical assessment'
  ];

  const channelLimits = {
    email: { subject: true, maxLength: null, attachments: true },
    whatsapp: { subject: false, maxLength: 4096, attachments: true },
    sms: { subject: false, maxLength: 160, attachments: false },
    teams: { subject: true, maxLength: null, attachments: true },
    phone: { subject: false, maxLength: 500, attachments: false }
  };

  const handleAIGenerate = () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI generation');
      return;
    }
    onGenerateWithAI(aiPrompt);
    setAiPrompt('');
    setShowAiPanel(false);
  };

  const handleQuickPrompt = (prompt) => {
    setAiPrompt(prompt);
    onGenerateWithAI(prompt);
    setShowAiPanel(false);
  };

  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    
    onMessageChange({
      ...messageData,
      attachments: [...messageData.attachments, ...newAttachments]
    });
    
    toast.success(`${files.length} file(s) attached`);
  };

  const removeAttachment = (index) => {
    const newAttachments = messageData.attachments.filter((_, i) => i !== index);
    onMessageChange({
      ...messageData,
      attachments: newAttachments
    });
  };

  const insertVariable = (variable) => {
    const variables = {
      candidateName: '{{candidate_name}}',
      candidateEmail: '{{candidate_email}}',
      candidateSkills: '{{candidate_skills}}',
      candidateExperience: '{{candidate_experience}}',
      candidateLocation: '{{candidate_location}}',
      referrerName: '{{referrer_name}}',
      currentDate: '{{current_date}}',
      companyName: '{{company_name}}'
    };
    
    const newBody = messageData.body + ' ' + variables[variable];
    onMessageChange({ ...messageData, body: newBody });
  };

  const formatText = (format) => {
    const selection = window.getSelection().toString();
    if (!selection) return;
    
    const formats = {
      bold: `**${selection}**`,
      italic: `*${selection}*`,
      bullet: `• ${selection}`,
      number: `1. ${selection}`
    };
    
    const formatted = formats[format] || selection;
    const newBody = messageData.body.replace(selection, formatted);
    onMessageChange({ ...messageData, body: newBody });
  };

  const getCharacterCount = () => {
    const limit = channelLimits[channel].maxLength;
    const current = messageData.body.length;
    
    if (!limit) return null;
    
    return {
      current,
      limit,
      remaining: limit - current,
      percentage: (current / limit) * 100
    };
  };

  const charCount = getCharacterCount();

  return (
    <div className="space-y-6">
      {/* AI Assistant Panel */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg overflow-hidden border border-purple-200">
        <div className="px-4 py-3 bg-white/70 backdrop-blur-sm flex justify-between items-center border-b border-purple-200">
          <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">🤖</span>
            AI Message Assistant
          </h4>
          <button
            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
            onClick={() => setShowAiPanel(!showAiPanel)}
          >
            {showAiPanel ? 'Hide' : 'Show'} AI Helper
          </button>
        </div>

        {showAiPanel && (
          <div className="p-4 space-y-4">
            <div className="flex gap-3">
              <textarea
                className="flex-1 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Describe what kind of message you want to create..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows="3"
              />
              <button
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={handleAIGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
              >
                {aiGenerating ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Generate
                  </>
                )}
              </button>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Quick prompts:</p>
              <div className="flex flex-wrap gap-2">
                {aiPromptSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs hover:bg-purple-50 hover:border-purple-400 transition-colors disabled:opacity-50"
                    onClick={() => handleQuickPrompt(suggestion)}
                    disabled={aiGenerating}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <details className="bg-white rounded-lg p-3">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                Candidate Context (AI will use this)
              </summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {candidateContext}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* Subject Field (if applicable) */}
      {channelLimits[channel].subject && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Subject</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter subject..."
            value={messageData.subject}
            onChange={(e) => onMessageChange({ ...messageData, subject: e.target.value })}
          />
        </div>
      )}

      {/* Message Body */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-semibold text-gray-700">Message</label>
          <div className="flex gap-2">
            <button
              className="p-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              onClick={() => setShowFormatting(!showFormatting)}
              title="Formatting"
            >
              📝
            </button>
            {channelLimits[channel].attachments && (
              <button
                className="p-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
              >
                📎
              </button>
            )}
          </div>
        </div>

        {showFormatting && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
            <button
              onClick={() => formatText('bold')}
              className="px-3 py-1 font-bold bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => formatText('italic')}
              className="px-3 py-1 italic bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => formatText('bullet')}
              className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Bullet"
            >
              •
            </button>
            <button
              onClick={() => formatText('number')}
              className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Number"
            >
              1.
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  insertVariable(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Insert variable...</option>
              <option value="candidateName">Candidate Name</option>
              <option value="candidateEmail">Candidate Email</option>
              <option value="candidateSkills">Skills</option>
              <option value="candidateExperience">Experience</option>
              <option value="candidateLocation">Location</option>
              <option value="referrerName">Referrer Name</option>
              <option value="currentDate">Current Date</option>
              <option value="companyName">Company Name</option>
            </select>
          </div>
        )}

        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-vertical"
          placeholder={`Enter your ${channel} message...`}
          value={messageData.body}
          onChange={(e) => onMessageChange({ ...messageData, body: e.target.value })}
          rows="10"
        />

        {charCount && (
          <div className="flex items-center gap-3">
            <span className={`text-sm ${charCount.remaining < 20 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              {charCount.current} / {charCount.limit}
            </span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${charCount.percentage >= 100 ? 'bg-red-500' : 'bg-purple-600'}`}
                style={{ width: `${Math.min(charCount.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      {channelLimits[channel].attachments && messageData.attachments.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Attachments</label>
          <div className="space-y-2">
            {messageData.attachments.map((attachment, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                <span className="text-lg">📄</span>
                <span className="flex-1 text-sm text-gray-700 truncate">{attachment.name}</span>
                <span className="text-xs text-gray-500">
                  {(attachment.size / 1024).toFixed(2)} KB
                </span>
                <button
                  className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                  onClick={() => removeAttachment(idx)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileAttachment}
      />
    </div>
  );
};

export default MessageComposer;