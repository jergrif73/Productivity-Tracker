import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, query, writeBatch, getDocs, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Star, PlusCircle, XCircle, ChevronLeft, ChevronRight, Calendar, Users, Briefcase, Settings, Trash2, FilePenLine, BarChartHorizontal, UserSquare, LogOut, AlertTriangle, KeyRound, Loader2, Clipboard } from 'lucide-react';

// --- Firebase Configuration ---
// IMPORTANT: REPLACE THE PLACEHOLDER VALUES BELOW WITH YOUR ACTUAL FIREBASE CONFIG
// You can get this from your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyC8aM0mFNiRmy8xcLsS48lSPfHQ9egrJ7s",
  authDomain: "productivity-tracker-3017d.firebaseapp.com",
  projectId: "productivity-tracker-3017d",
  storageBucket: "productivity-tracker-3017d.firebasestorage.app",
  messagingSenderId: "489412895343",
  appId: "1:489412895343:web:780e7717db122a2b99639a",
  measurementId: "G-LGTREWPTGJ"
};

const appId = 'default-productivity-tracker';
const ASSIGNMENTS_COLLECTION = 'assignments';

// --- Hardcoded Initial Data from User's Files ---
const initialDetailersData = [
    { name: "Arne Knutsen", employeeId: "-502530" }, { name: "Bailee Risley", employeeId: "-107888" }, { name: "David Hisaw", employeeId: "-500038" }, { name: "Devon Beaudry", employeeId: "-505369" }, { name: "Jacob Gowey", employeeId: "-100989" }, { name: "Jade Abrams", employeeId: "-530498" }, { name: "Jeremiah Griffith", employeeId: "-500193" }, { name: "Melissa Cannon", employeeId: "-530634" }, { name: "Michael McIntyre", employeeId: "-507259" }, { name: "Philip Kronberg", employeeId: "-506614" }, { name: "Rick Peterson", employeeId: "-500132" }, { name: "Robert Mitchell", employeeId: "-113404" }, { name: "Shawn Schneirla", employeeId: "-503701" }, { name: "Shawn Simleness", employeeId: "-503506" }, { name: "Travis Michalowski", employeeId: "-505404" }, { name: "Joshua Testerman", employeeId: "-504750" }, { name: "Tyler Stoker", employeeId: "-113923" }, { name: "Nickolas Marshall", employeeId: "-520118" }, { name: "Jeremy Splattstoesser", employeeId: "-507221" }, { name: "Pavel Makarenko", employeeId: "-500793" }
].map(d => ({ ...d, skills: { modelKnowledge: 0, bimKnowledge: 0, leadership: 0, mechanical: 0, teamwork: 0 }, disciplines: [] }));


const initialProjectsData = [
    { name: "Brandt Interco", projectId: "5800005" }, { name: "PRECON / Estimating 2022", projectId: "5818022" }, { name: "RLSB 7th Floor Buildout", projectId: "5820526" }, { name: "PRN 1 Modernization", projectId: "5820533" }, { name: "OHEP IPA", projectId: "5820574" }, { name: "Vantage WA 13", projectId: "5820577" }, { name: "Microsoft Service Project", projectId: "5820580" }, { name: "PSU VSC", projectId: "5820608" }, { name: "Albina Library", projectId: "5820637" }, { name: "KND1-2 Type F", projectId: "5820643" }, { name: "Vantage WA 13 - Tenant Office Fit up", projectId: "5820648" }, { name: "UCO Type F", projectId: "5820653" }, { name: "DLS BD CL02 BATCH TANK RE", projectId: "5820654" }, { name: "Old Trapper Warehouse Expansion", projectId: "5820661" }, { name: "Legacy Emanuel Cath Lab", projectId: "5820663" }, { name: "PRN Wellhouse", projectId: "5820664" }, { name: "Sunriver Public Safety Building", projectId: "5820668" }, { name: "Meta MOFE MTR Racks - UCO", projectId: "5820669" }, { name: "Meta MOFE MTR Racks - KND", projectId: "5820670" }, { name: "Providence POP 1 Womens Health", projectId: "5820682" }, { name: "Microsoft EAT04", projectId: "5820690" }, { name: "Legacy LEW Infrastructure Package 1", projectId: "5820705" }, { name: "T5CS - Portland IV - Phase-III", projectId: "5820707" }, { name: "Vantage WA13 Phase 4 & 5", projectId: "5820709" }, { name: "Meta MOFE MTR Racks - RIN", projectId: "5820717" }, { name: "Meta MOFE MTR Racks - RMN", projectId: "5820718" }, { name: "Hitt Project Avalon Engineering", projectId: "5820723" }, { name: "Genentech - Acid CIP 200 Tank Replacement", projectId: "5820738" }, { name: "Apple - PRZ.05 PreCon", projectId: "5820754" }, { name: "Meta DCF v2.0 MOFE Design Support", projectId: "5820777" }, { name: "WA13 Level 2 Office TI", projectId: "5820779" }, { name: "Meta MOFE MTRs - Project Cable - LVN", projectId: "5820788" }, { name: "NTT H13", projectId: "5820800" }, { name: "MSFT PHX 73", projectId: "52.60." }, { name: "Overhead", projectId: "58.30." }, { name: "Pipe/Plumbing", projectId: "58.40." }, { name: "Detailing OH", projectId: "58.60." }, { name: "UCSF Benioff MRI Replacement", projectId: "5622373" }
];

const skillsList = { modelKnowledge: "Model Knowledge", bimKnowledge: "BIM Knowledge", leadership: "Leadership Skills", mechanical: "Mechanical Abilities", teamwork: "Teamwork Ability" };
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

let db, auth;
try {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
        throw new Error("Firebase config is not set. Please update App.js with your Firebase project credentials.");
    }
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

// --- React Components (all in one file) ---

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

// ... other components would go here ...
// This space is intentionally left blank for brevity
// The full application code contains all components in one file.

export default function App() {
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [firebaseError, setFirebaseError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [detailers, setDetailers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDetailerForModal, setSelectedDetailerForModal] = useState(null);
    const [viewMode, setViewMode] = useState('detailer'); 
    const [detailerSortOrder, setDetailerSortOrder] = useState('firstName');

    useEffect(() => {
        try {
             if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
                throw new Error("Firebase config is not set. Please update App.js with your Firebase project credentials.");
            }
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authInstance = getAuth(app);
            setDb(firestore);
            
            onAuthStateChanged(authInstance, (user) => {
                if(user) {
                    setIsAuthReady(true);
                } else {
                    signInAnonymously(authInstance).catch((error) => {
                        console.error("Anonymous sign-in failed:", error);
                        setFirebaseError(error.message);
                    });
                }
            });
        } catch (e) {
            console.error(e);
            setFirebaseError(e.message);
        }
    }, []);
    
    const initializeData = useCallback(async () => {
        if (!db || !isAuthReady) return; setIsLoading(true);
        try {
             const collectionsToSeed = {
                detailers: initialDetailersData,
                projects: initialProjectsData,
            };

            for (const [collName, data] of Object.entries(collectionsToSeed)) {
                const collRef = collection(db, `artifacts/${appId}/public/data/${collName}`);
                const snapshot = await getDocs(query(collRef));
                if (snapshot.empty) {
                    console.log(`Seeding ${collName}...`);
                    const batch = writeBatch(db);
                    data.forEach(item => {
                        const newDocRef = doc(collRef);
                        batch.set(newDocRef, item);
                    });
                    await batch.commit();
                }
            }
        } catch (error) {
            console.error("Error initializing data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [db, isAuthReady]);

    useEffect(() => {
        if(isAuthReady) {
            initializeData();
        }
    }, [isAuthReady, initializeData]);
    
    useEffect(() => {
        if (isLoading || !db) return;
        const unsubs = ['detailers', 'projects', 'assignments'].map(name => 
            onSnapshot(query(collection(db, `artifacts/${appId}/public/data/${name}`)), snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if(name === 'detailers') setDetailers(data);
                else if (name === 'projects') setProjects(data);
                else setAssignments(data);
            }, error => console.error(`Error fetching ${name}:`, error))
        );
        return () => unsubs.forEach(unsub => unsub());
    }, [isLoading, db]);
    
    const handleAssignmentChange = useCallback(async (assignmentId, field, value) => { await updateDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignmentId), { [field]: value }); }, [db]);
    const handleAddAssignment = useCallback(async (employeeId) => { const today = new Date(); const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7); await addDoc(collection(db, `artifacts/${appId}/public/data/assignments`), { employeeId, projectId: '', trades: [], startDate: formatDate(today), endDate: formatDate(nextWeek) }); }, [db]);
    const handleRemoveAssignment = useCallback(async (assignmentId) => { await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignmentId)); }, [db]);
    const handleSaveSkills = useCallback(async (detailerId, newSkills) => { await updateDoc(doc(db, `artifacts/${appId}/public/data/detailers`, detailerId), { skills: newSkills }); }, [db]);
    const handleAddDetailer = useCallback(async (name, employeeId) => { await addDoc(collection(db, `artifacts/${appId}/public/data/detailers`), { name, employeeId, skills: { modelKnowledge: 0, bimKnowledge: 0, leadership: 0, mechanical: 0, teamwork: 0 }, disciplines: [] }); }, [db]);
    const handleRemoveDetailer = useCallback(async (detailerId) => { await deleteDoc(doc(db, `artifacts/${appId}/public/data/detailers`, detailerId)); }, [db]);
    const handleAddProject = useCallback(async (name, projectId) => { await addDoc(collection(db, `artifacts/${appId}/public/data/projects`), { name, projectId }); }, [db]);
    const handleRemoveProject = useCallback(async (projectId) => { await deleteDoc(doc(db, `artifacts/${appId}/public/data/projects`, projectId)); }, [db]);
    const handleUpdateDetailer = useCallback(async (detailerId, data) => { await updateDoc(doc(db, `artifacts/${appId}/public/data/detailers`, detailerId), data); }, [db]);
    
    const handleAddTrade = useCallback(async (assignmentId) => {
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, assignmentId);
        const assignmentDoc = await getDoc(assignmentRef);
        if (assignmentDoc.exists()) {
            const currentTrades = assignmentDoc.data().trades || [];
            const newTrade = { id: crypto.randomUUID(), discipline: '', subDiscipline: '', percentage: 0 };
            await updateDoc(assignmentRef, { trades: [...currentTrades, newTrade] });
        }
    }, [db]);

    const handleRemoveTrade = useCallback(async (assignmentId, tradeId) => {
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, assignmentId);
        const assignmentDoc = await getDoc(assignmentRef);
        if (assignmentDoc.exists()) {
            const currentTrades = assignmentDoc.data().trades || [];
            const updatedTrades = currentTrades.filter(t => t.id !== tradeId);
            await updateDoc(assignmentRef, { trades: updatedTrades });
        }
    }, [db]);

    const handleTradeChange = useCallback(async (assignmentId, tradeId, field, value) => {
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, assignmentId);
        const assignmentDoc = await getDoc(assignmentRef);
        if (assignmentDoc.exists()) {
            const currentTrades = assignmentDoc.data().trades || [];
            const updatedTrades = currentTrades.map(t => t.id === tradeId ? { ...t, [field]: value } : t);
            await updateDoc(assignmentRef, { trades: updatedTrades });
        }
    }, [db]);
    
    const changeWeek = (offset) => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + offset * 7); return d; });
    const sortedDetailers = useMemo(() => {
        const getLastName = (name) => { const parts = name.split(' '); return parts.length > 1 ? parts[parts.length - 1] : name; };
        return [...detailers].sort((a, b) => {
            if (detailerSortOrder === 'lastName') return getLastName(a.name).localeCompare(getLastName(b.name));
            return a.name.localeCompare(b.name);
        });
    }, [detailers, detailerSortOrder]);

    if (firebaseError) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 p-4">
                <div className="max-w-2xl text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl border border-red-200 dark:border-red-700">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">Firebase Configuration Error</h2>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">{firebaseError}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Please open the `App.js` file and replace the placeholder `firebaseConfig` object with your actual project credentials from the Firebase console.</p>
                </div>
            </div>
        );
    }

    if (isLoading) { return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="text-center"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500 mx-auto"></div><p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading Tracker...</p></div></div>; }

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                {selectedDetailer && <SkillsModal detailer={selectedDetailer} projects={projects} assignments={assignments} onClose={() => setSelectedDetailer(null)} onSaveSkills={handleSaveSkills} />}
                <header className="mb-6"><h1 className="text-3xl font-bold text-gray-800 dark:text-white">Productivity Tracker</h1><p className="text-gray-600 dark:text-gray-400">Manage detailer skills and project allocations.</p></header>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => changeWeek(-1)} className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"><ChevronLeft size={20} className="text-gray-700 dark:text-gray-300"/></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">Today</button>
                        <span className="font-medium text-center text-gray-800 dark:text-gray-200 w-48">{getStartOfWeek(currentDate).toLocaleDateString()} - {new Date(new Date(getStartOfWeek(currentDate)).setDate(getStartOfWeek(currentDate).getDate() + 6)).toLocaleDateString()}</span>
                        <button onClick={() => changeWeek(1)} className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"><ChevronRight size={20} className="text-gray-700 dark:text-gray-300"/></button>
                    </div>
                    <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                        <button onClick={() => setViewMode('detailer')} className={`px-3 py-1 text-sm font-medium rounded-md flex items-center ${viewMode === 'detailer' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-600 dark:text-gray-300'}`}><Users size={16} className="mr-2"/>Detailer</button>
                        <button onClick={() => setViewMode('project')} className={`px-3 py-1 text-sm font-medium rounded-md flex items-center ${viewMode === 'project' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-600 dark:text-gray-300'}`}><Briefcase size={16} className="mr-2"/>Project</button>
                        <button onClick={() => setViewMode('workloader')} className={`px-3 py-1 text-sm font-medium rounded-md flex items-center ${viewMode === 'workloader' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-600 dark:text-gray-300'}`}><BarChartHorizontal size={16} className="mr-2"/>Workloader</button>
                        <button onClick={() => setViewMode('edit')} className={`px-3 py-1 text-sm font-medium rounded-md flex items-center ${viewMode === 'edit' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-600 dark:text-gray-300'}`}><FilePenLine size={16} className="mr-2"/>Edit</button>
                        <button onClick={() => setViewMode('management')} className={`px-3 py-1 text-sm font-medium rounded-md flex items-center ${viewMode === 'management' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-600 dark:text-gray-300'}`}><Settings size={16} className="mr-2"/>Manage</button>
                    </div>
                </div>

                {viewMode === 'detailer' ? (<><div className="flex justify-end items-center mb-4"><span className="text-sm font-medium mr-2 text-gray-700 dark:text-gray-300">Sort by:</span><div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1"><button onClick={() => setDetailerSortOrder('firstName')} className={`px-3 py-1 text-sm font-medium rounded-md ${detailerSortOrder === 'firstName' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>First Name</button><button onClick={() => setDetailerSortOrder('lastName')} className={`px-3 py-1 text-sm font-medium rounded-md ${detailerSortOrder === 'lastName' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>Last Name</button></div></div><div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"><thead className="bg-gray-50 dark:bg-gray-700"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/4">Detailer</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/2">Project Assignments</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/4">Total Time</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{sortedDetailers.map(detailer => (<AllocationRow key={detailer.id} detailer={detailer} projects={projects} assignments={assignments} onAssignmentChange={handleAssignmentChange} onAddAssignment={handleAddAssignment} onRemoveAssignment={handleRemoveAssignment} onShowSkills={setSelectedDetailer} onAddTrade={handleAddTrade} onRemoveTrade={handleRemoveTrade} onTradeChange={handleTradeChange} />))}</tbody></table></div></>) 
                : viewMode === 'project' ? (<ProjectView projects={projects} detailers={detailers} assignments={assignments} currentDate={currentDate} formatDate={formatDate} isDateBetween={isDateBetween} />) 
                : viewMode === 'management' ? (<ManagementView detailers={detailers} projects={projects} onAddDetailer={handleAddDetailer} onRemoveDetailer={handleRemoveDetailer} onAddProject={handleAddProject} onRemoveProject={handleRemoveProject} />)
                : viewMode === 'edit' ? (<EditEmployeeView detailers={detailers} onUpdateDetailer={handleUpdateDetailer} />)
                : (<WorkloaderView projects={projects} detailers={detailers} assignments={assignments} currentDate={currentDate} getStartOfWeek={getStartOfWeek} isDateBetween={isDateBetween} formatDate={formatDate} />)}

                <footer className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400"><p>Productivity Tracker App</p></footer>
            </div>
        </div>
    );
}
