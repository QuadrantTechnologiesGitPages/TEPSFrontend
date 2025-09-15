// recruitment-app-mui/src/modules/benchSales/components/AICommunication/MessageHistory.jsx

export const MessageHistory = ({ history, onResend }) => {
  const getChannelIcon = (channel) => {
    const icons = {
      email: '📧',
      whatsapp: '💬',
      teams: '👥',
      sms: '📱',
      phone: '📞'
    };
    return icons[channel] || '📮';
  };

  const getStatusColor = (status) => {
    const colors = {
      sent: 'text-green-600 bg-green-50',
      failed: 'text-red-600 bg-red-50',
      scheduled: 'text-amber-600 bg-amber-50',
      draft: 'text-gray-600 bg-gray-50'
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="block text-5xl mb-4">📭</span>
        <p className="text-gray-600">No messages sent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((message) => (
        <div key={message.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
              {getChannelIcon(message.channel)} {message.channel}
            </span>
            <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(message.status)}`}>
              {message.status}
            </span>
            <span className="ml-auto text-sm text-gray-500">
              {new Date(message.sentAt).toLocaleString()}
            </span>
          </div>
          
          <div className="mb-3">
            {message.subject && (
              <div className="font-semibold text-gray-900 mb-1">{message.subject}</div>
            )}
            <div className="text-gray-600 text-sm line-clamp-3">
              {message.body}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              To: {message.recipients.map(r => r.name).join(', ')}
            </div>
            <button
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
              onClick={() => onResend(message)}
            >
              Use as template
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
