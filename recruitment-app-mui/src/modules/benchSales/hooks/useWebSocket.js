// src/hooks/useWebSocket.js
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export const useWebSocket = (userId) => {
  const [socket, setSocket] = useState(null);
  const [formUpdates, setFormUpdates] = useState([]);

  useEffect(() => {
    if (!userId) return;

    // Create socket connection
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      newSocket.emit('join', userId);
    });

    // Listen for form completion events
    newSocket.on('formCompleted', (data) => {
      console.log('Form completed:', data);
      setFormUpdates(prev => [...prev, data]);
      
      // Show notification
      showNotification('Form Completed', `Candidate has submitted their form!`);
      
      // Update local storage
      const submissions = JSON.parse(localStorage.getItem('formSubmissions') || '[]');
      const index = submissions.findIndex(s => s.token === data.token);
      if (index >= 0) {
        submissions[index].status = 'completed';
        submissions[index].completedDate = new Date().toISOString();
        localStorage.setItem('formSubmissions', JSON.stringify(submissions));
      }
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('formUpdate', { detail: data }));
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userId]);

  const subscribeToCase = (caseId) => {
    if (socket) {
      socket.emit('subscribeToFormUpdates', caseId);
    }
  };

  return { socket, formUpdates, subscribeToCase };
};

// Helper function for notifications
function showNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  } else {
    // Fallback to toast or alert
    alert(`${title}: ${message}`);
  }
}