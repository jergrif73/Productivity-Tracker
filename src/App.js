import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, query, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// --- Helper Functions & Initial Data ---

// Provide a default value for process.env.REACT_APP_APP_ID if it's not defined
const appId = process.env.REACT_APP_APP_ID || 'default-prod-tracker-app';

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
    { firstName: "Philip", lastName: "Kronberg", employeeId: "500132", skills: {}, disciplineSkillsets: {} },    
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

// Initialize Firebase outside of the component to prevent re-initialization on re-renders
let firebaseApp;
let db;
let auth;

try {
    const firebaseConfig = {
        apiKey: "AIzaSyC8aM0mFNiRmy8xcLsS48lSPfHQ9egrJ7s",
        authDomain: "productivity-tracker-3017d.firebaseapp.com",
        projectId: "productivity-tracker-3017d",
        storageBucket: "productivity-tracker-3017d.firebasestorage.app",
        messagingSenderId: "489412895343",
        appId: "1:489412895343:web:780e7717db122a2b99639a",
        measurementId: "G-LGTREWPTGJ"
    };

    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
} catch (error) {
    console.error("Firebase initialization failed:", error);
    // You might want to display an error message to the user here
}


// --- React Components ---

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

const Modal = ({ children, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-end">
                    <button onClick={onClose} className="text-2xl font-bold">&times;</button>
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
    const [view, setView] = useState('detailers');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [detailers, setDetailers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            console.error("Firebase Auth is not initialized.");
            setIsAuthReady(true); // Allow the app to render even if auth isn't ready, with a message
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            } else {
                try {
                    // Use environment variable REACT_APP_INITIAL_AUTH_TOKEN
                    if (process.env.REACT_APP_INITIAL_AUTH_TOKEN) {
                        await signInWithCustomToken(auth, process.env.REACT_APP_INITIAL_AUTH_TOKEN);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Authentication failed:", error);
                    setIsAuthReady(true); // Still set to true to allow UI to render even on auth failure
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const seedInitialData = async () => {
        if (!db) return;
        const detailersRef = collection(db, `artifacts/${appId}/public/data/detailers`);
        const projectsRef = collection(db, `artifacts/${appId}/public/data/projects`);
        
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
        
        setLoading(false);
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
        if (loading) return <div className="text-center p-10">Loading data...</div>;
        if (!db || !auth) return <div className="text-center p-10 text-red-500">Error: Firebase not initialized. Please check your configuration.</div>;

        switch (view) {
            case 'detailers':
                return <DetailerConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'projects':
                return <ProjectConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'workloader':
                return <WorkloaderConsole detailers={detailers} projects={projects} assignments={assignments} />;
            case 'skills':
                return <SkillsConsole detailers={detailers} />;
            case 'admin':
                return <AdminConsole detailers={detailers} projects={projects} />;
            default:
                return <DetailerConsole detailers={detailers} projects={projects} assignments={assignments} />;
        }
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif' }} className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-screen-2xl mx-auto bg-white rounded-xl shadow-lg">
                <header className="p-4 border-b">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-800">Workforce Productivity Tracker</h1>
                        <nav className="bg-gray-200 p-1 rounded-lg">
                            <div className="flex items-center space-x-1">
                                {navButtons.map(button => (
                                    <button
                                        key={button.id}
                                        onClick={() => setView(button.id)}
                                        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === button.id ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                                    >
                                        {button.icon}
                                        {button.label}
                                    </button>
                                ))}
                            </div>
                        </nav>
                    </div>
                </header>
                <main className="p-4">
                    {isAuthReady ? renderView() : <div className="text-center p-10">Authenticating...</div>}
                </main>
                <footer className="text-center p-2 text-xs text-gray-500 border-t">
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
                    <div className="col-span-2 text-right">TOTAL TIME</div>
                </div>
                <div className="space-y-4">
                    {sortedDetailers.map(d => {
                        const detailerAssignments = assignments.filter(a => a.detailerId === d.id);
                        const totalAllocation = detailerAssignments.reduce((sum, a) => sum + Number(a.allocation || 0), 0);
                        const detailerNewAssignments = newAssignments[d.id] || [];

                        return (
                            <div key={d.id} className="bg-white rounded-lg shadow p-4 grid grid-cols-12 gap-4 items-start">
                                <div className="col-span-12 md:col-span-3">
                                    <p className="font-bold">{d.firstName} {d.lastName}</p>
                                    <p className="text-xs text-gray-500">ID: {d.employeeId}</p>
                                    <button onClick={() => setViewingSkillsFor(d)} className="text-sm text-blue-600 hover:underline">View Skills</button>
                                </div>
                                <div className="col-span-12 md:col-span-7 space-y-2">
                                    {detailerAssignments.map(asn => (
                                        <InlineAssignmentEditor key={asn.id} assignment={asn} projects={projects} detailerDisciplines={d.disciplineSkillsets} onUpdate={handleUpdateExistingAssignment} onDelete={() => handleDeleteExistingAssignment(asn.id)} />
                                    ))}
                                    {detailerNewAssignments.map(asn => (
                                        <InlineAssignmentEditor key={asn.id} assignment={asn} projects={projects} detailerDisciplines={d.disciplineSkillsets} onUpdate={(upd) => handleUpdateNewAssignment(d.id, upd)} onDelete={() => handleDeleteNewAssignment(d.id, asn.id)} />
                                    ))}
                                    <button onClick={() => handleAddNewAssignment(d.id)} className="text-sm text-blue-600 hover:underline">+ Add Project/Trade</button>
                                </div>
                                <div className="col-span-12 md:col-span-2 text-right">
                                    <p className={`font-bold text-lg ${totalAllocation > 100 ? 'text-red-500' : 'text-green-600'}`}>{totalAllocation}%</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
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
                        <div key={p.id} className="bg-gray-50 p-4 rounded-lg border">
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
        // Replaced alert with console.log for better non-blocking feedback
        try {
            await setDoc(detailerRef, dataToSave, { merge: true });
            console.log("Changes saved successfully!");
        } catch (error) {
            console.error("Error saving changes:", error);
        }
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
                <div className="bg-gray-50 p-4 rounded-lg border space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Basic Info for {editableDetailer.firstName} {editableDetailer.lastName}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input value={editableDetailer.firstName} onChange={e => setEditableDetailer({...editableDetailer, firstName: e.target.value})} placeholder="First Name" className="p-2 border rounded-md" />
                            <input value={editableDetailer.lastName} onChange={e => setEditableDetailer({...editableDetailer, lastName: e.target.value})} placeholder="Last Name" className="p-2 border rounded-md" />
                            <input value={editableDetailer.employeeId} onChange={e => setEditableDetailer({...editableDetailer, employeeId: e.target.value})} placeholder="Employee ID" className="p-2 border rounded-md" />
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
                </div>
            )}
        </div>
    );
};


const AdminConsole = ({ detailers, projects }) => {
    const [newDetailer, setNewDetailer] = useState({ firstName: '', lastName: '', employeeId: '' });
    const [newProject, setNewProject] = useState({ name: '', projectId: '' });

    const handleAdd = async (type) => {
        if (!db) return;
        if (type === 'detailer') {
            // Replaced alert with custom UI/console.log for better non-blocking feedback
            if (!newDetailer.firstName || !newDetailer.lastName || !newDetailer.employeeId) {
                console.warn('Fill all detailer fields to add a new detailer.');
                return;
            }
            const detailersRef = collection(db, `artifacts/${appId}/public/data/detailers`);
            await addDoc(detailersRef, { ...newDetailer, skills: {}, disciplineSkillsets: {} });
            setNewDetailer({ firstName: '', lastName: '', employeeId: '' });
        } else {
            // Replaced alert with custom UI/console.log for better non-blocking feedback
            if (!newProject.name || !newProject.projectId) {
                console.warn('Fill all project fields to add a new project.');
                return;
            }
            const projectsRef = collection(db, `artifacts/${appId}/public/data/projects`);
            await addDoc(projectsRef, newProject);
            setNewProject({ name: '', projectId: '' });
        }
    };

    const handleDelete = async (type, id) => {
        if (!db) return;
        const collectionName = type === 'detailer' ? 'detailers' : 'projects';
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id));
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
                <div className="mt-4 space-y-2">
                    {detailers.map(d => (
                        <div key={d.id} className="flex justify-between items-center bg-white p-2 border rounded-md">
                            <span>{d.firstName} {d.lastName} ({d.employeeId})</span>
                            <button onClick={() => handleDelete('detailer', d.id)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                        </div>
                    ))}
                </div>
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
                <div className="mt-4 space-y-2">
                    {projects.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white p-2 border rounded-md">
                            <span>{p.name} ({p.projectId})</span>
                            <button onClick={() => handleDelete('project', p.id)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
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
        for (let i = 0; i < 16; i++) {
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
            <div className="flex flex-col sm:flex-row justify-between items-center p-2 bg-gray-50 rounded-lg border gap-4">
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

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="p-2 font-semibold w-[100px] min-w-[100px] border border-gray-300">DETAILER</th>
                            <th className="p-2 font-semibold w-[60px] min-w-[60px] border border-gray-300">TRADE</th>
                            <th className="p-2 font-semibold w-[40px] min-w-[40px] border border-gray-300">% ALLOCATED</th>
                            {weekDates.map(date => {
                                const weekStart = new Date(date);
                                const weekEnd = new Date(weekStart);
                                weekEnd.setDate(weekEnd.getDate() + 6);
                                const isCurrentWeek = new Date() >= weekStart && new Date() <= weekEnd;
                                return (
                                <th key={date.toISOString()} className={`p-2 font-semibold w-4 min-w-[8px] text-center border border-gray-300 ${isCurrentWeek ? 'bg-blue-200' : ''}`}>
                                    {`${date.getMonth() + 1}/${date.getDate()}`}
                                </th>
                                )})}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.map(project => (
                            <React.Fragment key={project.id}>
                                <tr className="bg-gray-200 sticky top-10">
                                    <th colSpan={3 + weekDates.length} className="p-2 text-left font-bold text-gray-700 border border-gray-300">
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

export default App; // Added this line to export the App component as default