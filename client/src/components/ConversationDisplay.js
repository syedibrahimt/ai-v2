import React, { useEffect, useRef } from 'react';

const ConversationDisplay = ({ conversation }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const getMessageClass = (speaker) => {
    if (speaker === 'You') return 'user';
    if (speaker === 'System') return 'system';
    return 'agent';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card">
      <h3>Conversation</h3>
      <div className="conversation-display" ref={scrollRef}>
        {conversation.length === 0 ? (
          <div className="conversation-message system">
            <div>Start a session to begin your math tutoring! 🚀</div>
          </div>
        ) : (
          conversation.map((msg) => (
            <div key={msg.id} className={`conversation-message ${getMessageClass(msg.speaker)}`}>
              <div className="message-header">{msg.speaker}</div>
              <div className="message-content">{msg.message}</div>
              <div className="message-time">{formatTime(msg.timestamp)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationDisplay;