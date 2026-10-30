import React from 'react';
import {
  Compass,
  AlertTriangle,
  Calendar,
  User,
  MapPin,
  HelpCircle,
  Search,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export function InterpretationCard({ interpretation }) {
  if (!interpretation) return null;

  const { intent, summary } = interpretation;

  // Derive readable intent label and icon
  const getIntentMeta = (type) => {
    switch (type) {
      case 'CREATE_SNAG':
        return {
          label: 'Report Problem',
          icon: <AlertTriangle size={15} className="meta-icon warn" />,
          colorClass: 'intent-snag',
        };
      case 'CREATE_TASK':
        return {
          label: 'Create Task',
          icon: <Calendar size={15} className="meta-icon info" />,
          colorClass: 'intent-task',
        };
      case 'SEARCH_SNAGS':
        return {
          label: 'Search Problems',
          icon: <Search size={15} className="meta-icon cyan" />,
          colorClass: 'intent-search',
        };
      case 'SEARCH_TASKS':
        return {
          label: 'Search Tasks',
          icon: <Search size={15} className="meta-icon cyan" />,
          colorClass: 'intent-search',
        };
      case 'PROJECT_STATUS':
        return {
          label: 'Project Status',
          icon: <BarChart3 size={15} className="meta-icon green" />,
          colorClass: 'intent-status',
        };
      case 'NEED_CLARIFICATION':
        return {
          label: 'Clarification Needed',
          icon: <HelpCircle size={15} className="meta-icon amber" />,
          colorClass: 'intent-clarify',
        };
      default:
        return {
          label: 'Site Command',
          icon: <HelpCircle size={15} className="meta-icon muted" />,
          colorClass: 'intent-unknown',
        };
    }
  };

  const meta = getIntentMeta(intent);
  const pendingPayload = interpretation.pendingAction?.payload || null;

  return (
    <div className={`interpretation-card ${meta.colorClass}`}>
      <div className="interpretation-header">
        <div className="intent-title-row">
          <CheckCircle2 size={15} className="compass-icon" aria-hidden="true" />
          <span className="intent-pretitle">COMMAND UNDERSTANDING</span>
        </div>
        <div className="intent-action-badge">
          {meta.icon}
          <span className="intent-name-text">{meta.label}</span>
        </div>
      </div>

      {summary && (
        <div className="intent-summary-box">
          <p className="intent-summary-text">{summary}</p>
        </div>
      )}

      {/* Structured entity tags if available */}
      {pendingPayload && (
        <div className="extracted-entities-grid">
          {pendingPayload.title && (
            <div className="entity-item">
              <span className="entity-label">Title</span>
              <span className="entity-value">{pendingPayload.title}</span>
            </div>
          )}

          {pendingPayload.location && (
            <div className="entity-item">
              <span className="entity-label">
                <MapPin size={11} aria-hidden="true" /> Location
              </span>
              <span className="entity-value">{pendingPayload.location}</span>
            </div>
          )}

          {pendingPayload.assigneeName && (
            <div className="entity-item">
              <span className="entity-label">
                <User size={11} aria-hidden="true" /> Assigned To
              </span>
              <span className="entity-value">{pendingPayload.assigneeName}</span>
            </div>
          )}

          {pendingPayload.priority && (
            <div className="entity-item">
              <span className="entity-label">Priority</span>
              <StatusBadge status={pendingPayload.priority} type="priority" />
            </div>
          )}

          {pendingPayload.dueDate && (
            <div className="entity-item">
              <span className="entity-label">
                <Calendar size={11} aria-hidden="true" /> Deadline
              </span>
              <span className="entity-value">
                {new Date(pendingPayload.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InterpretationCard;
