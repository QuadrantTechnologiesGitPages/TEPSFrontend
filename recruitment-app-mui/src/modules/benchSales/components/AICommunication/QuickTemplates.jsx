// recruitment-app-mui/src/modules/benchSales/components/AICommunication/QuickTemplates.jsx

export const QuickTemplates = ({ templates, onSelectTemplate, candidateStatus, loading }) => {
  const defaultTemplates = [
    {
      id: 'intro',
      name: 'Introduction',
      icon: '👋',
      description: 'Initial outreach to candidate',
      statuses: ['Active']
    },
    {
      id: 'interview',
      name: 'Interview Invitation',
      icon: '📅',
      description: 'Schedule interview with candidate',
      statuses: ['Active']
    },
    {
      id: 'followup',
      name: 'Follow-up',
      icon: '🔄',
      description: 'Check in on candidate status',
      statuses: ['Active', 'On Hold']
    },
    {
      id: 'placement',
      name: 'Placement Confirmation',
      icon: '🎉',
      description: 'Congratulate on successful placement',
      statuses: ['Placed']
    },
    {
      id: 'referrer-update',
      name: 'Referrer Update',
      icon: '📊',
      description: 'Update referrer on candidate progress',
      statuses: ['Active', 'Placed']
    },
    {
      id: 'documents',
      name: 'Document Request',
      icon: '📄',
      description: 'Request additional documents',
      statuses: ['Active']
    },
    {
      id: 'rejection',
      name: 'Position Filled',
      icon: '🚫',
      description: 'Inform about position being filled',
      statuses: ['Inactive']
    },
    {
      id: 'reactivation',
      name: 'Reactivation',
      icon: '🔥',
      description: 'Re-engage inactive candidate',
      statuses: ['Inactive']
    }
  ];

  const relevantTemplates = defaultTemplates.filter(
    template => template.statuses.includes(candidateStatus)
  );

  const otherTemplates = defaultTemplates.filter(
    template => !template.statuses.includes(candidateStatus)
  );

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-3">
          Recommended for {candidateStatus} Status
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {relevantTemplates.map(template => (
            <button
              key={template.id}
              className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onSelectTemplate(template)}
              disabled={loading}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-3xl">{template.icon}</span>
                <span className="font-semibold text-gray-900 text-sm">{template.name}</span>
                <span className="text-xs text-gray-600 line-clamp-2">{template.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {otherTemplates.length > 0 && (
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">Other Templates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {otherTemplates.map(template => (
              <button
                key={template.id}
                className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onSelectTemplate(template)}
                disabled={loading}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="text-3xl">{template.icon}</span>
                  <span className="font-semibold text-gray-900 text-sm">{template.name}</span>
                  <span className="text-xs text-gray-600 line-clamp-2">{template.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {templates.length > 0 && (
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">Custom Templates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {templates.map(template => (
              <button
                key={template.id}
                className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onSelectTemplate(template)}
                disabled={loading}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="text-3xl">⭐</span>
                  <span className="font-semibold text-gray-900 text-sm">{template.name}</span>
                  <span className="text-xs text-gray-600 line-clamp-2">{template.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};