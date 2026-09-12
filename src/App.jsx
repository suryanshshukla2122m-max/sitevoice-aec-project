import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import VoiceCommandPanel from './components/VoiceCommandPanel';
import InterpretationCard from './components/InterpretationCard';
import ConfirmationCard from './components/ConfirmationCard';
import AssistantResponse from './components/AssistantResponse';
import ProjectOverview from './components/ProjectOverview';
import SnagList from './components/SnagList';
import TaskList from './components/TaskList';
import ProjectStatusView from './components/ProjectStatusView';
import SearchResults from './components/SearchResults';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import {
  getProjects,
  getProjectSummary,
  getSnags,
  getTasks,
  interpretVoice,
  executeAction,
} from './services/api';

export default function App() {
  // 1. Projects & Selected Context State
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectSummary, setProjectSummary] = useState(null);
  const [snags, setSnags] = useState([]);
  const [tasks, setTasks] = useState([]);

  // 2. Navigation State & Mobile Drawer
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 3. Loading & UI States
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingSnags, setIsLoadingSnags] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasRecentSuccess, setHasRecentSuccess] = useState(false);

  // 4. Command Pipeline & Feedback States
  const [interpretation, setInterpretation] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [assistantMessage, setAssistantMessage] = useState('');

  // 5. Search Results State
  const [searchResults, setSearchResults] = useState(null);
  const [searchType, setSearchType] = useState(null);
  const [searchSummary, setSearchSummary] = useState('');

  // 6. System Notifications
  const [notification, setNotification] = useState(null);

  // 7. Speech Synthesis Hook (Audio playback)
  const { speak, isSpeaking, isMuted, toggleMute } = useSpeechSynthesis();

  // Helper to show transient alerts
  const notify = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
  };

  // -------------------------------------------------------------
  // Load Project Details (Summary, Snags, Tasks)
  // -------------------------------------------------------------
  const loadProjectData = useCallback(async (projectId) => {
    if (!projectId) return;

    setIsLoadingSummary(true);
    setIsLoadingSnags(true);
    setIsLoadingTasks(true);

    try {
      const [summaryRes, snagsRes, tasksRes] = await Promise.all([
        getProjectSummary(projectId),
        getSnags({ projectId }),
        getTasks({ projectId }),
      ]);

      if (summaryRes.success) setProjectSummary(summaryRes);
      if (snagsRes.success) setSnags(snagsRes.data || []);
      if (tasksRes.success) setTasks(tasksRes.data || []);
    } catch (err) {
      notify(`Failed to fetch project data: ${err.message}`, 'error');
    } finally {
      setIsLoadingSummary(false);
      setIsLoadingSnags(false);
      setIsLoadingTasks(false);
    }
  }, []);

  // -------------------------------------------------------------
  // Initial Project Bootstrap
  // -------------------------------------------------------------
  useEffect(() => {
    async function initProjects() {
      setIsLoadingProjects(true);
      try {
        const res = await getProjects();
        if (res.success && res.data && res.data.length > 0) {
          setProjects(res.data);
          const defaultProj = res.data.find((p) => p.status === 'Active') || res.data[0];
          setSelectedProject(defaultProj);
          await loadProjectData(defaultProj._id);
        } else {
          notify('No projects found. Please ensure project data is initialized.', 'error');
        }
      } catch (err) {
        notify(`Failed to connect to backend: ${err.message}`, 'error');
      } finally {
        setIsLoadingProjects(false);
      }
    }
    initProjects();
  }, [loadProjectData]);

  // Handle Project Change
  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setSearchResults(null);
    setSearchType(null);
    setPendingAction(null);
    setInterpretation(null);
    setAssistantMessage('');
    await loadProjectData(project._id);
    notify(`Active project: ${project.name}`, 'info');
  };

  // -------------------------------------------------------------
  // Voice / Command Interpretation Handler
  // -------------------------------------------------------------
  const handleSendCommand = async (text) => {
    if (!text || !text.trim()) return;

    const trimmed = text.trim();
    setIsInterpreting(true);
    setPendingAction(null);
    setHasRecentSuccess(false);

    try {
      const response = await interpretVoice({
        transcript: trimmed,
        projectId: selectedProject?._id,
      });

      if (!response.success) {
        throw new Error(response.message || 'Interpretation failed.');
      }

      setInterpretation(response);

      const spoken =
        response.spokenResponse ||
        response.summary ||
        (response.requiresConfirmation
          ? 'Action staged for review. Please confirm to save.'
          : 'Command processed.');
      setAssistantMessage(spoken);
      speak(spoken);

      // Handle Write Confirmation Requirement
      if (response.requiresConfirmation && response.pendingAction) {
        setPendingAction(response.pendingAction);
        setSearchResults(null);
      } else {
        setPendingAction(null);
      }

      // Handle Search Queries
      if (response.intent === 'SEARCH_SNAGS' || response.intent === 'SEARCH_TASKS') {
        setSearchResults(response.results || []);
        setSearchType(response.intent);
        setSearchSummary(response.summary || `Found ${response.count || 0} matching items.`);
      } else {
        setSearchResults(null);
        setSearchType(null);
      }

      // Handle Project Status request
      if (response.intent === 'PROJECT_STATUS') {
        setActiveTab('status');
        if (selectedProject) {
          getProjectSummary(selectedProject._id).then((sum) => {
            if (sum.success) setProjectSummary(sum);
          });
        }
      }
    } catch (err) {
      const errMsg = err.message || 'Error communicating with backend voice interpreter.';
      notify(errMsg, 'error');
      setAssistantMessage(`Sorry, I encountered an issue: ${errMsg}`);
      speak('Sorry, I encountered an issue processing that command.');
    } finally {
      setIsInterpreting(false);
    }
  };

  // -------------------------------------------------------------
  // Speech Recognition Hook Integration
  // -------------------------------------------------------------
  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    error: voiceError,
    isSupported: isVoiceSupported,
  } = useSpeechRecognition({
    onResult: (finalText) => {
      handleSendCommand(finalText);
    },
    onError: (err) => {
      notify(err, 'error');
    },
  });

  // -------------------------------------------------------------
  // Confirmation Handlers (Write Actions)
  // -------------------------------------------------------------
  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsExecuting(true);
    try {
      const result = await executeAction({
        actionType: pendingAction.actionType,
        projectId: pendingAction.projectId,
        payload: pendingAction.payload,
      });

      if (!result.success) {
        throw new Error(result.message || 'Database write failed.');
      }

      const successFeedback =
        result.message ||
        result.spokenResponse ||
        (pendingAction.actionType === 'CREATE_SNAG'
          ? 'Snag created successfully.'
          : 'Task scheduled successfully.');

      notify(successFeedback, 'success');
      setAssistantMessage(successFeedback);
      speak(successFeedback);

      setHasRecentSuccess(true);
      setTimeout(() => setHasRecentSuccess(false), 3500);

      // Clear pending state
      setPendingAction(null);
      setInterpretation(null);

      // Switch to the relevant tab to show the newly created item
      if (pendingAction.actionType === 'CREATE_SNAG') {
        setActiveTab('snags');
      } else if (pendingAction.actionType === 'CREATE_TASK') {
        setActiveTab('tasks');
      }

      // Immediately refresh active project summary and registry data from MongoDB
      if (selectedProject) {
        await loadProjectData(selectedProject._id);
      }
    } catch (err) {
      const failMsg = `Action could not be saved: ${err.message}`;
      notify(failMsg, 'error');
      setAssistantMessage(failMsg);
      speak('Failed to save record.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    const cancelMsg = 'Action cancelled. No changes were saved.';
    notify(cancelMsg, 'info');
    setAssistantMessage(cancelMsg);
    speak('Action cancelled.');
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchType(null);
    setSearchSummary('');
  };

  return (
    <div className="sitevoice-app-shell">
      {/* 4. Desktop Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSearchResults(null);
        }}
        snagCount={snags.length}
        taskCount={tasks.length}
        selectedProject={selectedProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="sitevoice-main-content">
        {/* 4. Clean Top Header: Page Title Only */}
        <Header
          activeTab={activeTab}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Workspace Body */}
        <main className="sitevoice-workspace">
          {/* Notification Alert (transient banner) */}
          {notification && (
            <div className={`clean-alert-toast ${notification.type}`} role="status">
              <span>{notification.message}</span>
              <button
                type="button"
                className="toast-dismiss-btn"
                onClick={() => setNotification(null)}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}

          {/* Search Results (When user issued a search query) */}
          {searchResults !== null ? (
            <SearchResults
              results={searchResults}
              searchType={searchType}
              querySummary={searchSummary}
              onClear={handleClearSearch}
            />
          ) : (
            <>
              {/* If active tab is OVERVIEW: Compact Voice Bar + 4 Metrics + Recent Activity */}
              {activeTab === 'overview' && (
                <div className="overview-page-layout">
                  {/* 5, 6, 7. Compact Voice Command Bar + subtle helpers */}
                  <VoiceCommandPanel
                    isListening={isListening}
                    interimTranscript={interimTranscript}
                    onStartListening={startListening}
                    onStopListening={stopListening}
                    isInterpreting={isInterpreting}
                    onSendCommand={handleSendCommand}
                    isVoiceSupported={isVoiceSupported}
                    voiceError={voiceError}
                    hasPendingAction={!!pendingAction}
                    hasRecentSuccess={hasRecentSuccess}
                  />

                  {/* Non-modal Voice Feedback (Assistant voice response or query interpretation) */}
                  {!pendingAction && (interpretation || assistantMessage) && (
                    <div className="voice-inline-feedback">
                      {interpretation ? (
                        <InterpretationCard interpretation={interpretation} />
                      ) : (
                        <AssistantResponse
                          message={assistantMessage}
                          onReplay={(msg) => speak(msg)}
                          isSpeaking={isSpeaking}
                        />
                      )}
                    </div>
                  )}

                  {/* 9, 10. Four Overview Metrics & Recent Activity */}
                  <ProjectOverview
                    summary={projectSummary}
                    snags={snags}
                    tasks={tasks}
                    isLoading={isLoadingSummary}
                    onNavigate={(tab) => setActiveTab(tab)}
                  />
                </div>
              )}

              {/* Active Tab: SNAGS (Section 10) */}
              {activeTab === 'snags' && (
                <div className="registry-tab-layout">
                  <SnagList snags={snags} isLoading={isLoadingSnags} />
                </div>
              )}

              {/* Active Tab: TASKS (Section 11) */}
              {activeTab === 'tasks' && (
                <div className="registry-tab-layout">
                  <TaskList tasks={tasks} isLoading={isLoadingTasks} />
                </div>
              )}

              {/* Active Tab: PROJECT STATUS (Section 12) */}
              {activeTab === 'status' && (
                <div className="registry-tab-layout">
                  <ProjectStatusView
                    project={selectedProject}
                    summary={projectSummary}
                    snags={snags}
                    tasks={tasks}
                    isLoading={isLoadingSummary}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 8. CREATE_SNAG / CREATE_TASK confirmation as an overlay/modal so it does not push the page downward */}
      {pendingAction && (
        <ConfirmationCard
          pendingAction={pendingAction}
          projectName={selectedProject?.name || 'Skyline Residence'}
          projectCode={selectedProject?.code || 'SKY-204'}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
          isExecuting={isExecuting}
        />
      )}
    </div>
  );
}
