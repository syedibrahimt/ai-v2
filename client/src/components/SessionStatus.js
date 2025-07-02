import React from 'react';

const SessionStatus = ({ active, currentAgent, agentInfo }) => {
  return (
    <div className="card session-status">
      <h3>Session Status</h3>
      <div>
        <span className={`status-indicator ${active ? 'active' : 'inactive'}`}></span>
        {active ? 'Active Session' : 'No Active Session'}
      </div>
      
      {active && currentAgent && agentInfo && (
        <div className="agent-info">
          <div className="agent-avatar">{agentInfo.avatar}</div>
          <div className="agent-name">{agentInfo.name}</div>
          <div className="agent-description">{agentInfo.description}</div>
          <div className="agent-role">
            <small>{agentInfo.role}</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionStatus;