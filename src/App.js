import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion'; // Import Framer Motion

// Import all the console components
import TeamConsole from './TeamConsole';
import ProjectConsole from './ProjectConsole';
import WorkloaderConsole from './WorkloaderConsole';
import TaskConsole from './TaskConsole';
import GanttConsole from './GanttConsole';
import ForecastConsole from './ForecastConsole';
import SkillsConsole from './SkillsConsole';
import ReportingConsole from './ReportingConsole';
import AdminConsole from './AdminConsole';

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

// --- NEW UX/UI Components ---
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

// --- React Components ---
const LoginInline = ({ onLogin, error }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if(password !== confirmPassword) {
            setLocalError('Passwords do not match.');
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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div className={`${theme.cardBg} ${theme.textColor} p-6 rounded-lg shadow-2xl w-full ${customClasses} max-h-[90vh] overflow-y-auto`}>
                <div className="flex justify-end">
                    <button onClick={onClose} className={`text-2xl font-bold ${theme.subtleText} hover:${theme.textColor}`}>&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- Main Application Component ---
const App = () => {
    const [view, setView] = useState('projects');
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
    const [accessLevel, setAccessLevel] = useState('default');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [toasts, setToasts] = useState([]);
    const [viewingSkillsFor, setViewingSkillsFor] = useState(null);


    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
        }, 3000);
    };

    const themeClasses = {
        light: { mainBg: 'bg-gray-100', headerBg: 'bg-white', cardBg: 'bg-white', textColor: 'text-gray-800', subtleText: 'text-gray-600', borderColor: 'border-gray-200', altRowBg: 'bg-blue-50', navBg: 'bg-gray-200', navBtn: 'text-gray-600 hover:bg-gray-300', navBtnActive: 'bg-white text-blue-600 shadow', consoleBg: 'bg-gray-50', inputBg: 'bg-white', inputText: 'text-gray-900', inputBorder: 'border-gray-300', buttonBg: 'bg-gray-200', buttonText: 'text-gray-800' },
        grey: { mainBg: 'bg-gray-300', headerBg: 'bg-gray-400', cardBg: 'bg-gray-200', textColor: 'text-black', subtleText: 'text-gray-700', borderColor: 'border-gray-400', altRowBg: 'bg-gray-300', navBg: 'bg-gray-300', navBtn: 'text-gray-800 hover:bg-gray-400', navBtnActive: 'bg-white text-blue-700 shadow', consoleBg: 'bg-gray-200', inputBg: 'bg-gray-100', inputText: 'text-black', inputBorder: 'border-gray-400', buttonBg: 'bg-gray-400', buttonText: 'text-black' },
        dark: { mainBg: 'bg-gray-900', headerBg: 'bg-gray-800', cardBg: 'bg-gray-700', textColor: 'text-gray-200', subtleText: 'text-gray-400', borderColor: 'border-gray-600', altRowBg: 'bg-gray-800', navBg: 'bg-gray-700', navBtn: 'text-gray-400 hover:bg-gray-600', navBtnActive: 'bg-gray-900 text-white shadow', consoleBg: 'bg-gray-800', inputBg: 'bg-gray-800', inputText: 'text-gray-200', inputBorder: 'border-gray-600', buttonBg: 'bg-gray-600', buttonText: 'text-gray-200' }
    };
    const currentTheme = themeClasses[theme];

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

        setTimeout(() => setLoading(false), 1000); // Simulate loading for skeleton visibility

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [isAuthReady]);

    const handleLoginAttempt = (username, password) => {
        if (username === 'Taskmaster' && password === 'Taskmaster1234') {
            setAccessLevel('taskmaster');
            setView('detailers');
            setIsLoggedIn(true);
            setLoginError('');
        } else if (username === 'TCL' && password === 'TCL1234') {
            setAccessLevel('tcl');
            setView('projects');
            setIsLoggedIn(true);
            setLoginError('');
        } else if (username === 'Viewer' && password === 'Viewer8765') {
            setAccessLevel('viewer');
            setView('workloader');
            setIsLoggedIn(true);
            setLoginError('');
        } else {
            setLoginError('Invalid username or password.');
        }
    };

    const handleLogout = () => {
        setAccessLevel('default');
        setIsLoggedIn(false);
        setView('projects');
    };

    const handleNavClick = (viewId) => {
        setView(viewId);
    };
    
    const navButtons = [
        { id: 'detailers', label: 'Team', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg> },
        { id: 'projects', label: 'Project', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg> },
        { id: 'workloader', label: 'Workloader', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5z" /></svg> },
        { id: 'tasks', label: 'Tasks', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" /></svg>},
        { id: 'gantt', label: 'Gantt', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg> },
        { id: 'forecast', label: 'Forecast', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 5.943 7.522 3 10 3s6.268 2.943 9.542 7c-3.274 4.057-7.03 7-9.542 7S3.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg> },
        { id: 'reporting', label: 'Reporting', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg> },
        { id: 'admin', label: 'Manage', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    ];
    
    const navConfig = {
        taskmaster: ['detailers', 'projects', 'workloader', 'tasks', 'gantt', 'forecast', 'reporting', 'admin'],
        tcl: ['projects', 'workloader', 'tasks', 'gantt'],
        viewer: ['workloader', 'tasks', 'gantt'],
        default: []
    };

    const visibleNavButtons = navButtons.filter(button => 
        navConfig[accessLevel]?.includes(button.id)
    );

    const renderView = () => {
        if (loading) {
            switch (view) {
                case 'detailers': return <TeamConsoleSkeleton currentTheme={currentTheme} />;
                default: return <div className="p-10"><SkeletonLoader className="h-32 w-full" /></div>;
            }
        }
        
        const allowedViews = navConfig[accessLevel];
        const currentView = allowedViews?.includes(view) ? view : (allowedViews.length > 0 ? allowedViews[0] : null);
        
        const consoleProps = { db, detailers, projects, assignments, tasks, taskLanes, currentTheme, accessLevel, theme, setTheme, appId, showToast };

        switch (currentView) {
            case 'detailers': return <TeamConsole {...consoleProps} setViewingSkillsFor={setViewingSkillsFor} />;
            case 'projects': return <ProjectConsole {...consoleProps} />;
            case 'workloader': return <WorkloaderConsole {...consoleProps} />;
            case 'tasks': return <TaskConsole {...consoleProps} />;
            case 'gantt': return <GanttConsole {...consoleProps} />;
            case 'forecast': return <ForecastConsole {...consoleProps} />;
            case 'reporting': return <ReportingConsole {...consoleProps} allProjectActivities={allProjectActivities} />;
            case 'admin': return <AdminConsole {...consoleProps} />;
            default: return <div className="text-center p-10">Select a view from the navigation.</div>;
        }
    };

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
        <div style={{ fontFamily: 'Arial, sans-serif' }} className={`${currentTheme.mainBg} min-h-screen`}>
            <Toaster toasts={toasts} />
            <div className={`w-full h-screen flex flex-col ${currentTheme.textColor}`}>
                 <header className={`p-4 border-b space-y-4 flex-shrink-0 ${currentTheme.headerBg} ${currentTheme.borderColor}`}>
                     <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h1 className={`text-2xl font-bold ${currentTheme.textColor}`}>Workforce Productivity Tracker</h1>
                        <nav className={`${currentTheme.navBg} p-1 rounded-lg`}>
                            <div className="flex items-center space-x-1 flex-wrap justify-center">
                                {visibleNavButtons.map(button => (
                                    <button
                                        key={button.id}
                                        onClick={() => handleNavClick(button.id)}
                                        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === button.id ? currentTheme.navBtnActive : currentTheme.navBtn}`}
                                    >
                                        {button.icon}
                                        {button.label}
                                    </button>
                                ))}
                            </div>
                        </nav>
                    </div>
                    <div className="flex justify-center items-center">
                         <button
                                onClick={handleLogout}
                                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-600 transition-colors"
                            >
                                Logout ({accessLevel})
                            </button>
                    </div>
                </header>
                <main className={`flex-grow overflow-y-auto ${currentTheme.consoleBg}`}>
                   {/* This is where the animation is applied */}
                   <AnimatePresence mode="wait">
                        <motion.div
                            key={view} // The key is crucial for AnimatePresence to detect changes
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderView()}
                        </motion.div>
                    </AnimatePresence>
                </main>
                 <footer className={`text-center p-2 text-xs border-t flex-shrink-0 ${currentTheme.headerBg} ${currentTheme.borderColor} ${currentTheme.subtleText}`}>
                    User ID: {userId || 'N/A'} | App ID: {appId}
                </footer>
            </div>
            {viewingSkillsFor && (
                <Modal onClose={() => setViewingSkillsFor(null)} currentTheme={currentTheme}>
                    <SkillsConsole db={db} detailers={[viewingSkillsFor]} singleDetailerMode={true} currentTheme={currentTheme} appId={appId} showToast={showToast} />
                </Modal>
            )}
        </div>
    );
};

export default App;
