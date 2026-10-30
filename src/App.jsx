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
import CreateSnagModal from './components/CreateSnagModal';
import CreateTaskModal from './components/CreateTaskModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import LoginModal from './components/LoginModal';
import MyWorkView from './components/MyWorkView';
import ReportedProblemsView from './components/ReportedProblemsView';
import UserProfileView from './components/UserProfileView';
import ProjectManagementView from './components/ProjectManagementView';
import TeamManagementView from './components/TeamManagementView';

import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import {
  getCurrentUser,
  loginUser,
  switchUserSession,
  logoutUser,
  getProjects,
  getProjectSummary,
  createProject,
  updateProject,
  deleteProject,
  getSnags,
  getTasks,
  getMyWork,
  getUsers,
  createUser,
  updateUser,
  createSnag,
  createTask,
  updateSnag,
  deleteSnag,
  updateTask,
  addTaskUpdate,
  deleteTask,
  interpretVoice,
  executeAction,
} from './services/api';

export default function App() {
  // 1. User Authentication & Role State
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // 2. Projects & Selected Context State
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectSummary, setProjectSummary] = useState(null);
  const [snags, setSnags] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [myWorkTasks, setMyWorkTasks] = useState([]);
  const [users, setUsers] = useState([]);

  // 3. Navigation State & Filter Presets
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [snagInitialFilter, setSnagInitialFilter] = useState('ALL');
  const [taskInitialFilter, setTaskInitialFilter] = useState('ALL');
  const [snagExpandedId, setSnagExpandedId] = useState(null);
  const [taskExpandedId, setTaskExpandedId] = useState(null);

  // 4. Loading & UI States
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingSnags, setIsLoadingSnags] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingMyWork, setIsLoadingMyWork] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasRecentSuccess, setHasRecentSuccess] = useState(false);

  // 5. Modal Dialog States
  const [isCreateSnagOpen, setIsCreateSnagOpen] = useState(false);
  const [snagModalInitialData, setSnagModalInitialData] = useState(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    item: null,
    type: null,
    isDeleting: false,
  });

  // 6. Command Pipeline & Feedback States
  const [interpretation, setInterpretation] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [assistantMessage, setAssistantMessage] = useState('');

  // 7. Search Results State
  const [searchResults, setSearchResults] = useState(null);
  const [searchType, setSearchType] = useState(null);
  const [searchSummary, setSearchSummary] = useState('');

  // 8. System Notifications
  const [notification, setNotification] = useState(null);

  // 9. Speech Synthesis Hook (Audio playback)
  const { speak, isSpeaking, isMuted, toggleMute } = useSpeechSynthesis();

  // Helper to show transient alerts
  const notify = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
  };

  const isWorker =
    currentUser &&
    currentUser.role !== 'Admin' &&
    currentUser.role !== 'Project Manager';

  // -------------------------------------------------------------
  // Load Project Data (Summary, Snags, Tasks for selected project)
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
  // Load My Work (For logged-in contractor/worker)
  // -------------------------------------------------------------
  const loadMyWorkData = useCallback(async (userId = null) => {
    setIsLoadingMyWork(true);
    try {
      const params = {};
      if (userId) params.assigneeId = userId;
      const res = await getMyWork(params);
      if (res.success) {
        setMyWorkTasks(res.data || []);
      }
    } catch (err) {
      console.warn('Could not load assigned work:', err);
    } finally {
      setIsLoadingMyWork(false);
    }
  }, []);

  // -------------------------------------------------------------
  // Initial Bootstrap: Auth Session, Projects, Users
  // -------------------------------------------------------------
  useEffect(() => {
    async function initApp() {
      setIsLoadingProjects(true);
      try {
        // 1. Fetch current authenticated user
        let user = null;
        const authRes = await getCurrentUser().catch(() => ({ success: false }));
        if (authRes.success && authRes.user) {
          user = authRes.user;
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
          setIsLoginModalOpen(true);
        }

        // 2. Fetch projects and users list
        const [projRes, userRes] = await Promise.all([
          getProjects(),
          getUsers().catch(() => ({ success: false, data: [] })),
        ]);

        if (userRes.success && userRes.data) {
          setUsers(userRes.data);
        }

        if (projRes.success && projRes.data && projRes.data.length > 0) {
          setProjects(projRes.data);
          const defaultProj = projRes.data.find((p) => p.status === 'Active') || projRes.data[0];
          setSelectedProject(defaultProj);
          await loadProjectData(defaultProj._id);
        } else {
          notify('No projects found. Please ensure project data is initialized.', 'error');
        }

        // If logged-in user is a contractor/worker, load their work & default to 'mywork' tab
        if (user && user.role !== 'Admin' && user.role !== 'Project Manager') {
          setActiveTab('mywork');
          await loadMyWorkData(user._id);
        } else {
          setActiveTab('overview');
        }
      } catch (err) {
        notify(`Failed to connect to backend: ${err.message}`, 'error');
      } finally {
        setIsLoadingProjects(false);
      }
    }

    initApp();
  }, [loadProjectData, loadMyWorkData]);

  // -------------------------------------------------------------
  // Handle Project Change
  // -------------------------------------------------------------
  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setSearchResults(null);
    setSearchType(null);
    setPendingAction(null);
    setInterpretation(null);
    setAssistantMessage('');
    await loadProjectData(project._id);
    notify(`Switched active project to ${project.name}`, 'info');
  };

  // -------------------------------------------------------------
  // Auth Handlers (Login, Quick Switch, Logout)
  // -------------------------------------------------------------
  const handleLogin = async ({ email, password }) => {
    setIsAuthLoading(true);
    try {
      const res = await loginUser({ email, password });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        notify(res.message || `Logged in as ${res.user.name}`, 'success');

        // Reload projects accessible by this user
        const projRes = await getProjects();
        if (projRes.success && projRes.data) {
          setProjects(projRes.data);
          if (projRes.data.length > 0) {
            setSelectedProject(projRes.data[0]);
            await loadProjectData(projRes.data[0]._id);
          }
        }

        // Set role default view
        if (res.user.role !== 'Admin' && res.user.role !== 'Project Manager') {
          setActiveTab('mywork');
          await loadMyWorkData(res.user._id);
        } else {
          setActiveTab('overview');
        }
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleQuickSwitch = async (account) => {
    setIsAuthLoading(true);
    try {
      const res = await switchUserSession({ email: account.email });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        notify(`Switched session to ${res.user.name} (${res.user.role})`, 'success');

        // Reload projects
        const projRes = await getProjects();
        if (projRes.success && projRes.data) {
          setProjects(projRes.data);
          if (projRes.data.length > 0) {
            const currentProjStillAccessible = projRes.data.find(
              (p) => p._id === selectedProject?._id
            );
            const activeP = currentProjStillAccessible || projRes.data[0];
            setSelectedProject(activeP);
            await loadProjectData(activeP._id);
          }
        }

        // Set role-based tab
        if (res.user.role !== 'Admin' && res.user.role !== 'Project Manager') {
          setActiveTab('mywork');
          await loadMyWorkData(res.user._id);
        } else {
          setActiveTab('overview');
        }
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    notify('Signed out successfully.', 'info');
    setIsLoginModalOpen(true);
  };

  // -------------------------------------------------------------
  // Project Management Actions (Admin / PM)
  // -------------------------------------------------------------
  const handleCreateProject = async (formData) => {
    try {
      const res = await createProject(formData);
      if (res.success && res.data) {
        notify(`Created project "${res.data.name}"`, 'success');
        const projRes = await getProjects();
        if (projRes.success) {
          setProjects(projRes.data);
          setSelectedProject(res.data);
          await loadProjectData(res.data._id);
        }
      }
    } catch (err) {
      notify(`Failed to create project: ${err.message}`, 'error');
    }
  };

  const handleUpdateProject = async (id, formData) => {
    try {
      const res = await updateProject(id, formData);
      if (res.success) {
        notify('Project details updated successfully.', 'success');
        const projRes = await getProjects();
        if (projRes.success) {
          setProjects(projRes.data);
          if (selectedProject?._id === id) {
            setSelectedProject(res.data);
          }
        }
      }
    } catch (err) {
      notify(`Failed to update project: ${err.message}`, 'error');
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      const res = await deleteProject(id);
      if (res.success) {
        notify('Project deleted successfully.', 'success');
        const projRes = await getProjects();
        if (projRes.success && projRes.data.length > 0) {
          setProjects(projRes.data);
          setSelectedProject(projRes.data[0]);
          await loadProjectData(projRes.data[0]._id);
        }
      }
    } catch (err) {
      notify(`Failed to delete project: ${err.message}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // Team Management Actions
  // -------------------------------------------------------------
  const handleCreateUser = async (formData) => {
    try {
      const res = await createUser(formData);
      if (res.success) {
        notify(`Added team member "${res.data.name}"`, 'success');
        const userRes = await getUsers();
        if (userRes.success) setUsers(userRes.data);
      }
    } catch (err) {
      notify(`Failed to add user: ${err.message}`, 'error');
    }
  };

  const handleUpdateUser = async (id, formData) => {
    try {
      const res = await updateUser(id, formData);
      if (res.success) {
        notify('User assignments updated.', 'success');
        const userRes = await getUsers();
        if (userRes.success) setUsers(userRes.data);
      }
    } catch (err) {
      notify(`Failed to update user: ${err.message}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // Contractor / Worker "My Work" Actions
  // -------------------------------------------------------------
  const handleMyWorkStatusUpdate = async (taskId, newStatus) => {
    try {
      const res = await updateTask(taskId, { status: newStatus });
      if (res.success) {
        notify(`Task status updated to "${newStatus}"`, 'success');
        await Promise.all([
          loadMyWorkData(currentUser?._id),
          loadProjectData(selectedProject?._id),
        ]);
      }
    } catch (err) {
      notify(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleMyWorkAddUpdate = async (taskId, text) => {
    try {
      const res = await addTaskUpdate(taskId, text);
      if (res.success) {
        notify('Progress update posted to task log.', 'success');
        await Promise.all([
          loadMyWorkData(currentUser?._id),
          loadProjectData(selectedProject?._id),
        ]);
      }
    } catch (err) {
      notify(`Failed to post update: ${err.message}`, 'error');
    }
  };

  const handleMyWorkReportProblem = (task) => {
    setSnagModalInitialData({
      title: `Problem on: ${task.title}`,
      location: task.projectId?.name || selectedProject?.location || '',
      priority: 'High',
      assigneeId: currentUser?._id || '',
      description: `Reported by ${currentUser?.name} during execution of task "${task.title}".`,
    });
    setIsCreateSnagOpen(true);
  };

  // -------------------------------------------------------------
  // Navigation with Filter Drill-Down (Metrics & Search items)
  // -------------------------------------------------------------
  const handleNavigateWithFilter = (tab, filter = 'ALL', itemId = null) => {
    if (tab === 'snags') {
      setSnagInitialFilter(filter);
      if (itemId) setSnagExpandedId(itemId);
    } else if (tab === 'tasks') {
      setTaskInitialFilter(filter);
      if (itemId) setTaskExpandedId(itemId);
    }
    setActiveTab(tab);
    setSearchResults(null);
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
      const errMsg = err.message || 'Error communicating with voice interpreter.';
      notify(errMsg, 'error');
      setAssistantMessage(`Issue processing command: ${errMsg}`);
      speak('Sorry, I encountered an issue processing that command.');
    } finally {
      setIsInterpreting(false);
    }
  };

  // Speech Recognition Hook
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
  // Confirmation Handlers (Voice Action Confirmation)
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

      const confirmMsg =
        pendingAction.actionType === 'CREATE_SNAG'
          ? `Problem "${result.data?.title || pendingAction.payload.title}" reported and saved.`
          : `Task "${result.data?.title || pendingAction.payload.title}" created and assigned.`;

      notify(confirmMsg, 'success');
      setAssistantMessage(confirmMsg);
      speak(confirmMsg);

      setPendingAction(null);
      setInterpretation(null);
      setHasRecentSuccess(true);
      setTimeout(() => setHasRecentSuccess(false), 5000);

      if (pendingAction.projectId) {
        await Promise.all([
          loadProjectData(pendingAction.projectId),
          loadMyWorkData(currentUser?._id),
        ]);
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to save action to database.';
      notify(errMsg, 'error');
      setAssistantMessage(`Save failed: ${errMsg}`);
      speak('The database action could not be completed.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    setInterpretation(null);
    setAssistantMessage('Action cancelled. No changes were made to the project.');
    notify('Action cancelled.', 'info');
  };

  // -------------------------------------------------------------
  // Problem Creation & Status Updates
  // -------------------------------------------------------------
  const handleCreateSnagSubmit = async (formData) => {
    if (!selectedProject?._id) {
      notify('Please select an active project before reporting a problem.', 'error');
      return;
    }

    setIsSubmittingModal(true);
    try {
      const payload = {
        projectId: selectedProject._id,
        reporterId: currentUser?._id,
        reporterName: currentUser?.name,
        ...formData,
      };

      const res = await createSnag(payload);
      if (res.success) {
        notify('Problem reported successfully.', 'success');
        setIsCreateSnagOpen(false);
        setSnagModalInitialData(null);
        await Promise.all([
          loadProjectData(selectedProject._id),
          loadMyWorkData(currentUser?._id),
        ]);
        setActiveTab('snags');
      }
    } catch (err) {
      notify(`Failed to report problem: ${err.message}`, 'error');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleUpdateSnagStatus = async (snagId, newStatus) => {
    try {
      const res = await updateSnag(snagId, { status: newStatus });
      if (res.success) {
        notify(`Problem marked as ${newStatus}`, 'success');
        await loadProjectData(selectedProject?._id);
      }
    } catch (err) {
      notify(`Failed to update problem status: ${err.message}`, 'error');
    }
  };

  const handleDeleteSnag = (snag) => {
    setDeleteModal({
      isOpen: true,
      item: snag,
      type: 'snag',
      isDeleting: false,
    });
  };

  // -------------------------------------------------------------
  // Task Creation & Status Updates
  // -------------------------------------------------------------
  const handleCreateTaskSubmit = async (formData) => {
    if (!selectedProject?._id) {
      notify('Please select an active project before creating a task.', 'error');
      return;
    }

    setIsSubmittingModal(true);
    try {
      const payload = {
        projectId: selectedProject._id,
        ...formData,
      };

      const res = await createTask(payload);
      if (res.success) {
        notify('Task created and assigned successfully.', 'success');
        setIsCreateTaskOpen(false);
        await Promise.all([
          loadProjectData(selectedProject._id),
          loadMyWorkData(currentUser?._id),
        ]);
        setActiveTab('tasks');
      }
    } catch (err) {
      notify(`Failed to create task: ${err.message}`, 'error');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await updateTask(taskId, { status: newStatus });
      if (res.success) {
        notify(`Task marked as ${newStatus}`, 'success');
        await Promise.all([
          loadProjectData(selectedProject?._id),
          loadMyWorkData(currentUser?._id),
        ]);
      }
    } catch (err) {
      notify(`Failed to update task status: ${err.message}`, 'error');
    }
  };

  const handleDeleteTask = (task) => {
    setDeleteModal({
      isOpen: true,
      item: task,
      type: 'task',
      isDeleting: false,
    });
  };

  // -------------------------------------------------------------
  // Confirm Deletion Handler
  // -------------------------------------------------------------
  const handleConfirmDelete = async () => {
    const { item, type } = deleteModal;
    if (!item) return;

    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      if (type === 'snag') {
        await deleteSnag(item._id);
        notify('Problem deleted successfully.', 'success');
      } else if (type === 'task') {
        await deleteTask(item._id);
        notify('Task deleted successfully.', 'success');
      }
      setDeleteModal({ isOpen: false, item: null, type: null, isDeleting: false });
      await Promise.all([
        loadProjectData(selectedProject?._id),
        loadMyWorkData(currentUser?._id),
      ]);
    } catch (err) {
      notify(`Failed to delete ${type}: ${err.message}`, 'error');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchType(null);
    setSearchSummary('');
  };

  const handleSelectSearchResult = (item, type) => {
    if (type === 'SEARCH_SNAGS') {
      handleNavigateWithFilter('snags', 'ALL', item._id);
    } else {
      handleNavigateWithFilter('tasks', 'ALL', item._id);
    }
  };

  const reportedProblemsCount = snags.filter((s) => {
    if (!currentUser) return false;
    return (
      s.reporterId?._id === currentUser._id ||
      s.reporterId === currentUser._id ||
      s.assigneeId?._id === currentUser._id ||
      s.assigneeId === currentUser._id ||
      s.assigneeId?.name === currentUser.name ||
      s.reporterName === currentUser.name
    );
  }).length;

  return (
    <div className="sitevoice-app-shell">
      {/* Top Header across the entire top of the application */}
      <Header
        activeTab={activeTab}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        selectedProject={selectedProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onNavigateToProfile={() => {
          setActiveTab('profile');
          setSearchResults(null);
        }}
        onNavigateToHome={() => {
          setActiveTab(isWorker ? 'mywork' : 'overview');
          setSearchResults(null);
        }}
        onLogout={handleLogout}
        onOpenCreateSnag={() => {
          setSnagModalInitialData(null);
          setIsCreateSnagOpen(true);
        }}
        onOpenCreateTask={!isWorker ? () => setIsCreateTaskOpen(true) : null}
      />

      {/* Main Body Area: Left Sidebar + Right Workspace Content */}
      <div className="sitevoice-body-container">
        {/* Primary Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSearchResults(null);
          }}
          snagCount={snags.filter((s) => s.status === 'Open').length}
          taskCount={tasks.filter((t) => t.status === 'Pending').length}
          myWorkCount={myWorkTasks.filter((t) => t.status !== 'Completed').length}
          reportedProblemsCount={reportedProblemsCount}
          projectCount={projects.length}
          teamCount={users.length}
          currentUser={currentUser}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area (Occupies all remaining screen width) */}
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
              onSelectResult={handleSelectSearchResult}
            />
          ) : (
            <>
              {/* Active Tab: MY WORK (Contractor / Worker Panel) */}
              {activeTab === 'mywork' && (
                <div className="registry-tab-layout">
                  <MyWorkView
                    tasks={myWorkTasks}
                    isLoading={isLoadingMyWork}
                    currentUser={currentUser}
                    onUpdateStatus={handleMyWorkStatusUpdate}
                    onAddUpdate={handleMyWorkAddUpdate}
                    onReportProblem={handleMyWorkReportProblem}
                  />
                </div>
              )}

              {/* Active Tab: OVERVIEW (Dashboard with voice bar & metrics) */}
              {activeTab === 'overview' && (
                <div className="overview-page-layout">
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

                  {/* Non-modal Voice Feedback */}
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

                  {/* Four Overview Metrics & Recent Activity */}
                  <ProjectOverview
                    summary={projectSummary}
                    snags={snags}
                    tasks={tasks}
                    isLoading={isLoadingSummary}
                    onNavigate={handleNavigateWithFilter}
                    projectName={selectedProject?.name}
                  />
                </div>
              )}

              {/* Active Tab: PROBLEMS I REPORTED (Worker / Contractor Panel) */}
              {activeTab === 'reported_problems' && (
                <div className="registry-tab-layout">
                  <ReportedProblemsView
                    snags={snags}
                    currentUser={currentUser}
                    selectedProject={selectedProject}
                    isLoading={isLoadingSnags}
                    onOpenReportProblem={() => {
                      setSnagModalInitialData(null);
                      setIsCreateSnagOpen(true);
                    }}
                    onUpdateStatus={handleUpdateSnagStatus}
                  />
                </div>
              )}

              {/* Active Tab: USER PROFILE */}
              {activeTab === 'profile' && (
                <div className="registry-tab-layout">
                  <UserProfileView
                    currentUser={currentUser}
                    projects={projects}
                    onOpenLoginModal={() => setIsLoginModalOpen(true)}
                    onLogout={handleLogout}
                  />
                </div>
              )}

              {/* Active Tab: CONSTRUCTION PROJECTS (Multi-Project View) */}
              {activeTab === 'projects' && (
                <div className="registry-tab-layout">
                  <ProjectManagementView
                    projects={projects}
                    isLoading={isLoadingProjects}
                    currentUser={currentUser}
                    selectedProject={selectedProject}
                    onSelectProject={(p) => {
                      handleSelectProject(p);
                      setActiveTab('overview');
                    }}
                    onCreateProject={handleCreateProject}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    users={users}
                  />
                </div>
              )}

              {/* Active Tab: PROBLEMS (Snags) */}
              {activeTab === 'snags' && (
                <div className="registry-tab-layout">
                  <SnagList
                    snags={snags}
                    isLoading={isLoadingSnags}
                    onOpenCreate={() => {
                      setSnagModalInitialData(null);
                      setIsCreateSnagOpen(true);
                    }}
                    onUpdateStatus={handleUpdateSnagStatus}
                    onDeleteSnag={handleDeleteSnag}
                    initialFilter={snagInitialFilter}
                    initialExpandedId={snagExpandedId}
                    projectName={selectedProject?.name}
                  />
                </div>
              )}

              {/* Active Tab: TASKS */}
              {activeTab === 'tasks' && (
                <div className="registry-tab-layout">
                  <TaskList
                    tasks={tasks}
                    isLoading={isLoadingTasks}
                    onOpenCreate={!isWorker ? () => setIsCreateTaskOpen(true) : null}
                    onUpdateStatus={handleUpdateTaskStatus}
                    onDeleteTask={handleDeleteTask}
                    initialFilter={taskInitialFilter}
                    initialExpandedId={taskExpandedId}
                    projectName={selectedProject?.name}
                    canDelete={!isWorker}
                  />
                </div>
              )}

              {/* Active Tab: TEAM & CONTRACTORS */}
              {activeTab === 'team' && (
                <div className="registry-tab-layout">
                  <TeamManagementView
                    users={users}
                    projects={projects}
                    tasks={tasks}
                    currentUser={currentUser}
                    onCreateUser={handleCreateUser}
                    onUpdateUser={handleUpdateUser}
                  />
                </div>
              )}

              {/* Active Tab: PROJECT STATUS */}
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

      {/* Voice CREATE_SNAG / CREATE_TASK Confirmation Dialog */}
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

      {/* Manual Report Problem Modal Form */}
      <CreateSnagModal
        isOpen={isCreateSnagOpen}
        onClose={() => {
          setIsCreateSnagOpen(false);
          setSnagModalInitialData(null);
        }}
        onSubmit={handleCreateSnagSubmit}
        users={users}
        projectName={selectedProject?.name}
        initialData={snagModalInitialData}
        isSubmitting={isSubmittingModal}
      />

      {/* Manual Create Task Modal Form */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={handleCreateTaskSubmit}
        users={users}
        projectName={selectedProject?.name}
        isSubmitting={isSubmittingModal}
      />

      {/* Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, item: null, type: null, isDeleting: false })
        }
        onConfirm={handleConfirmDelete}
        title={deleteModal.item?.title || ''}
        itemType={deleteModal.type || 'item'}
        isDeleting={deleteModal.isDeleting}
      />

      {/* User Login & Role Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onQuickSwitch={handleQuickSwitch}
        isSubmitting={isAuthLoading}
      />
    </div>
  );
}
