import React from 'react';
import { X, MapPin, User, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge';

export function SearchResults({ results = [], searchType, querySummary, onClear }) {
  const isSnags = searchType === 'SEARCH_SNAGS';
  const typeLabel = isSnags ? 'snag' : 'task';
  const count = results.length;
  const headline = `${count} ${count === 1 ? typeLabel : typeLabel + 's'} found`;

  return (
    <div className="clean-search-results" role="region" aria-label="Search Results">
      <div className="search-header-row">
        <div>
          <h3 className="search-result-headline">{headline}</h3>
          {querySummary && <p className="search-result-subtext">{querySummary}</p>}
        </div>

        <button
          type="button"
          className="btn-dismiss-search"
          onClick={onClear}
          aria-label="Dismiss search results"
        >
          <X size={14} aria-hidden="true" />
          <span>Dismiss</span>
        </button>
      </div>

      {results.length === 0 ? (
        <div className="search-empty-box">
          <p className="empty-txt">No matching records found.</p>
        </div>
      ) : (
        <div className="search-cards-stack">
          {results.map((item) => (
            <div key={item._id} className="search-item-row">
              <div className="search-item-main">
                <span className="search-item-title">{item.title}</span>
                <div className="search-item-details">
                  {isSnags && item.location && (
                    <span className="search-detail-item">
                      <MapPin size={12} aria-hidden="true" /> {item.location}
                    </span>
                  )}
                  {item.assigneeId && (
                    <span className="search-detail-item">
                      <User size={12} aria-hidden="true" /> {item.assigneeId.name}
                    </span>
                  )}
                  {!isSnags && item.dueDate && (
                    <span className="search-detail-item">
                      <Calendar size={12} aria-hidden="true" />{' '}
                      {new Date(item.dueDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="search-item-badges">
                {item.priority && <StatusBadge status={item.priority} type="priority" />}
                <StatusBadge status={item.status} type="status" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchResults;

