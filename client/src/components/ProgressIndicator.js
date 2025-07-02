import React from 'react';

const ProgressIndicator = ({ currentAgent }) => {
  const steps = [
    { id: 'welcomer', name: 'Welcome', icon: '👋' },
    { id: 'question-presenter', name: 'Problem', icon: '📚' },
    { id: 'step-by-step-tutor', name: 'Tutoring', icon: '🎯' }
  ];

  const getStepClass = (stepId) => {
    if (stepId === currentAgent) return 'active';
    
    const currentIndex = steps.findIndex(step => step.id === currentAgent);
    const stepIndex = steps.findIndex(step => step.id === stepId);
    
    if (currentIndex > stepIndex) return 'completed';
    return '';
  };

  return (
    <div className="card">
      <h3>Session Progress</h3>
      <div className="progress-indicator">
        {steps.map((step, index) => (
          <div key={step.id} className={`progress-step ${getStepClass(step.id)}`}>
            <div>{step.icon}</div>
            <div>{step.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;