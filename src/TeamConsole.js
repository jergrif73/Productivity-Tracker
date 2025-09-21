import React, { useState, useMemo, useEffect, useContext } from 'react';
import { collection, doc, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { NavigationContext } from './App'; // Import the new context
import { TutorialHighlight } from './App'; // Import TutorialHighlight

// --- Helper Components ---

// New Modal for creating a project on the fly
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

const InlineAssignmentEditor = ({ db, assignment, projects, detailerDisciplines, onSave, onDelete, currentTheme, onAddNewProject, accessLevel }) => {
    const [editableAssignment, setEditableAssignment] = useState({ ...assignment });

    const sortedProjects = useMemo(() => {
        // Filter out archived projects from the dropdown list
        return [...projects].filter(p => !p.archived).sort((a, b) => a.name.localeCompare(b.name));
    }, [projects]);

    const handleSave = async () => {
        const updatedAssignment = {
            ...editableAssignment,
            allocation: Number(editableAssignment.allocation)
        };
        onSave(updatedAssignment);
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setEditableAssignment(prev => ({
            ...prev,
            [name]: value
        }));
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
        setEditableAssignment(prev => ({
            ...prev,
            trade: e.target.value
        }));
    };

    const handleAllocationChange = (e) => {
        setEditableAssignment(prev => ({
            ...prev,
            allocation: e.target.value
        }));
    };

    return (
        <div className={`p-4 rounded-md ${currentTheme.altRowBg} space-y-3`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        {accessLevel === 'taskmaster' && (
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
                            <option key={discipline} value={discipline}>{discipline}</option>
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
                        max="100"
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={handleSave} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">Save</button>
                <button onClick={onDelete} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Delete</button>
            </div>
        </div>
    );
};

const EmployeeDetailPanel = ({ employee, assignments, projects, handleAddNewAssignment, setAssignmentToDelete, handleSaveAssignment, handleDeleteAssignment, currentTheme, db, accessLevel, setViewingSkillsFor, onAddNewProjectForAssignment, expandedAssignmentId, setExpandedAssignmentId }) => {
    const { navigateToWorkloaderForEmployee } = useContext(NavigationContext);

    const handleGoToEmployeeWorkloader = (e, employeeId) => {
        e.stopPropagation();
        if (accessLevel === 'taskmaster') {
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

    // Filter assignments to only show those linked to non-archived projects
    const filteredAssignments = useMemo(() => {
        return assignments.filter(asn => {
            // A temporary assignment has no projectId yet, so we must include it explicitly.
            if (asn.id.startsWith('temp_')) {
                return true;
            }
            // For existing assignments, check if the project is valid and not archived.
            const project = projects.find(p => p.id === asn.projectId);
            return project && !project.archived;
        });
    }, [assignments, projects]);


    return (
        <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} h-full flex flex-col`}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-xl font-bold">{employee.firstName} {employee.lastName}'s Assignments</h3>
                <div className="flex items-center gap-2">
                    {accessLevel === 'taskmaster' && (
                        <button onClick={() => handleAddNewAssignment(employee.id)} className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md">+ Add Assignment</button>
                    )}
                    {accessLevel === 'taskmaster' && (
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
            <div className="space-y-3 overflow-y-auto flex-grow hide-scrollbar-on-hover pr-2">
                {filteredAssignments.length > 0 ? (
                    filteredAssignments.map(asn => {
                        const isExpanded = expandedAssignmentId === asn.id;
                        return (
                            <motion.div
                                key={asn.id}
                                layout
                                initial={false} // Disable initial animation for layout
                                animate={{ backgroundColor: isExpanded ? currentTheme.altRowBg : currentTheme.cardBg }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className={`p-3 rounded-lg border ${currentTheme.borderColor} shadow-sm cursor-pointer`}
                            >
                                <motion.div layout="position" className="flex justify-between items-center" onClick={() => toggleAssignmentExpansion(asn.id)}>
                                    <div>
                                        {/* Display project name and number, with fallback for missing data and no fixed parentheses */}
                                        <p className="font-semibold">
                                            {asn.projectName || 'No Project Selected'}
                                            {asn.projectNumber ? ` (${asn.projectNumber})` : ''}
                                        </p>
                                        <p className={`text-sm ${currentTheme.subtleText}`}>Trade: {asn.trade} | Allocation: {asn.allocation}%</p>
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
                                            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside editor
                                        >
                                            <TutorialHighlight tutorialKey="manageAssignments"> {/* Added TutorialHighlight */}
                                                <InlineAssignmentEditor
                                                    db={db}
                                                    assignment={asn}
                                                    projects={projects}
                                                    detailerDisciplines={Array.isArray(employee.disciplineSkillsets) ? employee.disciplineSkillsets.map(s => s.name) : Object.keys(employee.disciplineSkillsets || {})}
                                                    onSave={handleSaveAssignment}
                                                    onDelete={() => { 
                                                        if (asn.id.startsWith('temp_')) {
                                                            handleDeleteAssignment(asn.id);
                                                        } else {
                                                            setAssignmentToDelete(asn);
                                                        }
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
                    })
                ) : (
                    <p className={currentTheme.subtleText}>No assignments for this employee.</p>
                )}
            </div>
            {/* The button has been moved to the header of this panel */}
        </div>
    );
};


const TeamConsole = ({ db, detailers, projects, assignments, currentTheme, appId, showToast, setViewingSkillsFor, initialSelectedEmployeeInTeamConsole, setInitialSelectedEmployeeInTeamConsole, accessLevel, setInitialSelectedEmployeeInWorkloader }) => {
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
    const [tempAssignment, setTempAssignment] = useState(null);
    const { navigateToWorkloaderForEmployee } = useContext(NavigationContext);
    
    // ** THE FIX IS HERE **
    // This effect listens for the global 'close-overlays' event dispatched from App.js
    // and closes all modals/popups within this console.
    useEffect(() => {
        const handleClose = () => {
            setIsNewProjectModalOpen(false);
            setEmployeeToDelete(null);
            setAssignmentToDelete(null);
        };
        window.addEventListener('close-overlays', handleClose);
        return () => window.removeEventListener('close-overlays', handleClose);
    }, []); // Empty dependency array ensures this runs only once.


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
                mainTrade = Object.keys(skills)[0];
            }

            if (mainTrade) {
                trades.add(mainTrade);
            }
        });
        const tradeArray = Array.from(trades).sort();
        setAllTrades(tradeArray);
        setActiveTrades(tradeArray);
    }, [detailers]);

    const handleTradeFilterToggle = (tradeToToggle) => {
        setActiveTrades(prev => {
            const newTrades = new Set(prev);
            if (newTrades.has(tradeToToggle)) {
                newTrades.delete(tradeToToggle);
            } else {
                newTrades.add(tradeToToggle);
            }
            return Array.from(newTrades);
        });
    };

    const handleSelectAllTrades = () => {
        if (activeTrades.length === allTrades.length) {
            setActiveTrades([]);
        } else {
            setActiveTrades(allTrades);
        }
    };

    const handleSelectEmployee = (employeeId) => {
        setSelectedEmployeeId(prevId => {
            const newId = prevId === employeeId ? null : employeeId;
            if (prevId !== newId) {
                setExpandedAssignmentId(null); // Collapse assignments when changing employee
                setTempAssignment(null); // Clear temp assignment when changing employee
            }
            return newId;
        });
    };

    const handleDeleteEmployee = async (id) => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/detailers`, id));
            const batch = [];
            assignments.filter(a => a.detailerId === id).forEach(assignment => {
                batch.push(deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignment.id)));
            });
            await Promise.all(batch);
            setEmployeeToDelete(null);
            if (selectedEmployeeId === id) {
                setSelectedEmployeeId(null);
            }
        } catch (error) {
            console.error("Error deleting employee:", error);
        }
    };

    const handleSaveAssignment = async (assignmentData) => {
        try {
            if (assignmentData.id.startsWith('temp_')) {
                // This is a new, temporary assignment. Save it as a new document.
                const { id, ...dataToSave } = assignmentData;
                await addDoc(collection(db, `artifacts/${appId}/public/data/assignments`), dataToSave);
                setTempAssignment(null); // Clear the temporary assignment from state
                setExpandedAssignmentId(null); // Collapse after saving
            } else {
                // This is an existing assignment. Update it.
                await setDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignmentData.id), assignmentData, { merge: true });
                setExpandedAssignmentId(null); // Collapse after saving
            }
        } catch (error) {
            console.error("Error saving assignment:", error);
        }
    };

    const handleDeleteAssignment = async (assignmentId) => {
        if (assignmentId.startsWith('temp_')) {
            // If it's a temporary assignment, just remove it from local state
            setTempAssignment(null);
            setExpandedAssignmentId(null);
        } else {
            // Otherwise, delete from Firestore
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignmentId));
                setAssignmentToDelete(null);
            } catch (error) {
                console.error("Error deleting assignment:", error);
            }
        }
    };

    const handleAddNewAssignment = (detailerId) => {
        // If there's already an unsaved temp assignment, don't create another
        if (tempAssignment) {
            showToast("Please save or delete the current new assignment first.", "error");
            return;
        }

        const tempId = `temp_${Date.now()}`;
        const newAssignment = {
            id: tempId,
            detailerId,
            projectId: '',
            projectName: '',
            projectNumber: '',
            trade: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            allocation: 0,
            status: 'active'
        };
        setTempAssignment(newAssignment);
        setExpandedAssignmentId(tempId);
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
            
            if (assignmentForNewProject.id.startsWith('temp_')) {
                setTempAssignment(updatedAssignment);
            } else {
                await handleSaveAssignment(updatedAssignment);
            }
            setAssignmentForNewProject(null);
        }
    };

    const groupedEmployees = useMemo(() => {
        const processed = detailers
            .map(employee => {
                const employeeAssignments = assignments
                    .filter(a => a.detailerId === employee.id)
                    .map(a => {
                        const project = projects.find(p => p.id === a.projectId);
                        return {
                            ...a,
                            projectName: project ? project.name : '',
                            projectNumber: project ? project.projectId : ''
                        };
                    });

                let currentWeekAllocation = 0;
                const today = new Date();
                const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                employeeAssignments.forEach(ass => {
                    const assignStart = new Date(ass.startDate);
                    const assignEnd = new Date(ass.endDate);
                    if (assignStart <= endOfWeek && assignEnd >= startOfWeek) {
                        currentWeekAllocation += Number(ass.allocation);
                    }
                });

                const skills = employee.disciplineSkillsets;
                let mainTrade = 'Uncategorized';
                if (Array.isArray(skills) && skills.length > 0) {
                    mainTrade = skills[0].name;
                } else if (skills && !Array.isArray(skills) && Object.keys(skills).length > 0) {
                    mainTrade = Object.keys(skills)[0];
                }

                return { ...employee, assignments: employeeAssignments, currentWeekAllocation, mainTrade };
            })
            .filter(employee => {
                const lowercasedTerm = searchTerm.toLowerCase();
                return (employee.firstName.toLowerCase().includes(lowercasedTerm) ||
                        employee.lastName.toLowerCase().includes(lowercasedTerm)) &&
                       activeTrades.includes(employee.mainTrade);
            })
            .sort((a, b) => a.lastName.localeCompare(b.lastName));

        return processed.reduce((acc, employee) => {
            const { mainTrade } = employee;
            if (!acc[mainTrade]) {
                acc[mainTrade] = [];
            }
            acc[mainTrade].push(employee);
            return acc;
        }, {});
    }, [detailers, assignments, searchTerm, activeTrades, projects]);

    const selectedEmployee = useMemo(() => {
        if (!selectedEmployeeId) return null;
        const employeeData = detailers.find(e => e.id === selectedEmployeeId);
        if (!employeeData) return null;

        const firestoreAssignments = assignments.filter(a => a.detailerId === selectedEmployeeId);
        
        // Combine firestore assignments with the temporary one if it belongs to the selected employee
        const allAssignments = [...firestoreAssignments];
        if (tempAssignment && tempAssignment.detailerId === selectedEmployeeId) {
            allAssignments.push(tempAssignment);
        }

        const enrichedAssignments = allAssignments.map(a => {
            const project = projects.find(p => p.id === a.projectId);
            return {
                ...a,
                projectName: project ? project.name : (a.projectName || ''),
                projectNumber: project ? project.projectId : (a.projectNumber || '')
            };
        });

        return {...employeeData, assignments: enrichedAssignments};

    }, [selectedEmployeeId, detailers, assignments, projects, tempAssignment]);

    return (
        <TutorialHighlight tutorialKey="detailers"> {/* Main highlight for Team Console */}
            <div className="p-4 h-full flex flex-col">
                {isNewProjectModalOpen && (
                    <NewProjectModal
                        db={db}
                        appId={appId}
                        onClose={() => setIsNewProjectModalOpen(false)}
                        onProjectCreated={handleProjectCreated}
                        currentTheme={currentTheme}
                    />
                )}
                <div className="flex justify-between items-center mb-4 gap-4 flex-shrink-0 flex-wrap">
                    <TutorialHighlight tutorialKey="viewToggle"> {/* Highlight for view toggle */}
                        <div className={`flex items-center gap-1 p-1 rounded-lg ${currentTheme.altRowBg}`}>
                            <button onClick={() => setViewMode('condensed')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'condensed' ? `${currentTheme.cardBg} shadow` : ''}`}>Condensed</button>
                            <button onClick={() => setViewMode('detailed')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'detailed' ? `${currentTheme.cardBg} shadow` : ''}`}>Detailed</button>
                        </div>
                    </TutorialHighlight>
                    <TutorialHighlight tutorialKey="searchAndFilter"> {/* Highlight for search and filter buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {allTrades.map(trade => (
                                <button
                                    key={trade}
                                    onClick={() => handleTradeFilterToggle(trade)}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTrades.includes(trade) ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                >
                                    {trade}
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

                {assignmentToDelete && (
                    <ConfirmationModal
                        isOpen={!!assignmentToDelete}
                        onClose={() => setAssignmentToDelete(null)}
                        onConfirm={() => handleDeleteAssignment(assignmentToDelete.id)}
                        title="Confirm Assignment Deletion"
                        currentTheme={currentTheme}
                    >
                        Are you sure you want to delete the assignment for {assignmentToDelete.projectName} ({assignmentToDelete.trade})?
                    </ConfirmationModal>
                )}

                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                    <div className="md:col-span-1 flex flex-col overflow-hidden">
                        <TutorialHighlight tutorialKey="searchAndFilter"> {/* Re-highlight for search bar */}
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
                        <div className="flex-grow overflow-y-auto space-y-4 pr-2 hide-scrollbar-on-hover">
                            {Object.keys(groupedEmployees).sort().map(trade => (
                                <div key={trade}>
                                    <h3 className={`text-sm font-bold uppercase ${currentTheme.subtleText} mb-2 pl-1`}>{trade}</h3>
                                    <div className="space-y-2">
                                        {groupedEmployees[trade].map((employee) => {
                                            const isSelected = selectedEmployeeId === employee.id;
                                            const allocationColor = employee.currentWeekAllocation > 100 ? 'text-red-500' : (employee.currentWeekAllocation < 80 ? 'text-yellow-500' : 'text-green-500');

                                            return (
                                                <TutorialHighlight tutorialKey="selectEmployee"> {/* Highlight for selecting an employee */}
                                                    <div
                                                        key={employee.id}
                                                        onClick={() => handleSelectEmployee(employee.id)}
                                                        className={`p-3 rounded-lg border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : currentTheme.borderColor} ${currentTheme.cardBg} shadow-sm cursor-pointer transition-all duration-200`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h3 className="font-semibold">{employee.firstName} {employee.lastName}</h3>
                                                                {viewMode === 'detailed' && (
                                                                    <>
                                                                        <p className={`text-xs ${currentTheme.subtleText}`}>{employee.title || 'N/A'}</p>
                                                                        <p className={`text-xs ${currentTheme.subtleText}`}>{employee.email || 'No email'}</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <TutorialHighlight tutorialKey="currentWeekAllocation"> {/* Highlight for current week allocation */}
                                                                <span className={`text-lg font-bold ${allocationColor}`}>{employee.currentWeekAllocation}%</span>
                                                            </TutorialHighlight>
                                                        </div>
                                                        {viewMode === 'detailed' && (
                                                            <div className="flex justify-end gap-2 mt-2 text-xs">
                                                                <TutorialHighlight tutorialKey="setSkills"> {/* Highlight for setting skills */}
                                                                    <button onClick={(e) => { e.stopPropagation(); setViewingSkillsFor(employee); }} className="text-blue-500 hover:underline">View Skills</button>
                                                                </TutorialHighlight>
                                                                <button onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(employee); }} className="text-red-500 hover:underline">Delete</button>
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

                    <div className="md:col-span-2 overflow-hidden h-full">
                        <AnimatePresence mode="wait">
                            {selectedEmployee ? (
                                <motion.div
                                    key={selectedEmployee.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full"
                                >
                                    <EmployeeDetailPanel
                                        employee={selectedEmployee}
                                        assignments={selectedEmployee.assignments}
                                        projects={projects}
                                        handleAddNewAssignment={handleAddNewAssignment}
                                        setAssignmentToDelete={setAssignmentToDelete}
                                        handleSaveAssignment={handleSaveAssignment}
                                        handleDeleteAssignment={handleDeleteAssignment}
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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

