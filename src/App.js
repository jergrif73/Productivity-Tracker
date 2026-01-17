import React, { useState, useEffect, createContext, useContext, useMemo, useRef, Suspense, lazy, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { tutorialContent } from './tutorial-steps.js';

// Lazy load the heavy console components
const TeamConsole = lazy(() => import('./TeamConsole.js'));
const ProjectConsole = lazy(() => import('./ProjectConsole.js'));
const WorkloaderConsole = lazy(() => import('./WorkloaderConsole.js'));
const TaskConsole = lazy(() => import('./TaskConsole.js'));
const GanttConsole = lazy(() => import('./GanttConsole.js'));
const ProjectForecastConsole = lazy(() => import('./ProjectForecastConsole.js'));
const SkillsConsole = lazy(() => import('./SkillsConsole.js'));
const ReportingConsole = lazy(() => import('./ReportingConsole.js'));
const AdminConsole = lazy(() => import('./AdminConsole.js'));
const MyDashboard = lazy(() => import('./MyDashboard.js'));
const DatabaseConsole = lazy(() => import('./DatabaseConsole.js')); // Import the new console

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyC8aM0mFNiRmy8xcLsS48lSPfHQ9egrJ7s",
  authDomain: "productivity-tracker-3017d.firebaseapp.com",
  projectId: "productivity-tracker-3017d",
  storageBucket: "productivity-tracker-3017d.appspot.com",
  messagingSenderId: "489412895343",
  appId: "1:489412895343:web:780e7717db122a2b99639a",
  measurementId: "G-LGTREWPTGJ"
};

// --- Gemini API Configuration ---
const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;

// --- Firebase Initialization ---
let db, auth;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

// --- Helper Functions & Initial Data ---
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-prod-tracker-app';
const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;

// --- Contexts ---
const AuthContext = createContext({ accessLevel: 'default', setAccessLevel: () => {}, currentUser: null });
export const TutorialContext = createContext();
export const NavigationContext = createContext({
    navigateToWorkloaderForEmployee: () => {},
    navigateToWorkloaderForProject: () => {},
    navigateToTeamConsoleForEmployee: () => {},
    navigateToProjectConsoleForProject: () => {},
    navigateToView: () => {},
});

// --- Tutorial System ---
export const useTutorial = () => useContext(TutorialContext);

export const TutorialProvider = ({ children, accessLevel }) => {
    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(null);
    const [currentTutorial, setCurrentTutorial] = useState(null);
    const [stepIndex, setStepIndex] = useState(0);

    const startTutorial = (view) => {
        const fullTutorial = tutorialContent[view];
        if (fullTutorial && fullTutorial.steps.length > 0) {
            const filteredSteps = fullTutorial.steps.filter(step =>
                !step.roles || step.roles.includes(accessLevel)
            );

            if (filteredSteps.length > 0) {
                setCurrentTutorial({ ...fullTutorial, steps: filteredSteps });
                setStepIndex(0);
                setTutorialStep(filteredSteps[0]);
                setIsTutorialActive(true);
            } else {
                console.warn("No relevant tutorial steps found for view:", view, "and access level:", accessLevel);
            }
        } else {
            console.warn("No tutorial found for view:", view);
        }
    };

    const endTutorial = () => {
        setIsTutorialActive(false);
        setTutorialStep(null);
        setCurrentTutorial(null);
        setStepIndex(0);
    };

    const nextStep = () => {
        if (currentTutorial && stepIndex < currentTutorial.steps.length - 1) {
            const newIndex = stepIndex + 1;
            setStepIndex(newIndex);
            setTutorialStep(currentTutorial.steps[newIndex]);
        }
    };

    const prevStep = () => {
        if (currentTutorial && stepIndex > 0) {
            const newIndex = stepIndex - 1;
            setStepIndex(newIndex);
            setTutorialStep(currentTutorial.steps[newIndex]);
        }
    };

    const setStepByKey = (key) => {
        if (currentTutorial) {
            const stepIdx = currentTutorial.steps.findIndex(s => s.key === key);
            if (stepIdx !== -1) {
                setStepIndex(stepIdx);
                setTutorialStep(currentTutorial.steps[stepIdx]);
            }
        }
    };

    const value = {
        isTutorialActive,
        tutorialStep,
        stepIndex,
        totalSteps: currentTutorial ? currentTutorial.steps.length : 0,
        startTutorial,
        endTutorial,
        nextStep,
        prevStep,
        setStepByKey,
    };

    return (
        <TutorialContext.Provider value={value}>
            {children}
        </TutorialContext.Provider>
    );
};

export const TutorialHighlight = ({ tutorialKey, children, className, style }) => {
    const { isTutorialActive, tutorialStep, setStepByKey } = useTutorial();
    const isHighlighted = isTutorialActive && tutorialStep && tutorialStep.key === tutorialKey;

    const handleClick = (e) => {
        if (isTutorialActive) {
            e.preventDefault();
            e.stopPropagation();
            setStepByKey(tutorialKey);
        }
    };

    return (
        <div
            className={`${className} ${isTutorialActive ? 'relative cursor-pointer' : ''}`}
            style={style}
            onClick={handleClick}
        >
            {children}
            {isHighlighted && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-blue-500 bg-opacity-40 ring-2 ring-blue-300 ring-offset-2 rounded-lg pointer-events-none animate-pulse-strong"
                ></motion.div>
            )}
        </div>
    );
};

const TutorialWidget = () => {
    const { isTutorialActive, tutorialStep, stepIndex, totalSteps, endTutorial, nextStep, prevStep } = useTutorial();
    const widgetRef = useRef(null);

    if (!isTutorialActive || !tutorialStep) return null;

    const widgetVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.8, rotate: -5 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            rotate: 0,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 8,
                mass: 1,
                when: "beforeChildren",
                ease: "easeOut"
            }
        },
        exit: { opacity: 0, y: 50, scale: 0.8, rotate: 5, transition: { duration: 0.2 } }
    };

    const contentVariants = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
    };

    return (
        <motion.div
            ref={widgetRef}
            className="fixed bottom-4 right-4 w-full max-w-sm p-4 bg-gray-800 text-white rounded-lg shadow-2xl z-[100] border border-blue-400"
            variants={widgetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            <div className="flex justify-between items-center mb-3">
                <AnimatePresence mode="wait">
                    <motion.h3 key={tutorialStep.key + "-title"} variants={contentVariants} initial="initial" animate="animate" exit="exit" className="text-lg font-bold">{tutorialStep.title}</motion.h3>
                </AnimatePresence>
                <button onClick={endTutorial} className="text-gray-400 hover:text-white font-bold text-2xl">&times;</button>
            </div>
            <AnimatePresence mode="wait">
                <motion.p key={tutorialStep.key + "-content"} variants={contentVariants} initial="initial" animate="animate" exit="exit" className="text-sm text-gray-300 mb-4">{tutorialStep.content}</motion.p>
            </AnimatePresence>
            <div className="flex justify-between items-center">
                <motion.p variants={contentVariants} className="text-xs text-gray-500">Step {stepIndex + 1} of {totalSteps}</motion.p>
                <div className="flex gap-2">
                    <button onClick={prevStep} disabled={stepIndex === 0} className="px-3 py-1 text-sm bg-gray-600 rounded-md hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                    <button onClick={nextStep} disabled={stepIndex === totalSteps - 1} className="px-3 py-1 text-sm bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
            </div>
        </motion.div>
    );
};

// --- Feedback/Bug Report Modal ---
const FeedbackModal = ({ isOpen, onClose, db, appId, currentTheme, showToast, currentUser }) => {
    const [feedbackType, setFeedbackType] = useState('bug');
    const [title, setTitle] = useState('');
    const [consoleAffected, setConsoleAffected] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [description, setDescription] = useState('');
    const [stepsToReproduce, setStepsToReproduce] = useState('');
    const [expectedBehavior, setExpectedBehavior] = useState('');
    const [actualBehavior, setActualBehavior] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const consoleOptions = [
        'Dashboard', 'Team', 'Project', 'Tasks', 'Gantt', 'Forecast', 
        'Reporting', 'Manage', 'DB Admin', 'Workloader', 'Login/Auth', 'Other'
    ];

    const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];

    const getBrowserInfo = () => {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        
        return {
            browser,
            userAgent: ua,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString()
        };
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            showToast('Please enter a title', 'error');
            return;
        }
        if (!description.trim()) {
            showToast('Please enter a description', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Find the "New Requests" lane
            const lanesRef = collection(db, `artifacts/${appId}/public/data/taskLanes`);
            const lanesSnapshot = await getDocs(lanesRef);
            let newRequestsLaneId = null;
            
            lanesSnapshot.forEach(doc => {
                if (doc.data().name === 'New Requests') {
                    newRequestsLaneId = doc.id;
                }
            });

            if (!newRequestsLaneId) {
                showToast('Error: Could not find New Requests lane', 'error');
                setIsSubmitting(false);
                return;
            }

            const browserInfo = getBrowserInfo();
            const typeLabel = feedbackType === 'bug' ? '🐛 BUG' : feedbackType === 'feature' ? '✨ FEATURE' : '💡 ENHANCEMENT';
            const priorityEmoji = priority === 'Critical' ? '🔴' : priority === 'High' ? '🟠' : priority === 'Medium' ? '🟡' : '🟢';

            // Build the task description
            let fullDescription = `**Type:** ${typeLabel}\n`;
            fullDescription += `**Priority:** ${priorityEmoji} ${priority}\n`;
            fullDescription += `**Console/Area:** ${consoleAffected || 'Not specified'}\n`;
            fullDescription += `**Reported by:** ${currentUser?.firstName || 'Unknown'} ${currentUser?.lastName || ''}\n`;
            fullDescription += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
            fullDescription += `---\n\n`;
            fullDescription += `**Description:**\n${description}\n`;

            if (feedbackType === 'bug') {
                if (stepsToReproduce.trim()) {
                    fullDescription += `\n**Steps to Reproduce:**\n${stepsToReproduce}\n`;
                }
                if (expectedBehavior.trim()) {
                    fullDescription += `\n**Expected Behavior:**\n${expectedBehavior}\n`;
                }
                if (actualBehavior.trim()) {
                    fullDescription += `\n**Actual Behavior:**\n${actualBehavior}\n`;
                }
            }

            fullDescription += `\n---\n**Browser Info:**\n`;
            fullDescription += `• Browser: ${browserInfo.browser}\n`;
            fullDescription += `• Screen: ${browserInfo.screenSize}\n`;
            fullDescription += `• Timestamp: ${browserInfo.timestamp}\n`;

            const taskData = {
                taskName: `ATTN:DEV - ${typeLabel} - ${title}`,
                projectId: '',
                detailerId: '',
                status: 'Not Started',
                dueDate: '',
                entryDate: new Date().toISOString().split('T')[0],
                laneId: newRequestsLaneId,
                subTasks: [],
                watchers: [],
                comments: [{
                    id: `comment_${Date.now()}`,
                    text: fullDescription,
                    authorId: currentUser?.id || 'system',
                    authorName: `${currentUser?.firstName || 'System'} ${currentUser?.lastName || ''}`.trim(),
                    timestamp: new Date().toISOString()
                }],
                attachments: [],
                feedbackMeta: {
                    type: feedbackType,
                    priority,
                    consoleAffected,
                    browserInfo,
                    reporterId: currentUser?.id || null,
                    reporterName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown'
                }
            };

            await addDoc(collection(db, `artifacts/${appId}/public/data/tasks`), taskData);

            showToast('Feedback submitted successfully! Thank you.', 'success');
            
            // Reset form
            setFeedbackType('bug');
            setTitle('');
            setConsoleAffected('');
            setPriority('Medium');
            setDescription('');
            setStepsToReproduce('');
            setExpectedBehavior('');
            setActualBehavior('');
            onClose();

        } catch (error) {
            console.error('Error submitting feedback:', error);
            showToast('Failed to submit feedback. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`${currentTheme.cardBg} ${currentTheme.textColor} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}
            >
                {/* Header */}
                <div className={`p-4 border-b ${currentTheme.borderColor} flex justify-between items-center flex-shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Report Bug / Suggest Feature</h2>
                            <p className={`text-sm ${currentTheme.subtleText}`}>Help us improve the application</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg ${currentTheme.buttonBg} hover:bg-opacity-80`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Feedback Type */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${currentTheme.subtleText}`}>Type *</label>
                        <div className="flex gap-2">
                            {[
                                { value: 'bug', label: '🐛 Bug Report', color: 'red' },
                                { value: 'feature', label: '✨ Feature Request', color: 'purple' },
                                { value: 'enhancement', label: '💡 Enhancement', color: 'blue' }
                            ].map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => setFeedbackType(type.value)}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        feedbackType === type.value 
                                            ? `bg-${type.color}-500 text-white` 
                                            : `${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-80`
                                    }`}
                                    style={feedbackType === type.value ? { backgroundColor: type.color === 'red' ? '#ef4444' : type.color === 'purple' ? '#a855f7' : '#3b82f6' } : {}}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${currentTheme.subtleText}`}>Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Brief summary of the issue or suggestion"
                            className={`w-full p-3 border rounded-lg ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                        />
                    </div>

                    {/* Console Affected & Priority Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${currentTheme.subtleText}`}>Console/Area Affected</label>
                            <select
                                value={consoleAffected}
                                onChange={(e) => setConsoleAffected(e.target.value)}
                                className={`w-full p-3 border rounded-lg ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                            >
                                <option value="">Select area...</option>
                                {consoleOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${currentTheme.subtleText}`}>Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className={`w-full p-3 border rounded-lg ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                            >
                                {priorityOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${currentTheme.subtleText}`}>Description *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={feedbackType === 'bug' 
                                ? "Describe the bug in detail. What were you trying to do?" 
                                : "Describe the feature or enhancement you'd like to see"}
                            rows={4}
                            className={`w-full p-3 border rounded-lg ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                        />
                    </div>

                    {/* Bug-specific fields */}
                    {feedbackType === 'bug' && (
                        <>
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${currentTheme.subtleText}`}>Steps to Reproduce</label>
                                <textarea
                                    value={stepsToReproduce}
                                    onChange={(e) => setStepsToReproduce(e.target.value)}
                                    placeholder="1. Go to...\n2. Click on...\n3. See error"
                                    rows={3}
                                    className={`w-full p-3 border rounded-lg ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${currentTheme.subtleText}`}>Expected Behavior</label>
                                    <textarea
                                        value={expectedBehavior}
                                        onChange={(e) => setExpectedBehavior(e.target.value)}
                                        placeholder="What should happen?"
                                        rows={2}
                                        className={`w-full p-3 border rounded-lg ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${currentTheme.subtleText}`}>Actual Behavior</label>
                                    <textarea
                                        value={actualBehavior}
                                        onChange={(e) => setActualBehavior(e.target.value)}
                                        placeholder="What actually happened?"
                                        rows={2}
                                        className={`w-full p-3 border rounded-lg ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Browser info notice */}
                    <div className={`p-3 rounded-lg ${currentTheme.altRowBg} text-sm ${currentTheme.subtleText}`}>
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Browser and screen information will be automatically included</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${currentTheme.borderColor} flex justify-end gap-3 flex-shrink-0`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-80`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Submit Feedback
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- UX/UI Components ---
const Toaster = ({ toasts }) => (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
            <div key={toast.id} className={`p-4 rounded-lg shadow-lg text-white animate-fade-in-out ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                {toast.message}
            </div>
        ))}
    </div>
);

const SkeletonLoader = ({ className }) => (
    <div className={`bg-gray-300 animate-pulse rounded ${className}`}></div>
);

const TeamConsoleSkeleton = ({ currentTheme }) => (
    <div>
        <div className="flex justify-end items-center mb-4 gap-2">
            <SkeletonLoader className="h-8 w-24" />
            <SkeletonLoader className="h-8 w-24" />
        </div>
        <div className={`${currentTheme.cardBg} rounded-lg p-4 space-y-2`}>
            {[...Array(5)].map((_, i) => (
                <div key={i} className={`p-4 ${i % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg} rounded-lg`}>
                    <div className="flex justify-between items-center">
                        <div className="space-y-2">
                            <SkeletonLoader className="h-5 w-40" />
                            <SkeletonLoader className="h-4 w-32" />
                        </div>
                        <SkeletonLoader className="h-8 w-20" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ConsoleLoadingFallback = ({ currentTheme, consoleName }) => (
    <div className={`h-full flex items-center justify-center ${currentTheme.consoleBg}`}>
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={`text-lg ${currentTheme.textColor}`}>Loading {consoleName}...</p>
        </div>
    </div>
);

const LoginInline = ({ onLogin, error }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setLocalError("Passwords do not match.");
            return;
        }
        setLocalError('');
        onLogin(username, password);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 p-6 bg-slate-800/50 rounded-lg shadow-xl w-full max-w-sm backdrop-blur-sm">
             <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-md text-sm text-gray-800 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md text-sm text-gray-800 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
            />
            <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md text-sm text-gray-800 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors">
                Login
            </button>
            {localError && <p className="text-red-400 text-xs mt-2">{localError}</p>}
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </form>
    );
};

const SplashScreen = ({ onLogin, error }) => {
    return (
        <div className="relative h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 overflow-hidden">
            <div className="absolute top-0 -left-1/4 w-96 h-96 bg-blue-400/30 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
            <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-gray-500/30 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="absolute -bottom-1/2 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl opacity-40 animate-pulse" style={{animationDelay: '4s'}}></div>

            <div className="relative z-10 flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-8" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.7)'}}>
                    NW Detailing Productivity Tracker
                </h1>
                <LoginInline onLogin={onLogin} error={error} />
            </div>
        </div>
    );
};

const Modal = ({ children, onClose, customClasses = 'max-w-4xl', currentTheme }) => {
    const theme = currentTheme || { cardBg: 'bg-white', textColor: 'text-gray-800', subtleText: 'text-gray-600' };
    return (
        <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "-20px", opacity: 0 }}
                animate={{ y: "0", opacity: 1 }}
                exit={{ y: "20px", opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.5 }}
                className={`${theme.cardBg} ${theme.textColor} p-6 rounded-lg shadow-2xl w-full ${customClasses} max-h-[90vh] overflow-y-auto hide-scrollbar-on-hover`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-end">
                    <button onClick={onClose} className={`text-2xl font-bold ${theme.subtleText} hover:${theme.textColor}`}>&times;</button>
                </div>
                {children}
            </motion.div>
        </motion.div>
    );
};

// --- Performance Hooks ---
const useThrottledNavigation = () => {
    const [isNavigating, setIsNavigating] = useState(false);
    
    const throttledNavigate = useCallback((navigationFn) => {
        if (isNavigating) return;
        
        setIsNavigating(true);
        navigationFn();
        
        setTimeout(() => setIsNavigating(false), 300);
    }, [isNavigating]);
    
    return throttledNavigate;
};

// --- Main Application Component ---
const AppContent = ({ accessLevel, isLoggedIn, loginError, handleLoginAttempt, handleLogout, currentUser, geminiApiKey }) => {
    const [view, setView] = useState('dashboard');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [detailers, setDetailers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [taskLanes, setTaskLanes] = useState([]);
    const [allProjectActivities, setAllProjectActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [theme, setTheme] = useState('dark');
    const [viewingSkillsFor, setViewingSkillsFor] = useState(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    const [initialSelectedEmployeeInTeamConsole, setInitialSelectedEmployeeInTeamConsole] = useState(null);
    const [initialSelectedEmployeeInWorkloader, setInitialSelectedEmployeeInWorkloader] = useState(null);
    const [initialProjectConsoleFilter, setInitialProjectConsoleFilter] = useState(null);
    const [initialSelectedProjectInWorkloader, setInitialSelectedProjectInWorkloader] = useState(null);

    const { startTutorial, isTutorialActive } = useContext(TutorialContext);
    const throttledNavigate = useThrottledNavigation();
    
    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
        }, 3000);
    };

    const [toasts, setToasts] = useState([]);

    const themeClasses = {
        light: { mainBg: 'bg-gray-100', headerBg: 'bg-white', cardBg: 'bg-white', textColor: 'text-gray-800', subtleText: 'text-gray-600', borderColor: 'border-gray-200', altRowBg: 'bg-blue-50', navBg: 'bg-gray-200', navBtn: 'text-gray-600 hover:bg-gray-300', navBtnActive: 'bg-white text-blue-600 shadow', consoleBg: 'bg-gray-50', inputBg: 'bg-white', inputText: 'text-gray-900', inputBorder: 'border-gray-300', buttonBg: 'bg-gray-200', buttonText: 'text-gray-800' },
        grey: { mainBg: 'bg-gray-300', headerBg: 'bg-gray-400', cardBg: 'bg-gray-200', textColor: 'text-black', subtleText: 'text-gray-700', borderColor: 'border-gray-400', altRowBg: 'bg-gray-300', navBg: 'bg-gray-300', navBtn: 'text-gray-800 hover:bg-gray-400', navBtnActive: 'bg-white text-blue-700 shadow', consoleBg: 'bg-gray-200', inputBg: 'bg-gray-100', inputText: 'text-black', inputBorder: 'border-gray-400', buttonBg: 'bg-gray-400', buttonText: 'text-black' },
        dark: { mainBg: 'bg-gray-900', headerBg: 'bg-gray-800', cardBg: 'bg-gray-700', textColor: 'text-gray-200', subtleText: 'text-gray-400', borderColor: 'border-gray-600', altRowBg: 'bg-gray-800', navBg: 'bg-gray-700', navBtn: 'text-gray-400 hover:bg-gray-600', navBtnActive: 'bg-gray-900 text-white shadow', consoleBg: 'bg-gray-800', inputBg: 'bg-gray-800', inputText: 'text-gray-200', inputBorder: 'border-gray-600', buttonBg: 'bg-gray-600', buttonText: 'text-gray-200' }
    };
    const currentTheme = themeClasses[theme];
    
    const navigationContextValue = useMemo(() => ({
        navigateToWorkloaderForEmployee: (employeeId) => {
            throttledNavigate(() => {
                setInitialSelectedProjectInWorkloader(null);
                setInitialProjectConsoleFilter(null);
                setInitialSelectedEmployeeInTeamConsole(null);
                setInitialSelectedEmployeeInWorkloader(employeeId);
                setView('workloader');
            });
        },
        navigateToWorkloaderForProject: (projectId) => {
            throttledNavigate(() => {
                setInitialSelectedEmployeeInWorkloader(null);
                setInitialProjectConsoleFilter(null);
                setInitialSelectedEmployeeInTeamConsole(null);
                setInitialSelectedProjectInWorkloader(projectId);
                setView('workloader');
            });
        },
        navigateToTeamConsoleForEmployee: (employeeId) => {
            throttledNavigate(() => {
                setInitialSelectedEmployeeInWorkloader(null);
                setInitialSelectedProjectInWorkloader(null);
                setInitialProjectConsoleFilter(null);
                setInitialSelectedEmployeeInTeamConsole(employeeId);
                setView('detailers');
            });
        },
        navigateToProjectConsoleForProject: (projectId) => {
            throttledNavigate(() => {
                setInitialSelectedEmployeeInWorkloader(null);
                setInitialSelectedProjectInWorkloader(null);
                setInitialSelectedEmployeeInTeamConsole(null);
                setInitialProjectConsoleFilter(projectId);
                setView('projects');
            });
        },
        navigateToView: (viewId) => {
            throttledNavigate(() => {
                setInitialSelectedEmployeeInWorkloader(null);
                setInitialSelectedProjectInWorkloader(null);
                setInitialSelectedEmployeeInTeamConsole(null);
                setInitialProjectConsoleFilter(null);
                setView(viewId);
            });
        }
    }), [throttledNavigate]);

    useEffect(() => {
        if (!auth) {
            setAuthError("Firebase configuration is missing or invalid. The app cannot start.");
            setIsAuthReady(true);
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            } else {
                (async () => {
                    try {
                        if (initialAuthToken) {
                           await signInWithCustomToken(auth, initialAuthToken);
                        } else {
                           await signInAnonymously(auth);
                        }
                        if (auth.currentUser) {
                           setIsAuthReady(true);
                        }
                    } catch (error) {
                        console.error("Authentication failed", error);
                        setAuthError("Could not authenticate. Please refresh the page.");
                        setIsAuthReady(true);
                    }
                })();
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isAuthReady || !db) return;
        setLoading(true);

        const collections = {
            detailers: setDetailers,
            projects: setProjects,
            assignments: setAssignments,
            tasks: setTasks,
            taskLanes: (data) => setTaskLanes(data.sort((a, b) => a.order - b.order)),
            projectActivities: setAllProjectActivities,
        };

        const unsubscribers = Object.entries(collections).map(([name, setter]) => {
            const collRef = collection(db, `artifacts/${appId}/public/data/${name}`);
            return onSnapshot(collRef, snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(data);
            }, err => console.error(`Error fetching ${name}:`, err));
        });
        
        setLoading(false);

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [isAuthReady]);

    const handleNavClick = (viewId) => {
        setView(viewId);
    };

    const navButtons = [
        { id: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg> },
        { id: 'workloader', label: 'Workloader', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5z" /></svg> },
        { id: 'detailers', label: 'Team', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg> },
        { id: 'projects', label: 'Project', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2-2H4a2 2 0 01-2-2V6z" /></svg> },
        { id: 'tasks', label: 'Tasks', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" /></svg>},
        { id: 'gantt', label: 'Gantt', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.001 0 0120.488 9z" /></svg> },
        { id: 'project-forecast', label: 'Forecast', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L9 9.61l-3.66-1.57a1 1 0 00-1.23.26l-2 3a1 1 0 00.22 1.5l4 2a1 1 0 00.94 0l7-3a1 1 0 000-1.84l-3-1.29-3.66 1.57a1 1 0 00-1.23-.26l-2-3a1 1 0 00.22-1.5l4-2z" /></svg> },
        { id: 'reporting', label: 'Reporting', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg> },
        { id: 'admin', label: 'Manage', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
        { id: 'database', label: 'DB Admin', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" /><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3s-7-1.343-7-3z" /><path d="M10 2C6.134 2 3 3.343 3 5s3.134 3 7 3 7-1.343 7-3-3.134-3-7-3z" /></svg> },
    ];

    const navConfig = {
        taskmaster: ['dashboard', 'workloader', 'detailers', 'projects', 'tasks', 'gantt', 'project-forecast', 'reporting', 'admin', 'database'],
        tcl: ['dashboard', 'workloader', 'detailers', 'projects', 'tasks', 'gantt'],
        viewer: ['dashboard', 'workloader', 'tasks', 'gantt'],
        default: []
    };

    const visibleNavButtons = navButtons.filter(button =>
        navConfig[accessLevel]?.includes(button.id)
    );

    // Stable references for props to prevent unnecessary re-renders
    const consoleProps = useMemo(() => ({
        db,
        detailers,
        projects,
        assignments,
        tasks,
        taskLanes,
        currentTheme,
        accessLevel,
        theme,
        setTheme,
        appId,
        showToast,
        initialProjectConsoleFilter,
        setInitialProjectConsoleFilter,
        initialSelectedProjectInWorkloader,
        setInitialSelectedProjectInWorkloader,
        initialSelectedEmployeeInTeamConsole,
        setInitialSelectedEmployeeInTeamConsole,
        setInitialSelectedEmployeeInWorkloader,
        geminiApiKey,
    }), [
        detailers, 
        projects, 
        assignments, 
        tasks, 
        taskLanes, 
        currentTheme, 
        accessLevel, 
        theme, 
        initialProjectConsoleFilter, 
        initialSelectedProjectInWorkloader, 
        initialSelectedEmployeeInTeamConsole,
        geminiApiKey
    ]);

    if (!isAuthReady && !authError) {
        return <div className="text-center p-10">Authenticating...</div>;
    }

    if (authError) {
         return <div className="text-center p-10 text-red-500">{authError}</div>;
    }

    if (!isLoggedIn) {
        return <SplashScreen onLogin={handleLoginAttempt} error={loginError} />;
    }
    
    return (
        <NavigationContext.Provider value={navigationContextValue}>
            <div style={{ fontFamily: 'Arial, sans-serif' }} className={`${currentTheme.mainBg} h-screen w-screen overflow-hidden ${isTutorialActive ? 'tutorial-active' : ''}`}>
                <style>
                    {`
                    .hide-scrollbar-on-hover::-webkit-scrollbar {
                        width: 5px;
                        height: 5px;
                    }
                    .hide-scrollbar-on-hover::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .hide-scrollbar-on-hover::-webkit-scrollbar-thumb {
                        background-color: transparent;
                        border-radius: 10px;
                    }
                    .hide-scrollbar-on-hover:hover::-webkit-scrollbar-thumb {
                        background-color: rgba(55, 65, 81, 0.8);
                    }
                    .hide-scrollbar-on-hover {
                        scrollbar-width: thin;
                        scrollbar-color: transparent transparent;
                    }
                    .hide-scrollbar-on-hover:hover {
                        scrollbar-color: rgba(55, 65, 81, 0.8) transparent;
                    }
                    `}
                </style>
                <Toaster toasts={toasts} />
                <TutorialWidget />
                <div className={`w-full h-full flex flex-col ${currentTheme.textColor}`}>
                    <header className={`p-4 border-b space-y-4 flex-shrink-0 ${currentTheme.headerBg} ${currentTheme.borderColor}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h1 className={`text-2xl font-bold ${currentTheme.textColor}`}>Workforce Productivity Tracker</h1>
                            <nav className={`${currentTheme.navBg} p-1 rounded-lg`}>
                                <div className="flex items-center space-x-1 flex-wrap justify-center">
                                    {visibleNavButtons.map(button => (
                                        <TutorialHighlight tutorialKey={button.id} key={button.id}>
                                            <button
                                                onClick={() => handleNavClick(button.id)}
                                                className={`flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md transition-colors w-36 ${view === button.id ? currentTheme.navBtnActive : currentTheme.navBtn}`}
                                            >
                                                {button.icon}
                                                {button.label}
                                            </button>
                                        </TutorialHighlight>
                                    ))}
                                </div>
                            </nav>
                        </div>
                        <div className="flex justify-center items-center gap-4">
                            <button
                                    onClick={() => setIsFeedbackModalOpen(true)}
                                    className="bg-amber-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center gap-2"
                                    title="Report a bug or suggest a feature"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Feedback
                                </button>
                            <button
                                    onClick={() => startTutorial(view)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-purple-700 transition-colors"
                                >
                                    Guided Tour
                                </button>
                            <button
                                    onClick={handleLogout}
                                    className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-600 transition-colors"
                                >
                                    Logout ({currentUser?.firstName || accessLevel})
                                </button>
                        </div>
                    </header>
                    <main className={`flex-grow ${currentTheme.consoleBg} min-h-0 overflow-hidden`}>
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <TeamConsoleSkeleton currentTheme={currentTheme} />
                            </div>
                        ) : (
                            <div className="relative h-full">
                                {/* Dashboard */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Dashboard" />}>
                                        <MyDashboard {...consoleProps} currentUser={currentUser} navigateToView={navigationContextValue.navigateToView} />
                                    </Suspense>
                                </div>
                                
                                {/* Team Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'detailers' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Team Console" />}>
                                        <TeamConsole {...consoleProps} setViewingSkillsFor={setViewingSkillsFor} />
                                    </Suspense>
                                </div>
                                
                                {/* Project Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'projects' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Project Console" />}>
                                        <ProjectConsole {...consoleProps} />
                                    </Suspense>
                                </div>
                                
                                {/* Workloader Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'workloader' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Workloader Console" />}>
                                        <WorkloaderConsole {...consoleProps} initialSelectedEmployeeInWorkloader={initialSelectedEmployeeInWorkloader} />
                                    </Suspense>
                                </div>
                                
                                {/* Task Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'tasks' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Task Console" />}>
                                        <TaskConsole {...consoleProps} />
                                    </Suspense>
                                </div>
                                
                                {/* Gantt Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'gantt' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Gantt Console" />}>
                                        <GanttConsole {...consoleProps} />
                                    </Suspense>
                                </div>
                                
                                {/* Project Forecast Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'project-forecast' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Forecast Console" />}>
                                        <ProjectForecastConsole {...consoleProps} />
                                    </Suspense>
                                </div>
                                
                                {/* Reporting Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'reporting' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Reporting Console" />}>
                                        <ReportingConsole {...consoleProps} allProjectActivities={allProjectActivities} />
                                    </Suspense>
                                </div>
                                
                                {/* Admin Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 overflow-y-auto ${view === 'admin' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Admin Console" />}>
                                        <AdminConsole {...consoleProps} />
                                    </Suspense>
                                </div>
                                
                                {/* Database Console */}
                                <div className={`absolute inset-0 transition-opacity duration-300 ${view === 'database' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Database Console" />}>
                                        <DatabaseConsole {...consoleProps} />
                                    </Suspense>
                                </div>
                            </div>
                        )}
                        
                        {/* Skills modal */}
                        {viewingSkillsFor && (
                            <Modal onClose={() => setViewingSkillsFor(null)} currentTheme={currentTheme}>
                                <Suspense fallback={<ConsoleLoadingFallback currentTheme={currentTheme} consoleName="Skills Console" />}>
                                    <SkillsConsole db={db} detailers={[viewingSkillsFor]} singleDetailerMode={true} currentTheme={currentTheme} appId={appId} showToast={showToast} />
                                </Suspense>
                            </Modal>
                        )}
                    </main>
                    <footer className={`text-center p-2 text-xs border-t flex-shrink-0 ${currentTheme.headerBg} ${currentTheme.borderColor} ${currentTheme.subtleText}`}>
                        User ID: {userId || 'N/A'} | App ID: {appId}
                    </footer>
                </div>
                
                {/* Feedback Modal */}
                <FeedbackModal 
                    isOpen={isFeedbackModalOpen}
                    onClose={() => setIsFeedbackModalOpen(false)}
                    db={db}
                    appId={appId}
                    currentTheme={currentTheme}
                    showToast={showToast}
                    currentUser={currentUser}
                />
            </div>
        </NavigationContext.Provider>
    );
};

const App = () => {
    const [accessLevel, setAccessLevel] = useState('default');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [allDetailers, setAllDetailers] = useState([]);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/detailers`), (snapshot) => {
            setAllDetailers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!geminiApiKey && !window.__app_id) {
            console.warn(`
      =================================================================
      AI-POWERED INSIGHTS - API KEY MISSING
      -----------------------------------------------------------------
      The 'geminiApiKey' in App.js is empty. The AI features in the
      Reporting Console will not work without it.

      To fix this:
      1. Get your free API key from Google AI Studio:
         https://makersuite.google.com/app/apikey
      2. Paste the key into the 'geminiApiKey' constant in App.js.
      =================================================================
      `);
        }
    }, []);

    const handleLoginAttempt = (username, password) => {
        const user = allDetailers.find(d => d.firstName === username);

        if (username === 'Taskmaster' && password === 'Taskmaster1234') {
            setAccessLevel('taskmaster');
            setIsLoggedIn(true);
            setLoginError('');
            setCurrentUser({ id: 'taskmaster_user', firstName: 'Taskmaster' });
        } else if (username === 'TCL' && password === 'TCL1234') {
            setAccessLevel('tcl');
            setIsLoggedIn(true);
            setLoginError('');
            setCurrentUser({ id: 'tcl_user', firstName: 'TCL' });
        } else if (username === 'Viewer' && password === 'Viewer8765') {
            setAccessLevel('viewer');
            setIsLoggedIn(true);
            setLoginError('');
            setCurrentUser({ id: 'viewer_user', firstName: 'Viewer' });
        } else if (user) {
            if (password === 'TCL1234') {
                setAccessLevel('tcl');
                setIsLoggedIn(true);
                setLoginError('');
                setCurrentUser(user);
            } else if (password === 'Viewer8765') {
                setAccessLevel('viewer');
                setIsLoggedIn(true);
                setLoginError('');
                setCurrentUser(user);
            } else {
                 setLoginError('Invalid password for this user.');
            }
        }
        else {
            setLoginError('Invalid username or password.');
        }
    };

    const handleLogout = () => {
        setAccessLevel('default');
        setIsLoggedIn(false);
        setCurrentUser(null);
    };

    const authContextValue = useMemo(() => ({ accessLevel, setAccessLevel, currentUser }), [accessLevel, currentUser]);

    return (
        <AuthContext.Provider value={authContextValue}>
            <TutorialProvider accessLevel={accessLevel}>
                <AppContent
                    accessLevel={accessLevel}
                    isLoggedIn={isLoggedIn}
                    loginError={loginError}
                    handleLoginAttempt={handleLoginAttempt}
                    handleLogout={handleLogout}
                    currentUser={currentUser}
                    geminiApiKey={geminiApiKey}
                />
            </TutorialProvider>
        </AuthContext.Provider>
    );
};

export default App;