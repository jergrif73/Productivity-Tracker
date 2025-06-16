import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, query, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyC8aM0mFNiRmy8xcLsS48lSPfHQ9egrJ7s",
  authDomain: "productivity-tracker-3017d.firebaseapp.com",
  projectId: "productivity-tracker-3017d",
  storageBucket: "productivity-tracker-3017d.firebasestorage.app",
  messagingSenderId: "489412895343",
  appId: "1:489412895343:web:780e7717db122a2b99639a",
  measurementId: "G-LGTREWPTGJ"
};

let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// --- Helper Functions & Initial Data ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-prod-tracker-app';

const initialDetailers = [
    { firstName: "Arne", lastName: "Knutsen", employeeId: "502530", skills: {}, disciplineSkillsets: {} },
    { firstName: "Bailee", lastName: "Risley", employeeId: "107888", skills: {}, disciplineSkillsets: {} },
    { firstName: "David", lastName: "Hisaw", employeeId: "500038", skills: {}, disciplineSkillsets: {} },
    { firstName: "Devon", lastName: "Beaudry", employeeId: "505369", skills: {}, disciplineSkillsets: {} },
    { firstName: "Jacob", lastName: "Gowey", employeeId: "100989", skills: {}, disciplineSkillsets: {} },
    { firstName: "Jade", lastName: "Abrams", employeeId: "530498", skills: {}, disciplineSkillsets: {} },
    { firstName: "Jeremiah", lastName: "Griffith", employeeId: "500193", skills: {}, disciplineSkillsets: {} },
    { firstName: "Melissa", lastName: "Cannon", employeeId: "530634", skills: {}, disciplineSkillsets: {} },
    { firstName: "Michael", lastName: "McIntyre", employeeId: "507259", skills: {}, disciplineSkillsets: {} },
    { firstName: "Philip", lastName: "Kronberg", employeeId: "506614", skills: {}, disciplineSkillsets: {} },
    { firstName: "Rick", lastName: "Peterson", employeeId: "500132", skills: {}, disciplineSkillsets: {} },
    { firstName: "Robert", lastName: "Mitchell", employeeId: "113404", skills: {}, disciplineSkillsets: {} },
    { firstName: "Shawn", lastName: "Schneirla", employeeId: "503701", skills: {}, disciplineSkillsets: {} },
    { firstName: "Shawn", lastName: "Simleness", employeeId: "503506", skills: {}, disciplineSkillsets: {} },
    { firstName: "Travis", lastName: "Michalowski", employeeId: "505404", skills: {}, disciplineSkillsets: {} },
    { firstName: "Joshua", lastName: "Testerman", employeeId: "504750", skills: {}, disciplineSkillsets: {} },
    { firstName: "Tyler", lastName: "Stoker", employeeId: "113923", skills: {}, disciplineSkillsets: {} },
    { firstName: "Nickolas", lastName: "Marshall", employeeId: "520118", skills: {}, disciplineSkillsets: {} },
    { firstName: "Jeremy", lastName: "Splattstoesser", employeeId: "507221", skills: {}, disciplineSkillsets: {} },
    { firstName: "Pavel", lastName: "Makarenko", employeeId: "500793", skills: {}, disciplineSkillsets: {} },
    { firstName: "Tyson", lastName: "Kafentzis", employeeId: "101153", skills: {}, disciplineSkillsets: {} }
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

// --- React Components ---

const FeedbackMessage = ({ message, type }) => {
    if (!message) return null;
    const baseClasses = "p-3 my-2 rounded-md text-sm font-medium transition-opacity duration-300";
    const typeClasses = type === 'success' 
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";
    return <div className={`${baseClasses} ${typeClasses}`}>{message}</div>;
};

const BubbleRating = ({ score, onScoreChange }) => (
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

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-end">
                <button onClick={onClose} className="text-2xl font-bold">&times;</button>
            </div>
            {children}
        </div>
    </div>
);

const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
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
    const [view, setView] = useState('detailers');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [detailers, setDetailers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Effect for handling authentication state
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            } else {
                try {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Authentication failed:", error);
                    setIsAuthReady(true); // Still proceed even if auth fails, to not block UI
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Effect for seeding data and subscribing to Firestore changes
    useEffect(() => {
        if (!isAuthReady || !db) return;

        const seedInitialData = async () => {
            const detailersRef = collection(db, `artifacts/${appId}/public/data/detailers`);
            const projectsRef = collection(db, `artifacts/${appId}/public/data/projects`);
            
            const detailerSnapshot = await getDocs(query(detailersRef));
            if (detailerSnapshot.empty) {
                console.log("Seeding detailers...");
                const batch = writeBatch(db);
                initialDetailers.forEach(d => batch.set(doc(detailersRef), d));
                await batch.commit();
            }

            const projectSnapshot = await getDocs(query(projectsRef));
            if (projectSnapshot.empty) {
                console.log("Seeding projects...");
                const batch = writeBatch(db);
                initialProjects.forEach(p => batch.set(doc(projectsRef), p));
                await batch.commit();
            }
        };

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
            setLoading(false); // Set loading to false after assignments (main data) are loaded
        });
        
        return () => {
            unsubDetailers();
            unsubProjects();
            unsubAssignments();
        };
    }, [isAuthReady]);
    
    const navButtons = [
        { id: 'detailers', label: 'Detailer', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg> },
        { id: 'projects', label: 'Project', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg> },
        { id: 'workloader', label: 'Workloader', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5z" /></svg> },
        { id: 'skills', label: 'Edit', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg> },
        { id: 'admin', label: 'Manage', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    ];

    const renderView = () => {
        if (loading) return <div className="text-center p-10 font-semibold">Loading data...</div>;
        switch (view) {
            case 'detailers': return <DetailerConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'projects': return <ProjectConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'workloader': return <WorkloaderConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'skills': return <SkillsConsole detailers={detailers} />;
            case 'admin': return <AdminConsole detailers={detailers} projects={projects} />;
            default: return <DetailerConsole detailers={detailers} projects={projects} assignments={assignments} />;
        }
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif' }} className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-screen-2xl mx-auto bg-white rounded-xl shadow-lg">
                <header className="p-4 border-b">
                     <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-800">Workforce Productivity Tracker</h1>
                        <nav className="bg-gray-200 p-1 rounded-lg">
                            <div className="flex items-center space-x-1 flex-wrap justify-center">
                                {navButtons.map(button => (
                                    <button key={button.id} onClick={() => setView(button.id)} className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === button.id ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
                                        {button.icon} {button.label}
                                    </button>
                                ))}
                            </div>
                        </nav>
                    </div>
                </header>
                <main className="p-4">
                    {isAuthReady ? renderView() : <div className="text-center p-10 font-semibold">Authenticating...</div>}
                </main>
                 <footer className="text-center p-2 text-xs text-gray-500 border-t">
                    User ID: {userId || 'N/A'} | App ID: {appId}
                </footer>
            </div>
        </div>
    );
};

// --- Console Components ---

const InlineAssignmentEditor = ({ assignment, projects, onUpdate, onDelete, onSave }) => {
    const sortedProjects = useMemo(() => [...projects].sort((a,b) => a.projectId.localeCompare(b.projectId, undefined, {numeric: true})), [projects]);
    const isNew = useMemo(() => assignment.id.startsWith('new_'), [assignment.id]);
    
    const handleChange = (field, value) => onUpdate({ ...assignment, [field]: value });

    return (
        <div className="bg-gray-50 p-3 rounded-lg border space-y-3">
            <div className="flex items-center gap-2">
                <select value={assignment.projectId} onChange={e => handleChange('projectId', e.target.value)} className="w-full p-2 border rounded-md bg-white">
                    <option value="">Select a Project...</option>
                    {sortedProjects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
                </select>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-100">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <input type="date" value={assignment.startDate} onChange={e => handleChange('startDate', e.target.value)} className="w-full p-2 border rounded-md" />
                 <input type="date" value={assignment.endDate} onChange={e => handleChange('endDate', e.target.value)} className="w-full p-2 border rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                 <select value={assignment.trade} onChange={e => handleChange('trade', e.target.value)} className="w-full p-2 border rounded-md bg-white">
                    <option value="">Trade...</option>
                    {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <select value={assignment.activity} onChange={e => handleChange('activity', e.target.value)} className="w-full p-2 border rounded-md bg-white">
                    <option value="">Activity...</option>
                    {activityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input type="number" placeholder="%" value={assignment.allocation} onChange={e => handleChange('allocation', e.target.value)} className="w-full p-2 border rounded-md" />
            </div>
            {isNew && (
                <button onClick={onSave} className="w-full mt-2 bg-green-500 text-white p-2 rounded-md hover:bg-green-600 font-semibold">
                    Save New Assignment
                </button>
            )}
        </div>
    );
};

const DetailerConsole = ({ detailers, projects, assignments }) => {
    const [sortBy, setSortBy] = useState('firstName');
    const [viewingSkillsFor, setViewingSkillsFor] = useState(null);
    const [newAssignments, setNewAssignments] = useState({});
    const [feedback, setFeedback] = useState({}); // { detailerId: { message, type } }

    const showFeedback = (detailerId, message, type) => {
        setFeedback(f => ({ ...f, [detailerId]: { message, type } }));
        setTimeout(() => setFeedback(f => ({ ...f, [detailerId]: null })), 3000);
    };

    const getMostRecentMonday = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff)).toISOString().split('T')[0];
    };
    
    const sortedDetailers = useMemo(() => [...detailers].sort((a, b) => a[sortBy].localeCompare(b[sortBy])), [detailers, sortBy]);

    const handleAddNewAssignment = (detailerId) => {
        const newAsn = { id: `new_${Date.now()}`, projectId: '', startDate: getMostRecentMonday(), endDate: '', trade: '', activity: '', allocation: '100' };
        setNewAssignments(prev => ({ ...prev, [detailerId]: [...(prev[detailerId] || []), newAsn] }));
    };
    
    const handleUpdateNewAssignment = (detailerId, updatedAsn) => {
        const toUpdate = (newAssignments[detailerId] || []).map(asn => asn.id === updatedAsn.id ? updatedAsn : asn);
        setNewAssignments(prev => ({ ...prev, [detailerId]: toUpdate }));
    };

    const handleSaveNewAssignment = async (detailerId, assignmentToSave) => {
        const { projectId, startDate, endDate, trade, activity, allocation } = assignmentToSave;
        if (!projectId || !startDate || !endDate || !trade || !activity || !allocation) {
            showFeedback(detailerId, "Please fill all fields before saving.", "error");
            return;
        }
        const { id, ...payload } = assignmentToSave;
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/assignments`), { ...payload, detailerId, allocation: Number(payload.allocation) });
            const remaining = (newAssignments[detailerId] || []).filter(a => a.id !== id);
            setNewAssignments(prev => ({ ...prev, [detailerId]: remaining }));
        } catch (e) {
            console.error("Error saving new assignment:", e);
            showFeedback(detailerId, "Failed to save assignment.", "error");
        }
    };
    
    const handleDeleteNewAssignment = (detailerId, assignmentId) => {
        const remaining = (newAssignments[detailerId] || []).filter(a => a.id !== assignmentId);
        setNewAssignments(prev => ({ ...prev, [detailerId]: remaining }));
    };

    const handleUpdateExistingAssignment = async (assignment) => {
        const { id, ...payload } = assignment;
        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/assignments`, id), { ...payload, allocation: Number(payload.allocation) });
        } catch(e) { console.error("Error updating assignment", e); }
    };
    
    const handleDeleteExistingAssignment = async (id) => {
        if (window.confirm("Are you sure you want to delete this assignment?")) {
             await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, id));
        }
    }

    return (
        <div>
            <div className="flex justify-end items-center mb-4 gap-2">
                <span className="mr-2 text-sm font-medium">Sort by:</span>
                <button onClick={() => setSortBy('firstName')} className={`px-4 py-1.5 rounded-md text-sm ${sortBy === 'firstName' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>First Name</button>
                <button onClick={() => setSortBy('lastName')} className={`px-4 py-1.5 rounded-md text-sm ${sortBy === 'lastName' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Last Name</button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="hidden md:grid grid-cols-12 gap-4 font-bold text-sm text-gray-600 px-4 py-2">
                    <div className="col-span-3">DETAILER</div>
                    <div className="col-span-7">PROJECT ASSIGNMENTS</div>
                    <div className="col-span-2 text-right">TOTAL ALLOCATION</div>
                </div>
                <div className="space-y-4">
                    {sortedDetailers.map(d => {
                        const detailerAssignments = assignments.filter(a => a.detailerId === d.id);
                        const totalAllocation = detailerAssignments.reduce((sum, a) => sum + Number(a.allocation || 0), 0);

                        return (
                            <div key={d.id} className="bg-white rounded-lg shadow p-4 grid grid-cols-12 gap-4 items-start">
                                <div className="col-span-12 md:col-span-3">
                                    <p className="font-bold">{d.firstName} {d.lastName}</p>
                                    <p className="text-xs text-gray-500">ID: {d.employeeId}</p>
                                    <button onClick={() => setViewingSkillsFor(d)} className="text-sm text-blue-600 hover:underline">View Skills</button>
                                </div>
                                <div className="col-span-12 md:col-span-7 space-y-2">
                                    {detailerAssignments.map(asn => <InlineAssignmentEditor key={asn.id} assignment={asn} projects={projects} onUpdate={handleUpdateExistingAssignment} onDelete={() => handleDeleteExistingAssignment(asn.id)} />)}
                                    {(newAssignments[d.id] || []).map(asn => <InlineAssignmentEditor key={asn.id} assignment={asn} projects={projects} onUpdate={(upd) => handleUpdateNewAssignment(d.id, upd)} onDelete={() => handleDeleteNewAssignment(d.id, asn.id)} onSave={() => handleSaveNewAssignment(d.id, asn)} />)}
                                    <button onClick={() => handleAddNewAssignment(d.id)} className="text-sm text-blue-600 hover:underline mt-2">+ Add Assignment</button>
                                    <FeedbackMessage message={feedback[d.id]?.message} type={feedback[d.id]?.type} />
                                </div>
                                <div className="col-span-12 md:col-span-2 text-right">
                                    <p className={`font-bold text-lg ${totalAllocation > 100 ? 'text-red-500' : 'text-green-600'}`}>{totalAllocation}%</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {viewingSkillsFor && <Modal onClose={() => setViewingSkillsFor(null)}><SkillsConsole detailers={[viewingSkillsFor]} singleDetailerMode={true} /></Modal>}
        </div>
    );
};


const ProjectConsole = ({ detailers, projects, assignments }) => {
    const sortedProjects = useMemo(() => [...projects].sort((a,b) => a.projectId.localeCompare(b.projectId, undefined, {numeric: true})), [projects]);
    
    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Project Overview</h2>
            <div className="space-y-4">
                {sortedProjects.map(p => {
                    const projectAssignments = assignments.filter(a => a.projectId === p.id);
                    return (
                        <div key={p.id} className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-lg font-semibold">{p.name} <span className="text-gray-600 font-normal">({p.projectId})</span></h3>
                            <div className="mt-2 pl-4 border-l-2 border-blue-200">
                                <h4 className="text-sm font-semibold mb-1">Assigned Detailers:</h4>
                                {projectAssignments.length === 0 ? <p className="text-sm text-gray-500">None</p> : (
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {projectAssignments.map(a => {
                                            const detailer = detailers.find(d => d.id === a.detailerId);
                                            return (
                                                <li key={a.id}>
                                                    {detailer ? `${detailer.firstName} ${detailer.lastName}` : 'Unknown Detailer'} - <span className="font-semibold">{a.allocation}%</span> ({a.trade} / {a.activity})
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
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    const showFeedback = (message, type) => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
    };

    useEffect(() => {
        const detailer = detailers.find(d => d.id === selectedDetailerId);
        setEditableDetailer(detailer ? { ...detailer } : null);
    }, [selectedDetailerId, detailers]);

    if (!selectedDetailerId && !singleDetailerMode) {
        return (
            <div>
                 <h2 className="text-xl font-bold mb-4">Modify Detailer Skills & Info</h2>
                 <select onChange={e => setSelectedDetailerId(e.target.value)} value={selectedDetailerId} className="w-full max-w-xs p-2 border rounded-md">
                    <option value="" disabled>Select a detailer to edit...</option>
                    {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                </select>
            </div>
        )
    }
    
    if (!editableDetailer) return null;

    const handleSkillChange = (skillName, score) => setEditableDetailer(p => ({ ...p, skills: { ...p.skills, [skillName]: score } }));
    const handleDisciplineRatingChange = (name, score) => setEditableDetailer(p => ({ ...p, disciplineSkillsets: { ...p.disciplineSkillsets, [name]: score } }));
    
    const handleAddDiscipline = () => {
        if (newDiscipline && !((editableDetailer.disciplineSkillsets || {})[newDiscipline])) {
            setEditableDetailer(p => ({ ...p, disciplineSkillsets: { ...(p.disciplineSkillsets || {}), [newDiscipline]: 0 } }));
            setNewDiscipline('');
        }
    };
    
    const handleRemoveDiscipline = (disciplineToRemove) => {
        const { [disciplineToRemove]: _, ...remaining } = editableDetailer.disciplineSkillsets;
        setEditableDetailer(p => ({ ...p, disciplineSkillsets: remaining }));
    };

    const handleSaveChanges = async () => {
        const { id, ...dataToSave } = editableDetailer;
        try {
            await setDoc(doc(db, `artifacts/${appId}/public/data/detailers`, id), dataToSave, { merge: true });
            showFeedback("Changes saved successfully!", "success");
        } catch (e) {
            showFeedback("Error saving changes.", "error");
            console.error(e);
        }
    };
    
    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Modify Skills for {editableDetailer.firstName} {editableDetailer.lastName}</h2>
            <div className="bg-gray-50 p-4 rounded-lg border space-y-6">
                 {/* Basic Info editing could be added here if desired */}
                <div>
                    <h3 className="text-lg font-semibold mb-2">Skill Assessment</h3>
                    <div className="space-y-4">{skillCategories.map(skill => (
                        <div key={skill}><label className="font-medium">{skill}</label><BubbleRating score={editableDetailer.skills?.[skill] || 0} onScoreChange={(score) => handleSkillChange(skill, score)}/></div>
                    ))}</div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Discipline Skillsets</h3>
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <select value={newDiscipline} onChange={(e) => setNewDiscipline(e.target.value)} className="p-2 border rounded-md bg-white">
                            <option value="">Select a discipline...</option>
                            {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <button onClick={handleAddDiscipline} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Add</button>
                    </div>
                    <div className="space-y-4">{Object.entries(editableDetailer.disciplineSkillsets || {}).map(([name, score]) => (
                        <div key={name} className="p-3 bg-white rounded-md border">
                            <div className="flex justify-between items-start"><span className="font-medium">{name}</span><button onClick={() => handleRemoveDiscipline(name)} className="text-red-500 hover:text-red-700 text-xl font-bold">&times;</button></div>
                            <BubbleRating score={score} onScoreChange={(newScore) => handleDisciplineRatingChange(name, newScore)} />
                        </div>
                    ))}</div>
                </div>
                <FeedbackMessage message={feedback.message} type={feedback.type} />
                <button onClick={handleSaveChanges} className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600 mt-4 font-semibold">Save All Changes</button>
            </div>
        </div>
    );
};


const AdminConsole = ({ detailers, projects }) => {
    const [newDetailer, setNewDetailer] = useState({ firstName: '', lastName: '', employeeId: '' });
    const [newProject, setNewProject] = useState({ name: '', projectId: '' });
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    const showFeedback = (message, type) => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
    };

    const handleAdd = async (type) => {
        if (type === 'detailer') {
            if (!newDetailer.firstName || !newDetailer.lastName || !newDetailer.employeeId) return showFeedback('Fill all detailer fields.', 'error');
            await addDoc(collection(db, `artifacts/${appId}/public/data/detailers`), { ...newDetailer, skills: {}, disciplineSkillsets: {} });
            setNewDetailer({ firstName: '', lastName: '', employeeId: '' });
            showFeedback('Detailer added.', 'success');
        } else {
            if (!newProject.name || !newProject.projectId) return showFeedback('Fill all project fields.', 'error');
            await addDoc(collection(db, `artifacts/${appId}/public/data/projects`), newProject);
            setNewProject({ name: '', projectId: '' });
            showFeedback('Project added.', 'success');
        }
    };

    const handleDelete = async (type, id, name) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            const collectionName = type === 'detailer' ? 'detailers' : 'projects';
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id));
            showFeedback(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`, 'success');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h2 className="text-xl font-bold mb-4">Manage Detailers</h2>
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-semibold mb-2">Add New Detailer</h3>
                    <div className="space-y-2 mb-4">
                        <input value={newDetailer.firstName} onChange={e => setNewDetailer({...newDetailer, firstName: e.target.value})} placeholder="First Name" className="w-full p-2 border rounded-md"/>
                        <input value={newDetailer.lastName} onChange={e => setNewDetailer({...newDetailer, lastName: e.target.value})} placeholder="Last Name" className="w-full p-2 border rounded-md"/>
                        <input value={newDetailer.employeeId} onChange={e => setNewDetailer({...newDetailer, employeeId: e.target.value})} placeholder="Employee ID" className="w-full p-2 border rounded-md"/>
                    </div>
                    <button onClick={() => handleAdd('detailer')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600">Add Detailer</button>
                </div>
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">{detailers.map(d => (
                    <div key={d.id} className="flex justify-between items-center bg-white p-2 border rounded-md"><span>{d.firstName} {d.lastName} ({d.employeeId})</span><button onClick={() => handleDelete('detailer', d.id, `${d.firstName} ${d.lastName}`)} className="text-red-500 hover:text-red-700 font-bold">&times;</button></div>
                ))}</div>
            </div>
            <div>
                <h2 className="text-xl font-bold mb-4">Manage Projects</h2>
                 <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-semibold mb-2">Add New Project</h3>
                    <div className="space-y-2 mb-4">
                        <input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="Project Name" className="w-full p-2 border rounded-md"/>
                        <input value={newProject.projectId} onChange={e => setNewProject({...newProject, projectId: e.target.value})} placeholder="Project ID" className="w-full p-2 border rounded-md"/>
                    </div>
                    <button onClick={() => handleAdd('project')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600">Add Project</button>
                </div>
                 <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">{projects.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white p-2 border rounded-md"><span>{p.name} ({p.projectId})</span><button onClick={() => handleDelete('project', p.id, p.name)} className="text-red-500 hover:text-red-700 font-bold">&times;</button></div>
                ))}</div>
            </div>
            <div className="md:col-span-2"><FeedbackMessage message={feedback.message} type={feedback.type} /></div>
        </div>
    );
};

const WorkloaderConsole = ({ detailers, projects, assignments }) => {
    const [startDate, setStartDate] = useState(new Date());

    const getWeekDates = from => {
        const sunday = new Date(from);
        sunday.setHours(0, 0, 0, 0);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        return Array.from({ length: 16 }, (_, i) => new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i * 7));
    };
    
    const weekDates = useMemo(() => getWeekDates(startDate), [startDate]);

    const groupedData = useMemo(() => {
        const assignmentsByProject = assignments.reduce((acc, assignment) => {
            if(assignment.projectId) (acc[assignment.projectId] = acc[assignment.projectId] || []).push(assignment);
            return acc;
        }, {});
        return projects.map(project => ({
            ...project,
            assignments: (assignmentsByProject[project.id] || []).map(ass => ({ ...ass, detailer: detailers.find(d => d.id === ass.detailerId) }))
        })).filter(p => p.assignments.length > 0).sort((a,b) => a.name.localeCompare(b.name));
    }, [projects, assignments, detailers]);

    const handleDateNav = offset => setStartDate(prev => new Date(prev.setDate(prev.getDate() + offset)));
    const getWeekDisplay = start => {
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.getMonth()+1}/${start.getDate()}/${start.getFullYear().toString().slice(-2)} - ${end.getMonth()+1}/${end.getDate()}/${end.getFullYear().toString().slice(-2)}`;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center p-2 bg-gray-50 rounded-lg border gap-4">
                <div className="flex items-center gap-2"><button onClick={() => handleDateNav(-7)} className="p-2 rounded-md hover:bg-gray-200">{'<'}</button><button onClick={() => setStartDate(new Date())} className="p-2 px-4 border rounded-md hover:bg-gray-200">Today</button><button onClick={() => handleDateNav(7)} className="p-2 rounded-md hover:bg-gray-200">{'>'}</button><span className="font-semibold text-sm ml-4 whitespace-nowrap">{getWeekDisplay(weekDates[0])}</span></div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">{Object.entries(legendColorMapping).map(([trade, color]) => (<div key={trade} className="flex items-center gap-2"><div className={`w-4 h-4 rounded-sm ${color}`}></div><span>{trade}</span></div>))}</div>
            </div>
            <div className="overflow-x-auto border rounded-lg"><table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-10"><tr>
                    <th className="p-2 font-semibold w-32 min-w-[128px] border-r">DETAILER</th><th className="p-2 font-semibold w-24 min-w-[96px] border-r">TRADE</th><th className="p-2 font-semibold w-20 min-w-[80px] border-r">%</th>
                    {weekDates.map(date => {
                        const weekStart = new Date(date); const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
                        const isCurrentWeek = new Date() >= weekStart && new Date() <= weekEnd;
                        return <th key={date.toISOString()} className={`p-1 font-semibold w-11 min-w-[44px] text-center border-r ${isCurrentWeek ? 'bg-blue-100' : ''}`}>{`${date.getMonth() + 1}/${date.getDate()}`}</th>
                    })}
                </tr></thead>
                <tbody>{groupedData.map(project => (<React.Fragment key={project.id}>
                    <tr className="bg-gray-200 sticky top-10 z-0"><th colSpan={3 + weekDates.length} className="p-2 text-left font-bold text-gray-700">{project.name} ({project.projectId})</th></tr>
                    {project.assignments.map(assignment => {
                        const { bg: bgColor, text: textColor } = tradeColorMapping[assignment.trade] || {bg: 'bg-gray-200', text: 'text-black'};
                        const detailerName = assignment.detailer ? `${assignment.detailer.firstName.charAt(0)}. ${assignment.detailer.lastName}` : 'N/A';
                        return (
                            <tr key={assignment.id} className="hover:bg-gray-50 h-8"><td className="p-1 font-medium border-r">{detailerName}</td><td className="p-1 border-r">{assignment.trade}</td><td className="p-1 font-semibold text-center border-r">{assignment.allocation}%</td>
                                {weekDates.map(weekStart => {
                                    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
                                    // Robust date parsing (treats 'YYYY-MM-DD' as local date)
                                    const startParts = assignment.startDate.split('-'); const assignStart = new Date(startParts[0], startParts[1] - 1, startParts[2]);
                                    const endParts = assignment.endDate.split('-'); const assignEnd = new Date(endParts[0], endParts[1] - 1, endParts[2]);
                                    assignEnd.setHours(23, 59, 59, 999); // ensure end date is inclusive
                                    const isAssigned = assignStart <= weekEnd && assignEnd >= weekStart;
                                    return (
                                        <td key={weekStart.toISOString()} className="p-0 border-r">{isAssigned ? (
                                            <Tooltip text={`Activity: ${assignment.activity || 'N/A'}`}>
                                                <div className={`h-full w-full flex items-center justify-center p-1 ${bgColor} ${textColor} text-xs font-bold`}><span>{assignment.allocation}%</span></div>
                                            </Tooltip>
                                        ) : <div className="h-full"></div>}</td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </React.Fragment>))}</tbody>
            </table></div>
        </div>
    );
};

export default App;
