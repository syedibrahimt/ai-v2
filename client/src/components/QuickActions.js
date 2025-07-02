import React from 'react';

const QuickActions = ({ onAction }) => {
  const actions = [
    { text: 'I need help', action: 'I need help with this problem' },
    { text: 'Next problem', action: 'I\'m ready for the next problem' },
    { text: 'Repeat that', action: 'Can you repeat that please?' },
    { text: 'I don\'t understand', action: 'I don\'t understand this step' }
  ];

  return (
    <div className="card">
      <h3>Quick Actions</h3>
      <div className="quick-actions">
        {actions.map((action, index) => (
          <button
            key={index}
            className="quick-action-btn"
            onClick={() => onAction(action.action)}
          >
            {action.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;