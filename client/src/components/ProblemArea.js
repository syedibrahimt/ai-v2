import React from 'react';

const ProblemArea = ({ problem }) => {
  if (!problem) return null;

  return (
    <div className="card problem-area">
      <h3>📝 Current Problem</h3>
      <div className="problem-text">{problem}</div>
      <div>
        <small>Think about it, then speak your answer or ask for help!</small>
      </div>
    </div>
  );
};

export default ProblemArea;