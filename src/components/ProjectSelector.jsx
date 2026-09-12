import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';

export function ProjectSelector({ projects = [], selectedProject, onSelectProject, isLoading }) {
  const currentProjectId = selectedProject ? selectedProject._id : '';

  return (
    <div className="project-selector-wrapper">
      <div className="project-selector-icon">
        <Building2 size={16} aria-hidden="true" />
      </div>
      <div className="project-selector-content">
        <label htmlFor="project-select" className="sr-only">
          Select Active AEC Project
        </label>
        <select
          id="project-select"
          className="project-select-element"
          value={currentProjectId}
          onChange={(e) => {
            const found = projects.find((p) => p._id === e.target.value);
            if (found) onSelectProject(found);
          }}
          disabled={isLoading || projects.length === 0}
        >
          {projects.length === 0 && (
            <option value="">{isLoading ? 'Loading Projects...' : 'No Projects Found'}</option>
          )}
          {projects.map((proj) => (
            <option key={proj._id} value={proj._id}>
              {proj.name} ({proj.location || 'Site'})
            </option>
          ))}
        </select>
      </div>
      <div className="project-selector-arrow">
        <ChevronDown size={14} aria-hidden="true" />
      </div>
    </div>
  );
}

export default ProjectSelector;
