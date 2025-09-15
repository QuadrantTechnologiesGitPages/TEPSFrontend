// recruitment-app-mui/src/modules/benchSales/components/AICommunication/AICommunicationHub.jsx

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import candidateService from '../../services/candidateService';
import aiCommunicationService from '../../services/aiCommunicationService';
import MessageComposer from './MessageComposer';
import ChannelSelector from './ChannelSelector';
import { RecipientSelector, MessageHistory, QuickTemplates } from './ChannelSelector';

const AICommunicationHub = ({ candidateId, onClose }) => {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('compose'); // compose, history, templates
  
  // Communication state
  const [selectedChannel, setSelectedChannel] = useState('email');
  const [recipients, setRecipients] = useState({
    candidate: true,
    referrer: false
  });
  const [messageData, setMessageData] = useState({
    subject: '',
    body: '',
    attachments: []
  });
  
  // AI state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [messageHistory, setMessageHistory] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  // Channel availability
  const [channelStatus, setChannelStatus] = useState({
    email: { available: true, configured: true },
    whatsapp: { available: true, configured: false },
    teams: { available: true, configured: false },
    phone: { available: true, configured: false },
    sms: { available: true, configured: false }
  });

  useEffect(() => {
    if (candidateId) {
      fetchCandidateData();
      fetchMessageHistory();
      fetchTemplates();
      checkChannelStatus();
    }
  }, [candidateId]);

  const fetchCandidateData = async () => {
    setLoading(true);
    try {
      const data = await candidateService.getCandidateById(candidateId);
      const candidateData = data.candidate || data;
      
      // Parse skills if needed
      if (typeof candidateData.skills === 'string') {
        try {
          candidateData.skills = JSON.parse(candidateData.skills);
        } catch {
          candidateData.skills = candidateData.skills.split(',').map(s => s.trim());
        }
      }
      
      setCandidate(candidateData);
      
      // Set default subject based on candidate status
      const defaultSubject = generateDefaultSubject(candidateData);
      setMessageData(prev => ({ ...prev, subject: defaultSubject }));
      
      // Build AI context
      const context = buildAIContext(candidateData);
      setAiContext(context);
      
    } catch (error) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageHistory = async () => {
    try {
      const history = await aiCommunicationService.getMessageHistory(candidateId);
      setMessageHistory(history);
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const templates = await aiCommunicationService.getTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const checkChannelStatus = async () => {
    try {
      const status = await aiCommunicationService.checkChannelStatus();
      setChannelStatus(status);
    } catch (error) {
      console.error('Error checking channel status:', error);
    }
  };

  const generateDefaultSubject = (candidate) => {
    const statusSubjects = {
      'Active': `Exciting Opportunity for ${candidate.name}`,
      'Placed': `Congratulations on Your Placement, ${candidate.name}!`,
      'On Hold': `Update on Your Application Status`,
      'Inactive': `Reconnecting - New Opportunities Available`
    };
    return statusSubjects[candidate.status] || `Opportunity Update for ${candidate.name}`;
  };

  const buildAIContext = (candidate) => {
    const parts = [
      `Candidate: ${candidate.name}`,
      `Email: ${candidate.email}`,
      `Status: ${candidate.status}`,
      `Skills: ${Array.isArray(candidate.skills) ? candidate.skills.join(', ') : 'N/A'}`,
      `Experience: ${candidate.years_experience || 'N/A'} years`,
      `Location: ${candidate.current_location || 'N/A'}`,
      `Visa: ${candidate.visa_status || 'N/A'}`,
      `Availability: ${candidate.availability || 'N/A'}`
    ];
    
    if (candidate.notes) {
      parts.push(`Notes: ${candidate.notes}`);
    }
    
    if (candidate.referred_by) {
      parts.push(`Referred by: ${candidate.referred_by}`);
    }
    
    return parts.join('\n');
  };

  const handleGenerateWithAI = async (prompt) => {
    setAiGenerating(true);
    try {
      const generatedMessage = await aiCommunicationService.generateMessage({
        prompt,
        context: aiContext,
        channel: selectedChannel,
        recipientType: recipients.referrer ? 'referrer' : 'candidate',
        candidateStatus: candidate.status,
        template: null
      });
      
      setMessageData({
        subject: generatedMessage.subject || messageData.subject,
        body: generatedMessage.body
      });
      
      toast.success('Message generated successfully');
    } catch (error) {
      console.error('Error generating message:', error);
      toast.error('Failed to generate message with AI');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleTemplateSelect = async (template) => {
    setAiGenerating(true);
    try {
      const generatedMessage = await aiCommunicationService.generateMessage({
        context: aiContext,
        channel: selectedChannel,
        recipientType: recipients.referrer ? 'referrer' : 'candidate',
        candidateStatus: candidate.status,
        template: template.id
      });
      
      setMessageData({
        subject: generatedMessage.subject || template.subject,
        body: generatedMessage.body
      });
      
      setActiveTab('compose');
      toast.success('Template applied successfully');
    } catch (error) {
      toast.error('Failed to apply template');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageData.body.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    const recipientList = [];
    if (recipients.candidate && candidate.email) {
      recipientList.push({
        type: 'candidate',
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone
      });
    }
    if (recipients.referrer && candidate.referred_by) {
      recipientList.push({
        type: 'referrer',
        name: candidate.referred_by,
        email: candidate.referrer_email || '',
        phone: candidate.referrer_phone || ''
      });
    }
    
    if (recipientList.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    
    try {
      const result = await aiCommunicationService.sendMessage({
        candidateId: candidate.id,
        channel: selectedChannel,
        recipients: recipientList,
        subject: messageData.subject,
        body: messageData.body,
        attachments: messageData.attachments
      });
      
      if (result.success) {
        toast.success(`Message sent via ${selectedChannel}`);
        
        // Refresh history
        fetchMessageHistory();
        
        // Clear message
        setMessageData({
          subject: generateDefaultSubject(candidate),
          body: '',
          attachments: []
        });
        
        // Switch to history tab
        setActiveTab('history');
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    }
  };

  const handleChannelChange = (channel) => {
    setSelectedChannel(channel);
    
    // Adjust message format based on channel
    if (channel === 'whatsapp' || channel === 'sms') {
      // For WhatsApp/SMS, combine subject and body
      if (messageData.subject && !messageData.body.includes(messageData.subject)) {
        setMessageData(prev => ({
          ...prev,
          body: `${prev.subject}\n\n${prev.body}`
        }));
      }
    }
  };

  const handleScheduleMessage = async (scheduleTime) => {
    try {
      const result = await aiCommunicationService.scheduleMessage({
        candidateId: candidate.id,
        channel: selectedChannel,
        recipients: getRecipientList(),
        subject: messageData.subject,
        body: messageData.body,
        scheduleTime
      });
      
      if (result.success) {
        toast.success(`Message scheduled for ${new Date(scheduleTime).toLocaleString()}`);
        setActiveTab('history');
      }
    } catch (error) {
      toast.error('Failed to schedule message');
    }
  };

  const getRecipientList = () => {
    const list = [];
    if (recipients.candidate) list.push('candidate');
    if (recipients.referrer) list.push('referrer');
    return list;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Loading communication hub...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">Candidate not found</p>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-800',
      'Placed': 'bg-blue-100 text-blue-800',
      'On Hold': 'bg-yellow-100 text-yellow-800',
      'Inactive': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-6xl mx-auto overflow-hidden flex flex-col h-[90vh]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">AI Communication Hub</h2>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <span className="font-medium">{candidate.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(candidate.status)}`}>
                {candidate.status}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-50 border-b border-gray-200">
        {[
          { id: 'compose', label: 'Compose', icon: '✍️' },
          { id: 'templates', label: 'Templates', icon: '📋' },
          { id: 'history', label: `History (${messageHistory.length})`, icon: '📜' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 font-medium transition-all relative
              ${activeTab === tab.id 
                ? 'text-purple-600 bg-white' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {activeTab === 'compose' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <ChannelSelector
              selectedChannel={selectedChannel}
              onChannelChange={handleChannelChange}
              channelStatus={channelStatus}
            />

            <RecipientSelector
              recipients={recipients}
              onRecipientsChange={setRecipients}
              candidate={candidate}
            />

            <MessageComposer
              channel={selectedChannel}
              messageData={messageData}
              onMessageChange={setMessageData}
              onGenerateWithAI={handleGenerateWithAI}
              aiGenerating={aiGenerating}
              candidateContext={aiContext}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMessageData({ subject: '', body: '', attachments: [] })}
              >
                Clear
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                onClick={() => {
                  const time = new Date();
                  time.setHours(time.getHours() + 1);
                  handleScheduleMessage(time);
                }}
              >
                <span>⏰</span>
                Schedule
              </button>
              <button
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={handleSendMessage}
                disabled={!messageData.body.trim() || (!recipients.candidate && !recipients.referrer)}
              >
                <span>📤</span>
                Send via {selectedChannel}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <QuickTemplates
            templates={templates}
            onSelectTemplate={handleTemplateSelect}
            candidateStatus={candidate.status}
            loading={aiGenerating}
          />
        )}

        {activeTab === 'history' && (
          <MessageHistory
            history={messageHistory}
            onResend={(message) => {
              setMessageData({
                subject: message.subject,
                body: message.body,
                attachments: []
              });
              setSelectedChannel(message.channel);
              setActiveTab('compose');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AICommunicationHub;