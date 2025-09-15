// recruitment-app-mui/src/modules/benchSales/components/AICommunication/RecipientSelector.jsx

export const RecipientSelector = ({ recipients, onRecipientsChange, candidate }) => {
  const toggleRecipient = (type) => {
    onRecipientsChange({
      ...recipients,
      [type]: !recipients[type]
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">Recipients</label>
      <div className="space-y-3">
        <label className="flex items-start p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={recipients.candidate}
            onChange={() => toggleRecipient('candidate')}
            className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <div className="ml-3">
            <div className="font-medium text-gray-900">Candidate</div>
            <div className="text-sm text-gray-600">
              {candidate.name} ({candidate.email || 'No email'})
            </div>
          </div>
        </label>

        {candidate.referred_by && (
          <label className="flex items-start p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={recipients.referrer}
              onChange={() => toggleRecipient('referrer')}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div className="ml-3">
              <div className="font-medium text-gray-900">Referrer</div>
              <div className="text-sm text-gray-600">
                {candidate.referred_by} ({candidate.referrer_email || 'Contact info needed'})
              </div>
            </div>
          </label>
        )}
      </div>
    </div>
  );
};