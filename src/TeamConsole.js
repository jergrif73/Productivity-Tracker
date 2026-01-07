import React, { useState, useMemo, useEffect, useContext } from 'react';
// --- FIX: Add missing Firestore imports ---
import { collection, doc, addDoc, setDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
// --- END FIX ---
import { motion, AnimatePresence } from 'framer-motion';
import { NavigationContext } from './App'; // Import the new context
import { TutorialHighlight } from './App'; // Import TutorialHighlight

// Add CSS for the hide-scrollbar-on-hover functionality
// ... (scrollbarStyles and injection remain the same) ...
const scrollbarStyles = `
.hide-scrollbar-on-hover {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* Internet Explorer 10+ */
}

.hide-scrollbar-on-hover::-webkit-scrollbar {
    width: 0px;
    background: transparent; /* Chrome/Safari/Webkit */
}

.hide-scrollbar-on-hover:hover {
    scrollbar-width: thin; /* Firefox */
    -ms-overflow-style: auto; /* Internet Explorer 10+ */
}

.hide-scrollbar-on-hover:hover::-webkit-scrollbar {
    width: 8px;
}

.hide-scrollbar-on-hover:hover::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
}

.hide-scrollbar-on-hover:hover::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    transition: background 0.3s ease;
}

.hide-scrollbar-on-hover:hover::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
}
`;

// Inject the styles into the document head
if (typeof document !== 'undefined' && !document.getElementById('scrollbar-styles')) {
    const style = document.createElement('style');
    style.id = 'scrollbar-styles';
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);
}

// Helper function to convert legacy trade names to abbreviations
const getTradeDisplayName = (trade) => {
    const displayMap = {
        'BIM': 'VDC',
        'Piping': 'MP',
        'Duct': 'MH',
        'Plumbing': 'PL',
        'Coordination': 'Coord',
        'Management': 'MGMT',
        'Structural': 'ST',
        'Fire Protection': 'FP',
        'Process Piping': 'PP',
        'Medical Gas': 'PJ',
    };
    return displayMap[trade] || trade;
};


// --- Helper Components ---
// ... (NewProjectModal, ConfirmationModal) ...
const NewProjectModal = ({ db, appId, onClose, onProjectCreated, currentTheme }) => {
    const [newProject, setNewProject] = useState({ name: '', projectId: '' });
    const [error, setError] = useState('');

    const handleAddProject = async () => {
        if (!newProject.name || !newProject.projectId) {
            setError('Please fill out both Project Name and Project ID.');
            return;
        }
        setError('');
        try {
            const projectsRef = collection(db, `artifacts/${appId}/public/data/projects`);
            const docRef = await addDoc(projectsRef, {
                ...newProject,
                initialBudget: 0,
                blendedRate: 0,
                vdcBlendedRate: 0,
                contingency: 0,
                dashboardUrl: '',
                status: 'Planning',
                archived: false
            });
            
            // Initialize projectActivities with standard activities
            const standardChargeCodes = [
                { description: "MH  Modeling / Coordinating", chargeCode: "9615161" },
                { description: "MH Spooling", chargeCode: "9615261" },
                { description: "MH Deliverables", chargeCode: "9615361" },
                { description: "MH Internal Changes", chargeCode: "9615461" },
                { description: "MH External Changes", chargeCode: "9615561" },
                { description: "MP  Modeling / Coordinating", chargeCode: "9616161" },
                { description: "MP Spooling", chargeCode: "9616261" },
                { description: "MP Deliverables", chargeCode: "9616361" },
                { description: "MP Internal Changes", chargeCode: "9616461" },
                { description: "MP External Changes ", chargeCode: "9616561" },
                { description: "PL Modeling / Coordinating", chargeCode: "9618161" },
                { description: "PL Spooling", chargeCode: "9618261" },
                { description: "PL Deliverables", chargeCode: "9618361" },
                { description: "PL Internal Changes", chargeCode: "9618461" },
                { description: "PL External Changes", chargeCode: "9618561" },
                { description: "Detailing Management", chargeCode: "9619161" },
                { description: "Project Content Development", chargeCode: "9619261" },
                { description: "Project Coordination Management", chargeCode: "9630762" },
                { description: "VDC Support", chargeCode: "9631062" }
            ];
            
            const normalizeDesc = (str = '') => String(str).replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
            
            const standardActivities = standardChargeCodes.map(item => ({
                id: `std_${item.chargeCode}_${Math.random().toString(16).slice(2)}`,
                description: normalizeDesc(item.description),
                chargeCode: item.chargeCode,
                estimatedHours: 0,
                hoursUsed: 0,
                percentComplete: 0,
                subsets: []
            }));
            
            const groupedActivities = {
                duct: standardActivities.filter(act => /^MH\s*/i.test(act.description)),
                piping: standardActivities.filter(act => /^MP\s*/i.test(act.description)),
                plumbing: standardActivities.filter(act => /^PL\s*/i.test(act.description)),
                management: standardActivities.filter(act => 
                    ['Detailing Management', 'Project Content Development', 'Project Coordination Management'].some(
                        keyword => act.description.toLowerCase().includes(keyword.toLowerCase())
                    )
                ),
                vdc: standardActivities.filter(act => act.description === 'VDC Support')
            };
            
            // VDC defaults to VDC Rate, all others to Detailing Rate
            const projectActivitiesData = {
                activities: groupedActivities,
                actionTrackerDisciplines: [
                    { key: 'duct', label: 'MH' },
                    { key: 'piping', label: 'MP' },
                    { key: 'plumbing', label: 'PL' },
                    { key: 'management', label: 'MGMT' },
                    { key: 'vdc', label: 'VDC' }
                ],
                actionTrackerData: {},
                budgetImpacts: [],
                mainItems: [],
                projectWideActivities: [],
                rateTypes: {
                    duct: 'Detailing Rate',
                    piping: 'Detailing Rate',
                    plumbing: 'Detailing Rate',
                    management: 'Detailing Rate',
                    vdc: 'VDC Rate'
                }
            };
            
            await setDoc(doc(db, `artifacts/${appId}/public/data/projectActivities`, docRef.id), projectActivitiesData);
            
            onProjectCreated({ id: docRef.id, ...newProject });
            onClose();
        } catch (err) {
            console.error("Error adding new project:", err);
            setError("Failed to add new project. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center">
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-lg shadow-2xl w-full max-w-md`}>
                <h3 className="text-lg font-bold mb-4">Add New Project</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Project Name"
                        value={newProject.name}
                        onChange={(e) => setNewProject(p => ({ ...p, name: e.target.value }))}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                    <input
                        type="text"
                        placeholder="Project ID"
                        value={newProject.projectId}
                        onChange={(e) => setNewProject(p => ({ ...p, projectId: e.target.value }))}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className={`px-4 py-2 rounded-md ${currentTheme.buttonBg} hover:bg-opacity-80`}>Cancel</button>
                    <button onClick={handleAddProject} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Create Project</button>
                </div>
            </div>
        </div>
    );
};

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


// --- REVERTED InlineAssignmentEditor to pass original assignment prop on delete ---
const InlineAssignmentEditor = ({ db, assignment, projects, detailerDisciplines, onSave, onDelete, currentTheme, onAddNewProject, accessLevel }) => {
    const [editableAssignment, setEditableAssignment] = useState({ ...assignment });

    // Update local state if the assignment prop changes
    useEffect(() => {
        setEditableAssignment({...assignment});
    }, [assignment]);


    const sortedProjects = useMemo(() => {
        return [...projects].filter(p => !p.archived).sort((a, b) => a.name.localeCompare(b.name));
    }, [projects]);

    const handleSave = async () => {
        const updatedAssignment = {
            ...editableAssignment,
            allocation: Number(editableAssignment.allocation) || 0
        };
        onSave(updatedAssignment);
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setEditableAssignment(prev => ({ ...prev, [name]: value }));
    };

    const handleProjectChange = (e) => {
        const projectId = e.target.value;
        const selectedProject = projects.find(p => p.id === projectId);
        setEditableAssignment(prev => ({
            ...prev,
            projectId: projectId,
            projectName: selectedProject ? selectedProject.name : '',
            projectNumber: selectedProject ? selectedProject.projectId : ''
        }));
    };

    const handleTradeChange = (e) => {
        setEditableAssignment(prev => ({ ...prev, trade: e.target.value }));
    };

    const handleAllocationChange = (e) => {
        setEditableAssignment(prev => ({ ...prev, allocation: e.target.value }));
    };

    // --- REVERTED: Pass the assignment object from props on delete ---
    const triggerDelete = () => {
        onDelete(assignment); // Pass the original assignment object from props
    };
    // --- END REVERT ---

    return (
        <div className={`p-4 rounded-md ${currentTheme.altRowBg} space-y-3`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* ... Input fields remain the same ... */}
                 <div>
                    <label className={`block text-sm font-medium mb-1 ${currentTheme.subtleText}`}>Project</label>
                    <div className="flex items-center gap-2">
                        <select
                            value={editableAssignment.projectId || ''}
                            onChange={handleProjectChange}
                            className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                        >
                            <option value="">Select Project</option>
                            {sortedProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.projectId})</option>
                            ))}
                        </select>
                        {(accessLevel === 'taskmaster' || accessLevel === 'tcl') && (
                             <button
                                onClick={() => onAddNewProject(editableAssignment)}
                                className={`p-2 rounded-md ${currentTheme.buttonBg} hover:bg-opacity-80 flex-shrink-0`}
                                type="button"
                                title="Add New Project"
                            >
                                +
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${currentTheme.subtleText}`}>Trade</label>
                    <select
                        value={editableAssignment.trade || ''}
                        onChange={handleTradeChange}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    >
                        <option value="">Select Trade</option>
                        {detailerDisciplines.map(discipline => (
                            <option key={discipline} value={discipline}>{getTradeDisplayName(discipline)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${currentTheme.subtleText}`}>Start Date</label>
                    <input
                        type="date"
                        name="startDate"
                        value={editableAssignment.startDate || ''}
                        onChange={handleDateChange}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${currentTheme.subtleText}`}>End Date</label>
                    <input
                        type="date"
                        name="endDate"
                        value={editableAssignment.endDate || ''}
                        onChange={handleDateChange}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${currentTheme.subtleText}`}>Allocation (%)</label>
                    <input
                        type="number"
                        name="allocation"
                        value={editableAssignment.allocation || ''}
                        onChange={handleAllocationChange}
                        min="0"
                        // Allow over-allocation, remove max
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={handleSave} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">Save</button>
                {/* UPDATED: Call triggerDelete */}
                <button onClick={triggerDelete} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Delete</button>
            </div>
        </div>
    );
};
// --- END UPDATE ---


// --- EmployeeDetailPanel ---
const EmployeeDetailPanel = ({ employee, assignmentsProp, projects, handleAddNewAssignment, setAssignmentToDelete, handleSaveAssignment, handleDeleteAssignment, currentTheme, db, accessLevel, setViewingSkillsFor, onAddNewProjectForAssignment, expandedAssignmentId, setExpandedAssignmentId }) => {

    const { navigateToWorkloaderForEmployee } = useContext(NavigationContext);

    const handleGoToEmployeeWorkloader = (e, employeeId) => {
        e.stopPropagation();
        if (accessLevel === 'taskmaster' || accessLevel === 'tcl') {
            navigateToWorkloaderForEmployee(employeeId);
        }
    };

    const toggleAssignmentExpansion = (assignmentId) => {
        setExpandedAssignmentId(prevId => (prevId === assignmentId ? null : assignmentId));
    };

    const animationVariants = {
        hidden: { opacity: 0, height: 0 },
        visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: "easeInOut" } },
        exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeInOut" } }
    };

    // Split assignments into active and archived based on end date
    const { activeAssignments, archivedAssignments } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const active = [];
        const archived = [];
        
        (assignmentsProp || []).forEach(asn => {
            if (asn.endDate) {
                const endDate = new Date(asn.endDate);
                endDate.setHours(0, 0, 0, 0);
                if (endDate < today) {
                    archived.push(asn);
                } else {
                    active.push(asn);
                }
            } else {
                // No end date means it's active
                active.push(asn);
            }
        });
        
        // Sort archived by end date descending (most recent first)
        archived.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        
        return { activeAssignments: active, archivedAssignments: archived };
    }, [assignmentsProp]);
    
    const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

    // Helper to render an assignment card
    const renderAssignmentCard = (asn) => {
        const isExpanded = expandedAssignmentId === asn.id;
        const detailerDisciplines = Array.isArray(employee.disciplineSkillsets)
            ? employee.disciplineSkillsets.map(s => s.name)
            : Object.keys(employee.disciplineSkillsets || {});

        return (
            <motion.div
                key={asn.id}
                layout
                initial={false}
                animate={{ backgroundColor: isExpanded ? currentTheme.altRowBg : currentTheme.cardBg }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className={`p-3 rounded-lg border ${currentTheme.borderColor} shadow-sm cursor-pointer`}
            >
                <motion.div layout="position" className="flex justify-between items-center" onClick={() => toggleAssignmentExpansion(asn.id)}>
                    <div>
                        <p className="font-semibold">
                            {asn.projectName || 'No Project Selected'}
                            {asn.projectNumber ? ` (${asn.projectNumber})` : ''}
                        </p>
                        <p className={`text-sm ${currentTheme.subtleText}`}>Trade: {getTradeDisplayName(asn.trade)} | Allocation: {asn.allocation}%</p>
                        <p className={`text-xs ${currentTheme.subtleText}`}>{asn.startDate} to {asn.endDate}</p>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                        </svg>
                    </motion.div>
                </motion.div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            key={`detail-${asn.id}`}
                            variants={animationVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="overflow-hidden mt-3"
                            onClick={e => e.stopPropagation()}
                        >
                            <TutorialHighlight tutorialKey="manageAssignments">
                                <InlineAssignmentEditor
                                    db={db}
                                    assignment={asn}
                                    projects={projects}
                                    detailerDisciplines={detailerDisciplines}
                                    onSave={handleSaveAssignment}
                                    onDelete={(assignmentObject) => {
                                        setAssignmentToDelete(assignmentObject);
                                        setExpandedAssignmentId(null);
                                    }}
                                    currentTheme={currentTheme}
                                    onAddNewProject={onAddNewProjectForAssignment}
                                    accessLevel={accessLevel}
                                />
                            </TutorialHighlight>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    return (
        <div className={`rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} flex flex-col h-full`}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-xl font-bold">{employee.firstName} {employee.lastName}'s Assignments</h3>
                <div className="flex items-center gap-2">
                    {(accessLevel === 'taskmaster' || accessLevel === 'tcl') && (
                        <button onClick={() => handleAddNewAssignment(employee.id)} className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md">+ Add Assignment</button>
                    )}
                    {(accessLevel === 'taskmaster' || accessLevel === 'tcl') && (
                        <TutorialHighlight tutorialKey="goToEmployeeAssignments">
                            <button
                                onClick={(e) => handleGoToEmployeeWorkloader(e, employee.id)}
                                className={`px-3 py-1 text-sm rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-80 transition-colors`}
                            >
                                Employee Workloader
                            </button>
                        </TutorialHighlight>
                    )}
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto hide-scrollbar-on-hover">
                {/* Active Assignments */}
                <div className="space-y-3">
                    {activeAssignments.length > 0 ? (
                        activeAssignments.map(asn => renderAssignmentCard(asn))
                    ) : (
                        <p className={currentTheme.subtleText}>No active assignments for this employee.</p>
                    )}
                </div>
                
                {/* Archived Assignments Section */}
                {archivedAssignments.length > 0 && (
                    <div className="mt-6">
                        <button
                            onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg ${currentTheme.altRowBg} border ${currentTheme.borderColor} hover:bg-opacity-80 transition-colors`}
                        >
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                <span className="font-semibold">Archive</span>
                                <span className={`text-sm ${currentTheme.subtleText}`}>({archivedAssignments.length} past assignment{archivedAssignments.length !== 1 ? 's' : ''})</span>
                            </div>
                            <motion.div animate={{ rotate: isArchiveExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </motion.div>
                        </button>
                        
                        <AnimatePresence>
                            {isArchiveExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-3 mt-3 pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                                        {archivedAssignments.map(asn => renderAssignmentCard(asn))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};
// --- END UPDATE ---


const TeamConsole = ({ db, detailers, projects, assignments, currentTheme, appId, showToast, setViewingSkillsFor, initialSelectedEmployeeInTeamConsole, setInitialSelectedEmployeeInTeamConsole, accessLevel, setInitialSelectedEmployeeInWorkloader }) => {
    // ... (State variables remain the same) ...
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [viewMode, setViewMode] = useState('condensed');
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [assignmentToDelete, setAssignmentToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [allTrades, setAllTrades] = useState([]);
    const [activeTrades, setActiveTrades] = useState([]);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [assignmentForNewProject, setAssignmentForNewProject] = useState(null);
    const [expandedAssignmentId, setExpandedAssignmentId] = useState(null);

    // ... (useEffect hooks remain the same) ...
     useEffect(() => {
        const handleClose = () => {
            setIsNewProjectModalOpen(false);
            setEmployeeToDelete(null);
            setAssignmentToDelete(null);
        };
        window.addEventListener('close-overlays', handleClose);
        return () => window.removeEventListener('close-overlays', handleClose);
    }, []);

    useEffect(() => {
        if (initialSelectedEmployeeInTeamConsole && detailers.length > 0) {
            const employeeExists = detailers.some(d => d.id === initialSelectedEmployeeInTeamConsole);
            if (employeeExists) {
                setSelectedEmployeeId(initialSelectedEmployeeInTeamConsole);
                setInitialSelectedEmployeeInTeamConsole(null);
            } else {
                setInitialSelectedEmployeeInTeamConsole(null);
            }
        }
    }, [initialSelectedEmployeeInTeamConsole, detailers, setInitialSelectedEmployeeInTeamConsole]);

    useEffect(() => {
        const trades = new Set();
        detailers.forEach(d => {
            const skills = d.disciplineSkillsets;
            let mainTrade = 'Uncategorized';
            if (Array.isArray(skills) && skills.length > 0) {
                mainTrade = skills[0].name;
            } else if (skills && !Array.isArray(skills) && Object.keys(skills).length > 0) {
                 const firstKey = Object.keys(skills)[0];
                 mainTrade = firstKey || 'Uncategorized';
            }
            if (mainTrade) trades.add(mainTrade);
        });
        const tradeArray = Array.from(trades).sort();
        setAllTrades(tradeArray);
        setActiveTrades(tradeArray);
    }, [detailers]);

    // ... (Event handlers: handleTradeFilterToggle, handleSelectAllTrades, handleSelectEmployee, handleDeleteEmployee, handleSaveAssignment remain mostly the same) ...
     const handleTradeFilterToggle = (tradeToToggle) => {
        setActiveTrades(prev => {
            const newTrades = new Set(prev);
            if (newTrades.has(tradeToToggle)) newTrades.delete(tradeToToggle);
            else newTrades.add(tradeToToggle);
            return Array.from(newTrades);
        });
    };

    const handleSelectAllTrades = () => {
        setActiveTrades(prev => prev.length === allTrades.length ? [] : allTrades);
    };

    const handleSelectEmployee = (employeeId) => {
        setSelectedEmployeeId(prevId => {
            const newId = prevId === employeeId ? null : employeeId;
            if (prevId !== newId) setExpandedAssignmentId(null);
            return newId;
        });
    };

    const handleDeleteEmployee = async (id) => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/detailers`, id));
            const assignmentsRef = collection(db, `artifacts/${appId}/public/data/assignments`);
            const q = query(assignmentsRef, where("detailerId", "==", id));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            setEmployeeToDelete(null);
            if (selectedEmployeeId === id) setSelectedEmployeeId(null);
            showToast("Employee deleted.", "success");
        } catch (error) {
            console.error("Error deleting employee:", error);
            showToast("Failed to delete employee.", "error");
        }
    };

    const handleSaveAssignment = async (assignmentData) => {
        try {
            if (!assignmentData.projectId || !assignmentData.trade || !assignmentData.startDate || !assignmentData.endDate || assignmentData.allocation === undefined) {
                 showToast("Please fill all required fields.", "error");
                 return;
            }
            const { isPlaceholder, ...dataToSave } = assignmentData;
            await setDoc(doc(db, `artifacts/${appId}/public/data/assignments`, dataToSave.id), dataToSave, { merge: true });
            setExpandedAssignmentId(null);
            showToast("Assignment saved.", "success");
        } catch (error) {
            console.error("Error saving assignment:", error);
            showToast("Error saving assignment.", "error");
        }
    };

    // --- REVERTED handleDeleteAssignment ---
    // Now accepts assignmentId as argument
    const handleDeleteAssignment = async (assignmentId) => {
        console.log("handleDeleteAssignment called with ID:", assignmentId); // Log entry
        if (!assignmentId || typeof assignmentId !== 'string') {
            console.error("Invalid assignment ID received for deletion:", assignmentId);
            showToast("Cannot delete: Invalid assignment ID.", "error");
            setAssignmentToDelete(null); // Clear confirmation state
            return;
        }

        // Removed the placeholder check as it shouldn't be needed if the ID passed is correct
        console.log("Attempting Firestore delete for:", assignmentId); // Log before Firestore call
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignmentId));
            console.log("Firestore delete successful for:", assignmentId); // Log success
            showToast("Assignment deleted.", "success");
        } catch (error) {
            console.error("Error deleting from Firestore:", assignmentId, error); // Log the error
            showToast("Failed to delete assignment.", "error");
        } finally {
            // Always clear state regardless of success/failure
            setAssignmentToDelete(null);
            setExpandedAssignmentId(null);
        }
    };
    // --- END REVERT ---

    const handleAddNewAssignment = async (detailerId) => {
        const existingNew = assignments.find(a =>
             a.detailerId === detailerId &&
             (!a.projectId || !a.trade || a.allocation === 0)
        );
        // --- FIX: Check against the actual ID used for expansion ---
        if (existingNew && expandedAssignmentId === existingNew.id) {
            showToast("Please save or delete the current new assignment first.", "info");
            return;
        }
        // --- END FIX ---
        const newAssignmentData = {
            detailerId, projectId: '', trade: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            allocation: 0, status: 'active'
        };
        try {
            const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/assignments`), newAssignmentData);
            console.log("Added assignment placeholder:", docRef.id);
            setExpandedAssignmentId(docRef.id);
            showToast("New row added. Fill details & save.", "info");
        } catch (error) {
             console.error("Error adding placeholder:", error);
             showToast("Could not add assignment.", "error");
        }
    };

    const handleOpenNewProjectModal = (assignment) => {
        setAssignmentForNewProject(assignment);
        setIsNewProjectModalOpen(true);
    };

    const handleProjectCreated = async (newProject) => {
        if (assignmentForNewProject) {
            const updatedAssignment = {
                ...assignmentForNewProject,
                projectId: newProject.id,
                projectName: newProject.name,
                projectNumber: newProject.projectId
            };
            try {
                const { isPlaceholder, ...dataToSave } = updatedAssignment;
                await handleSaveAssignment(dataToSave);
                if (expandedAssignmentId === assignmentForNewProject.id) {
                     // The useEffect in InlineAssignmentEditor should handle this
                }
            } catch (error) {
                 console.error("Error updating assignment after project creation:", error);
                 showToast("Failed to link project.", "error");
            }
            setAssignmentForNewProject(null);
        }
    };


    // ... (groupedEmployees, selectedEmployeeData, selectedEmployeeAssignments memos remain the same) ...
    const groupedEmployees = useMemo(() => {
        const processed = detailers
            .map(employee => {
                const employeeAssignments = assignments
                    .filter(a => a.detailerId === employee.id)
                    .map(a => {
                        const project = projects.find(p => p.id === a.projectId);
                        return { ...a, isArchivedProject: project ? project.archived : false };
                    });
                let currentWeekAllocation = 0;
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                employeeAssignments.forEach(ass => {
                    if (ass.isArchivedProject) return;
                    const assignStartStr = ass.startDate;
                    const assignEndStr = ass.endDate;
                    if (typeof assignStartStr !== 'string' || !assignStartStr.match(/^\d{4}-\d{2}-\d{2}$/) ||
                        typeof assignEndStr !== 'string' || !assignEndStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                         return;
                    }
                    const assignStart = new Date(assignStartStr);
                    const assignEnd = new Date(assignEndStr);
                    if (isNaN(assignStart.getTime()) || isNaN(assignEnd.getTime())) return;
                    assignStart.setHours(0, 0, 0, 0);
                    assignEnd.setHours(23, 59, 59, 999);
                    if (assignStart <= endOfWeek && assignEnd >= startOfWeek) {
                        currentWeekAllocation += Number(ass.allocation) || 0;
                    }
                });
                const skills = employee.disciplineSkillsets;
                let mainTrade = 'Uncategorized';
                if (Array.isArray(skills) && skills.length > 0) mainTrade = skills[0].name;
                else if (skills && !Array.isArray(skills) && Object.keys(skills).length > 0) {
                     const firstKey = Object.keys(skills)[0];
                     mainTrade = firstKey || 'Uncategorized';
                }
                return { ...employee, currentWeekAllocation, mainTrade };
            })
            .filter(employee => {
                const lower = searchTerm.toLowerCase();
                return (employee.firstName.toLowerCase().includes(lower) ||
                        employee.lastName.toLowerCase().includes(lower)) &&
                       activeTrades.includes(employee.mainTrade);
            })
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
        return processed.reduce((acc, employee) => {
            if (!acc[employee.mainTrade]) acc[employee.mainTrade] = [];
            acc[employee.mainTrade].push(employee);
            return acc;
        }, {});
    }, [detailers, assignments, searchTerm, activeTrades, projects]);

    const selectedEmployeeData = useMemo(() => {
        return detailers.find(e => e.id === selectedEmployeeId);
    }, [selectedEmployeeId, detailers]);

    const selectedEmployeeAssignments = useMemo(() => {
        if (!selectedEmployeeId) return [];
        const firestoreAssignments = assignments.filter(a => a.detailerId === selectedEmployeeId);
        const activeAssignments = firestoreAssignments.filter(asn => {
            const project = projects.find(p => p.id === asn.projectId);
            const startDateValid = asn.startDate && typeof asn.startDate === 'string' && asn.startDate.match(/^\d{4}-\d{2}-\d{2}$/) && !isNaN(new Date(asn.startDate).getTime());
            return (!asn.projectId || (project && !project.archived)) && startDateValid;
        });
        return activeAssignments
            .map(a => {
                const project = projects.find(p => p.id === a.projectId);
                return { ...a,
                    projectName: project ? project.name : (a.projectName || 'No Project Selected'),
                    projectNumber: project ? project.projectId : (a.projectNumber || '')
                };
            })
             // --- REVERTED filter here, moved date validation above ---
            .sort((a, b) => {
                 const aIsNew = !a.projectId || !a.trade || a.allocation === undefined || a.allocation === 0;
                 const bIsNew = !b.projectId || !b.trade || b.allocation === undefined || b.allocation === 0;
                 if (aIsNew && !bIsNew) return -1;
                 if (!aIsNew && bIsNew) return 1;
                return new Date(a.startDate) - new Date(b.startDate);
            });
    }, [selectedEmployeeId, assignments, projects]);


    return (
        <TutorialHighlight tutorialKey="detailers">
            <div className="absolute inset-0 flex flex-col">
                {/* Modals */}
                {isNewProjectModalOpen && (
                    <NewProjectModal
                        db={db}
                        appId={appId}
                        onClose={() => setIsNewProjectModalOpen(false)}
                        onProjectCreated={handleProjectCreated}
                        currentTheme={currentTheme}
                    />
                )}

                {/* Top Controls - Fixed Header */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                     <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                        <TutorialHighlight tutorialKey="viewToggle">
                            <div className={`flex items-center gap-1 p-1 rounded-lg ${currentTheme.altRowBg}`}>
                                <button onClick={() => setViewMode('condensed')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'condensed' ? `${currentTheme.cardBg} shadow` : ''}`}>Condensed</button>
                                <button onClick={() => setViewMode('detailed')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'detailed' ? `${currentTheme.cardBg} shadow` : ''}`}>Detailed</button>
                            </div>
                        </TutorialHighlight>
                        <TutorialHighlight tutorialKey="searchAndFilter">
                            <div className="flex items-center gap-2 flex-wrap">
                                {allTrades.map(trade => (
                                    <button
                                        key={trade}
                                        onClick={() => handleTradeFilterToggle(trade)}
                                        className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTrades.includes(trade) ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                    >
                                        {getTradeDisplayName(trade)}
                                    </button>
                                ))}
                                <button
                                    onClick={handleSelectAllTrades}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTrades.length === allTrades.length ? 'bg-green-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                >
                                    {activeTrades.length === allTrades.length ? 'None' : 'All'}
                                </button>
                            </div>
                        </TutorialHighlight>
                    </div>
                </div>

                {/* Confirmation Modals */}
                {employeeToDelete && (
                    <ConfirmationModal
                        isOpen={!!employeeToDelete}
                        onClose={() => setEmployeeToDelete(null)}
                        onConfirm={() => handleDeleteEmployee(employeeToDelete.id)}
                        title="Confirm Employee Deletion"
                        currentTheme={currentTheme}
                    >
                        Are you sure you want to delete {employeeToDelete.firstName} {employeeToDelete.lastName}? This will also delete all their assignments.
                    </ConfirmationModal>
                )}

                {/* --- UPDATED ConfirmationModal onConfirm --- */}
                {assignmentToDelete && (
                    <ConfirmationModal
                        isOpen={!!assignmentToDelete}
                        onClose={() => setAssignmentToDelete(null)}
                        onConfirm={() => handleDeleteAssignment(assignmentToDelete.id)} // Pass ID from state
                        title="Confirm Assignment Deletion"
                        currentTheme={currentTheme}
                    >
                        Are you sure you want to delete the assignment for {assignmentToDelete.projectName || 'this assignment'} ({getTradeDisplayName(assignmentToDelete.trade) || 'No Trade'})?
                    </ConfirmationModal>
                )}
                 {/* --- END UPDATE --- */}


                {/* Main Content Area - Two Column Layout */}
                <div className="flex-1 flex gap-4 p-4 min-h-0">
                    {/* Left Column - Employee List with Independent Scrolling */}
                    <div className="w-1/3 flex flex-col min-h-0">
                        <TutorialHighlight tutorialKey="searchAndFilter">
                            <div className="mb-4 flex-shrink-0">
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                />
                            </div>
                        </TutorialHighlight>

                        {/* Scrollable employee list */}
                        <div className="flex-1 overflow-y-auto hide-scrollbar-on-hover">
                            <div className="space-y-4">
                                {Object.keys(groupedEmployees).sort().map(trade => (
                                    <div key={trade}>
                                        <h3 className={`text-sm font-bold uppercase ${currentTheme.subtleText} mb-2 pl-1 sticky top-0 ${currentTheme.cardBg} py-1 z-10`}>{getTradeDisplayName(trade)}</h3>
                                        <div className="space-y-2">
                                            {groupedEmployees[trade].map((employee) => {
                                                const isSelected = selectedEmployeeId === employee.id;
                                                const allocationColor = employee.currentWeekAllocation > 100 ? 'text-red-500' : (employee.currentWeekAllocation < 80 ? 'text-yellow-500' : 'text-green-500');

                                                return (
                                                    <TutorialHighlight key={employee.id} tutorialKey="selectEmployee">
                                                        <div
                                                            onClick={() => handleSelectEmployee(employee.id)}
                                                            className={`p-3 rounded-lg border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : currentTheme.borderColor} ${currentTheme.cardBg} shadow-sm cursor-pointer transition-all duration-200`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="font-semibold truncate">{employee.firstName} {employee.lastName}</h3>
                                                                    {viewMode === 'detailed' && (
                                                                        <>
                                                                            <p className={`text-xs ${currentTheme.subtleText} truncate`}>{employee.title || 'N/A'}</p>
                                                                            <p className={`text-xs ${currentTheme.subtleText} truncate`}>{employee.email || 'No email'}</p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <TutorialHighlight tutorialKey="currentWeekAllocation">
                                                                    <span className={`text-lg font-bold ${allocationColor} ml-2 flex-shrink-0`}>{employee.currentWeekAllocation}%</span>
                                                                </TutorialHighlight>
                                                            </div>
                                                            {viewMode === 'detailed' && (
                                                                <div className="flex justify-end gap-2 mt-2 text-xs">
                                                                    <TutorialHighlight tutorialKey="setSkills">
                                                                        <button onClick={(e) => { e.stopPropagation(); setViewingSkillsFor(employee); }} className="text-blue-500 hover:underline">View Skills</button>
                                                                    </TutorialHighlight>
                                                                    {(accessLevel === 'taskmaster' || accessLevel === 'tcl') && (
                                                                        <button onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(employee); }} className="text-red-500 hover:underline">Delete</button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TutorialHighlight>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Assignment Details with Independent Scrolling */}
                    <div className="flex-1 min-h-0">
                        <AnimatePresence mode="wait">
                            {selectedEmployeeData ? ( // Use selectedEmployeeData here
                                <motion.div
                                    key={selectedEmployeeData.id} // Use stable ID
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full"
                                >
                                    <EmployeeDetailPanel
                                        employee={selectedEmployeeData} // Pass basic data
                                        assignmentsProp={selectedEmployeeAssignments} // Pass calculated assignments (renamed prop)
                                        projects={projects}
                                        handleAddNewAssignment={handleAddNewAssignment}
                                        setAssignmentToDelete={setAssignmentToDelete}
                                        handleSaveAssignment={handleSaveAssignment}
                                        handleDeleteAssignment={handleDeleteAssignment} // Pass the main delete handler
                                        currentTheme={currentTheme}
                                        db={db}
                                        accessLevel={accessLevel}
                                        setViewingSkillsFor={setViewingSkillsFor}
                                        onAddNewProjectForAssignment={handleOpenNewProjectModal}
                                        expandedAssignmentId={expandedAssignmentId}
                                        setExpandedAssignmentId={setExpandedAssignmentId}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="callout"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={`w-full h-full flex flex-col justify-center items-center p-4 rounded-lg ${currentTheme.altRowBg} border-2 border-dashed ${currentTheme.borderColor}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-4 ${currentTheme.subtleText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <h3 className="text-lg font-semibold">Project Assignments</h3>
                                    <p className={currentTheme.subtleText}>Select an employee from the list to view and manage their project assignments.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </TutorialHighlight>
    );
};

export default TeamConsole;