import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, query, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import * as d3 from 'd3';

// --- Helper Functions & Initial Data ---

const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-prod-tracker-app';
const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;


const titleOptions = [
    "Detailer I",
    "Detailer II",
    "Detailer III",
    "BIM Specialist",
    "Programmatic Detailer",
    "Project Constructability Lead",
    "Project Constructability Lead, Sr.",
    "Trade Constructability Lead",
    "Constructability Manager"
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
    { name: "Brandt Interco", projectId: "5800005" },
    { name: "PRECON / Estimating 2022", projectId: "5818022" },
    { name: "RLSB 7th Floor Buildout", projectId: "5820526" },
    { name: "PRN 1 Modernization", projectId: "5820533" },
    { name: "OHEP IPA", projectId: "5820574" },
    { name: "Vantage WA 13", projectId: "5820577" },
    { name: "Microsoft Service Project", projectId: "5820580" },
    { name: "PSU VSC", projectId: "5820608" },
    { name: "Albina Library", projectId: "5820637" },
    { name: "KND1-2 Type F", projectId: "5820643" },
    { name: "Vantage WA 13 - Tenant Office Fit up", projectId: "5820648" },
    { name: "UCO Type F", projectId: "5820653" },
    { name: "DLS BD CL02 BATCH TANK RE", projectId: "5820654" },
    { name: "Old Trapper Warehouse Expansion", projectId: "5820661" },
    { name: "Legacy Emanuel Cath Lab", projectId: "5820663" },
    { name: "PRN Wellhouse", projectId: "5820664" },
    { name: "Sunriver Public Safety Building", projectId: "5820668" },
    { name: "Meta MOFE MTR Racks - UCO", projectId: "5820669" },
    { name: "Meta MOFE MTR Racks - KND", projectId: "5820670" },
    { name: "Providence POP 1 Womens Health", projectId: "5820682" },
    { name: "Microsoft EAT04", projectId: "5820690" },
    { name: "Legacy LEW Infrastructure Package 1", projectId: "5820705" },
    { name: "T5CS - Portland IV - Phase-III", projectId: "5820707" },
    { name: "Vantage WA13 Phase 4 & 5", projectId: "5820709" },
    { name: "Meta MOFE MTR Racks - RIN", projectId: "5820717" },
    { name: "Meta MOFE MTR Racks - RMN", projectId: "5820718" },
    { name: "Hitt Project Avalon Engineering", projectId: "5820723" },
    { name: "Genentech - Acid CIP 200 Tank Replacement", projectId: "5820738" },
    { name: "Apple - PRZ.05 PreCon", projectId: "5820754" },
    { name: "Meta DCF v2.0 MOFE Design Support", projectId: "5820777" },
    { name: "WA13 Level 2 Office TI", projectId: "5820779" },
    { name: "Meta MOFE MTRs - Project Cable - LVN", projectId: "5820788" },
    { name: "NTT H13", projectId: "5820800" },
    { name: "UCSF Benioff MRI Replacement", projectId: "5622373" }
];

const skillCategories = ["Model Knowledge", "BIM Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
const disciplineOptions = ["Duct", "Plumbing", "Piping", "Structural", "Coordination", "GIS/GPS", "BIM"];
const activityOptions = ["Modeling", "Coordination", "Spooling", "Deliverables", "Miscellaneous"];
const taskStatusOptions = ["Not Started", "In Progress", "Completed"];

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

const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : {
  apiKey: "AIzaSyC8aM0mFNiRmy8xcLsS48lSPfHQ9egrJ7s",
  authDomain: "productivity-tracker-3017d.firebaseapp.com",
  projectId: "productivity-tracker-3017d",
  storageBucket: "productivity-tracker-3017d.appspot.com",
  messagingSenderId: "489412895343",
  appId: "1:489412895343:web:780e7717db122a2b99639a",
  measurementId: "G-LGTREWPTGJ"
};

let db, auth;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

// --- Email Simulation Function ---
const sendEmail = (to, subject, body) => {
    console.log("--- Sending Email (Simulation) ---");
    console.log(`To: ${to}`);
    console.log(`From: Jgriffith@southlandind.com`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: \n${body}`);
    console.log("-----------------------------------");
};


// --- React Components ---

const LoginInline = ({ onLogin, error }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm"
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm"
                required
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                Login
            </button>
            {error && <p className="text-red-500 text-xs ml-2">{error}</p>}
        </form>
    );
};

const BubbleRating = ({ score, onScoreChange }) => {
    return (
        <div className="flex items-center space-x-1 flex-wrap">
            {[...Array(10)].map((_, i) => {
                const ratingValue = i + 1;
                return (
                    <div key={ratingValue} className="flex flex-col items-center">
                        <span className="text-xs">{ratingValue}</span>
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

const Modal = ({ children, onClose, customClasses = 'max-w-4xl' }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div className={`bg-white p-6 rounded-lg shadow-2xl w-full ${customClasses} max-h-[90vh] overflow-y-auto`}>
                <div className="flex justify-end">
                    <button onClick={onClose} className="text-2xl font-bold text-gray-600 hover:text-gray-900">&times;</button>
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
    const [view, setView] = useState('projects'); // Default to a non-protected view
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [detailers, setDetailers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [taskLanes, setTaskLanes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Authentication state
    const [isPrivilegedUser, setIsPrivilegedUser] = useState(false);
    const [loginError, setLoginError] = useState('');


    useEffect(() => {
        if (!auth) {
            console.error("Firebase is not initialized. Check your configuration.");
            setLoading(false);
            return;
        };
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            } else {
                 try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Authentication failed:", error);
                } finally {
                     setIsAuthReady(true);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const seedInitialData = async () => {
        if (!db) return;
        const detailersRef = collection(db, `artifacts/${appId}/public/data/detailers`);
        const projectsRef = collection(db, `artifacts/${appId}/public/data/projects`);
        const lanesRef = collection(db, `artifacts/${appId}/public/data/taskLanes`);
        
        // Seed Detailers
        const detailerSnapshot = await getDocs(query(detailersRef));
        if (detailerSnapshot.empty) {
            console.log("Seeding detailers...");
            const batch = writeBatch(db);
            initialDetailers.forEach(d => {
                const newDocRef = doc(detailersRef);
                batch.set(newDocRef, d);
            });
            await batch.commit();
        }

        // Seed Projects
        const projectSnapshot = await getDocs(query(projectsRef));
        if (projectSnapshot.empty) {
            console.log("Seeding projects...");
            const batch = writeBatch(db);
            initialProjects.forEach(p => {
                const newDocRef = doc(projectsRef);
                batch.set(newDocRef, p);
            });
            await batch.commit();
        }
        
        // Seed Task Lanes
        const laneSnapshot = await getDocs(query(lanesRef));
        if (laneSnapshot.empty) {
            console.log("Seeding task lanes...");
            const initialLanes = [
                { name: "New Requests", order: 0 },
                { name: "Project Setup Support (VDC)", order: 1 },
                { name: "Process Improvements (VDC)", order: 2 },
                { name: "Support Requests (VDC)", order: 3 },
                { name: "RFA Requests (VDC)", order: 4 },
                { name: "On Hold", order: 5 },
            ];
            const batch = writeBatch(db);
            initialLanes.forEach(lane => {
                const newDocRef = doc(lanesRef);
                batch.set(newDocRef, lane);
            });
            await batch.commit();
        }
    };

    useEffect(() => {
        if (!isAuthReady || !db) return;
        setLoading(true);
        seedInitialData();

        const unsubDetailers = onSnapshot(collection(db, `artifacts/${appId}/public/data/detailers`), snapshot => {
            setDetailers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubProjects = onSnapshot(collection(db, `artifacts/${appId}/public/data/projects`), snapshot => {
            setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubAssignments = onSnapshot(collection(db, `artifacts/${appId}/public/data/assignments`), snapshot => {
            setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubTasks = onSnapshot(collection(db, `artifacts/${appId}/public/data/tasks`), snapshot => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubTaskLanes = onSnapshot(collection(db, `artifacts/${appId}/public/data/taskLanes`), snapshot => {
            const lanes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTaskLanes(lanes.sort((a, b) => a.order - b.order));
        });
        
        setLoading(false);
        return () => {
            unsubDetailers();
            unsubProjects();
            unsubAssignments();
            unsubTasks();
            unsubTaskLanes();
        };
    }, [isAuthReady]);

    // --- Authentication and Navigation Handlers ---
    const protectedViews = ['detailers', 'skills', 'admin'];

    const handleNavClick = (viewId) => {
        setView(viewId);
    };

    const handleLoginAttempt = (username, password) => {
        if (username === 'Taskmaster' && password === 'Taskmaster1234') {
            setIsPrivilegedUser(true);
            setLoginError('');
            setView('detailers'); // Navigate to a protected view after login
        } else {
            setLoginError('Invalid username or password.');
        }
    };

    const handleLogout = () => {
        setIsPrivilegedUser(false);
        setView('projects'); // Redirect to a safe, public view
    };
    
    const navButtons = [
        { id: 'detailers', label: 'Detailer', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg> },
        { id: 'projects', label: 'Project', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg> },
        { id: 'workloader', label: 'Workloader', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5z" /></svg> },
        { id: 'tasks', label: 'Tasks', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" /></svg>},
        { id: 'gantt', label: 'Gantt', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg> },
        { id: 'skills', label: 'Edit', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg> },
        { id: 'admin', label: 'Manage', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    ];
    
    const visibleNavButtons = isPrivilegedUser
        ? navButtons
        : navButtons.filter(button => !protectedViews.includes(button.id));


    const renderView = () => {
        if (loading) return <div className="text-center p-10">Loading data...</div>;
        if (!db || !auth) return <div className="text-center p-10 text-red-500">Error: Firebase not initialized. Please check your configuration.</div>;
        
        // If view is protected and user is not privileged, show the public project view instead.
        if (protectedViews.includes(view) && !isPrivilegedUser) {
            return <ProjectConsole detailers={detailers} projects={projects} assignments={assignments} />;
        }

        switch (view) {
            case 'detailers':
                return <DetailerConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'projects':
                return <ProjectConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'workloader':
                return <WorkloaderConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'tasks':
                return <TaskConsole tasks={tasks} detailers={detailers} projects={projects} taskLanes={taskLanes} />;
             case 'gantt':
                return <GanttConsole projects={projects} assignments={assignments} />;
            case 'skills':
                return <SkillsConsole detailers={detailers} />;
            case 'admin':
                return <AdminConsole detailers={detailers} projects={projects} />;
            default:
                return <ProjectConsole detailers={detailers} projects={projects} assignments={assignments} />;
        }
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif' }} className="bg-gray-100 min-h-screen">
            <div className="w-full h-screen flex flex-col bg-white">
                 <header className={`p-4 border-b space-y-4 flex-shrink-0 ${view === 'tasks' ? 'bg-gray-800 text-white' : ''}`}>
                     <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h1 className={`text-2xl font-bold ${view === 'tasks' ? 'text-white' : 'text-gray-800'}`}>Workforce Productivity Tracker</h1>
                        <nav className="bg-gray-200 p-1 rounded-lg">
                            <div className="flex items-center space-x-1 flex-wrap justify-center">
                                {visibleNavButtons.map(button => (
                                    <button
                                        key={button.id}
                                        onClick={() => handleNavClick(button.id)}
                                        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === button.id ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        {button.icon}
                                        {button.label}
                                    </button>
                                ))}
                            </div>
                        </nav>
                    </div>
                    <div className="flex justify-center items-center">
                        {isPrivilegedUser ? (
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-600 transition-colors"
                            >
                                Logout
                            </button>
                        ) : (
                            <LoginInline onLogin={handleLoginAttempt} error={loginError} />
                        )}
                    </div>
                </header>
                <main className={`flex-grow overflow-y-auto ${view === 'tasks' ? 'bg-gray-800' : 'p-4 bg-gray-50'}`}>
                    {isAuthReady ? renderView() : <div className="text-center p-10">Authenticating...</div>}
                </main>
                 <footer className={`text-center p-2 text-xs border-t flex-shrink-0 ${view === 'tasks' ? 'bg-gray-800 text-gray-400' : 'text-gray-500'}`}>
                    User ID: {userId || 'N/A'} | App ID: {appId}
                </footer>
            </div>
        </div>
    );
};


// --- Console Components ---
const InlineAssignmentEditor = ({ assignment, projects, detailerDisciplines, onUpdate, onDelete }) => {
    const sortedProjects = useMemo(() => {
        return [...projects].sort((a,b) => a.projectId.localeCompare(b.projectId, undefined, {numeric: true}));
    }, [projects]);
    
    const availableTrades = Object.keys(detailerDisciplines || {});

    const handleChange = (field, value) => {
        onUpdate({ ...assignment, [field]: value });
    };

    return (
        <div className="bg-gray-50 p-3 rounded-lg border space-y-3">
             <div className="flex items-center gap-2">
                <select 
                    value={assignment.projectId} 
                    onChange={e => handleChange('projectId', e.target.value)} 
                    className="w-full p-2 border rounded-md"
                >
                    <option value="">Select a Project...</option>
                    {sortedProjects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
                </select>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <input type="date" value={assignment.startDate} onChange={e => handleChange('startDate', e.target.value)} className="w-full p-2 border rounded-md" />
                 <input type="date" value={assignment.endDate} onChange={e => handleChange('endDate', e.target.value)} className="w-full p-2 border rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-2">
                 <select value={assignment.trade} onChange={e => handleChange('trade', e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">Trade...</option>
                    {availableTrades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <select value={assignment.activity} onChange={e => handleChange('activity', e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">Activity...</option>
                    {activityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input type="number" placeholder="%" value={assignment.allocation} onChange={e => handleChange('allocation', e.target.value)} className="w-full p-2 border rounded-md" />
            </div>
        </div>
    );
};

const DetailerConsole = ({ detailers, projects, assignments }) => {
    const [sortBy, setSortBy] = useState('firstName');
    const [viewingSkillsFor, setViewingSkillsFor] = useState(null);
    const [newAssignments, setNewAssignments] = useState({}); // { detailerId: [newAssignmentObj, ...] }
    const [expandedDetailerId, setExpandedDetailerId] = useState(null);

    const getMostRecentMonday = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    };
    
    const sortedDetailers = useMemo(() => {
        return [...detailers].sort((a, b) => {
            if (sortBy === 'firstName') return a.firstName.localeCompare(b.firstName);
            return a.lastName.localeCompare(b.lastName);
        });
    }, [detailers, sortBy]);

    const handleAddNewAssignment = (detailerId) => {
        const newAsn = {
            id: `new_${Date.now()}`, // temp id
            projectId: '',
            startDate: getMostRecentMonday(),
            endDate: '',
            trade: '',
            activity: '',
            allocation: '100',
        };
        setNewAssignments(prev => ({
            ...prev,
            [detailerId]: [...(prev[detailerId] || []), newAsn],
        }));
    };
    
    const handleUpdateNewAssignment = (detailerId, updatedAsn) => {
        const toUpdate = (newAssignments[detailerId] || []).map(asn => asn.id === updatedAsn.id ? updatedAsn : asn);
        setNewAssignments(prev => ({ ...prev, [detailerId]: toUpdate }));

        // Check if ready to save
        if(updatedAsn.projectId && updatedAsn.startDate && updatedAsn.endDate && updatedAsn.trade && updatedAsn.activity && updatedAsn.allocation) {
            const { id, ...payload } = updatedAsn;
            const finalPayload = { ...payload, detailerId, allocation: Number(payload.allocation) };

            addDoc(collection(db, `artifacts/${appId}/public/data/assignments`), finalPayload)
                .then(() => {
                    // remove from new assignments state
                    const remaining = (newAssignments[detailerId] || []).filter(a => a.id !== updatedAsn.id);
                    setNewAssignments(prev => ({ ...prev, [detailerId]: remaining }));
                })
                .catch(e => console.error("Error saving new assignment:", e));
        }
    };
    
    const handleDeleteNewAssignment = (detailerId, assignmentId) => {
        const remaining = (newAssignments[detailerId] || []).filter(a => a.id !== assignmentId);
        setNewAssignments(prev => ({ ...prev, [detailerId]: remaining }));
    };

    const handleUpdateExistingAssignment = async (assignment) => {
        const { id, ...payload } = assignment;
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, id);
        try {
            await updateDoc(assignmentRef, {
                ...payload,
                allocation: Number(payload.allocation)
            });
        } catch(e) {
            console.error("Error updating assignment", e);
        }
    };
    
    const handleDeleteExistingAssignment = async (id) => {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, id));
    }
    
    const toggleDetailer = (detailerId) => {
        setExpandedDetailerId(prevId => prevId === detailerId ? null : detailerId);
    };

    return (
        <div>
            <div className="flex justify-end items-center mb-4 gap-2">
                <span className="mr-2 text-sm font-medium">Sort by:</span>
                <button onClick={() => setSortBy('firstName')} className={`px-4 py-1.5 rounded-md text-sm ${sortBy === 'firstName' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>First Name</button>
                <button onClick={() => setSortBy('lastName')} className={`px-4 py-1.5 rounded-md text-sm ${sortBy === 'lastName' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Last Name</button>
            </div>
            
            <div className="bg-white rounded-lg p-4 space-y-2">
                <div className="hidden md:grid grid-cols-12 gap-4 font-bold text-sm text-gray-600 px-4 py-2">
                    <div className="col-span-3">DETAILER</div>
                    <div className="col-span-7">PROJECT ASSIGNMENTS</div>
                    <div className="col-span-2 text-right">CURRENT WEEK %</div>
                </div>
                {sortedDetailers.map(d => {
                    const detailerAssignments = assignments.filter(a => a.detailerId === d.id);
                    
                    const today = new Date();
                    const dayOfWeek = today.getDay();
                    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                    const weekStart = new Date(today.setDate(diff));
                    weekStart.setHours(0, 0, 0, 0);

                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    weekEnd.setHours(23, 59, 59, 999);
                    
                    const weeklyAssignments = detailerAssignments.filter(a => {
                        if (!a.startDate || !a.endDate) return false;
                        const assignStart = new Date(a.startDate);
                        const assignEnd = new Date(a.endDate);
                        return assignStart <= weekEnd && assignEnd >= weekStart;
                    });

                    const weeklyAllocation = weeklyAssignments.reduce((sum, a) => sum + Number(a.allocation || 0), 0);
                    const detailerNewAssignments = newAssignments[d.id] || [];
                    const isExpanded = expandedDetailerId === d.id;

                    return (
                        <div key={d.id} className="bg-white rounded-lg shadow">
                            <div 
                                className="grid grid-cols-12 gap-4 items-center p-4 cursor-pointer"
                                onClick={() => toggleDetailer(d.id)}
                            >
                                <div className="col-span-11 md:col-span-3">
                                    <p className="font-bold">{d.firstName} {d.lastName}</p>
                                    <p className="text-sm text-gray-600">{d.title || 'N/A'}</p>
                                    <p className="text-xs text-gray-500">ID: {d.employeeId}</p>
                                    <a href={`mailto:${d.email}`} onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:underline">{d.email}</a>
                                    <button onClick={(e) => {e.stopPropagation(); setViewingSkillsFor(d);}} className="text-sm text-blue-600 hover:underline mt-2 block">View Skills</button>
                                </div>
                                <div className="hidden md:col-span-7 md:block">
                                    {!isExpanded && (
                                        <p className="text-sm text-gray-500">
                                            {detailerAssignments.length > 0 ? `${detailerAssignments.length} total assignment(s)` : 'No assignments'}
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
                                <div className="p-4 border-t border-gray-200">
                                    <div className="grid grid-cols-12 gap-4 items-start">
                                        <div className="col-span-12 md:col-start-4 md:col-span-7 space-y-2">
                                            <h4 className="font-semibold text-gray-700 mb-2">All Project Assignments</h4>
                                            {detailerAssignments.length > 0 ? detailerAssignments.map(asn => (
                                                <InlineAssignmentEditor key={asn.id} assignment={asn} projects={projects} detailerDisciplines={d.disciplineSkillsets} onUpdate={handleUpdateExistingAssignment} onDelete={() => handleDeleteExistingAssignment(asn.id)} />
                                            )) : <p className="text-sm text-gray-500">No assignments to display.</p>}
                                             {detailerNewAssignments.map(asn => (
                                                <InlineAssignmentEditor key={asn.id} assignment={asn} projects={projects} detailerDisciplines={d.disciplineSkillsets} onUpdate={(upd) => handleUpdateNewAssignment(d.id, upd)} onDelete={() => handleDeleteNewAssignment(d.id, asn.id)} />
                                            ))}
                                            <button onClick={() => handleAddNewAssignment(d.id)} className="text-sm text-blue-600 hover:underline">+ Add Project/Trade</button>
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
            </div>

            {viewingSkillsFor && (
                <Modal onClose={() => setViewingSkillsFor(null)}>
                    <SkillsConsole detailers={[viewingSkillsFor]} singleDetailerMode={true} />
                </Modal>
            )}
        </div>
    );
};


const ProjectConsole = ({ detailers, projects, assignments }) => {
    const sortedProjects = useMemo(() => {
        return [...projects].sort((a,b) => a.projectId.localeCompare(b.projectId, undefined, {numeric: true}));
    }, [projects]);
    
    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Project Overview</h2>
            <div className="space-y-4">
                {sortedProjects.map(p => {
                    const projectAssignments = assignments.filter(a => a.projectId === p.id);
                    return (
                        <div key={p.id} className="bg-white p-4 rounded-lg border shadow-sm">
                            <h3 className="text-lg font-semibold">{p.name}</h3>
                            <p className="text-sm text-gray-600">Project ID: {p.projectId}</p>
                            <div className="mt-2 pl-4 border-l-2 border-blue-200">
                                <h4 className="text-sm font-semibold mb-1">Assigned Detailers:</h4>
                                {projectAssignments.length === 0 ? (
                                    <p className="text-sm text-gray-500">None</p>
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SkillsConsole = ({ detailers, singleDetailerMode = false }) => {
    const [selectedDetailerId, setSelectedDetailerId] = useState(singleDetailerMode && detailers[0] ? detailers[0].id : '');
    const [editableDetailer, setEditableDetailer] = useState(null);
    const [newDiscipline, setNewDiscipline] = useState('');
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        const detailer = detailers.find(d => d.id === selectedDetailerId);
        if (detailer) {
            setEditableDetailer({ ...detailer });
        } else {
            setEditableDetailer(null);
        }
    }, [selectedDetailerId, detailers]);

    const handleSkillChange = (skillName, score) => {
        setEditableDetailer(prev => ({
            ...prev,
            skills: { ...prev.skills, [skillName]: score }
        }));
    };
    
    const handleAddDiscipline = () => {
        if (newDiscipline && editableDetailer) {
            const currentDisciplines = editableDetailer.disciplineSkillsets || {};
            if (!currentDisciplines.hasOwnProperty(newDiscipline)) {
                setEditableDetailer(prev => ({
                    ...prev,
                    disciplineSkillsets: { ...(prev.disciplineSkillsets || {}), [newDiscipline]: 0 }
                }));
                setNewDiscipline('');
            }
        }
    };
    
    const handleRemoveDiscipline = (disciplineToRemove) => {
        setEditableDetailer(prev => {
            const { [disciplineToRemove]: _, ...remaining } = prev.disciplineSkillsets;
            return { ...prev, disciplineSkillsets: remaining };
        });
    };
    
    const handleDisciplineRatingChange = (name, score) => {
        setEditableDetailer(prev => ({
            ...prev,
            disciplineSkillsets: {
                ...prev.disciplineSkillsets,
                [name]: score,
            },
        }));
    };

    const handleSaveChanges = async () => {
        if (!db || !editableDetailer) return;
        const detailerRef = doc(db, `artifacts/${appId}/public/data/detailers`, editableDetailer.id);
        const { id, ...dataToSave } = editableDetailer;
        await setDoc(detailerRef, dataToSave, { merge: true });
        setSaveMessage("Changes saved successfully!");
        setTimeout(() => setSaveMessage(''), 3000);
    };
    
    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Modify Detailer Skills & Info</h2>
            {!singleDetailerMode && (
                <div className="mb-4">
                    <select onChange={e => setSelectedDetailerId(e.target.value)} value={selectedDetailerId} className="w-full max-w-xs p-2 border rounded-md">
                        <option value="" disabled>Select a detailer...</option>
                        {detailers.map(d => (
                            <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                        ))}
                    </select>
                </div>
            )}

            {editableDetailer && (
                <div className="bg-white p-4 rounded-lg border space-y-6 shadow-sm">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Basic Info for {editableDetailer.firstName} {editableDetailer.lastName}</h3>
                        <div className="space-y-2">
                            <input value={editableDetailer.firstName} onChange={e => setEditableDetailer({...editableDetailer, firstName: e.target.value})} placeholder="First Name" className="w-full p-2 border rounded-md" />
                            <input value={editableDetailer.lastName} onChange={e => setEditableDetailer({...editableDetailer, lastName: e.target.value})} placeholder="Last Name" className="w-full p-2 border rounded-md" />
                            <input type="email" value={editableDetailer.email || ''} onChange={e => setEditableDetailer({...editableDetailer, email: e.target.value})} placeholder="Email" className="w-full p-2 border rounded-md" />
                             <select value={editableDetailer.title || ''} onChange={e => setEditableDetailer({...editableDetailer, title: e.target.value})} className="w-full p-2 border rounded-md">
                                <option value="" disabled>Select a Title</option>
                                {titleOptions.map(title => (
                                    <option key={title} value={title}>{title}</option>
                                ))}
                            </select>
                            <input value={editableDetailer.employeeId} onChange={e => setEditableDetailer({...editableDetailer, employeeId: e.target.value})} placeholder="Employee ID" className="w-full p-2 border rounded-md" />
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Skill Assessment</h3>
                         <div className="space-y-4">
                            {skillCategories.map(skill => (
                                <div key={skill}>
                                    <label className="font-medium">{skill}</label>
                                    <BubbleRating 
                                        score={editableDetailer.skills?.[skill] || 0}
                                        onScoreChange={(score) => handleSkillChange(skill, score)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Discipline Skillsets</h3>
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                             <select value={newDiscipline} onChange={(e) => setNewDiscipline(e.target.value)} className="p-2 border rounded-md">
                                <option value="">Select a discipline...</option>
                                {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <button onClick={handleAddDiscipline} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Add Discipline</button>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(editableDetailer.disciplineSkillsets || {}).map(([name, score]) => (
                                <div key={name} className="p-3 bg-white rounded-md border">
                                    <div className="flex justify-between items-start">
                                       <span className="font-medium">{name}</span>
                                       <button onClick={() => handleRemoveDiscipline(name)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                                    </div>
                                    <BubbleRating score={score} onScoreChange={(newScore) => handleDisciplineRatingChange(name, newScore)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleSaveChanges} className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600 mt-4">Save All Changes</button>
                    {saveMessage && <p className="text-green-600 mt-2 text-center">{saveMessage}</p>}
                </div>
            )}
        </div>
    );
};


const AdminConsole = ({ detailers, projects }) => {
    const [newDetailer, setNewDetailer] = useState({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '' });
    const [newProject, setNewProject] = useState({ name: '', projectId: '' });

    const [editingDetailerId, setEditingDetailerId] = useState(null);
    const [editingDetailerData, setEditingDetailerData] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectData, setEditingProjectData] = useState(null);
    const [message, setMessage] = useState('');

    const handleAdd = async (type) => {
        if (!db) return;
        if (type === 'detailer') {
            if (!newDetailer.firstName || !newDetailer.lastName || !newDetailer.employeeId) {
                setMessage('Please fill all detailer fields.');
                setTimeout(()=> setMessage(''), 3000);
                return;
            }
            await addDoc(collection(db, `artifacts/${appId}/public/data/detailers`), { ...newDetailer, skills: {}, disciplineSkillsets: {} });
            setNewDetailer({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '' });
            setMessage('Detailer added.');
        } else {
            if (!newProject.name || !newProject.projectId) {
                setMessage('Please fill all project fields.');
                 setTimeout(()=> setMessage(''), 3000);
                return;
            }
            await addDoc(collection(db, `artifacts/${appId}/public/data/projects`), newProject);
            setNewProject({ name: '', projectId: '' });
            setMessage('Project added.');
        }
        setTimeout(()=> setMessage(''), 3000);
    };

    const handleDelete = async (type, id) => {
        const collectionName = type === 'detailer' ? 'detailers' : 'projects';
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id));
    };
    
    const handleEdit = (type, item) => {
        if (type === 'detailer') {
            setEditingProjectId(null); 
            setEditingDetailerId(item.id);
            setEditingDetailerData({ ...item });
        } else {
            setEditingDetailerId(null);
            setEditingProjectId(item.id);
            setEditingProjectData({ ...item });
        }
    };

    const handleCancel = () => {
        setEditingDetailerId(null);
        setEditingProjectId(null);
    };

    const handleUpdate = async (type) => {
        try {
            if (type === 'detailer') {
                const { id, ...data } = editingDetailerData;
                const detailerRef = doc(db, `artifacts/${appId}/public/data/detailers`, id);
                await updateDoc(detailerRef, data);
            } else {
                const { id, ...data } = editingProjectData;
                const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, id);
                await updateDoc(projectRef, data);
            }
            handleCancel();
        } catch (error) {
            console.error("Error updating document: ", error);
            setMessage("Failed to update item.");
            setTimeout(()=> setMessage(''), 3000);
        }
    };
    
    const handleEditDataChange = (e, type) => {
        const { name, value } = e.target;
        if (type === 'detailer') {
            setEditingDetailerData(prev => ({ ...prev, [name]: value }));
        } else {
            setEditingProjectData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const isEditing = editingDetailerId || editingProjectId;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h2 className="text-xl font-bold mb-4">Manage Detailers</h2>
                <div className={`bg-white p-4 rounded-lg border shadow-sm mb-4 ${isEditing ? 'opacity-50' : ''}`}>
                    <h3 className="font-semibold mb-2">Add New Detailer</h3>
                    <div className="space-y-2 mb-4">
                        <input value={newDetailer.firstName} onChange={e => setNewDetailer({...newDetailer, firstName: e.target.value})} placeholder="First Name" className="w-full p-2 border rounded-md" disabled={isEditing} />
                        <input value={newDetailer.lastName} onChange={e => setNewDetailer({...newDetailer, lastName: e.target.value})} placeholder="Last Name" className="w-full p-2 border rounded-md" disabled={isEditing} />
                        <input type="email" value={newDetailer.email} onChange={e => setNewDetailer({...newDetailer, email: e.target.value})} placeholder="Email" className="w-full p-2 border rounded-md" disabled={isEditing} />
                        <select value={newDetailer.title} onChange={e => setNewDetailer({...newDetailer, title: e.target.value})} className="w-full p-2 border rounded-md" disabled={isEditing}>
                            {titleOptions.map(title => (
                                <option key={title} value={title}>{title}</option>
                            ))}
                        </select>
                        <input value={newDetailer.employeeId} onChange={e => setNewDetailer({...newDetailer, employeeId: e.target.value})} placeholder="Employee ID" className="w-full p-2 border rounded-md" disabled={isEditing} />
                    </div>
                    <button onClick={() => handleAdd('detailer')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600" disabled={isEditing}>Add Detailer</button>
                </div>
                {message && <p className="text-center p-2">{message}</p>}
                <div className="space-y-2">
                    {detailers.map(d => (
                        <div key={d.id} className="bg-white p-3 border rounded-md shadow-sm">
                            {editingDetailerId === d.id ? (
                                <div className="space-y-2">
                                    <input name="firstName" value={editingDetailerData.firstName} onChange={e => handleEditDataChange(e, 'detailer')} className="w-full p-2 border rounded-md"/>
                                    <input name="lastName" value={editingDetailerData.lastName} onChange={e => handleEditDataChange(e, 'detailer')} className="w-full p-2 border rounded-md"/>
                                    <input type="email" name="email" value={editingDetailerData.email} onChange={e => handleEditDataChange(e, 'detailer')} placeholder="Email" className="w-full p-2 border rounded-md"/>
                                    <select name="title" value={editingDetailerData.title} onChange={e => handleEditDataChange(e, 'detailer')} className="w-full p-2 border rounded-md">
                                        {titleOptions.map(title => (
                                            <option key={title} value={title}>{title}</option>
                                        ))}
                                    </select>
                                    <input name="employeeId" value={editingDetailerData.employeeId} onChange={e => handleEditDataChange(e, 'detailer')} className="w-full p-2 border rounded-md"/>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdate('detailer')} className="flex-grow bg-green-500 text-white p-2 rounded-md hover:bg-green-600">Save</button>
                                        <button onClick={handleCancel} className="flex-grow bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p>{d.firstName} {d.lastName}</p>
                                        <p className="text-sm text-gray-500">{d.title || 'N/A'} ({d.employeeId})</p>
                                        <a href={`mailto:${d.email}`} className="text-xs text-blue-500 hover:underline">{d.email}</a>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit('detailer', d)} className="text-blue-600 hover:text-blue-800" disabled={isEditing}>Edit</button>
                                        <button onClick={() => handleDelete('detailer', d.id)} className="text-red-500 hover:text-red-700" disabled={isEditing}>Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4">Manage Projects</h2>
                 <div className={`bg-white p-4 rounded-lg border shadow-sm mb-4 ${isEditing ? 'opacity-50' : ''}`}>
                    <h3 className="font-semibold mb-2">Add New Project</h3>
                    <div className="space-y-2 mb-4">
                        <input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="Project Name" className="w-full p-2 border rounded-md" disabled={isEditing} />
                        <input value={newProject.projectId} onChange={e => setNewProject({...newProject, projectId: e.target.value})} placeholder="Project ID" className="w-full p-2 border rounded-md" disabled={isEditing} />
                    </div>
                    <button onClick={() => handleAdd('project')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600" disabled={isEditing}>Add Project</button>
                </div>
                <div className="space-y-2">
                    {projects.map(p => (
                         <div key={p.id} className="bg-white p-3 border rounded-md shadow-sm">
                            {editingProjectId === p.id ? (
                                <div className="space-y-2">
                                    <input name="name" value={editingProjectData.name} onChange={e => handleEditDataChange(e, 'project')} className="w-full p-2 border rounded-md"/>
                                    <input name="projectId" value={editingProjectData.projectId} onChange={e => handleEditDataChange(e, 'project')} className="w-full p-2 border rounded-md"/>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdate('project')} className="flex-grow bg-green-500 text-white p-2 rounded-md hover:bg-green-600">Save</button>
                                        <button onClick={handleCancel} className="flex-grow bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <span className="flex-grow pr-2">{p.name} ({p.projectId})</span>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => handleEdit('project', p)} className="text-blue-600 hover:text-blue-800" disabled={isEditing}>Edit</button>
                                        <button onClick={() => handleDelete('project', p.id)} className="text-red-500 hover:text-red-700" disabled={isEditing}>Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const WorkloaderConsole = ({ detailers, projects, assignments }) => {
    const [startDate, setStartDate] = useState(new Date());

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
            .map(project => {
                const projectAssignments = (assignmentsByProject[project.id] || []).map(ass => {
                    const detailer = detailers.find(d => d.id === ass.detailerId);
                    return {
                        ...ass,
                        detailerName: detailer ? `${detailer.firstName.charAt(0)}. ${detailer.lastName}` : 'Unknown Detailer'
                    };
                });
                return {
                    ...project,
                    assignments: projectAssignments,
                };
            })
            .filter(p => p.assignments.length > 0)
            .sort((a,b) => a.name.localeCompare(b.name));

    }, [projects, assignments, detailers]);

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

    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row justify-between items-center p-2 bg-white rounded-lg border shadow-sm gap-4">
                 <div className="flex items-center gap-2">
                     <button onClick={() => handleDateNav(-7)} className="p-2 rounded-md hover:bg-gray-200">{'<'}</button>
                     <button onClick={() => setStartDate(new Date())} className="p-2 px-4 border rounded-md hover:bg-gray-200">Today</button>
                     <button onClick={() => handleDateNav(7)} className="p-2 rounded-md hover:bg-gray-200">{'>'}</button>
                     <span className="font-semibold text-sm ml-4">{getWeekDisplay(weekDates[0])}</span>
                 </div>
                 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                     {Object.entries(legendColorMapping).map(([trade, color]) => (
                         <div key={trade} className="flex items-center gap-2">
                             <div className={`w-4 h-4 rounded-sm ${color}`}></div>
                             <span>{trade}</span>
                         </div>
                     ))}
                 </div>
             </div>

            <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="p-1 font-semibold w-16 min-w-[64px] border border-gray-300">DETAILER</th>
                            <th className="p-1 font-semibold w-11 min-w-[44px] border border-gray-300">TRADE</th>
                            <th className="p-1 font-semibold w-9 min-w-[36px] border border-gray-300">% ALLOCATED</th>
                            {weekDates.map(date => {
                                const weekStart = new Date(date);
                                const weekEnd = new Date(weekStart);
                                weekEnd.setDate(weekEnd.getDate() + 6);
                                const isCurrentWeek = new Date() >= weekStart && new Date() <= weekEnd;
                                return (
                                <th key={date.toISOString()} className={`p-1 font-semibold w-5 min-w-[20px] text-center border border-gray-300 ${isCurrentWeek ? 'bg-blue-200' : ''}`}>
                                    {`${date.getMonth() + 1}/${date.getDate()}`}
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.map(project => (
                            <React.Fragment key={project.id}>
                                <tr className="bg-gray-100 sticky top-10">
                                    <th colSpan={3 + weekDates.length} className="p-1 text-left font-bold text-gray-700 border border-gray-300">
                                        {project.name} ({project.projectId})
                                    </th>
                                </tr>
                                {project.assignments.map(assignment => {
                                    const { bg: bgColor, text: textColor } = tradeColorMapping[assignment.trade] || {bg: 'bg-gray-200', text: 'text-black'};
                                    return (
                                        <tr key={assignment.id} className="hover:bg-gray-50 h-8">
                                            <td className="p-1 font-medium border border-gray-300">{assignment.detailerName}</td>
                                            <td className="p-1 border border-gray-300">{assignment.trade}</td>
                                            <td className="p-1 font-semibold border border-gray-300">{assignment.allocation}%</td>
                                            {weekDates.map(weekStart => {
                                                const weekEnd = new Date(weekStart);
                                                weekEnd.setDate(weekStart.getDate() + 6);
                                                
                                                const assignStart = new Date(assignment.startDate);
                                                const assignEnd = new Date(assignment.endDate);

                                                const isAssigned = assignStart <= weekEnd && assignEnd >= weekStart;
                                                const tooltipText = isAssigned ? `Activity: ${assignment.activity || 'N/A'}` : '';

                                                return (
                                                    <td key={weekStart.toISOString()} className="p-0 border border-gray-300">
                                                        {isAssigned ? (
                                                          <Tooltip text={tooltipText}>
                                                              <div className={`h-full w-full flex items-center justify-center p-1 ${bgColor} ${textColor} text-xs font-bold rounded`}>
                                                                  <span>
                                                                    {assignment.allocation}%
                                                                  </span>
                                                              </div>
                                                          </Tooltip>
                                                        ) : <div className="h-full"></div>}
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
        </div>
    );
};

const GanttConsole = ({ projects, assignments }) => {
    const svgRef = useRef(null);
    const [startDate, setStartDate] = useState(new Date());
    const [ganttView, setGanttView] = useState('projects'); // 'projects' or 'totals'
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

    const projectData = useMemo(() => {
        const dataByProject = assignments.reduce((acc, assignment) => {
            if (!acc[assignment.projectId]) {
                acc[assignment.projectId] = [];
            }
            acc[assignment.projectId].push(assignment);
            return acc;
        }, {});

        return Object.entries(dataByProject).map(([projectId, projectAssignments]) => {
            const project = projects.find(p => p.id === projectId);
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
    }, [projects, assignments, weekDates]);

    const totalData = useMemo(() => {
        const totalWeeklyHours = weekDates.map(weekStart => {
            let totalHours = 0;
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            assignments.forEach(ass => {
                const assignStart = new Date(ass.startDate);
                const assignEnd = new Date(ass.endDate);
                if (assignStart <= weekEnd && assignEnd >= weekStart) {
                    totalHours += (Number(ass.allocation) / 100) * 40;
                }
            });
            return { date: weekStart, hours: totalHours };
        });
        return [{ projectId: 'total', projectName: 'Total Hours', values: totalWeeklyHours }];
    }, [assignments, weekDates]);


    useEffect(() => {
        if (!svgRef.current) return;
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


        g.append("g")
            .attr("transform", `translate(0,${boundedHeight})`)
            .call(d3.axisBottom(x).ticks(d3.timeWeek.every(1)).tickFormat(d3.timeFormat("%m/%d")));

        g.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Total Weekly Hours");

        // Manually create an array of 40-hour intervals for the reference lines
        const fortyHourTicks = [];
        for (let i = 40; i <= yMax; i += 40) {
            fortyHourTicks.push(i);
        }

        // Add horizontal reference lines
        g.append("g")
            .attr("class", "grid")
            .selectAll("line")
            .data(fortyHourTicks)
            .join("line")
                .attr("x1", 0)
                .attr("x2", boundedWidth)
                .attr("y1", d => y(d))
                .attr("y2", d => y(d))
                .attr("stroke", "red")
                .attr("stroke-opacity", 0.6)
                .attr("stroke-width", .5);
        
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

    }, [projectData, totalData, ganttView, boundedHeight, boundedWidth, margin.left, margin.top, weekDates, color]);

    const handleDateNav = (offset) => {
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center p-2 bg-white rounded-lg border shadow-sm gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => handleDateNav(-7)} className="p-2 rounded-md hover:bg-gray-200">{'<'}</button>
                    <button onClick={() => setStartDate(new Date())} className="p-2 px-4 border rounded-md hover:bg-gray-200">Today</button>
                    <button onClick={() => handleDateNav(7)} className="p-2 rounded-md hover:bg-gray-200">{'>'}</button>
                </div>
                 <div className="flex items-center gap-2 bg-gray-200 p-1 rounded-lg">
                    <button onClick={() => setGanttView('projects')} className={`px-3 py-1 text-sm rounded-md ${ganttView === 'projects' ? 'bg-white shadow' : ''}`}>Projects</button>
                    <button onClick={() => setGanttView('totals')} className={`px-3 py-1 text-sm rounded-md ${ganttView === 'totals' ? 'bg-white shadow' : ''}`}>Totals</button>
                </div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm overflow-x-auto">
                <svg ref={svgRef} width={width} height={height}></svg>
            </div>
            {ganttView === 'projects' && (
                <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-sm pt-8" style={{minHeight: '6rem'}}>
                    {projectData.map(p => (
                        <div key={p.projectId} className="flex flex-col items-center">
                            <div className="w-1/4 h-4" style={{backgroundColor: color(p.projectId), minWidth: '20px'}}></div>
                            <span className="transform -rotate-90 whitespace-nowrap mt-4">{p.projectNumber}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TaskDetailModal = ({ task, projects, detailers, onSave, onClose, onSetMessage }) => {
    const [taskData, setTaskData] = useState(null);
    const [newSubTask, setNewSubTask] = useState({ name: '', detailerId: '', dueDate: '' });
    const [editingSubTaskId, setEditingSubTaskId] = useState(null);
    const [editingSubTaskData, setEditingSubTaskData] = useState(null);
    const [newWatcherId, setNewWatcherId] = useState('');
    const [isNewTask, setIsNewTask] = useState(true);
    
    useEffect(() => {
        if (task && task.id) {
            setTaskData({...task, watchers: task.watchers || []});
            setIsNewTask(false);
        } else {
            setTaskData({
                taskName: '', projectId: '', detailerId: '', status: taskStatusOptions[0], dueDate: '',
                entryDate: new Date().toISOString().split('T')[0],
                subTasks: [], watchers: []
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
        if (!newSubTask.name) {
            return;
        }
        const subTaskToAdd = { ...newSubTask, id: `sub_${Date.now()}`, isCompleted: false };
        setTaskData(prev => ({...prev, subTasks: [...(prev.subTasks || []), subTaskToAdd]}));

        const assignee = detailers.find(d => d.id === subTaskToAdd.detailerId);
        if (assignee?.email) {
            sendEmail(
                assignee.email, 
                `New Sub-Task Assigned: ${subTaskToAdd.name}`,
                `A new sub-task "${subTaskToAdd.name}" has been assigned to you for the main task "${taskData.taskName}".\nDue Date: ${subTaskToAdd.dueDate}`
            );
        }

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
        
        const assignee = detailers.find(d => d.id === editingSubTaskData.detailerId);
         if (assignee?.email) {
            sendEmail(
                assignee.email,
                `Sub-Task Updated: ${editingSubTaskData.name}`,
                `The sub-task "${editingSubTaskData.name}" for the main task "${taskData.taskName}" has been updated.`
            );
        }

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
        setTaskData(prev => ({ ...prev, subTasks: prev.subTasks.filter(st => st.id !== subTaskId) }));
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

    if (!taskData) return null;

    return (
        <Modal onClose={onClose}>
            <div className="relative">
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">{isNewTask ? 'Add New Task' : 'Edit Task'}</h2>
                    
                    {/* --- Main Task Details --- */}
                    <div className="p-4 border rounded-lg space-y-3">
                        <input type="text" name="taskName" value={taskData.taskName} onChange={handleChange} placeholder="Task Name" className="w-full text-lg font-semibold p-2 border rounded-md" />
                        <div className="grid grid-cols-2 gap-4">
                            <select name="projectId" value={taskData.projectId} onChange={handleChange} className="w-full p-2 border rounded-md">
                                <option value="">Select Project...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select name="detailerId" value={taskData.detailerId} onChange={handleChange} className="w-full p-2 border rounded-md">
                                <option value="">Assign To...</option>
                                {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                            </select>
                            <input type="date" name="dueDate" value={taskData.dueDate} onChange={handleChange} className="w-full p-2 border rounded-md"/>
                            <p className="p-2 text-sm text-gray-500">Entry: {taskData.entryDate}</p>
                        </div>
                    </div>

                    {/* --- Watchers Section --- */}
                    <div className="p-4 border rounded-lg">
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
                                className="flex-grow p-2 border rounded-md"
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

                    {/* --- Sub-tasks Section --- */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">Sub-tasks</h3>
                        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                            {(taskData.subTasks || []).map(st => (
                                <div key={st.id}>
                                    {editingSubTaskId === st.id ? (
                                        <div className="flex gap-2 items-center p-2 bg-blue-50 rounded">
                                            <input type="text" name="name" value={editingSubTaskData.name} onChange={handleEditingSubTaskDataChange} className="flex-grow p-1 border rounded-md"/>
                                            <select name="detailerId" value={editingSubTaskData.detailerId} onChange={handleEditingSubTaskDataChange} className="p-1 border rounded-md text-sm"><option value="">Assignee...</option>{detailers.map(d => <option key={d.id} value={d.id}>{d.lastName}</option>)}</select>
                                            <input type="date" name="dueDate" value={editingSubTaskData.dueDate} onChange={handleEditingSubTaskDataChange} className="p-1 border rounded-md text-sm"/>
                                            <button onClick={handleUpdateSubTask} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">Save</button>
                                            <button onClick={handleCancelEditSubTask} className="px-3 py-1 bg-gray-400 text-white rounded-md text-sm hover:bg-gray-500">X</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                            <input type="checkbox" checked={st.isCompleted} onChange={() => handleToggleSubTask(st.id)} className="h-5 w-5 rounded text-blue-600"/>
                                            <span className={`flex-grow ${st.isCompleted ? 'line-through text-gray-500' : ''}`}>{st.name}</span>
                                            <span className="text-xs text-gray-500">{detailers.find(d => d.id === st.detailerId)?.lastName}</span>
                                            <span className="text-xs text-gray-500">{st.dueDate}</span>
                                            <button onClick={() => handleStartEditSubTask(st)} className="text-xs text-blue-600 hover:underline" disabled={editingSubTaskId}>Edit</button>
                                            <button onClick={() => handleDeleteSubTask(st.id)} className="text-red-400 hover:text-red-600 text-xl" disabled={editingSubTaskId}>&times;</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center p-2 border-t">
                            <input type="text" placeholder="New sub-task..." name="name" value={newSubTask.name} onChange={handleSubTaskChange} className="flex-grow p-1 border rounded-md" />
                            <select name="detailerId" value={newSubTask.detailerId} onChange={handleSubTaskChange} className="p-1 border rounded-md text-sm">
                                <option value="">Assignee...</option>
                                {detailers.map(d => <option key={d.id} value={d.id}>{d.lastName}</option>)}
                            </select>
                            <input type="date" name="dueDate" value={newSubTask.dueDate} onChange={handleSubTaskChange} className="p-1 border rounded-md text-sm" />
                            <button onClick={handleAddSubTask} className="px-3 py-1 bg-gray-200 rounded-md text-sm hover:bg-gray-300">Add</button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Cancel</button>
                        <button onClick={() => onSave(taskData)} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save All Changes</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};


const TaskCard = ({ task, detailers, onDragStart, onClick }) => {
    const watchers = (task.watchers || []).map(wId => detailers.find(d => d.id === wId)).filter(Boolean);
    const subTasks = task.subTasks || [];
    const completedSubTasks = subTasks.filter(st => st.isCompleted).length;
    const assignee = detailers.find(d => d.id === task.detailerId);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onClick}
            className="bg-gray-700 p-3 rounded-lg border border-gray-600 shadow-sm cursor-pointer mb-3 text-gray-200"
        >
            <p className="font-semibold mb-2">{task.taskName}</p>
            <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                <span className={task.dueDate ? '' : 'text-gray-500'}>
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
                                 <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border-2 border-gray-700">
                                     {assignee.firstName.charAt(0)}{assignee.lastName.charAt(0)}
                                 </span>
                            </Tooltip>
                        )}
                        {watchers.slice(0, 2).map(watcher => (
                            <Tooltip key={watcher.id} text={`${watcher.firstName} ${watcher.lastName}`}>
                                 <span className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs border-2 border-gray-700">
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


const TaskConsole = ({ tasks, detailers, projects, taskLanes }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [notification, setNotification] = useState(null);
    const [editingLaneId, setEditingLaneId] = useState(null);
    const [editingLaneName, setEditingLaneName] = useState('');
    const [deletingLane, setDeletingLane] = useState(null); // {id, name}

    const showNotification = (message) => {
        if (typeof message === 'string') {
            setNotification({ text: message, isError: false });
        } else {
            setNotification(message);
        }
        setTimeout(() => setNotification(null), 3000);
    };

    const handleOpenModal = (task = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleSaveTask = async (taskData) => {
        const isNew = !taskData.id;
        const assignee = detailers.find(d => d.id === taskData.detailerId);
        const watchers = (taskData.watchers || []).map(watcherId => detailers.find(d => d.id === watcherId)).filter(Boolean);

        if (isNew) {
            const newRequestsLane = taskLanes.find(l => l.name === "New Requests");
            if (!newRequestsLane) {
                showNotification({ text: "Error: 'New Requests' lane not found.", isError: true });
                return;
            }
            const { id, ...data } = taskData;
            data.laneId = newRequestsLane.id;
            const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/tasks`), data);
            
            const newTask = { id: docRef.id, ...data };
            setEditingTask(newTask); // Keep modal open in edit mode
            showNotification("Task created! You can now add attachments.");
            
            if(assignee?.email) sendEmail(assignee.email, `New Task: ${taskData.taskName}`, `You have been assigned a new task: "${taskData.taskName}".`);
            watchers.forEach(w => {
                 if(w.email) sendEmail(w.email, `New Task (Watched): ${taskData.taskName}`, `A new task you are watching has been created: "${taskData.taskName}".`);
            });

        } else {
            const { id, ...data } = taskData;
            const taskRef = doc(db, `artifacts/${appId}/public/data/tasks`, id);
            await updateDoc(taskRef, data);
            showNotification("Task updated successfully!");
            handleCloseModal();
            if(assignee?.email) sendEmail(assignee.email, `Task Updated: ${taskData.taskName}`, `A task assigned to you has been updated: "${taskData.taskName}".`);
            watchers.forEach(w => {
                 if(w.email) sendEmail(w.email, `Task Updated (Watched): ${taskData.taskName}`, `A task you are watching has been updated: "${taskData.taskName}".`);
            });
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
            showNotification(`Lane '${newLaneName}' added.`);
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
    
    const confirmDeleteLane = async (laneId) => {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/taskLanes`, laneId));
        showNotification("Lane deleted.");
        setDeletingLane(null);
    }


    const handleDeleteLane = (lane) => {
        const tasksInLane = tasks.filter(t => t.laneId === lane.id);
        if (tasksInLane.length > 0) {
            showNotification({ text: "Cannot delete a lane that contains tasks.", isError: true });
            return;
        }
        setDeletingLane(lane);
    };

    return (
        <div className="flex flex-col h-full">
             {notification && (
                <div className={`${notification.isError ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'} px-4 py-2 rounded relative m-4`} role="alert">
                    <span className="block sm:inline">{notification.text}</span>
                </div>
            )}
             <div className="flex-grow overflow-x-auto p-4">
                 <div className="flex space-x-4 h-full">
                     {taskLanes.map(lane => (
                         <div
                             key={lane.id}
                             onDragOver={handleDragOver}
                             onDrop={(e) => handleDrop(e, lane.id)}
                             className="bg-gray-900 rounded-lg p-3 w-56 flex-shrink-0 flex flex-col"
                         >
                            <div className="flex justify-between items-center mb-4 text-white">
                               { editingLaneId === lane.id ? (
                                   <input
                                      type="text"
                                      value={editingLaneName}
                                      onChange={(e) => setEditingLaneName(e.target.value)}
                                      onBlur={() => handleRenameLane(lane.id)}
                                      onKeyPress={(e) => e.key === 'Enter' && handleRenameLane(lane.id)}
                                      className="font-semibold p-1 rounded-md border bg-gray-700 w-full text-white"
                                      autoFocus
                                   />
                               ) : (
                                   <h2 className="font-semibold cursor-pointer" onClick={() => { setEditingLaneId(lane.id); setEditingLaneName(lane.name); }}>{lane.name}</h2>
                               )}
                                <button onClick={() => handleDeleteLane(lane)} className="text-gray-400 hover:text-red-500 disabled:opacity-20" disabled={tasks.some(t => t.laneId === lane.id)}>&times;</button>
                            </div>

                             {lane.name === "New Requests" && (
                                 <button onClick={() => handleOpenModal(null)} className="w-full text-left p-2 mb-3 bg-gray-700 text-gray-300 rounded-md shadow-sm hover:bg-gray-600">+ Add Task</button>
                             )}

                             <div className="flex-grow overflow-y-auto pr-2">
                                 {tasks.filter(t => t.laneId === lane.id).map(task => (
                                     <TaskCard
                                         key={task.id}
                                         task={task}
                                         detailers={detailers}
                                         onDragStart={handleDragStart}
                                         onClick={() => handleOpenModal(task)}
                                     />
                                 ))}
                             </div>
                         </div>
                     ))}
                      <div className="w-56 flex-shrink-0">
                         <button onClick={handleAddLane} className="w-full p-3 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600">+ Add Another List</button>
                      </div>
                 </div>
             </div>
            {isModalOpen && (
                <TaskDetailModal
                    task={editingTask}
                    detailers={detailers}
                    projects={projects}
                    onClose={handleCloseModal}
                    onSave={handleSaveTask}
                    onSetMessage={showNotification}
                />
            )}
             {deletingLane && (
                <Modal onClose={() => setDeletingLane(null)} customClasses="max-w-md">
                    <div className="text-center p-4">
                        <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
                        <p className="mb-6">Are you sure you want to delete the lane "{deletingLane.name}"? This action cannot be undone.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setDeletingLane(null)} className="px-6 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Cancel</button>
                            <button onClick={() => confirmDeleteLane(deletingLane.id)} className="px-6 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </Modal>
             )}
        </div>
    );
};


export default App;
