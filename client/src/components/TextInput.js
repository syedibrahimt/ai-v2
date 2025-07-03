import React, { useState } from 'react';

const TextInput = ({ sessionActive, onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && sessionActive) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!sessionActive) {
    return null;
  }

  return (
    <div className="card text-input">
      <h3>Type Your Response</h3>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            rows={3}
            disabled={!sessionActive}
          />
          <button 
            type="submit" 
            className="control-button primary"
            disabled={!message.trim() || !sessionActive}
          >
            📨 Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default TextInput;