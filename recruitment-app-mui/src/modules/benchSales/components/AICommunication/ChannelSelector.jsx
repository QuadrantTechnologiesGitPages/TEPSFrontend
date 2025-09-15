
// recruitment-app-mui/src/modules/benchSales/components/AICommunication/ChannelSelector.jsx

import React from 'react';

const ChannelSelector = ({ selectedChannel, onChannelChange, channelStatus }) => {
  const channels = [
    { id: 'email', name: 'Email', icon: '📧', color: 'blue' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: 'green' },
    { id: 'teams', name: 'Teams', icon: '👥', color: 'indigo' },
    { id: 'sms', name: 'SMS', icon: '📱', color: 'gray' },
    { id: 'phone', name: 'Phone', icon: '📞', color: 'emerald' }
  ];

  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: isActive ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-300',
      green: isActive ? 'border-green-500 bg-green-50' : 'hover:border-green-300',
      indigo: isActive ? 'border-indigo-500 bg-indigo-50' : 'hover:border-indigo-300',
      gray: isActive ? 'border-gray-500 bg-gray-50' : 'hover:border-gray-300',
      emerald: isActive ? 'border-emerald-500 bg-emerald-50' : 'hover:border-emerald-300'
    };
    return colorMap[color] || '';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">Select Communication Channel</label>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {channels.map(channel => {
          const status = channelStatus[channel.id];
          const isDisabled = !status?.available || !status?.configured;
          const isActive = selectedChannel === channel.id;
          
          return (
            <button
              key={channel.id}
              className={`
                relative p-4 bg-white border-2 rounded-lg transition-all
                ${isActive ? getColorClasses(channel.color, true) : 'border-gray-200'}
                ${!isActive && !isDisabled ? getColorClasses(channel.color, false) : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
              `}
              onClick={() => !isDisabled && onChannelChange(channel.id)}
              disabled={isDisabled}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">{channel.icon}</span>
                <span className="text-sm font-medium text-gray-700">{channel.name}</span>
              </div>
              {!status?.configured && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">
                  Not configured
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};