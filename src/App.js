import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, query, getDocs, writeBatch, updateDoc, where } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import * as d3 from 'd3';

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

const formatCurrency = (value) => {
    const numberValue = Number(value) || 0;
    return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const titleOptions = [
    "Detailer I", "Detailer II", "Detailer III", "BIM Specialist", "Programmatic Detailer",
    "Project Constructability Lead", "Project Constructability Lead, Sr.",
    "Trade Constructability Lead", "Constructability Manager"
];

const initialDetailers = [
    { firstName: "Arne", lastName: "Knutsen", employeeId: "502530", title: "Detailer III", email: "Arne.Knutsen@example.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Bailee", lastName: "Risley", employeeId: "107888", title: "Detailer I", email: "BRisley@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "David", lastName: "Hisaw", employeeId: "500038", title: "Detailer III", email: "DHisaw@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Devon", lastName: "Beaudry", employeeId: "505369", title: "Detailer I", email: "dbeaudry@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Jacob", lastName: "Gowey", employeeId: "100989", title: "Project Constructability Lead", email: "jgowey@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Jade", lastName: "Abrams", employeeId: "530498", title: "Detailer I", email: "Jade.Abrams@example.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Jeremiah", lastName: "Griffith", employeeId: "500193", title: "Project Constructability Lead, Sr.", email: "jgriffith@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Melissa", lastName: "Cannon", employeeId: "530634", title: "Detailer I", email: "MCannon@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Michael", lastName: "McIntyre", employeeId: "507259", title: "Detailer II", email: "mmcIntyre@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Philip", lastName: "Kronberg", employeeId: "506614", title: "Detailer II", email: "pkronberg@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Rick", lastName: "Peterson", employeeId: "500132", title: "Trade Constructability Lead", email: "rpeterson@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Robert", lastName: "Mitchell", employeeId: "113404", title: "Detailer I", email: "RoMitchell@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Shawn", lastName: "Schneirla", employeeId: "503701", title: "Detailer III", email: "sschneirla@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Shawn", lastName: "Simleness", employeeId: "503506", title: "Project Constructability Lead", email: "ssimleness@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Travis", lastName: "Michalowski", employeeId: "505404", title: "Detailer II", email: "TMichalowski@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Joshua", lastName: "Testerman", employeeId: "504750", title: "Detailer I", email: "JoTesterman@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Tyler", lastName: "Stoker", employeeId: "113923", title: "Detailer I", email: "Tyler.Stoker@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Nickolas", lastName: "Marshall", employeeId: "520118", title: "Detailer I", email: "nmarshall@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Jeremy", lastName: "Splattstoesser", employeeId: "507221", title: "Detailer II", email: "jsplattstoesser@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Pavel", lastName: "Makarenko", employeeId: "500793", title: "Detailer II", email: "PMakarenko@southlandind.com", skills: {}, disciplineSkillsets: {} },
    { firstName: "Tyson", lastName: "Kafentzis", employeeId: "101153", title: "Detailer I", email: "TKafentzis@southlandind.com", skills: {}, disciplineSkillsets: {} }
];

const initialProjects = [
    { name: "Brandt Interco", projectId: "5800005", initialBudget: 0, blendedRate: 0, contingency: 0, archived: false, dashboardUrl: "" },
    { name: "PRECON / Estimating 2022", projectId: "5818022", initialBudget: 0, blendedRate: 0, contingency: 0, archived: false, dashboardUrl: "" },
    { name: "RLSB 7th Floor Buildout", projectId: "5820526", initialBudget: 0, blendedRate: 0, contingency: 0, archived: false, dashboardUrl: "" },
];

const skillCategories = ["Model Knowledge", "BIM Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
const disciplineOptions = ["Duct", "Plumbing", "Piping", "Structural", "Coordination", "GIS/GPS", "BIM"];
const activityOptions = ["Modeling", "Coordination", "Spooling", "Deliverables", "Miscellaneous"];
const taskStatusOptions = ["Not Started", "In Progress", "Completed", "Deleted"];

const tradeColorMapping = {
    Piping: { bg: 'bg-green-500', text: 'text-white' },
    Duct: { bg: 'bg-yellow-400', text: 'text-black' },
    Plumbing: { bg: 'bg-amber-700', text: 'text-white' },
    Coordination: { bg: 'bg-fuchsia-500', text: 'text-white' },
    BIM: { bg: 'bg-purple-500', text: 'text-white' },
    Structural: { bg: 'bg-blue-500', text: 'text-white' },
    "GIS/GPS": { bg: 'bg-orange-500', text: 'text-white' },
};

const legendColorMapping = {
    Piping: 'bg-green-500',
    Duct: 'bg-yellow-400',
    Plumbing: 'bg-amber-700',
    Coordination: 'bg-fuchsia-500',
    BIM: 'bg-purple-500',
    Structural: 'bg-blue-500',
    "GIS/GPS": 'bg-orange-500',
};

const initialActivityData = [
    { id: `act_${Date.now()}_1`, description: "SM Modeling", chargeCode: "96100-96-ENG-10", estimatedHours: 0 },
    { id: `act_${Date.now()}_2`, description: "SM Coordination", chargeCode: "96800-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_3`, description: "SM Deliverables", chargeCode: "96810-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_4`, description: "SM Spooling", chargeCode: "96210-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_5`, description: "SM Misc", chargeCode: "96830-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_6`, description: "PF Modeling", chargeCode: "96110-96-ENG-10", estimatedHours: 0 },
    { id: `act_${Date.now()}_7`, description: "PF Coordination", chargeCode: "96801-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_8`, description: "PF Deliverables", chargeCode: "96811-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_9`, description: "PF Spooling", chargeCode: "96211-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_10`, description: "PF Misc", chargeCode: "96831-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_11`, description: "PL Modeling", chargeCode: "96130-96-ENG-10", estimatedHours: 0 },
    { id: `act_${Date.now()}_12`, description: "PL Coordination", chargeCode: "96803-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_13`, description: "PL Deliverables", chargeCode: "96813-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_14`, description: "PL Spooling", chargeCode: "96213-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_15`, description: "PL Misc", chargeCode: "96833-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_16`, description: "Detailing-In House-Cad Mgr", chargeCode: "96505-96-ENG-10", estimatedHours: 0 },
    { id: `act_${Date.now()}_17`, description: "Project Setup", chargeCode: "96301-96-ENG-62", estimatedHours: 0 },
];

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

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children, currentTheme }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center">
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-lg shadow-2xl w-full max-w-md`}>
                <h3 className="text-lg font-bold mb-4">{title}</h3>
                <div className={`mb-6 ${currentTheme.subtleText}`}>{children}</div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className={`px-4 py-2 rounded-md ${currentTheme.buttonBg} hover:bg-opacity-80`}>Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Confirm</button>
                </div>
            </div>
        </div>
    );
};

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


const BubbleRating = ({ score, onScoreChange, currentTheme }) => {
    return (
        <div className="flex items-center space-x-1 flex-wrap">
            {[...Array(10)].map((_, i) => {
                const ratingValue = i + 1;
                return (
                    <div key={ratingValue} className="flex flex-col items-center">
                        <span className={`text-xs ${currentTheme.textColor}`}>{ratingValue}</span>
                        <button
                            type="button"
                            onClick={() => onScoreChange(ratingValue)}
                            className={`w-5 h-5 rounded-full border border-gray-400 transition-colors ${ratingValue <= score ? 'bg-blue-500' : 'bg-gray-200 hover:bg-blue-200'}`}
                        />
                    </div>
                );
            })}
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

const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center justify-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && text && (
                <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md z-10">
                    {text}
                </div>
            )}
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
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [theme, setTheme] = useState('dark');
    const [accessLevel, setAccessLevel] = useState('default');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
        }, 3000);
    };

    const themeClasses = {
        light: { mainBg: 'bg-gray-100', headerBg: 'bg-white', cardBg: 'bg-white', textColor: 'text-gray-800', subtleText: 'text-gray-600', borderColor: 'border-gray-200', altRowBg: 'bg-blue-50', navBg: 'bg-gray-200', navBtn: 'text-gray-600 hover:bg-gray-300', navBtnActive: 'bg-white text-blue-600 shadow', consoleBg: 'p-4 bg-gray-50', inputBg: 'bg-white', inputText: 'text-gray-900', inputBorder: 'border-gray-300', buttonBg: 'bg-gray-200', buttonText: 'text-gray-800' },
        grey: { mainBg: 'bg-gray-300', headerBg: 'bg-gray-400', cardBg: 'bg-gray-200', textColor: 'text-black', subtleText: 'text-gray-700', borderColor: 'border-gray-400', altRowBg: 'bg-gray-300', navBg: 'bg-gray-300', navBtn: 'text-gray-800 hover:bg-gray-400', navBtnActive: 'bg-white text-blue-700 shadow', consoleBg: 'p-4 bg-gray-200', inputBg: 'bg-gray-100', inputText: 'text-black', inputBorder: 'border-gray-400', buttonBg: 'bg-gray-400', buttonText: 'text-black' },
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

    const seedInitialData = useCallback(async () => {
        if (!db) return;
        const detailersRef = collection(db, `artifacts/${appId}/public/data/detailers`);
        const projectsRef = collection(db, `artifacts/${appId}/public/data/projects`);
        const lanesRef = collection(db, `artifacts/${appId}/public/data/taskLanes`);
        
        const seedCollection = async (ref, initialData) => {
            const snapshot = await getDocs(query(ref));
            if (snapshot.empty) {
                console.log(`Seeding ${ref.path}...`);
                const batch = writeBatch(db);
                initialData.forEach(item => {
                    const newDocRef = doc(ref);
                    batch.set(newDocRef, item);
                });
                await batch.commit();
            }
        };

        await Promise.all([
            seedCollection(detailersRef, initialDetailers),
            seedCollection(projectsRef, initialProjects),
            seedCollection(lanesRef, [
                { name: "New Requests", order: 0 }, { name: "Project Setup Support (VDC)", order: 1 },
                { name: "Process Improvements (VDC)", order: 2 }, { name: "Support Requests (VDC)", order: 3 },
                { name: "RFA Requests (VDC)", order: 4 }, { name: "On Hold", order: 5 },
            ])
        ]);
    }, []);

    useEffect(() => {
        if (!isAuthReady || !db) return;
        setLoading(true);
    
        seedInitialData().then(() => {
            const collections = {
                detailers: setDetailers,
                projects: setProjects,
                assignments: setAssignments,
                tasks: setTasks,
                taskLanes: (data) => setTaskLanes(data.sort((a, b) => a.order - b.order)),
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
        });
    }, [isAuthReady, seedInitialData]);

    const handleLoginAttempt = (username, password) => {
        if (username === 'Taskmaster' && password === 'Taskmaster1234') {
            setAccessLevel('taskmaster');
            setView('detailers');
            setIsLoggedIn(true);
            setLoginError('');
        } else if (username === 'PCL' && password === 'PCL1234') {
            setAccessLevel('pcl');
            setView('projects');
            setIsLoggedIn(true);
            setLoginError('');
        } else if (username === 'Viewer' && password === 'Viewer8765') {
            setAccessLevel('viewer');
            setView('projects');
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
        { id: 'skills', label: 'Edit', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg> },
        { id: 'reporting', label: 'Reporting', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg> },
        { id: 'admin', label: 'Manage', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    ];
    
    const navConfig = {
        taskmaster: ['detailers', 'projects', 'workloader', 'tasks', 'gantt', 'skills', 'reporting', 'admin'],
        pcl: ['projects', 'workloader', 'tasks', 'gantt'],
        viewer: ['projects', 'workloader', 'tasks'],
        default: []
    };

    const visibleNavButtons = navButtons.filter(button => 
        navConfig[accessLevel]?.includes(button.id)
    );

    const renderView = () => {
        if (loading) {
            switch (view) {
                case 'detailers': return <TeamConsoleSkeleton currentTheme={currentTheme} />;
                // Add other skeleton loaders here if created
                default: return <div className="p-10"><SkeletonLoader className="h-32 w-full" /></div>;
            }
        }
        
        const allowedViews = navConfig[accessLevel];
        const currentView = allowedViews?.includes(view) ? view : (allowedViews.length > 0 ? allowedViews[0] : null);
        
        const consoleProps = { db, detailers, projects, assignments, tasks, taskLanes, currentTheme, accessLevel, theme, setTheme, appId, showToast };

        switch (currentView) {
            case 'detailers': return <TeamConsole {...consoleProps} />;
            case 'projects': return <ProjectConsole {...consoleProps} />;
            case 'workloader': return <WorkloaderConsole {...consoleProps} />;
            case 'tasks': return <TaskConsole {...consoleProps} />;
            case 'gantt': return <GanttConsole {...consoleProps} />;
            case 'skills': return <SkillsConsole {...consoleProps} />;
            case 'reporting': return <ReportingConsole {...consoleProps} />;
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
                   {renderView()}
                </main>
                 <footer className={`text-center p-2 text-xs border-t flex-shrink-0 ${currentTheme.headerBg} ${currentTheme.borderColor} ${currentTheme.subtleText}`}>
                    User ID: {userId || 'N/A'} | App ID: {appId}
                </footer>
            </div>
        </div>
    );
};


// --- Console Components ---

const InlineAssignmentEditor = ({ db, assignment, projects, detailerDisciplines, onUpdate, onDelete, currentTheme }) => {
    const sortedProjects = useMemo(() => {
        return [...projects].sort((a,b) => a.projectId.localeCompare(b.projectId, undefined, {numeric: true}));
    }, [projects]);
    
    const availableTrades = Object.keys(detailerDisciplines || {});

    const handleChange = (field, value) => {
        onUpdate({ ...assignment, [field]: value });
    };

    return (
        <div className={`${currentTheme.altRowBg} p-3 rounded-lg border ${currentTheme.borderColor} space-y-3`}>
             <div className="flex items-center gap-2">
                <select 
                    value={assignment.projectId} 
                    onChange={e => handleChange('projectId', e.target.value)} 
                    className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                >
                    <option value="">Select a Project...</option>
                    {sortedProjects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
                </select>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <input type="date" value={assignment.startDate} onChange={e => handleChange('startDate', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                 <input type="date" value={assignment.endDate} onChange={e => handleChange('endDate', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
            </div>
            <div className="grid grid-cols-3 gap-2">
                 <select value={assignment.trade} onChange={e => handleChange('trade', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                    <option value="">Trade...</option>
                    {availableTrades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <select value={assignment.activity} onChange={e => handleChange('activity', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                    <option value="">Activity...</option>
                    {activityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input type="number" placeholder="%" value={assignment.allocation} onChange={e => handleChange('allocation', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
            </div>
        </div>
    );
};

const TeamConsole = ({ db, detailers, projects, assignments, currentTheme, appId, showToast }) => {
    const [sortBy, setSortBy] = useState('firstName');
    const [viewingSkillsFor, setViewingSkillsFor] = useState(null);
    const [newAssignments, setNewAssignments] = useState({});
    const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [visibleEmployees, setVisibleEmployees] = useState(15);
    const [assignmentSortBy, setAssignmentSortBy] = useState('projectName'); // 'projectName' or 'projectId'

    const getMostRecentMonday = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff)).toISOString().split('T')[0];
    };
    
    const sortedEmployees = useMemo(() => {
        return [...detailers].sort((a, b) => {
            if (sortBy === 'firstName') return a.firstName.localeCompare(b.firstName);
            return a.lastName.localeCompare(b.lastName);
        });
    }, [detailers, sortBy]);

    // FIXED: Moved the complex sorting logic into a single useMemo at the top level of the component.
    // This prevents the "Hook can't be called in a callback" error and is more efficient.
    const employeesWithSortedAssignments = useMemo(() => {
        const projectMap = new Map(projects.map(p => [p.id, p]));
        return sortedEmployees.map(employee => {
            const empAssignments = assignments
                .filter(a => a.detailerId === employee.id)
                .map(assignment => {
                    const project = projectMap.get(assignment.projectId);
                    return {
                        ...assignment,
                        projectName: project ? project.name : 'Unknown Project',
                        projectIdentifier: project ? project.projectId : '0'
                    };
                });

            empAssignments.sort((a, b) => {
                if (assignmentSortBy === 'projectName') {
                    const nameCompare = a.projectName.localeCompare(b.projectName);
                    if (nameCompare !== 0) return nameCompare;
                    return a.projectIdentifier.localeCompare(b.projectIdentifier, undefined, { numeric: true });
                }
                return a.projectIdentifier.localeCompare(b.projectIdentifier, undefined, { numeric: true });
            });
            return { ...employee, sortedAssignments: empAssignments };
        });
    }, [sortedEmployees, assignments, projects, assignmentSortBy]);

    const handleAddNewAssignment = (employeeId) => {
        const newAsn = {
            id: `new_${Date.now()}`,
            projectId: '',
            startDate: getMostRecentMonday(),
            endDate: '',
            trade: '',
            activity: '',
            allocation: '100',
        };
        setNewAssignments(prev => ({
            ...prev,
            [employeeId]: [...(prev[employeeId] || []), newAsn],
        }));
    };
    
    const handleUpdateNewAssignment = (employeeId, updatedAsn) => {
        setNewAssignments(prev => ({
            ...prev,
            [employeeId]: (prev[employeeId] || []).map(asn => asn.id === updatedAsn.id ? updatedAsn : asn)
        }));
    };
    
    const handleSaveNewAssignment = async (employeeId, assignmentToSave) => {
        const { projectId, startDate, endDate, trade, activity, allocation } = assignmentToSave;
        if(!projectId || !startDate || !endDate || !trade || !activity || !allocation) {
            showToast("Please fill all fields before saving.", "error");
            return;
        }

        const { id, ...payload } = assignmentToSave;
        const finalPayload = { ...payload, detailerId: employeeId, allocation: Number(payload.allocation) };

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/assignments`), finalPayload);
            showToast("Assignment saved successfully!");
            const remaining = (newAssignments[employeeId] || []).filter(a => a.id !== assignmentToSave.id);
            setNewAssignments(prev => ({ ...prev, [employeeId]: remaining }));
        } catch (e) {
            console.error("Error saving new assignment:", e);
            showToast("Failed to save assignment.", "error");
        }
    };

    const handleDeleteNewAssignment = (employeeId, assignmentId) => {
        const remaining = (newAssignments[employeeId] || []).filter(a => a.id !== assignmentId);
        setNewAssignments(prev => ({ ...prev, [employeeId]: remaining }));
    };

    const handleUpdateExistingAssignment = async (assignment) => {
        const { id, ...payload } = assignment;
        const { projectId, trade, activity } = payload;
    
        if (!activity || !trade || !projectId) {
            confirmDeleteAssignment(id);
            return;
        }
    
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, id);
        try {
            await updateDoc(assignmentRef, {
                ...payload,
                allocation: Number(payload.allocation)
            });
            showToast("Assignment updated.");
            await mergeContiguousAssignments(payload.detailerId, payload.projectId);
        } catch(e) {
            console.error("Error updating assignment", e);
            showToast("Error updating assignment.", "error");
        }
    };
    
    const mergeContiguousAssignments = useCallback(async (detailerId, projectId) => {
        const q = query(
            collection(db, `artifacts/${appId}/public/data/assignments`),
            where("detailerId", "==", detailerId),
            where("projectId", "==", projectId)
        );
    
        const snapshot = await getDocs(q);
        const userAssignments = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            startDateObj: new Date(d.data().startDate),
            endDateObj: new Date(d.data().endDate),
        }));
    
        const validAssignments = userAssignments.filter(a => a.startDate && a.endDate);
        if (validAssignments.length < 2) return;
    
        validAssignments.sort((a, b) => a.startDateObj - b.startDateObj);
    
        const toDelete = new Set();
        const toUpdate = new Map();
    
        for (let i = 0; i < validAssignments.length - 1; i++) {
            const current = validAssignments[i];
            const next = validAssignments[i + 1];
    
            if (toDelete.has(current.id) || toDelete.has(next.id)) continue;
    
            const canMerge =
                current.trade === next.trade &&
                current.activity === next.activity &&
                current.allocation == next.allocation;
    
            const dayAfterCurrentEnd = new Date(current.endDateObj);
            dayAfterCurrentEnd.setUTCDate(dayAfterCurrentEnd.getUTCDate() + 1);
            
            if (canMerge && dayAfterCurrentEnd.getTime() === next.startDateObj.getTime()) {
                const newEndDate = next.endDate;
                current.endDate = newEndDate;
                current.endDateObj = new Date(newEndDate);
                
                toDelete.add(next.id);
                toUpdate.set(current.id, { endDate: newEndDate });
                validAssignments[i+1] = current;
            }
        }
    
        if (toDelete.size > 0 || toUpdate.size > 0) {
            const batch = writeBatch(db);
            toDelete.forEach(id => batch.delete(doc(db, `artifacts/${appId}/public/data/assignments`, id)));
            toUpdate.forEach((data, id) => {
                if(!toDelete.has(id)) {
                   batch.update(doc(db, `artifacts/${appId}/public/data/assignments`, id), data);
                }
            });
            try {
                await batch.commit();
                showToast("Assignments merged automatically.", "success");
            } catch (e) {
                console.error("Error during merge operation:", e);
                showToast("Failed to merge assignments.", "error");
            }
        }
    }, [appId, db, showToast]);

    const confirmDeleteAssignment = (id) => {
        const assignmentToDelete = assignments.find(a => a.id === id);
        if (!assignmentToDelete) return;
        
        setConfirmAction({
            title: "Delete Assignment",
            message: "Are you sure you want to permanently delete this assignment?",
            action: async () => {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, id));
                showToast("Assignment deleted.");
                await mergeContiguousAssignments(assignmentToDelete.detailerId, assignmentToDelete.projectId);
            }
        });
    };
    
    const toggleEmployee = (employeeId) => {
        setExpandedEmployeeId(prevId => prevId === employeeId ? null : employeeId);
    };

    return (
        <div>
            <ConfirmationModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    if(confirmAction.action) confirmAction.action();
                    setConfirmAction(null);
                }}
                title={confirmAction?.title}
                currentTheme={currentTheme}
            >
                {confirmAction?.message}
            </ConfirmationModal>

            <div className="flex justify-end items-center mb-4 gap-2">
                <span className={`mr-2 text-sm font-medium ${currentTheme.subtleText}`}>Sort by:</span>
                <button onClick={() => setSortBy('firstName')} className={`px-4 py-1.5 rounded-md text-sm ${sortBy === 'firstName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>First Name</button>
                <button onClick={() => setSortBy('lastName')} className={`px-4 py-1.5 rounded-md text-sm ${sortBy === 'lastName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Last Name</button>
            </div>
            
            <div className={`${currentTheme.cardBg} rounded-lg p-4 space-y-2`}>
                <div className={`hidden md:grid grid-cols-12 gap-4 font-bold text-sm ${currentTheme.subtleText} px-4 py-2`}>
                    <div className="col-span-3">EMPLOYEE</div>
                    <div className="col-span-7">PROJECT ASSIGNMENTS</div>
                    <div className="col-span-2 text-right">CURRENT WEEK %</div>
                </div>
                {employeesWithSortedAssignments.slice(0, visibleEmployees).map((employeeData, index) => {
                    const { sortedAssignments, ...employee } = employeeData;
                    const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;
                    
                    const today = new Date();
                    const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)));
                    weekStart.setHours(0, 0, 0, 0);

                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    weekEnd.setHours(23, 59, 59, 999);
                    
                    const weeklyAllocation = sortedAssignments.reduce((sum, a) => {
                        if (!a.startDate || !a.endDate) return sum;
                        const assignStart = new Date(a.startDate);
                        const assignEnd = new Date(a.endDate);
                        if (assignStart <= weekEnd && assignEnd >= weekStart) {
                            return sum + Number(a.allocation || 0);
                        }
                        return sum;
                    }, 0);

                    const employeeNewAssignments = newAssignments[employee.id] || [];
                    const isExpanded = expandedEmployeeId === employee.id;

                    return (
                        <div key={employee.id} className={`${bgColor} rounded-lg shadow-sm`}>
                            <div 
                                className="grid grid-cols-12 gap-4 items-center p-4 cursor-pointer"
                                onClick={() => toggleEmployee(employee.id)}
                            >
                                <div className="col-span-11 md:col-span-3">
                                    <p className="font-bold">{employee.firstName} {employee.lastName}</p>
                                    <p className={`text-sm ${currentTheme.subtleText}`}>{employee.title || 'N/A'}</p>
                                    <p className={`text-xs ${currentTheme.subtleText}`}>ID: {employee.employeeId}</p>
                                    <a href={`mailto:${employee.email}`} onClick={(e) => e.stopPropagation()} className="text-xs text-blue-500 hover:underline">{employee.email}</a>
                                    <button onClick={(e) => {e.stopPropagation(); setViewingSkillsFor(employee);}} className="text-sm text-blue-500 hover:underline mt-2 block">View Skills</button>
                                </div>
                                <div className="hidden md:col-span-7 md:block">
                                    {!isExpanded && (
                                        <p className={`text-sm ${currentTheme.subtleText}`}>
                                            {sortedAssignments.length > 0 ? `${sortedAssignments.length} total assignment(s)` : 'No assignments'}
                                        </p>
                                    )}
                                </div>
                                <div className="hidden md:col-span-2 md:block text-right">
                                     <p className={`font-bold text-lg ${weeklyAllocation > 100 ? 'text-red-500' : 'text-green-600'}`}>{weeklyAllocation}%</p>
                                </div>
                                <div className="col-span-1 flex justify-end items-center">
                                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className={`p-4 border-t ${currentTheme.borderColor}`}>
                                    <div className="grid grid-cols-12 gap-4 items-start">
                                        <div className="col-span-12 md:col-start-4 md:col-span-7 space-y-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className={`font-semibold ${currentTheme.textColor}`}>All Project Assignments</h4>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className={`${currentTheme.subtleText}`}>Sort by:</span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setAssignmentSortBy('projectName'); }}
                                                        className={`px-2 py-1 rounded ${assignmentSortBy === 'projectName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                                    >
                                                        Alphabetical
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setAssignmentSortBy('projectId'); }}
                                                        className={`px-2 py-1 rounded ${assignmentSortBy === 'projectId' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                                    >
                                                        Project ID
                                                    </button>
                                                </div>
                                            </div>
                                            {sortedAssignments.length > 0 ? sortedAssignments.map(asn => (
                                                <InlineAssignmentEditor key={asn.id} db={db} assignment={asn} projects={projects} detailerDisciplines={employee.disciplineSkillsets} onUpdate={handleUpdateExistingAssignment} onDelete={() => confirmDeleteAssignment(asn.id)} currentTheme={currentTheme} />
                                            )) : <p className={`text-sm ${currentTheme.subtleText}`}>No assignments to display.</p>}
                                             
                                            {employeeNewAssignments.map(asn => (
                                                <div key={asn.id} className="relative p-4 border border-dashed border-blue-400 rounded-lg">
                                                    <InlineAssignmentEditor db={db} assignment={asn} projects={projects} detailerDisciplines={employee.disciplineSkillsets} onUpdate={(upd) => handleUpdateNewAssignment(employee.id, upd)} onDelete={() => handleDeleteNewAssignment(employee.id, asn.id)} currentTheme={currentTheme} />
                                                    <button onClick={() => handleSaveNewAssignment(employee.id, asn)} className="mt-2 bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600">Save New Assignment</button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddNewAssignment(employee.id)} className="text-sm text-blue-500 hover:underline">+ Add Project/Trade</button>
                                        </div>
                                         <div className="col-span-12 md:col-span-2 text-right md:hidden">
                                            <p className="font-semibold">Current Week %</p>
                                            <p className={`font-bold text-lg ${weeklyAllocation > 100 ? 'text-red-500' : 'text-green-600'}`}>{weeklyAllocation}%</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
                {visibleEmployees < employeesWithSortedAssignments.length && (
                    <div className="text-center mt-4">
                        <button onClick={() => setVisibleEmployees(prev => prev + 15)} className={`${currentTheme.buttonBg} ${currentTheme.buttonText} px-4 py-2 rounded-lg`}>
                            Load More
                        </button>
                    </div>
                )}
            </div>

            {viewingSkillsFor && (
                <Modal onClose={() => setViewingSkillsFor(null)} currentTheme={currentTheme}>
                    <SkillsConsole db={db} detailers={[viewingSkillsFor]} singleDetailerMode={true} currentTheme={currentTheme} appId={appId} showToast={showToast} />
                </Modal>
            )}
        </div>
    );
};

const ActivityRow = React.memo(({ activity, groupKey, index, onChange, onDelete, project, currentTheme }) => {
    const blendedRate = project.blendedRate || 0;
    const earnedValue = (activity.estimatedHours * blendedRate) * (activity.percentComplete / 100);
    const actualCost = activity.hoursUsed * blendedRate;

    const calculateProjectedHours = (activity) => {
        const hoursUsed = Number(activity.hoursUsed) || 0;
        const percentComplete = Number(activity.percentComplete) || 0;
        if (!percentComplete || percentComplete === 0) return 0;
        return (hoursUsed / percentComplete) * 100;
    };
    const projected = calculateProjectedHours(activity);
    
    return (
        <tr key={activity.id}>
            <td className="p-1"><input type="text" value={activity.description} onChange={(e) => onChange(groupKey, index, 'description', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1"><input type="text" value={activity.chargeCode} onChange={(e) => onChange(groupKey, index, 'chargeCode', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1 w-24"><input type="text" value={activity.estimatedHours} onChange={(e) => onChange(groupKey, index, 'estimatedHours', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{activity.percentComplete.toFixed(2)}%</td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{activity.hoursUsed.toFixed(2)}</td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{formatCurrency(earnedValue)}</td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{formatCurrency(actualCost)}</td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{projected.toFixed(2)}</td>
            <td className="p-1 text-center w-12"><button onClick={() => onDelete(groupKey, index)} className="text-red-500 hover:text-red-700 font-bold">&times;</button></td>
        </tr>
    );
});


const CollapsibleActivityTable = React.memo(({ title, data, groupKey, colorClass, onAdd, onDelete, onChange, isCollapsed, onToggle, project, currentTheme }) => {
    return (
        <div className={`border-b ${currentTheme.borderColor}`}>
            <button
                onClick={onToggle}
                className={`w-full p-2 text-left font-bold flex justify-between items-center ${colorClass}`}
                disabled={onToggle === null}
            >
                <span>{title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {!isCollapsed && (
                <div className="overflow-x-auto" onClick={e => e.stopPropagation()}>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className={currentTheme.altRowBg}>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Activity Description</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Charge Code</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Est. Hrs</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>% Comp</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Hrs Used</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Earned ($)</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Actual ($)</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Proj. Hrs</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((activity, index) => (
                                <ActivityRow
                                    key={activity.id}
                                    activity={activity}
                                    groupKey={groupKey}
                                    index={index}
                                    onChange={onChange}
                                    onDelete={onDelete}
                                    project={project}
                                    currentTheme={currentTheme}
                                />
                            ))}
                             <tr>
                                <td colSpan="9" className="p-1"><button onClick={() => onAdd(groupKey)} className="text-sm text-blue-600 hover:underline">+ Add Activity</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
});

const FinancialSummary = ({ project, activityTotals, currentTheme }) => {
    if (!project || !activityTotals) return null;

    const initialBudget = project.initialBudget || 0;
    const contingency = project.contingency || 0;
    const blendedRate = project.blendedRate || 0;

    const spentToDate = activityTotals.used * blendedRate;
    
    const totalHours = activityTotals.estimated;
    const overallPercentComplete = totalHours > 0 ? (activityTotals.used / totalHours) * 100 : 0;
    
    const earnedValue = initialBudget * (overallPercentComplete / 100);
    const productivity = spentToDate > 0 ? earnedValue / spentToDate : 0;

    const costToComplete = (activityTotals.estimated - activityTotals.used) * blendedRate;
    const estFinalCost = spentToDate + costToComplete;

    return (
        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center`}>
            <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Initial Budget</p>
                <p className="text-lg font-bold">{formatCurrency(initialBudget)}</p>
            </div>
            <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Contingency</p>
                <p className="text-lg font-bold">{formatCurrency(contingency)}</p>
            </div>
            <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Spent to Date</p>
                <p className="text-lg font-bold">{formatCurrency(spentToDate)}</p>
            </div>
             <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Cost to Complete</p>
                <p className="text-lg font-bold">{formatCurrency(costToComplete)}</p>
            </div>
             <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Est. Final Cost</p>
                <p className="text-lg font-bold">{formatCurrency(estFinalCost)}</p>
            </div>
             <div >
                <p className={`text-sm ${currentTheme.subtleText}`}>Productivity</p>
                <p className={`text-lg font-bold ${productivity < 1 ? 'text-red-500' : 'text-green-500'}`}>{productivity.toFixed(2)}</p>
            </div>
        </div>
    )
}

const HourSummary = ({ project, activityTotals, currentTheme }) => {
    if (!project || !activityTotals) return null;

    const totalBudgetHours = (project.initialBudget || 0) / (project.blendedRate || 1);
    const allocatedHours = activityTotals.estimated;
    const unallocatedHours = totalBudgetHours - allocatedHours;

    return (
        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4`}>
            <div className="text-center">
                <p className={`text-sm ${currentTheme.subtleText}`}>Total Budgeted Hours</p>
                <p className="text-lg font-bold">{totalBudgetHours.toFixed(2)}</p>
            </div>
            <div className="text-center">
                <p className={`text-sm ${currentTheme.subtleText}`}>Total Allocated Hours</p>
                <p className="text-lg font-bold">{allocatedHours.toFixed(2)}</p>
            </div>
             <div className="text-center">
                <p className={`text-sm ${currentTheme.subtleText}`}>Unallocated Hours</p>
                <p className={`text-lg font-bold ${unallocatedHours < 0 ? 'text-red-500' : 'text-green-600'}`}>{unallocatedHours.toFixed(2)}</p>
            </div>
        </div>
    )
}

const ProjectDetailView = ({ db, project, projectId, accessLevel, currentTheme, appId, showToast }) => {
    const [draftData, setDraftData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newSubset, setNewSubset] = useState({ name: '', activityId: '', percentageOfProject: 0, percentComplete: 0, hoursUsed: 0, budget: 0 });
    const [editingSubsetId, setEditingSubsetId] = useState(null);
    const [editingSubsetData, setEditingSubsetData] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({
        projectBreakdown: false,
        sheetmetal: true,
        piping: true,
        plumbing: true,
        bim: true
    });
    const isPCL = accessLevel === 'pcl';

    const docRef = useMemo(() => doc(db, `artifacts/${appId}/public/data/projectActivities`, projectId), [projectId, db, appId]);

    const allActivitiesList = useMemo(() => {
        if (!draftData) return [];
        return Object.values(draftData.activities).flat();
    }, [draftData]);


    const groupActivities = (activityArray) => {
        return activityArray.reduce((acc, act) => {
            const desc = act.description.toUpperCase();
            if (desc.startsWith('SM')) acc.sheetmetal.push(act);
            else if (desc.startsWith('PF')) acc.piping.push(act);
            else if (desc.startsWith('PL')) acc.plumbing.push(act);
            else acc.bim.push(act);
            return acc;
        }, { sheetmetal: [], piping: [], plumbing: [], bim: [] });
    };

    const calculateRollups = useCallback((activities, subsets) => {
        const newActivities = JSON.parse(JSON.stringify(activities));
        
        Object.keys(newActivities).forEach(group => {
            newActivities[group].forEach(activity => {
                const relevantSubsets = subsets.filter(s => s.activityId === activity.id);
                
                const totalHoursUsed = relevantSubsets.reduce((sum, s) => sum + (Number(s.hoursUsed) || 0), 0);
                
                const totalPercentComplete = relevantSubsets.reduce((sum, s) => {
                    const subsetPercentOfProject = Number(s.percentageOfProject) || 0;
                    const subsetPercentComplete = Number(s.percentComplete) || 0;
                    return sum + ((subsetPercentOfProject / 100) * subsetPercentComplete);
                }, 0);

                activity.hoursUsed = totalHoursUsed;
                activity.percentComplete = totalPercentComplete; 
            });
        });
        return newActivities;
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            let initialData;
            if (docSnap.exists()) {
                const data = docSnap.data();
                const activities = data.activities || groupActivities(initialActivityData);
                const subsets = data.subsets || [];
                initialData = { activities, subsets };
            } else {
                const initialGroupedData = groupActivities(initialActivityData);
                initialData = { activities: initialGroupedData, subsets: [] };
                setDoc(docRef, initialData);
            }
            const rolledUpActivities = calculateRollups(initialData.activities, initialData.subsets);
            const fullData = {...initialData, activities: rolledUpActivities};
            
            setDraftData(JSON.parse(JSON.stringify(fullData)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching project data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, docRef, calculateRollups]);
    
    useEffect(() => {
        if (draftData) {
            const rolledUpActivities = calculateRollups(draftData.activities, draftData.subsets);
            if(JSON.stringify(rolledUpActivities) !== JSON.stringify(draftData.activities)){
                setDraftData(prev => ({ ...prev, activities: rolledUpActivities }));
            }
        }
    }, [draftData, calculateRollups]);


    const handleActivityChange = useCallback((group, index, field, value) => {
        setDraftData(prevDraft => {
            const newActivities = { ...prevDraft.activities };
            const newGroup = [...newActivities[group]];
            newGroup[index] = { ...newGroup[index], [field]: value };
            newActivities[group] = newGroup;

            return {
                ...prevDraft,
                activities: newActivities
            };
        });
    }, []);
    
    const handleSaveChanges = async (e) => {
        e.stopPropagation();
        const dataToSave = JSON.parse(JSON.stringify(draftData));

        dataToSave.subsets.forEach(subset => {
            subset.percentageOfProject = Number(subset.percentageOfProject) || 0;
            subset.percentComplete = Number(subset.percentComplete) || 0;
            subset.hoursUsed = Number(subset.hoursUsed) || 0;
            subset.budget = Number(subset.budget) || 0;
        });

        for (const groupKey of Object.keys(dataToSave.activities)) {
            dataToSave.activities[groupKey].forEach(activity => {
                delete activity.percentComplete;
                delete activity.hoursUsed;
            });
        }

        await setDoc(docRef, dataToSave, { merge: true });
        if (!isPCL) {
          showToast("Changes saved!");
        }
    };
    
    const handleEditingSubsetChange = (field, value) => {
        setEditingSubsetData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubsetFieldChange = useCallback((subsetId, field, value) => {
        setDraftData(prevDraft => {
            const newSubsets = prevDraft.subsets.map(s => {
                if (s.id === subsetId) {
                    const numericValue = Number(value);
                    return { ...s, [field]: isNaN(numericValue) ? 0 : numericValue };
                }
                return s;
            });
            return { ...prevDraft, subsets: newSubsets };
        });
    }, []);


    const handleAddNewSubset = () => {
        if (!newSubset.name.trim()) return;
        const subsetToAdd = { 
            ...newSubset, 
            id: `sub_${Date.now()}`, 
            percentageOfProject: Number(newSubset.percentageOfProject) || 0,
            percentComplete: Number(newSubset.percentComplete) || 0,
            hoursUsed: Number(newSubset.hoursUsed) || 0,
            budget: Number(newSubset.budget) || 0,
        };
        setDraftData(prevDraft => ({
            ...prevDraft,
            subsets: [...(prevDraft.subsets || []), subsetToAdd]
        }));
        setNewSubset({ name: '', activityId: '', percentageOfProject: 0, percentComplete: 0, hoursUsed: 0, budget: 0 });
    };

    const handleUpdateSubset = () => {
        if (!editingSubsetData || !editingSubsetData.name.trim()) return;
        setDraftData(prevDraft => ({
            ...prevDraft,
            subsets: prevDraft.subsets.map(s => 
                s.id === editingSubsetId 
                ? { ...editingSubsetData, 
                    percentageOfProject: Number(editingSubsetData.percentageOfProject) || 0,
                    percentComplete: Number(editingSubsetData.percentComplete) || 0,
                    hoursUsed: Number(editingSubsetData.hoursUsed) || 0,
                    budget: Number(editingSubsetData.budget) || 0,
                  } 
                : s
            )
        }));
        setEditingSubsetId(null);
        setEditingSubsetData(null);
    };

    const handleDeleteSubset = (subsetId) => {
        setDraftData(prevDraft => ({
            ...prevDraft,
            subsets: prevDraft.subsets.filter(s => s.id !== subsetId)
        }));
    };
    
    const handleAddNewActivity = useCallback((group) => {
        const newActivity = {
            id: `act_${Date.now()}`,
            description: "New Activity",
            chargeCode: "",
            estimatedHours: 0,
            percentComplete: 0,
            hoursUsed: 0,
        };
        setDraftData(prevDraft => ({
            ...prevDraft,
            activities: {
                ...prevDraft.activities,
                [group]: [...prevDraft.activities[group], newActivity]
            }
        }));
    }, []);

    const handleDeleteActivity = useCallback((group, index) => {
        setDraftData(prevDraft => {
            const newGroup = [...prevDraft.activities[group]];
            const deletedActivityId = newGroup[index].id;
            newGroup.splice(index, 1);
            return {
                ...prevDraft,
                activities: {
                    ...prevDraft.activities,
                    [group]: newGroup
                },
                subsets: prevDraft.subsets.filter(s => s.activityId !== deletedActivityId)
            };
        });
    }, []);

    const handleToggleCollapse = (e, section) => {
        e.stopPropagation();
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const activityTotals = useMemo(() => {
        if (!draftData) return null;
        const allActivities = Object.values(draftData.activities).flat();
        return allActivities.reduce((acc, activity) => {
            acc.estimated += Number(activity.estimatedHours || 0);
            acc.used += Number(activity.hoursUsed || 0);
            return acc;
        }, { estimated: 0, used: 0 });
    }, [draftData]);

    if (loading || !draftData || !project || !activityTotals) return <div className="p-4 text-center">Loading Project Details...</div>;
    
    return (
        <div className="space-y-6 mt-4 border-t pt-4">
             {!isPCL && (
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" onClick={e => e.stopPropagation()}>
                    <FinancialSummary project={project} activityTotals={activityTotals} currentTheme={currentTheme} />
                    <HourSummary project={project} activityTotals={activityTotals} currentTheme={currentTheme} />
                 </div>
             )}
            
            <div className={`${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                 <button
                    onClick={(e) => handleToggleCollapse(e, 'projectBreakdown')}
                    className={`w-full p-3 text-left font-bold flex justify-between items-center ${currentTheme.altRowBg} hover:bg-opacity-75 transition-colors`}
                >
                    <h3 className="text-lg font-semibold">Project Breakdown</h3>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform ${collapsedSections.projectBreakdown ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {!collapsedSections.projectBreakdown && (
                    <div className="p-4" onClick={e => e.stopPropagation()}>
                        <div className={`space-y-2 mb-4 ${isPCL ? 'w-full md:w-1/3' : ''}`}>
                            <div className={`hidden sm:grid ${isPCL ? 'grid-cols-4' : 'grid-cols-11'} gap-x-4 font-bold text-xs ${currentTheme.subtleText} px-2`}>
                                <span className="col-span-2">Name</span>
                                <span className="col-span-1">Activity</span>
                                {!isPCL && <span className="col-span-1">Budget ($)</span>}
                                {!isPCL && <span className="col-span-1">% of Project</span>}
                                <span className="col-span-1">% Complete</span>
                                {!isPCL && (
                                    <>
                                        <span className="col-span-1">Hours Used</span>
                                        <span className="col-span-1">Earned ($)</span>
                                        <span className="col-span-1">Actual ($)</span>
                                        <span className="col-span-1">Productivity</span>
                                        <span className="col-span-1">Actions</span>
                                    </>
                                )}
                            </div>
                            {(draftData.subsets || []).map((subset, index) => {
                                const earned = (subset.budget || 0) * (subset.percentComplete || 0) / 100;
                                const actual = (subset.hoursUsed || 0) * (project.blendedRate || 0);
                                const productivity = actual > 0 ? earned / actual : 0;
                                return (
                                    <div key={subset.id} className={`grid grid-cols-1 ${isPCL ? 'sm:grid-cols-4' : 'sm:grid-cols-11'} gap-x-4 items-center p-2 ${currentTheme.altRowBg} rounded-md`}>
                                        {editingSubsetId === subset.id && !isPCL ? (
                                            <>
                                                <input type="text" placeholder="Name" value={editingSubsetData.name} onChange={e => handleEditingSubsetChange('name', e.target.value)} className={`p-1 border rounded col-span-2 ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <select value={editingSubsetData.activityId} onChange={e => handleEditingSubsetChange('activityId', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                                    <option value="">Select Activity...</option>
                                                    {allActivitiesList.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
                                                </select>
                                                <input type="number" placeholder="Budget ($)" value={editingSubsetData.budget} onChange={e => handleEditingSubsetChange('budget', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <input type="number" placeholder="% of Project" value={editingSubsetData.percentageOfProject} onChange={e => handleEditingSubsetChange('percentageOfProject', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <input type="number" placeholder="% Complete" value={editingSubsetData.percentComplete} onChange={e => handleEditingSubsetChange('percentComplete', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <input type="number" placeholder="Hours Used" value={editingSubsetData.hoursUsed} onChange={e => handleEditingSubsetChange('hoursUsed', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <div className="col-span-3"></div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleUpdateSubset} className="text-green-500 hover:text-green-700">Save</button>
                                                    <button onClick={() => setEditingSubsetId(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-medium col-span-2">{subset.name}</span>
                                                <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{allActivitiesList.find(a => a.id === subset.activityId)?.description || 'N/A'}</span>
                                                {!isPCL && <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{formatCurrency(subset.budget || 0)}</span>}
                                                {!isPCL && <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{subset.percentageOfProject}%</span>}
                                                
                                                {isPCL ? (
                                                    <div className="col-span-1">
                                                        <input
                                                            type="number"
                                                            value={subset.percentComplete}
                                                            onChange={(e) => handleSubsetFieldChange(subset.id, 'percentComplete', e.target.value)}
                                                            onBlur={handleSaveChanges}
                                                            className={`p-1 border-2 rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.borderColor} border-yellow-400`}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{subset.percentComplete}%</span>
                                                )}

                                                {!isPCL && (
                                                    <>
                                                        <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{subset.hoursUsed}</span>
                                                        <span className={`text-sm font-semibold col-span-1`}>{formatCurrency(earned)}</span>
                                                        <span className={`text-sm font-semibold col-span-1`}>{formatCurrency(actual)}</span>
                                                        <span className={`text-sm font-bold col-span-1 ${productivity < 1 ? 'text-red-500' : 'text-green-500'}`}>{productivity.toFixed(2)}</span>
                                                        <div className="flex items-center gap-2 col-span-1">
                                                            <button onClick={() => {setEditingSubsetId(subset.id); setEditingSubsetData({...subset});}} className="text-blue-500 hover:text-blue-700">Edit</button>
                                                            <button onClick={() => handleDeleteSubset(subset.id)} className="text-red-500 hover:text-red-700">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                            )})}
                        </div>
                        {!isPCL && (
                            <div className="grid grid-cols-1 sm:grid-cols-9 gap-2 items-center p-2 border-t pt-4">
                                <input type="text" placeholder="Phase/Building/Area/Level" value={newSubset.name} onChange={e => setNewSubset({...newSubset, name: e.target.value})} className={`p-2 border rounded-md col-span-2 ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <select value={newSubset.activityId} onChange={e => setNewSubset({...newSubset, activityId: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                    <option value="">Select Activity...</option>
                                    {allActivitiesList.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
                                </select>
                                <input type="number" placeholder="Budget ($)" value={newSubset.budget} onChange={e => setNewSubset({...newSubset, budget: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <input type="number" placeholder="% of Proj" value={newSubset.percentageOfProject} onChange={e => setNewSubset({...newSubset, percentageOfProject: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <input type="number" placeholder="% Comp" value={newSubset.percentComplete} onChange={e => setNewSubset({...newSubset, percentComplete: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <input type="number" placeholder="Hrs Used" value={newSubset.hoursUsed} onChange={e => setNewSubset({...newSubset, hoursUsed: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />

                                <button onClick={handleAddNewSubset} className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 col-span-2">Add Subset</button>
                            </div>
                        )}
                    </div>
                 )}
            </div>

            {!isPCL && (
                <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`} onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold">Activity Tracker</h3>
                        <button onClick={handleSaveChanges} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm">
                            Save All Changes
                        </button>
                     </div>
                    <CollapsibleActivityTable title="Sheetmetal" data={draftData.activities.sheetmetal} groupKey="sheetmetal" colorClass="bg-yellow-400/70" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.sheetmetal} onToggle={(e) => handleToggleCollapse(e, 'sheetmetal')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="Piping" data={draftData.activities.piping} groupKey="piping" colorClass="bg-green-500/70" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.piping} onToggle={(e) => handleToggleCollapse(e, 'piping')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="Plumbing" data={draftData.activities.plumbing} groupKey="plumbing" colorClass="bg-amber-700/70" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.plumbing} onToggle={(e) => handleToggleCollapse(e, 'plumbing')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="BIM" data={draftData.activities.bim} groupKey="bim" colorClass="bg-purple-500/70" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.bim} onToggle={(e) => handleToggleCollapse(e, 'bim')} project={project} currentTheme={currentTheme}/>
                     <div className={`${currentTheme.altRowBg} font-bold p-2 flex justify-end gap-x-6`}>
                        <span className="text-right">Totals:</span>
                        <span>Est: {activityTotals.estimated.toFixed(2)}</span>
                        <span>Used: {activityTotals.used.toFixed(2)}</span>
                     </div>
                </div>
            )}
        </div>
    );
};


const ProjectConsole = ({ db, detailers, projects, assignments, accessLevel, currentTheme, appId, showToast }) => {
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [filters, setFilters] = useState({ query: '', detailerId: '', startDate: '', endDate: '' });

    const handleProjectClick = (projectId) => {
        setExpandedProjectId(prevId => (prevId === projectId ? null : projectId));
    };

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => !p.archived)
            .filter(p => {
                const { query, detailerId, startDate, endDate } = filters;
                const searchLower = query.toLowerCase();
                
                const nameMatch = p.name.toLowerCase().includes(searchLower);
                const idMatch = p.projectId.includes(searchLower);
                
                const projectAssignments = assignments.filter(a => a.projectId === p.id);
                
                const detailerMatch = !detailerId || projectAssignments.some(a => a.detailerId === detailerId);
                
                const dateMatch = (!startDate && !endDate) || projectAssignments.some(a => {
                    const assignStart = new Date(a.startDate);
                    const assignEnd = new Date(a.endDate);
                    const filterStart = startDate ? new Date(startDate) : null;
                    const filterEnd = endDate ? new Date(endDate) : null;

                    if (filterStart && filterEnd) return assignStart <= filterEnd && assignEnd >= filterStart;
                    if (filterStart) return assignEnd >= filterStart;
                    if (filterEnd) return assignStart <= filterEnd;
                    return true;
                });

                return (nameMatch || idMatch) && detailerMatch && dateMatch;
            })
            .sort((a, b) => a.projectId.localeCompare(b.projectId, undefined, { numeric: true }));
    }, [projects, assignments, filters]);

    const isViewer = accessLevel === 'viewer';
    
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div>
            <div className={`sticky top-0 z-10 p-4 rounded-b-lg mb-4 ${currentTheme.cardBg} border-b border-x ${currentTheme.borderColor} shadow-md`}>
                <h2 className={`text-xl font-bold mb-4 ${currentTheme.textColor}`}>Project Overview & Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        name="query"
                        placeholder="Search by project name or ID..."
                        value={filters.query}
                        onChange={handleFilterChange}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                    <select name="detailerId" value={filters.detailerId} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                        <option value="">Filter by Detailer...</option>
                        {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                    </select>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                </div>
            </div>
            <div className="space-y-4 px-4">
                {filteredProjects.map((p, index) => {
                    const projectAssignments = assignments.filter(a => a.projectId === p.id);
                    const isExpanded = expandedProjectId === p.id;
                    const project = projects.find(proj => proj.id === p.id);
                    const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;

                    return (
                        <div 
                            key={p.id} 
                            className={`${bgColor} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm transition-all duration-300 ease-in-out`}
                            onClick={() => handleProjectClick(p.id)}
                        >
                            <div className="flex justify-between items-start cursor-pointer">
                                <div>
                                    <h3 className="text-lg font-semibold">{p.name}</h3>
                                    <p className={`text-sm ${currentTheme.subtleText}`}>Project ID: {p.projectId}</p>
                                </div>
                                {!isExpanded && (
                                     <span className={`text-xs ${currentTheme.subtleText}`}>Click to expand</span>
                                )}
                            </div>
                           
                            {isExpanded && (
                                <div onClick={e => e.stopPropagation()}>
                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="text-md font-semibold mb-2 border-b pb-1">Assigned Detailers:</h4>
                                            {projectAssignments.length === 0 ? (
                                                <p className={`text-sm ${currentTheme.subtleText}`}>None</p>
                                            ) : (
                                                <ul className="list-disc list-inside text-sm space-y-1">
                                                    {projectAssignments.map(a => {
                                                        const detailer = detailers.find(d => d.id === a.detailerId);
                                                        return (
                                                            <li key={a.id}>
                                                                {detailer ? `${detailer.firstName} ${detailer.lastName}` : 'Unknown Detailer'} - <span className="font-semibold">{a.allocation}%</span> ({a.trade}/{a.activity})
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                        <div>
                                            {p.dashboardUrl && (
                                                <>
                                                    <h4 className="text-md font-semibold mb-2 border-b pb-1">Dashboard</h4>
                                                    <a
                                                        href={p.dashboardUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                        </svg>
                                                        Project Dashboard
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {!isViewer && <ProjectDetailView db={db} project={project} projectId={p.id} accessLevel={accessLevel} currentTheme={currentTheme} appId={appId} showToast={showToast} />}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SkillsConsole = ({ db, detailers, singleDetailerMode = false, currentTheme, appId, showToast }) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(singleDetailerMode && detailers[0] ? detailers[0].id : '');
    const [editableEmployee, setEditableEmployee] = useState(null);
    const [newDiscipline, setNewDiscipline] = useState('');

    useEffect(() => {
        const employee = detailers.find(d => d.id === selectedEmployeeId);
        if (employee) {
            setEditableEmployee({ ...employee });
        } else {
            setEditableEmployee(null);
        }
    }, [selectedEmployeeId, detailers]);

    const handleSkillChange = (skillName, score) => {
        setEditableEmployee(prev => ({
            ...prev,
            skills: { ...prev.skills, [skillName]: score }
        }));
    };
    
    const handleAddDiscipline = () => {
        if (newDiscipline && editableEmployee) {
            const currentDisciplines = editableEmployee.disciplineSkillsets || {};
            if (!currentDisciplines.hasOwnProperty(newDiscipline)) {
                setEditableEmployee(prev => ({
                    ...prev,
                    disciplineSkillsets: { ...(prev.disciplineSkillsets || {}), [newDiscipline]: 0 }
                }));
                setNewDiscipline('');
            }
        }
    };
    
    const handleRemoveDiscipline = (disciplineToRemove) => {
        setEditableEmployee(prev => {
            const { [disciplineToRemove]: _, ...remaining } = prev.disciplineSkillsets;
            return { ...prev, disciplineSkillsets: remaining };
        });
    };
    
    const handleDisciplineRatingChange = (name, score) => {
        setEditableEmployee(prev => ({
            ...prev,
            disciplineSkillsets: {
                ...prev.disciplineSkillsets,
                [name]: score,
            },
        }));
    };

    const handleSaveChanges = async () => {
        if (!db || !editableEmployee) return;
        const employeeRef = doc(db, `artifacts/${appId}/public/data/detailers`, editableEmployee.id);
        const { id, ...dataToSave } = editableEmployee;
        await setDoc(employeeRef, dataToSave, { merge: true });
        showToast("Changes saved successfully!");
    };
    
    return (
        <div className={currentTheme.textColor}>
            <h2 className="text-xl font-bold mb-4">Modify Employee Skills & Info</h2>
            {!singleDetailerMode && (
                <div className="mb-4">
                    <select onChange={e => setSelectedEmployeeId(e.target.value)} value={selectedEmployeeId} className={`w-full max-w-xs p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                        <option value="" disabled>Select an employee...</option>
                        {detailers.map(e => (
                            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                        ))}
                    </select>
                </div>
            )}

            {editableEmployee && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Basic Info for {editableEmployee.firstName} {editableEmployee.lastName}</h3>
                        <div className="space-y-2">
                            <input value={editableEmployee.firstName} onChange={e => setEditableEmployee({...editableEmployee, firstName: e.target.value})} placeholder="First Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                            <input value={editableEmployee.lastName} onChange={e => setEditableEmployee({...editableEmployee, lastName: e.target.value})} placeholder="Last Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                            <input type="email" value={editableEmployee.email || ''} onChange={e => setEditableEmployee({...editableEmployee, email: e.target.value})} placeholder="Email" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                             <select value={editableEmployee.title || ''} onChange={e => setEditableEmployee({...editableEmployee, title: e.target.value})} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="" disabled>Select a Title</option>
                                {titleOptions.map(title => (
                                    <option key={title} value={title}>{title}</option>
                                ))}
                            </select>
                            <input value={editableEmployee.employeeId} onChange={e => setEditableEmployee({...editableEmployee, employeeId: e.target.value})} placeholder="Employee ID" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Skill Assessment</h3>
                         <div className="space-y-4">
                            {skillCategories.map(skill => (
                                <div key={skill}>
                                    <label className="font-medium">{skill}</label>
                                    <BubbleRating 
                                        score={editableEmployee.skills?.[skill] || 0}
                                        onScoreChange={(score) => handleSkillChange(skill, score)}
                                        currentTheme={currentTheme}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Discipline Skillsets</h3>
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                             <select value={newDiscipline} onChange={(e) => setNewDiscipline(e.target.value)} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">Select a discipline...</option>
                                {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <button onClick={handleAddDiscipline} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Add Discipline</button>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(editableEmployee.disciplineSkillsets || {}).map(([name, score]) => (
                                <div key={name} className={`p-3 ${currentTheme.altRowBg} rounded-md border ${currentTheme.borderColor}`}>
                                    <div className="flex justify-between items-start">
                                       <span className="font-medium">{name}</span>
                                       <button onClick={() => handleRemoveDiscipline(name)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                                    </div>
                                    <BubbleRating score={score} onScoreChange={(newScore) => handleDisciplineRatingChange(name, newScore)} currentTheme={currentTheme} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleSaveChanges} className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600 mt-4">Save All Changes</button>
                </div>
            )}
        </div>
    );
};


const AdminConsole = ({ db, detailers, projects, currentTheme, appId, showToast }) => {
    const [newEmployee, setNewEmployee] = useState({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '' });
    const [newProject, setNewProject] = useState({ name: '', projectId: '', initialBudget: 0, blendedRate: 0, contingency: 0, dashboardUrl: '' });
    
    const [editingEmployeeId, setEditingEmployeeId] = useState(null);
    const [editingEmployeeData, setEditingEmployeeData] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectData, setEditingProjectData] = useState(null);
    const [employeeSortBy, setEmployeeSortBy] = useState('firstName');
    const [projectSortBy, setProjectSortBy] = useState('projectId');
    const [showArchived, setShowArchived] = useState(false);

    const sortedEmployees = useMemo(() => {
        return [...detailers].sort((a, b) => {
            if (employeeSortBy === 'lastName') {
                return a.lastName.localeCompare(b.lastName);
            }
            return a.firstName.localeCompare(b.firstName);
        });
    }, [detailers, employeeSortBy]);

    const sortedProjects = useMemo(() => {
        return [...projects]
            .filter(p => showArchived ? p.archived : !p.archived)
            .sort((a, b) => {
                if (projectSortBy === 'name') {
                    return a.name.localeCompare(b.name);
                }
                return a.projectId.localeCompare(b.projectId, undefined, { numeric: true });
            });
    }, [projects, projectSortBy, showArchived]);


    const handleAdd = async (type) => {
        if (!db) return;
        if (type === 'employee') {
            if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.employeeId) {
                showToast('Please fill all employee fields.', 'error');
                return;
            }
            await addDoc(collection(db, `artifacts/${appId}/public/data/detailers`), { ...newEmployee, skills: {}, disciplineSkillsets: {} });
            setNewEmployee({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '' });
            showToast('Employee added.');
        } else if (type === 'project') {
            if (!newProject.name || !newProject.projectId) {
                showToast('Please fill all project fields.', 'error');
                return;
            }
            await addDoc(collection(db, `artifacts/${appId}/public/data/projects`), {
                ...newProject,
                initialBudget: Number(newProject.initialBudget),
                blendedRate: Number(newProject.blendedRate),
                contingency: Number(newProject.contingency),
                archived: false,
            });
            setNewProject({ name: '', projectId: '', initialBudget: 0, blendedRate: 0, contingency: 0, dashboardUrl: '' });
            showToast('Project added.');
        }
    };

    const handleDelete = async (type, id) => {
        const collectionName = type === 'employee' ? 'detailers' : 'projects';
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id));
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`);
    };
    
    const handleEdit = (type, item) => {
        if (type === 'employee') {
            setEditingProjectId(null); 
            setEditingEmployeeId(item.id);
            setEditingEmployeeData({ ...item });
        } else if (type === 'project') {
            setEditingEmployeeId(null);
            setEditingProjectId(item.id);
            setEditingProjectData({ ...item });
        }
    };

    const handleCancel = () => {
        setEditingEmployeeId(null);
        setEditingProjectId(null);
    };

    const handleUpdate = async (type) => {
        try {
            if (type === 'employee') {
                const { id, ...data } = editingEmployeeData;
                const employeeRef = doc(db, `artifacts/${appId}/public/data/detailers`, id);
                await updateDoc(employeeRef, data);
            } else if (type === 'project') {
                const { id, ...data } = editingProjectData;
                const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, id);
                await updateDoc(projectRef, {
                    ...data,
                    initialBudget: Number(data.initialBudget),
                    blendedRate: Number(data.blendedRate),
                    contingency: Number(data.contingency),
                });
            }
            handleCancel();
            showToast('Item updated successfully.');
        } catch (error) {
            console.error("Error updating document: ", error);
            showToast("Failed to update item.", 'error');
        }
    };
    
    const handleEditDataChange = (e, type) => {
        const { name, value } = e.target;
        if (type === 'employee') {
            setEditingEmployeeData(prev => ({ ...prev, [name]: value }));
        } else if (type === 'project') {
            setEditingProjectData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleToggleArchive = async (projectId, isArchived) => {
        const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, projectId);
        await updateDoc(projectRef, {
            archived: !isArchived
        });
        showToast(`Project ${!isArchived ? 'archived' : 'unarchived'}.`);
    };
    
    const isEditing = editingEmployeeId || editingProjectId;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Manage Employees</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Sort by:</span>
                        <button onClick={() => setEmployeeSortBy('firstName')} className={`px-2 py-1 text-xs rounded-md ${employeeSortBy === 'firstName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>First Name</button>
                        <button onClick={() => setEmployeeSortBy('lastName')} className={`px-2 py-1 text-xs rounded-md ${employeeSortBy === 'lastName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Last Name</button>
                    </div>
                </div>
                <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4 ${isEditing ? 'opacity-50' : ''}`}>
                    <h3 className="font-semibold mb-2">Add New Employee</h3>
                    <div className="space-y-2 mb-4">
                        <input value={newEmployee.firstName} onChange={e => setNewEmployee({...newEmployee, firstName: e.target.value})} placeholder="First Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                        <input value={newEmployee.lastName} onChange={e => setNewEmployee({...newEmployee, lastName: e.target.value})} placeholder="Last Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                        <input type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} placeholder="Email" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                        <select value={newEmployee.title} onChange={e => setNewEmployee({...newEmployee, title: e.target.value})} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing}>
                            {titleOptions.map(title => (
                                <option key={title} value={title}>{title}</option>
                            ))}
                        </select>
                        <input value={newEmployee.employeeId} onChange={e => setNewEmployee({...newEmployee, employeeId: e.target.value})} placeholder="Employee ID" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                    </div>
                    <button onClick={() => handleAdd('employee')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600" disabled={isEditing}>Add Employee</button>
                </div>
                <div className="space-y-2">
                    {sortedEmployees.map((e, index) => {
                        const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;
                        return (
                        <div key={e.id} className={`${bgColor} p-3 border ${currentTheme.borderColor} rounded-md shadow-sm`}>
                            {editingEmployeeId === e.id ? (
                                <div className="space-y-2">
                                    <input name="firstName" value={editingEmployeeData.firstName} onChange={evt => handleEditDataChange(evt, 'employee')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    <input name="lastName" value={editingEmployeeData.lastName} onChange={evt => handleEditDataChange(evt, 'employee')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    <input type="email" name="email" value={editingEmployeeData.email} onChange={evt => handleEditDataChange(evt, 'employee')} placeholder="Email" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    <select name="title" value={editingEmployeeData.title} onChange={evt => handleEditDataChange(evt, 'employee')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                        {titleOptions.map(title => (
                                            <option key={title} value={title}>{title}</option>
                                        ))}
                                    </select>
                                    <input name="employeeId" value={editingEmployeeData.employeeId} onChange={evt => handleEditDataChange(evt, 'employee')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdate('employee')} className="flex-grow bg-green-500 text-white p-2 rounded-md hover:bg-green-600">Save</button>
                                        <button onClick={handleCancel} className="flex-grow bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p>{e.firstName} {e.lastName}</p>
                                        <p className={`text-sm ${currentTheme.subtleText}`}>{e.title || 'N/A'} ({e.employeeId})</p>
                                        <a href={`mailto:${e.email}`} className="text-xs text-blue-500 hover:underline">{e.email}</a>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit('employee', e)} className="text-blue-500 hover:text-blue-700" disabled={isEditing}>Edit</button>
                                        <button onClick={() => handleDelete('employee', e.id)} className="text-red-500 hover:text-red-700" disabled={isEditing}>Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Manage Projects</h2>
                    <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2">
                            <span className="text-sm">Sort by:</span>
                            <button onClick={() => setProjectSortBy('name')} className={`px-2 py-1 text-xs rounded-md ${projectSortBy === 'name' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Alphabetical</button>
                            <button onClick={() => setProjectSortBy('projectId')} className={`px-2 py-1 text-xs rounded-md ${projectSortBy === 'projectId' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Project ID</button>
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm mr-2">{showArchived ? 'Showing Archived' : 'Showing Active'}</span>
                            <label htmlFor="archiveToggle" className="flex items-center cursor-pointer">
                                <div className="relative">
                                <input type="checkbox" id="archiveToggle" className="sr-only" checked={showArchived} onChange={() => setShowArchived(!showArchived)} />
                                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showArchived ? 'translate-x-6' : ''}`}></div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                 <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4 ${isEditing ? 'opacity-50' : ''}`}>
                    <h3 className="font-semibold mb-2">Add New Project</h3>
                    <div className="space-y-2 mb-4">
                        <input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="Project Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                        <input value={newProject.projectId} onChange={e => setNewProject({...newProject, projectId: e.target.value})} placeholder="Project ID" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                         <div className="flex items-center gap-2">
                            <label className="w-32">Initial Budget ($):</label>
                            <input type="number" value={newProject.initialBudget} onChange={e => setNewProject({...newProject, initialBudget: e.target.value})} placeholder="e.g. 50000" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                        </div>
                         <div className="flex items-center gap-2">
                            <label className="w-32">Blended Rate ($/hr):</label>
                            <input type="number" value={newProject.blendedRate} onChange={e => setNewProject({...newProject, blendedRate: e.target.value})} placeholder="e.g. 75" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                        </div>
                         <div className="flex items-center gap-2">
                            <label className="w-32">Contingency ($):</label>
                            <input type="number" value={newProject.contingency} onChange={e => setNewProject({...newProject, contingency: e.target.value})} placeholder="e.g. 5000" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="w-32">Project Dashboard:</label>
                            <input type="url" value={newProject.dashboardUrl} onChange={e => setNewProject({...newProject, dashboardUrl: e.target.value})} placeholder="https://..." className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                        </div>
                    </div>
                    <button onClick={() => handleAdd('project')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600" disabled={isEditing}>Add Project</button>
                </div>
                <div className="space-y-2 mb-8">
                    {sortedProjects.map((p, index) => {
                        const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;
                        return (
                         <div key={p.id} className={`${bgColor} p-3 border ${currentTheme.borderColor} rounded-md shadow-sm`}>
                            {editingProjectId === p.id ? (
                                <div className="space-y-2">
                                    <input name="name" value={editingProjectData.name} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    <input name="projectId" value={editingProjectData.projectId} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    <div className="flex items-center gap-2">
                                        <label className="w-32">Initial Budget ($):</label>
                                        <input name="initialBudget" value={editingProjectData.initialBudget || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Initial Budget ($)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="w-32">Blended Rate ($/hr):</label>
                                        <input name="blendedRate" value={editingProjectData.blendedRate || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Blended Rate ($/hr)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    </div>
                                     <div className="flex items-center gap-2">
                                        <label className="w-32">Contingency ($):</label>
                                        <input name="contingency" value={editingProjectData.contingency || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Contingency ($)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="w-32">Project Dashboard:</label>
                                        <input name="dashboardUrl" value={editingProjectData.dashboardUrl || ''} onChange={e => handleEditDataChange(e, 'project')} placeholder="https://..." className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button onClick={() => handleUpdate('project')} className="flex-grow bg-green-500 text-white p-2 rounded-md hover:bg-green-600">Save</button>
                                        <button onClick={handleCancel} className="flex-grow bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                      <p>{p.name} ({p.projectId})</p>
                                      <p className={`text-sm ${currentTheme.subtleText}`}>Budget: {formatCurrency(p.initialBudget)} | Rate: ${p.blendedRate || 0}/hr | Contingency: {formatCurrency(p.contingency)}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => handleToggleArchive(p.id, p.archived || false)} className={`text-xs px-2 py-1 rounded-md ${p.archived ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`} disabled={isEditing}>{p.archived ? 'Unarchive' : 'Archive'}</button>
                                        <button onClick={() => handleEdit('project', p)} className="text-blue-500 hover:text-blue-700" disabled={isEditing}>Edit</button>
                                        <button onClick={() => handleDelete('project', p.id)} className="text-red-500 hover:text-red-700" disabled={isEditing}>Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
};

const AssignmentEditPopup = ({ assignment, detailer, onSave, onClose, position, currentTheme, weekIndex }) => {
    const [trade, setTrade] = useState(assignment.trade);
    const [activity, setActivity] = useState(assignment.activity);

    const availableTrades = useMemo(() => {
        return Object.keys(detailer?.disciplineSkillsets || {});
    }, [detailer]);

    const handleSave = () => {
        onSave(assignment.id, { trade, activity }, weekIndex);
        onClose();
    };

    if (!detailer) return null;

    const optionClasses = `${currentTheme.inputBg} ${currentTheme.inputText}`;

    return (
        <div
            style={{ top: position.top, left: position.left }}
            className={`absolute z-30 p-4 rounded-lg shadow-xl border ${currentTheme.cardBg} ${currentTheme.borderColor}`}
            onClick={e => e.stopPropagation()}
        >
            <h4 className="font-semibold mb-3">Edit Assignment</h4>
            <div className="space-y-3">
                <div className="relative">
                    <label className="block text-sm font-medium mb-1">Discipline (Trade)</label>
                    <div className={`relative ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-md`}>
                        <select
                            value={trade}
                            onChange={e => setTrade(e.target.value)}
                            className={`w-full p-2 appearance-none bg-transparent ${currentTheme.inputText}`}
                        >
                            {availableTrades.map(opt => <option className={optionClasses} key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                            <svg className={`fill-current h-4 w-4 ${currentTheme.inputText}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Activity</label>
                     <div className="relative">
                        <select
                            value={activity}
                            onChange={e => setActivity(e.target.value)}
                            className={`w-full p-2 border rounded-md appearance-none ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                        >
                            {activityOptions.map(opt => <option className={optionClasses} key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                             <svg className={`fill-current h-4 w-4 ${currentTheme.inputText}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className={`px-3 py-1 rounded-md text-sm ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>Cancel</button>
                <button onClick={handleSave} className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white">Save</button>
            </div>
        </div>
    );
};


const WorkloaderConsole = ({ db, detailers, projects, assignments, theme, setTheme, accessLevel, currentTheme, appId, showToast }) => {
    const [startDate, setStartDate] = useState(new Date());
    const [sortBy, setSortBy] = useState('name');
    const [dragFillStart, setDragFillStart] = useState(null);
    const [dragFillEnd, setDragFillEnd] = useState(null);
    const [editingCell, setEditingCell] = useState(null);
    const popupRef = useRef(null);

    const isTaskmaster = accessLevel === 'taskmaster';

    const getWeekDates = (from) => {
        const sunday = new Date(from);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        const weeks = [];
        for (let i = 0; i < 25; i++) {
            const weekStart = new Date(sunday);
            weekStart.setDate(sunday.getDate() + (i * 7));
            weeks.push(weekStart);
        }
        return weeks;
    };
    
    const weekDates = useMemo(() => getWeekDates(startDate), [startDate]);

    const groupedData = useMemo(() => {
        const assignmentsByProject = assignments.reduce((acc, assignment) => {
            const projId = assignment.projectId;
            if (!acc[projId]) acc[projId] = [];
            acc[projId].push(assignment);
            return acc;
        }, {});

        return projects
            .filter(p => !p.archived)
            .map(project => {
                const projectAssignments = (assignmentsByProject[project.id] || []).map(ass => {
                    const detailer = detailers.find(d => d.id === ass.detailerId);
                    return {
                        ...ass,
                        detailerName: detailer ? `${detailer.firstName.charAt(0)}. ${detailer.lastName}` : 'Unknown'
                    };
                });
                return { ...project, assignments: projectAssignments };
            })
            .filter(p => p.assignments.length > 0)
            .sort((a,b) => {
                if (sortBy === 'name') {
                    return a.name.localeCompare(b.name);
                }
                return a.projectId.localeCompare(b.projectId, undefined, { numeric: true });
            });

    }, [projects, assignments, detailers, sortBy]);

    const handleDateNav = (offset) => {
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };
    
    const getWeekDisplay = (start) => {
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.getMonth()+1}/${start.getDate()}/${start.getFullYear()} - ${end.getMonth()+1}/${end.getDate()}/${end.getFullYear()}`;
    }

    const handleCellClick = (e, assignment, weekIndex) => {
        if (!isTaskmaster) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setEditingCell({
            assignment,
            position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
            weekIndex
        });
    };

    const mergeContiguousAssignments = useCallback(async (detailerId, projectId) => {
        const q = query(
            collection(db, `artifacts/${appId}/public/data/assignments`),
            where("detailerId", "==", detailerId),
            where("projectId", "==", projectId)
        );
    
        const snapshot = await getDocs(q);
        const userAssignments = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            startDateObj: new Date(d.data().startDate),
            endDateObj: new Date(d.data().endDate),
        }));
    
        const validAssignments = userAssignments.filter(a => a.startDate && a.endDate);
        if (validAssignments.length < 2) return;
    
        validAssignments.sort((a, b) => a.startDateObj - b.startDateObj);
    
        const toDelete = new Set();
        const toUpdate = new Map();
    
        for (let i = 0; i < validAssignments.length - 1; i++) {
            const current = validAssignments[i];
            const next = validAssignments[i + 1];
    
            if (toDelete.has(current.id) || toDelete.has(next.id)) continue;
    
            const canMerge =
                current.trade === next.trade &&
                current.activity === next.activity &&
                current.allocation == next.allocation;
    
            const dayAfterCurrentEnd = new Date(current.endDateObj);
            dayAfterCurrentEnd.setUTCDate(dayAfterCurrentEnd.getUTCDate() + 1);
            
            if (canMerge && dayAfterCurrentEnd.getTime() === next.startDateObj.getTime()) {
                const newEndDate = next.endDate;
                current.endDate = newEndDate;
                current.endDateObj = new Date(newEndDate);
                
                toDelete.add(next.id);
                toUpdate.set(current.id, { endDate: newEndDate });
                validAssignments[i+1] = current;
            }
        }
    
        if (toDelete.size > 0 || toUpdate.size > 0) {
            const batch = writeBatch(db);
            toDelete.forEach(id => batch.delete(doc(db, `artifacts/${appId}/public/data/assignments`, id)));
            toUpdate.forEach((data, id) => {
                if(!toDelete.has(id)) {
                   batch.update(doc(db, `artifacts/${appId}/public/data/assignments`, id), data);
                }
            });
            try {
                await batch.commit();
                showToast("Assignments merged automatically.", "success");
            } catch (e) {
                console.error("Error during merge operation:", e);
                showToast("Failed to merge assignments.", "error");
            }
        }
    }, [appId, db, showToast]);

    const handleSplitAndUpdateAssignment = async (assignmentId, updates, editWeekIndex) => {
        const originalAssignment = assignments.find(a => a.id === assignmentId);
        if (!originalAssignment || (originalAssignment.trade === updates.trade && originalAssignment.activity === updates.activity)) {
            setEditingCell(null);
            return;
        }
    
        const batch = writeBatch(db);
        const assignmentsRef = collection(db, `artifacts/${appId}/public/data/assignments`);
    
        const changeDate = new Date(weekDates[editWeekIndex]);
        changeDate.setUTCHours(0,0,0,0);

        const originalStartDate = new Date(originalAssignment.startDate);
        originalStartDate.setUTCHours(0,0,0,0);

        const originalEndDate = new Date(originalAssignment.endDate);
        originalEndDate.setUTCHours(0,0,0,0);
    
        batch.delete(doc(assignmentsRef, originalAssignment.id));
    
        const dayBeforeChange = new Date(changeDate);
        dayBeforeChange.setUTCDate(dayBeforeChange.getUTCDate() - 1);
        if (originalStartDate < changeDate) {
            const beforeSegment = { ...originalAssignment, endDate: dayBeforeChange.toISOString().split('T')[0] };
            delete beforeSegment.id;
            batch.set(doc(assignmentsRef), beforeSegment);
        }
    
        const changeWeekEndDate = new Date(changeDate);
        changeWeekEndDate.setUTCDate(changeWeekEndDate.getUTCDate() + 6);
        const finalEndDateForChangedSegment = changeWeekEndDate < originalEndDate ? changeWeekEndDate : originalEndDate;
        
        const changedSegment = {
            ...originalAssignment,
            ...updates,
            startDate: changeDate.toISOString().split('T')[0],
            endDate: finalEndDateForChangedSegment.toISOString().split('T')[0]
        };
        delete changedSegment.id;
        batch.set(doc(assignmentsRef), changedSegment);
    
        const dayAfterChangeWeek = new Date(changeWeekEndDate);
        dayAfterChangeWeek.setUTCDate(dayAfterChangeWeek.getUTCDate() + 1);
        if (originalEndDate > changeWeekEndDate) {
            const afterSegment = { ...originalAssignment, startDate: dayAfterChangeWeek.toISOString().split('T')[0] };
            delete afterSegment.id;
            batch.set(doc(assignmentsRef), afterSegment);
        }
    
        try {
            await batch.commit();
            showToast("Assignment updated and split.", "success");
            await mergeContiguousAssignments(originalAssignment.detailerId, originalAssignment.projectId);
        } catch (e) {
            console.error("Error during split-update operation:", e);
            showToast("Error updating assignment.", "error");
        } finally {
            setEditingCell(null);
        }
    };

    const handleMouseUp = useCallback(async () => {
        if (!dragFillStart || dragFillEnd === null) return;

        const { assignment } = dragFillStart;
        const { weekIndex: endIndex } = dragFillEnd;

        const newEndDate = new Date(weekDates[endIndex]);
        newEndDate.setDate(newEndDate.getDate() + 6);
        
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, assignment.id);
        try {
            await updateDoc(assignmentRef, {
                endDate: newEndDate.toISOString().split('T')[0]
            });
             await mergeContiguousAssignments(assignment.detailerId, assignment.projectId);
        } catch (e) {
            console.error("Error updating assignment end date:", e);
        }

        setDragFillStart(null);
        setDragFillEnd(null);
    }, [dragFillStart, dragFillEnd, weekDates, appId, db, mergeContiguousAssignments]);
    
    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setEditingCell(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="space-y-4 h-full flex flex-col">
             <div className={`sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-center p-2 bg-opacity-80 backdrop-blur-sm ${currentTheme.headerBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4`}>
                 <div className="flex items-center gap-2">
                     <button onClick={() => handleDateNav(-7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<'}</button>
                     <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                     <button onClick={() => handleDateNav(7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'>'}</button>
                     <span className={`font-semibold text-sm ml-4 ${currentTheme.textColor}`}>{getWeekDisplay(weekDates[0])}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${currentTheme.subtleText}`}>Sort by:</span>
                    <button onClick={() => setSortBy('name')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'name' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Alphabetical</button>
                    <button onClick={() => setSortBy('projectId')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'projectId' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Project ID</button>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setTheme('light')} className={`px-3 py-1 text-sm rounded-md ${theme === 'light' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Light</button>
                    <button onClick={() => setTheme('grey')} className={`px-3 py-1 text-sm rounded-md ${theme === 'grey' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Grey</button>
                    <button onClick={() => setTheme('dark')} className={`px-3 py-1 text-sm rounded-md ${theme === 'dark' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Dark</button>
                 </div>
                 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                     {Object.entries(legendColorMapping).map(([trade, color]) => (
                         <div key={trade} className="flex items-center gap-2">
                             <div className={`w-4 h-4 rounded-sm ${color}`}></div>
                             <span className={currentTheme.textColor}>{trade}</span>
                         </div>
                     ))}
                 </div>
             </div>

            <div className={`overflow-auto border rounded-lg ${currentTheme.cardBg} ${currentTheme.borderColor} shadow-sm flex-grow`}>
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className={`${currentTheme.headerBg} sticky top-0 z-10`}>
                        <tr>
                            <th className={`p-1 font-semibold w-16 min-w-[64px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>DETAILER</th>
                            <th className={`p-1 font-semibold w-11 min-w-[44px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>TRADE</th>
                            <th className={`p-1 font-semibold w-9 min-w-[36px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>%</th>
                            {weekDates.map(date => {
                                const weekStart = new Date(date);
                                const weekEnd = new Date(weekStart);
                                weekEnd.setDate(weekEnd.getDate() + 6);
                                const isCurrentWeek = new Date() >= weekStart && new Date() <= weekEnd;
                                return (
                                <th key={date.toISOString()} className={`p-1 font-semibold w-5 min-w-[20px] text-center border ${currentTheme.borderColor} ${currentTheme.textColor} ${isCurrentWeek ? 'bg-blue-200 text-black' : ''}`}>
                                    {`${date.getMonth() + 1}/${date.getDate()}`}
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.map(project => (
                            <React.Fragment key={project.id}>
                                <tr className={`${currentTheme.altRowBg} sticky top-10`}>
                                    <th colSpan={3 + weekDates.length} className={`p-1 text-left font-bold ${currentTheme.textColor} border ${currentTheme.borderColor}`}>
                                        {project.name} ({project.projectId})
                                    </th>
                                </tr>
                                {project.assignments.map(assignment => {
                                    const { bg: bgColor, text: textColor } = tradeColorMapping[assignment.trade] || {bg: 'bg-gray-200', text: 'text-black'};
                                    return (
                                        <tr key={assignment.id} className={`${currentTheme.cardBg} hover:${currentTheme.altRowBg} h-8`}>
                                            <td className={`p-1 font-medium border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.detailerName}</td>
                                            <td className={`p-1 border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.trade}</td>
                                            <td className={`p-1 font-semibold border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.allocation}%</td>
                                            {weekDates.map((weekStart, weekIndex) => {
                                                const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
                                                const assignStart = new Date(assignment.startDate); const assignEnd = new Date(assignment.endDate);
                                                let isAssigned = assignStart <= weekEnd && assignEnd >= weekStart;
                                                const tooltipText = isAssigned ? `Activity: ${assignment.activity || 'N/A'}` : '';

                                                let isFillHighlighted = false;
                                                if (dragFillStart && dragFillStart.assignment.id === assignment.id && dragFillEnd) {
                                                    const minIndex = Math.min(dragFillStart.weekIndex, dragFillEnd.weekIndex);
                                                    const maxIndex = Math.max(dragFillStart.weekIndex, dragFillEnd.weekIndex);
                                                    if (weekIndex >= minIndex && weekIndex <= maxIndex) isFillHighlighted = true;
                                                }

                                                return (
                                                    <td key={weekStart.toISOString()} 
                                                        className={`p-0 border relative ${currentTheme.borderColor} ${isTaskmaster ? 'cursor-pointer' : ''}`}
                                                        onMouseEnter={() => { if (dragFillStart) setDragFillEnd({ weekIndex }); }}
                                                        onClick={(e) => handleCellClick(e, assignment, weekIndex)}
                                                    >
                                                        {(isAssigned || isFillHighlighted) && (
                                                          <Tooltip text={tooltipText}>
                                                              <div className={`h-full w-full flex items-center justify-center p-1 ${isFillHighlighted ? 'bg-blue-400 opacity-70' : bgColor} ${textColor} text-xs font-bold rounded relative`}>
                                                                  <span>{assignment.allocation}%</span>
                                                                  {isTaskmaster && isAssigned && (
                                                                    <div 
                                                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            setDragFillStart({ assignment, weekIndex });
                                                                        }}
                                                                    >
                                                                        <div className="h-full w-1 bg-white/50 rounded"></div>
                                                                    </div>
                                                                  )}
                                                              </div>
                                                          </Tooltip>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {editingCell && (
                <div ref={popupRef}>
                    <AssignmentEditPopup 
                        assignment={editingCell.assignment}
                        detailer={detailers.find(d => d.id === editingCell.assignment.detailerId)}
                        position={editingCell.position}
                        onClose={() => setEditingCell(null)}
                        onSave={handleSplitAndUpdateAssignment}
                        currentTheme={currentTheme}
                        weekIndex={editingCell.weekIndex}
                    />
                </div>
            )}
        </div>
    );
};

const GanttConsole = ({ projects, assignments, currentTheme }) => {
    const svgRef = useRef(null);
    const [startDate, setStartDate] = useState(new Date());
    const [ganttView, setGanttView] = useState('projects');
    const weekCount = 25;
    const dimensions = { width: 1100, height: 500, margin: { top: 20, right: 30, bottom: 150, left: 60 } };
    const { width, height, margin } = dimensions;
    const boundedWidth = width - margin.left - margin.right;
    const boundedHeight = height - margin.top - margin.bottom;
    const color = useMemo(() => d3.scaleOrdinal(d3.schemeCategory10), []);

    const getWeekDates = (from, count) => {
        const sunday = new Date(from);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        const weeks = [];
        for (let i = 0; i < count; i++) {
            const weekStart = new Date(sunday);
            weekStart.setDate(sunday.getDate() + (i * 7));
            weeks.push(weekStart);
        }
        return weeks;
    };

    const weekDates = useMemo(() => getWeekDates(startDate, weekCount), [startDate]);

    const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects]);
    const activeProjectIds = useMemo(() => new Set(activeProjects.map(p => p.id)), [activeProjects]);
    const activeAssignments = useMemo(() => assignments.filter(a => activeProjectIds.has(a.projectId)), [assignments, activeProjectIds]);


    const projectData = useMemo(() => {
        const dataByProject = activeAssignments.reduce((acc, assignment) => {
            if (!acc[assignment.projectId]) {
                acc[assignment.projectId] = [];
            }
            acc[assignment.projectId].push(assignment);
            return acc;
        }, {});

        return Object.entries(dataByProject).map(([projectId, projectAssignments]) => {
            const project = activeProjects.find(p => p.id === projectId);
            const weeklyHours = weekDates.map(weekStart => {
                let totalHours = 0;
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                projectAssignments.forEach(ass => {
                    const assignStart = new Date(ass.startDate);
                    const assignEnd = new Date(ass.endDate);
                    if (assignStart <= weekEnd && assignEnd >= weekStart) {
                        totalHours += (Number(ass.allocation) / 100) * 40;
                    }
                });
                return { date: weekStart, hours: totalHours };
            });
            return {
                projectId,
                projectName: project ? project.name : 'Unknown Project',
                projectNumber: project ? project.projectId : 'N/A',
                values: weeklyHours
            };
        });
    }, [activeProjects, activeAssignments, weekDates]);

    const totalData = useMemo(() => {
        const totalWeeklyHours = weekDates.map(weekStart => {
            let totalHours = 0;
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            activeAssignments.forEach(ass => {
                const assignStart = new Date(ass.startDate);
                const assignEnd = new Date(ass.endDate);
                if (assignStart <= weekEnd && assignEnd >= weekStart) {
                    totalHours += (Number(ass.allocation) / 100) * 40;
                }
            });
            return { date: weekStart, hours: totalHours };
        });
        return [{ projectId: 'total', projectName: 'Total Hours', values: totalWeeklyHours }];
    }, [activeAssignments, weekDates]);


    useEffect(() => {
        if (!svgRef.current || !currentTheme) return;
        const dataToRender = ganttView === 'projects' ? projectData : totalData;
        if(dataToRender.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        const yMax = ganttView === 'projects' 
            ? d3.max(dataToRender, d => d3.max(d.values, v => v.hours)) 
            : d3.max(dataToRender[0].values, v => v.hours);

        const x = d3.scaleTime()
            .domain(d3.extent(weekDates))
            .range([0, boundedWidth]);

        const y = d3.scaleLinear()
            .domain([0, yMax || 100])
            .range([boundedHeight, 0]);
        
        color.domain(projectData.map(p => p.projectId));

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.hours))
            .curve(d3.curveMonotoneX);

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        
        const tooltip = d3.select("body").append("div")
            .attr("class", "absolute opacity-0 transition-opacity duration-300 bg-black text-white text-xs rounded-md p-2 pointer-events-none shadow-lg")

        const xAxis = g.append("g")
            .attr("transform", `translate(0,${boundedHeight})`)
            .call(d3.axisBottom(x).ticks(d3.timeWeek.every(1)).tickFormat(d3.timeFormat("%m/%d")));
        
        xAxis.selectAll("text").style("fill", currentTheme.textColor);
        xAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

        const yAxis = g.append("g")
            .call(d3.axisLeft(y));
            
        yAxis.selectAll("text").style("fill", currentTheme.textColor);
        yAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

        g.append("text")
            .attr("fill", currentTheme.textColor)
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -(boundedHeight / 2))
            .attr("text-anchor", "middle")
            .text("Total Weekly Hours");

        const fortyHourTicks = [];
        for (let i = 40; i <= yMax; i += 40) {
            fortyHourTicks.push(i);
        }

        g.append("g")
            .attr("class", "grid")
            .selectAll("line")
            .data(fortyHourTicks)
            .join("line")
                .attr("x1", 0)
                .attr("x2", boundedWidth)
                .attr("y1", d => y(d))
                .attr("y2", d => y(d))
                .attr("stroke", "rgba(255, 82, 82, 0.5)")
                .attr("stroke-width", .5)
                .attr("stroke-dasharray", "4");
        
        const project = g.selectAll(".project")
            .data(dataToRender)
            .enter().append("g")
            .attr("class", "project");
        
        project.append("path")
            .attr("class", "line")
            .attr("d", d => line(d.values))
            .style("stroke", d => ganttView === 'projects' ? color(d.projectId) : '#2563eb')
            .style("fill", "none")
            .style("stroke-width", "2px")
            .on("mouseover", function(event, d) {
                if (ganttView === 'totals') return;
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<strong>${d.projectName}</strong><br/>ID: ${d.projectNumber}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
                d3.select(this).style('stroke-width', '4px');
            })
            .on("mouseout", function(d) {
                if (ganttView === 'totals') return;
                tooltip.transition().duration(500).style("opacity", 0);
                d3.select(this).style('stroke-width', '2px');
            });

        return () => { tooltip.remove() };

    }, [projectData, totalData, ganttView, boundedHeight, boundedWidth, margin.left, margin.top, weekDates, color, currentTheme]);

    const handleDateNav = (offset) => {
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };

    return (
        <div className="p-4 space-y-4">
            <div className={`flex flex-col sm:flex-row justify-between items-center p-2 ${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4`}>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleDateNav(-7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<'}</button>
                    <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                    <button onClick={() => handleDateNav(7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'>'}</button>
                </div>
                 <div className={`flex items-center gap-2 ${currentTheme.altRowBg} p-1 rounded-lg`}>
                    <button onClick={() => setGanttView('projects')} className={`px-3 py-1 text-sm rounded-md ${ganttView === 'projects' ? `${currentTheme.cardBg} shadow` : ''}`}>Projects</button>
                    <button onClick={() => setGanttView('totals')} className={`px-3 py-1 text-sm rounded-md ${ganttView === 'totals' ? `${currentTheme.cardBg} shadow` : ''}`}>Totals</button>
                </div>
            </div>
            <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm overflow-x-auto`}>
                <svg ref={svgRef} width={width} height={height}></svg>
            </div>
            {ganttView === 'projects' && (
                <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-sm pt-8" style={{minHeight: '6rem'}}>
                    {projectData.map(p => (
                        <div key={p.projectId} className="flex flex-col items-center">
                            <div className="w-1/4 h-4" style={{backgroundColor: color(p.projectId), minWidth: '20px'}}></div>
                            <span className={`transform -rotate-90 whitespace-nowrap mt-4 ${currentTheme.textColor}`}>{p.projectNumber}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CommentSection = ({ comments, onAddComment, onUpdateComment, onDeleteComment, currentTheme }) => {
    const [newComment, setNewComment] = useState('');
    const [author, setAuthor] = useState('');
    const [editingComment, setEditingComment] = useState(null);

    const handleAdd = () => {
        const commentData = {
            id: `comment_${Date.now()}`,
            author: author.toUpperCase(),
            text: newComment,
            timestamp: new Date().toISOString()
        };
        onAddComment(commentData);
        setNewComment('');
        setAuthor('');
    };

    const handleUpdate = () => {
        onUpdateComment(editingComment.id, editingComment.text);
        setEditingComment(null);
    };

    return (
        <div className="mt-4 space-y-3">
            <div className="space-y-2">
                {(comments || []).map(comment => (
                    <div key={comment.id} className={`${currentTheme.altRowBg} p-2 rounded-md text-sm`}>
                         {editingComment?.id === comment.id ? (
                            <div className="space-y-2">
                                <textarea 
                                    value={editingComment.text} 
                                    onChange={(e) => setEditingComment({...editingComment, text: e.target.value})}
                                    className={`w-full p-2 border rounded-md text-sm ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleUpdate} className="px-3 py-1 bg-green-500 text-white rounded text-xs">Save</button>
                                    <button onClick={() => setEditingComment(null)} className="px-3 py-1 bg-gray-400 text-white rounded text-xs">Cancel</button>
                                </div>
                            </div>
                         ) : (
                            <div>
                                <p className={currentTheme.textColor}>{comment.text}</p>
                                <div className={`flex justify-between items-center mt-1 ${currentTheme.subtleText} text-xs`}>
                                    <span><strong>{comment.author}</strong> - {new Date(comment.timestamp).toLocaleString()}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingComment({id: comment.id, text: comment.text})} className="hover:underline">Edit</button>
                                        <button onClick={() => onDeleteComment(comment.id)} className="hover:underline text-red-500">Delete</button>
                                    </div>
                                </div>
                            </div>
                         )}
                    </div>
                ))}
            </div>
            <div className="border-t pt-3 space-y-2">
                 <textarea 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)} 
                    placeholder="Add a comment..." 
                    className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
                <div className="flex gap-2 items-center">
                    <input 
                        type="text" 
                        value={author} 
                        onChange={e => setAuthor(e.target.value.toUpperCase())}
                        placeholder="Initials"
                        maxLength="3"
                        className={`p-2 border rounded-md w-20 ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={!newComment || author.length !== 3}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                    >
                        Post Comment
                    </button>
                </div>
            </div>
        </div>
    );
};


const TaskDetailModal = ({ db, task, projects, detailers, onSave, onClose, onSetMessage, onDelete, currentTheme }) => {
    const [taskData, setTaskData] = useState(null);
    const [newSubTask, setNewSubTask] = useState({ name: '', detailerId: '', dueDate: '' });
    const [editingSubTaskId, setEditingSubTaskId] = useState(null);
    const [editingSubTaskData, setEditingSubTaskData] = useState(null);
    const [newWatcherId, setNewWatcherId] = useState('');
    const [isNewTask, setIsNewTask] = useState(true);
    
    useEffect(() => {
        if (task && task.id) {
            const subTasksWithComments = (task.subTasks || []).map(st => ({...st, comments: st.comments || []}));
            setTaskData({...task, comments: task.comments || [], subTasks: subTasksWithComments});
            setIsNewTask(false);
        } else {
            setTaskData({
                taskName: '', projectId: '', detailerId: '', status: taskStatusOptions[0], dueDate: '',
                entryDate: new Date().toISOString().split('T')[0],
                subTasks: [], watchers: [], comments: []
            });
            setIsNewTask(true);
        }
    }, [task]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTaskData(prev => ({...prev, [name]: value}));
    };
    
    const handleSubTaskChange = (e) => {
        const { name, value } = e.target;
        setNewSubTask(prev => ({...prev, [name]: value}));
    };
    
    const handleAddSubTask = () => {
        if (!newSubTask.name) return;
        
        const subTaskToAdd = { ...newSubTask, id: `sub_${Date.now()}`, isCompleted: false, comments: [] };
        setTaskData(prev => ({...prev, subTasks: [...(prev.subTasks || []), subTaskToAdd]}));
        setNewSubTask({ name: '', detailerId: '', dueDate: '' });
    };

    const handleStartEditSubTask = (subTask) => {
        setEditingSubTaskId(subTask.id);
        setEditingSubTaskData({...subTask});
    };

    const handleCancelEditSubTask = () => {
        setEditingSubTaskId(null);
        setEditingSubTaskData(null);
    };

    const handleEditingSubTaskDataChange = (e) => {
        const { name, value } = e.target;
        setEditingSubTaskData(prev => ({...prev, [name]: value}));
    };
    
    const handleUpdateSubTask = () => {
        const updatedSubTasks = taskData.subTasks.map(st => st.id === editingSubTaskId ? editingSubTaskData : st);
        setTaskData(prev => ({...prev, subTasks: updatedSubTasks}));
        handleCancelEditSubTask();
    };
    
    const handleToggleSubTask = (subTaskId) => {
        const updatedSubTasks = taskData.subTasks.map(st => st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st);
        const completedCount = updatedSubTasks.filter(st => st.isCompleted).length;
        let newStatus = taskStatusOptions[0];
        if (completedCount > 0) {
            newStatus = completedCount === updatedSubTasks.length ? taskStatusOptions[2] : taskStatusOptions[1];
        }
        setTaskData(prev => ({ ...prev, subTasks: updatedSubTasks, status: newStatus }));
    };
    
    const handleDeleteSubTask = (subTaskId) => {
        setTaskData(prev => ({ ...prev, subTasks: taskData.subTasks.filter(st => st.id !== subTaskId) }));
    };

    const handleAddWatcher = () => {
      if (newWatcherId && !taskData.watchers.includes(newWatcherId)) {
          setTaskData(prev => ({ ...prev, watchers: [...prev.watchers, newWatcherId] }));
          setNewWatcherId('');
      }
    };

    const handleRemoveWatcher = (watcherIdToRemove) => {
        setTaskData(prev => ({
            ...prev,
            watchers: prev.watchers.filter(id => id !== watcherIdToRemove)
        }));
    };

    const handleAddComment = (commentData, subTaskId = null) => {
        if (!commentData.text.trim() || !commentData.author || commentData.author.trim().length !== 3) {
            onSetMessage({ text: "A comment and 3-letter initials are required.", isError: true });
            return;
        }

        let updatedTaskData;
        if (subTaskId) {
            updatedTaskData = {
                ...taskData,
                subTasks: taskData.subTasks.map(st => st.id === subTaskId ? { ...st, comments: [...(st.comments || []), commentData] } : st)
            };
        } else {
            updatedTaskData = { ...taskData, comments: [...(taskData.comments || []), commentData] };
        }
        setTaskData(updatedTaskData);
    };

    const handleUpdateComment = (commentId, newText, subTaskId = null) => {
        let updatedTaskData;
        if (subTaskId) {
             updatedTaskData = {
                ...taskData,
                subTasks: taskData.subTasks.map(st => {
                    if (st.id === subTaskId) {
                        return { ...st, comments: st.comments.map(c => c.id === commentId ? {...c, text: newText} : c) }
                    }
                    return st;
                })
             }
        } else {
             updatedTaskData = {
                ...taskData,
                comments: taskData.comments.map(c => c.id === commentId ? {...c, text: newText} : c)
             }
        }
        setTaskData(updatedTaskData);
    };

    const handleDeleteComment = (commentId, subTaskId = null) => {
        let updatedTaskData;
        if (subTaskId) {
             updatedTaskData = {
                ...taskData,
                subTasks: taskData.subTasks.map(st => {
                    if (st.id === subTaskId) {
                        return { ...st, comments: st.comments.filter(c => c.id !== commentId) }
                    }
                    return st;
                })
             }
        } else {
             updatedTaskData = {
                ...taskData,
                comments: taskData.comments.filter(c => c.id !== commentId)
             }
        }
        setTaskData(updatedTaskData);
    };
    
    if (!taskData) return null;
    
    const hasSubtasks = taskData.subTasks && taskData.subTasks.length > 0;
    const formElementClasses = `w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`;

    return (
        <Modal onClose={onClose} currentTheme={currentTheme}>
            <div className="relative">
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">{isNewTask ? 'Add New Task' : 'Edit Task'}</h2>
                    
                    <div className={`p-4 border rounded-lg space-y-3 ${currentTheme.altRowBg}`}>
                        <input type="text" name="taskName" value={taskData.taskName} onChange={handleChange} placeholder="Task Name" className={`text-lg font-semibold ${formElementClasses}`} />
                        <div className="grid grid-cols-2 gap-4">
                            <select name="projectId" value={taskData.projectId} onChange={handleChange} className={formElementClasses}>
                                <option value="">Select Project...</option>
                                {projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select name="detailerId" value={taskData.detailerId} onChange={handleChange} className={formElementClasses}>
                                <option value="">Assign To...</option>
                                {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                            </select>
                            <input type="date" name="dueDate" value={taskData.dueDate} onChange={handleChange} className={formElementClasses}/>
                            <p className={`p-2 text-sm ${currentTheme.subtleText}`}>Entry: {new Date(taskData.entryDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className={`p-4 border rounded-lg ${currentTheme.altRowBg}`}>
                        <h3 className="font-semibold mb-2">Watchers</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(taskData.watchers || []).map(watcherId => {
                                const watcher = detailers.find(d => d.id === watcherId);
                                return (
                                    <span key={watcherId} className="bg-gray-200 text-gray-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded-full flex items-center">
                                        {watcher ? `${watcher.firstName} ${watcher.lastName}` : 'Unknown'}
                                        <button onClick={() => handleRemoveWatcher(watcherId)} className="ml-2 text-gray-500 hover:text-gray-800 font-bold">&times;</button>
                                    </span>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 items-center border-t pt-4">
                            <select
                                value={newWatcherId}
                                onChange={(e) => setNewWatcherId(e.target.value)}
                                className={`flex-grow ${formElementClasses}`}
                            >
                                <option value="">Add a watcher...</option>
                                {detailers.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.firstName} {d.lastName}
                                    </option>
                                ))}
                            </select>
                            <button onClick={handleAddWatcher} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                Add
                            </button>
                        </div>
                    </div>

                    <div className={`p-4 border rounded-lg ${currentTheme.altRowBg}`}>
                        <h3 className="font-semibold mb-2">Sub-tasks</h3>
                        <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                            {(taskData.subTasks || []).map(st => (
                                <div key={st.id} className={`p-2 ${currentTheme.cardBg} rounded`}>
                                    {editingSubTaskId === st.id ? (
                                        <div className="flex gap-2 items-center">
                                            <input type="text" name="name" value={editingSubTaskData.name} onChange={handleEditingSubTaskDataChange} className={`flex-grow ${formElementClasses}`}/>
                                            <select name="detailerId" value={editingSubTaskData.detailerId} onChange={handleEditingSubTaskDataChange} className={`text-sm ${formElementClasses}`}><option value="">Assignee...</option>{detailers.map(d => <option key={d.id} value={d.id}>{d.lastName}</option>)}</select>
                                            <input type="date" name="dueDate" value={editingSubTaskData.dueDate} onChange={handleEditingSubTaskDataChange} className={`text-sm ${formElementClasses}`}/>
                                            <button onClick={handleUpdateSubTask} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">Save</button>
                                            <button onClick={handleCancelEditSubTask} className="px-3 py-1 bg-gray-400 text-white rounded-md text-sm hover:bg-gray-500">X</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={st.isCompleted} onChange={() => handleToggleSubTask(st.id)} className="h-5 w-5 rounded text-blue-600"/>
                                            <span className={`flex-grow ${st.isCompleted ? 'line-through text-gray-500' : ''}`}>{st.name}</span>
                                            <span className={`text-xs ${currentTheme.subtleText}`}>{detailers.find(d => d.id === st.detailerId)?.lastName}</span>
                                            <span className={`text-xs ${currentTheme.subtleText}`}>{st.dueDate}</span>
                                            <button onClick={() => handleStartEditSubTask(st)} className="text-xs text-blue-600 hover:underline" disabled={editingSubTaskId}>Edit</button>
                                            <button onClick={() => handleDeleteSubTask(st.id)} className="text-red-400 hover:text-red-600 text-xl" disabled={editingSubTaskId}>&times;</button>
                                        </div>
                                    )}
                                    <div className="pl-6">
                                        <CommentSection 
                                           comments={st.comments}
                                           onAddComment={(commentData) => handleAddComment(commentData, st.id)}
                                           onUpdateComment={(id, text) => handleUpdateComment(id, text, st.id)}
                                           onDeleteComment={(id) => handleDeleteComment(id, st.id)}
                                           currentTheme={currentTheme}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center p-2 border-t">
                            <input type="text" placeholder="New sub-task..." name="name" value={newSubTask.name} onChange={handleSubTaskChange} className={`flex-grow ${formElementClasses}`} />
                            <select name="detailerId" value={newSubTask.detailerId} onChange={handleSubTaskChange} className={`text-sm ${formElementClasses}`}>
                                <option value="">Assignee...</option>
                                {detailers.map(d => <option key={d.id} value={d.id}>{d.lastName}</option>)}
                            </select>
                            <input type="date" name="dueDate" value={newSubTask.dueDate} onChange={handleSubTaskChange} className={`text-sm ${formElementClasses}`} />
                            <button onClick={handleAddSubTask} className="px-3 py-1 bg-gray-200 rounded-md text-sm hover:bg-gray-300">Add</button>
                        </div>
                    </div>
                    
                     <div className={`p-4 border rounded-lg ${currentTheme.altRowBg}`}>
                         <h3 className="font-semibold mb-2">Task Comments</h3>
                         <CommentSection 
                           comments={taskData.comments}
                           onAddComment={handleAddComment}
                           onUpdateComment={handleUpdateComment}
                           onDeleteComment={handleDeleteComment}
                           currentTheme={currentTheme}
                         />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        {!isNewTask && (
                           <Tooltip text={hasSubtasks ? "Delete all sub-tasks first" : ""}>
                                <div className="mr-auto">
                                    <button
                                        onClick={onDelete}
                                        disabled={hasSubtasks}
                                        className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Delete Task
                                    </button>
                                </div>
                            </Tooltip>
                        )}
                        <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Cancel</button>
                        <button onClick={() => onSave(taskData)} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save All Changes</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};


const TaskCard = ({ task, detailers, onDragStart, onClick, currentTheme }) => {
    const watchers = (task.watchers || []).map(wId => detailers.find(d => d.id === wId)).filter(Boolean);
    const subTasks = task.subTasks || [];
    const completedSubTasks = subTasks.filter(st => st.isCompleted).length;
    const assignee = detailers.find(d => d.id === task.detailerId);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onClick}
            className={`${currentTheme.cardBg} p-3 rounded-lg border ${currentTheme.borderColor} shadow-sm cursor-pointer mb-3 ${currentTheme.textColor}`}
        >
            <p className="font-semibold mb-2">{task.taskName}</p>
            <div className={`flex items-center justify-between text-xs ${currentTheme.subtleText} mt-2`}>
                <span className={task.dueDate ? '' : 'opacity-50'}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {task.dueDate || 'No due date'}
                </span>
                <div className="flex items-center gap-2">
                    {subTasks.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          {completedSubTasks}/{subTasks.length}
                        </span>
                    )}
                     <div className="flex -space-x-2">
                        {assignee && (
                             <Tooltip text={`Assignee: ${assignee.firstName} ${assignee.lastName}`}>
                                 <span className={`w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border-2 ${currentTheme.borderColor}`}>
                                     {assignee.firstName.charAt(0)}{assignee.lastName.charAt(0)}
                                 </span>
                            </Tooltip>
                        )}
                        {watchers.slice(0, 2).map(watcher => (
                            <Tooltip key={watcher.id} text={`${watcher.firstName} ${watcher.lastName}`}>
                                 <span className={`w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs border-2 ${currentTheme.borderColor}`}>
                                     {watcher.firstName.charAt(0)}{watcher.lastName.charAt(0)}
                                 </span>
                            </Tooltip>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};


const TaskConsole = ({ db, tasks, detailers, projects, taskLanes, appId, showToast, currentTheme }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editingLaneId, setEditingLaneId] = useState(null);
    const [editingLaneName, setEditingLaneName] = useState('');
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const handleOpenModal = (task = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };
    
    const handleSoftDeleteTask = async (taskId) => {
        if (!taskId) return;
        const taskRef = doc(db, `artifacts/${appId}/public/data/tasks`, taskId);
        await updateDoc(taskRef, { status: 'Deleted' });
        showToast("Task deleted successfully!");
        handleCloseModal(); 
        setTaskToDelete(null); 
    };

    const handleSaveTask = async (taskData) => {
        const isNew = !taskData.id;
       
        try {
            if (isNew) {
                const newRequestsLane = taskLanes.find(l => l.name === "New Requests");
                if (!newRequestsLane) {
                    showToast("Error: 'New Requests' lane not found.", 'error');
                    return;
                }
                const { id, ...data } = taskData;
                data.laneId = newRequestsLane.id;
                await addDoc(collection(db, `artifacts/${appId}/public/data/tasks`), data);
                showToast("Task created!");
            } else {
                const { id, ...data } = taskData;
                const taskRef = doc(db, `artifacts/${appId}/public/data/tasks`, id);
                await updateDoc(taskRef, data);
                showToast("Task updated successfully!");
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving task: ", error);
            showToast(`Error saving task: ${error.message}`, 'error');
        }
    };

    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, targetLaneId) => {
        const taskId = e.dataTransfer.getData("taskId");
        const taskRef = doc(db, `artifacts/${appId}/public/data/tasks`, taskId);
        await updateDoc(taskRef, { laneId: targetLaneId });
    };

    const handleAddLane = async () => {
        const newLaneName = prompt("Enter new lane name:");
        if (newLaneName && newLaneName.trim() !== '') {
            const newLane = {
                name: newLaneName.trim(),
                order: taskLanes.length,
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/taskLanes`), newLane);
            showToast(`Lane '${newLaneName}' added.`);
        }
    };
    
    const handleRenameLane = async (laneId) => {
        if (!editingLaneName.trim()) {
            setEditingLaneId(null);
            return;
        };
        const laneRef = doc(db, `artifacts/${appId}/public/data/taskLanes`, laneId);
        await updateDoc(laneRef, { name: editingLaneName });
        setEditingLaneId(null);
        setEditingLaneName('');
    };
    
    const confirmDeleteLane = (lane) => {
        const tasksInLane = tasks.filter(t => t.laneId === lane.id && t.status !== 'Deleted');
        if (tasksInLane.length > 0) {
            showToast("Cannot delete a lane that contains tasks.", "error");
            return;
        }
        setConfirmAction({
            title: "Delete Lane",
            message: `Are you sure you want to delete the lane "${lane.name}"? This action cannot be undone.`,
            action: async () => {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/taskLanes`, lane.id));
                showToast("Lane deleted.");
            }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <ConfirmationModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    if(confirmAction?.action) confirmAction.action();
                    setConfirmAction(null);
                }}
                title={confirmAction?.title}
                currentTheme={currentTheme}
            >
                {confirmAction?.message}
            </ConfirmationModal>

             <div className="flex-grow overflow-x-auto p-4">
                 <div className="flex space-x-4 h-full">
                     {taskLanes.map(lane => (
                         <div
                             key={lane.id}
                             onDragOver={handleDragOver}
                             onDrop={(e) => handleDrop(e, lane.id)}
                             className={`${currentTheme.altRowBg} rounded-lg p-3 w-72 flex-shrink-0 flex flex-col`}
                         >
                            <div className={`flex justify-between items-center mb-4 ${currentTheme.textColor}`}>
                               { editingLaneId === lane.id ? (
                                   <input
                                      type="text"
                                      value={editingLaneName}
                                      onChange={(e) => setEditingLaneName(e.target.value)}
                                      onBlur={() => handleRenameLane(lane.id)}
                                      onKeyPress={(e) => e.key === 'Enter' && handleRenameLane(lane.id)}
                                      className={`font-semibold p-1 rounded-md border ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder} w-full`}
                                      autoFocus
                                   />
                               ) : (
                                   <h2 className="font-semibold cursor-pointer" onClick={() => { setEditingLaneId(lane.id); setEditingLaneName(lane.name); }}>{lane.name}</h2>
                               )}
                                <button onClick={() => confirmDeleteLane(lane)} className={`${currentTheme.subtleText} hover:text-red-500 disabled:opacity-20`} disabled={tasks.some(t => t.laneId === lane.id && t.status !== 'Deleted')}>&times;</button>
                            </div>

                             {lane.name === "New Requests" && (
                                 <button onClick={() => handleOpenModal(null)} className={`w-full text-left p-2 mb-3 ${currentTheme.cardBg} ${currentTheme.textColor} rounded-md shadow-sm hover:bg-opacity-80`}>+ Add Task</button>
                             )}

                             <div className="flex-grow overflow-y-auto pr-2">
                                 {tasks.filter(t => t.laneId === lane.id && t.status !== 'Deleted').map(task => (
                                     <TaskCard
                                         key={task.id}
                                         task={task}
                                         detailers={detailers}
                                         onDragStart={handleDragStart}
                                         onClick={() => handleOpenModal(task)}
                                         currentTheme={currentTheme}
                                     />
                                 ))}
                             </div>
                         </div>
                     ))}
                      <div className="w-72 flex-shrink-0">
                         <button onClick={handleAddLane} className={`w-full p-3 ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg hover:bg-opacity-80`}>+ Add Another List</button>
                      </div>
                 </div>
             </div>
            {isModalOpen && (
                <Modal onClose={handleCloseModal} currentTheme={currentTheme}>
                    <TaskDetailModal
                        db={db}
                        task={editingTask}
                        detailers={detailers}
                        projects={projects}
                        onClose={handleCloseModal}
                        onSave={handleSaveTask}
                        onSetMessage={(msg) => showToast(msg.text, msg.isError ? 'error' : 'success')}
                        onDelete={() => setTaskToDelete(editingTask)}
                        currentTheme={currentTheme}
                    />
                </Modal>
            )}
             {taskToDelete && (
                <ConfirmationModal
                    isOpen={!!taskToDelete}
                    onClose={() => setTaskToDelete(null)}
                    onConfirm={() => handleSoftDeleteTask(taskToDelete.id)}
                    title="Confirm Task Deletion"
                    currentTheme={currentTheme}
                >
                    Are you sure you want to delete the task "{taskToDelete.taskName}"? This will hide it from all active views.
                </ConfirmationModal>
             )}
        </div>
    );
};

const ReportingConsole = ({ projects, detailers, assignments, tasks, currentTheme }) => {
    const [reportType, setReportType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState(null);
    const [reportHeaders, setReportHeaders] = useState([]);

    const getDaysInRange = (assStart, assEnd, reportStart, reportEnd) => {
        const effectiveStart = Math.max(assStart.getTime(), reportStart.getTime());
        const effectiveEnd = Math.min(assEnd.getTime(), reportEnd.getTime());
        
        if (effectiveStart > effectiveEnd) {
            return 0;
        }

        const diffTime = Math.abs(effectiveEnd - effectiveStart);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const handleGenerateReport = () => {
        let data = [];
        let headers = [];

        const sDate = startDate ? new Date(startDate) : null;
        const eDate = endDate ? new Date(endDate) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);

        switch (reportType) {
            case 'project-hours':
                headers = ["Project Name", "Project ID", "Total Allocated Hours"];
                const hoursByProject = assignments.reduce((acc, ass) => {
                    if (!sDate || !eDate) return acc;

                    const assStartDate = new Date(ass.startDate);
                    const assEndDate = new Date(ass.endDate);

                    const daysInRage = getDaysInRange(assStartDate, assEndDate, sDate, eDate);

                    if (daysInRage > 0) {
                        const project = projects.find(p => p.id === ass.projectId);
                        if (project) {
                            if (!acc[project.id]) {
                                acc[project.id] = { name: project.name, id: project.projectId, hours: 0 };
                            }
                            const dailyHours = (Number(ass.allocation) / 100) * 8;
                            acc[project.id].hours += daysInRage * dailyHours;
                        }
                    }
                    return acc;
                }, {});
                data = Object.values(hoursByProject).map(p => [p.name, p.id, p.hours.toFixed(2)]);
                break;
            
            case 'detailer-workload':
                 headers = ["Detailer", "Total Hours", "Projects"];
                 const hoursByDetailer = assignments.reduce((acc, ass) => {
                    if (!sDate || !eDate) return acc;
                    const assStartDate = new Date(ass.startDate);
                    const assEndDate = new Date(ass.endDate);
                    
                    const daysInRage = getDaysInRange(assStartDate, assEndDate, sDate, eDate);

                    if(daysInRage > 0) {
                        const detailer = detailers.find(d => d.id === ass.detailerId);
                        if(detailer) {
                            if(!acc[detailer.id]) {
                                acc[detailer.id] = { name: `${detailer.firstName} ${detailer.lastName}`, hours: 0, projects: new Set() };
                            }
                            const project = projects.find(p => p.id === ass.projectId);
                            const dailyHours = (Number(ass.allocation) / 100) * 8;
                            acc[detailer.id].hours += daysInRage * dailyHours;
                            if(project) acc[detailer.id].projects.add(project.name);
                        }
                    }
                    return acc;
                 }, {});
                 data = Object.values(hoursByDetailer).map(d => [d.name, d.hours.toFixed(2), Array.from(d.projects).join(', ')]);
                 break;

            case 'task-status':
                headers = ["Task Name", "Project", "Assignee", "Status", "Due Date"];
                data = tasks
                    .filter(t => {
                        if (!t.dueDate) return true;
                        const taskDueDate = new Date(t.dueDate);
                        return (!sDate || taskDueDate >= sDate) && (!eDate || taskDueDate <= eDate);
                    })
                    .map(task => {
                        const project = projects.find(p => p.id === task.projectId);
                        const assignee = detailers.find(d => d.id === task.detailerId);
                        return [
                            task.taskName,
                            project ? project.name : 'N/A',
                            assignee ? `${assignee.firstName} ${assignee.lastName}` : 'N/A',
                            task.status,
                            task.dueDate || 'N/A'
                        ];
                    });
                break;

            default:
                break;
        }
        setReportData(data);
        setReportHeaders(headers);
    };

    const exportToCSV = () => {
        if (!reportData || !reportHeaders) return;

        let csvContent = "data:text/csv;charset=utf-8," 
            + reportHeaders.map(h => `"${h}"`).join(",") + "\n" 
            + reportData.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${reportType}_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className={`text-2xl font-bold ${currentTheme.textColor}`}>Reporting Console</h2>

            <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} space-y-4`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            <option value="">Select a report...</option>
                            <option value="project-hours">Project Hours Summary</option>
                            <option value="detailer-workload">Detailer Workload Summary</option>
                            <option value="task-status">Task Status Report</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                    </div>
                    <button onClick={handleGenerateReport} disabled={!reportType} className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">Generate Report</button>
                </div>
            </div>

            {reportData && (
                 <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Report Results</h3>
                        <button onClick={exportToCSV} className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700">Export to CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className={`${currentTheme.altRowBg}`}>
                                    {reportHeaders.map(header => <th key={header} className="p-2 text-left font-semibold">{header}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className={`border-b ${currentTheme.borderColor}`}>
                                        {row.map((cell, cellIndex) => <td key={cellIndex} className="p-2">{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            )}
        </div>
    );
};


export default App;
