import React, { useState, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// --- (Modal components would be imported from their own files in a full refactor) ---
// For now, let's assume these are available or passed in.
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
            <div className="grid grid-cols-2 gap-2">
                 <select value={assignment.trade} onChange={e => handleChange('trade', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                    <option value="">Trade...</option>
                    {availableTrades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input type="number" placeholder="%" value={assignment.allocation} onChange={e => handleChange('allocation', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
            </div>
        </div>
    );
};

const TeamConsole = ({ db, detailers, projects, assignments, currentTheme, appId, showToast, setViewingSkillsFor }) => {
    const [sortBy, setSortBy] = useState('firstName');
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
        const { projectId, startDate, endDate, trade, allocation } = assignmentToSave;
        if(!projectId || !startDate || !endDate || !trade || !allocation) {
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
        const { projectId, trade } = payload;
    
        if (!trade || !projectId) {
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
        } catch(e) {
            console.error("Error updating assignment", e);
            showToast("Error updating assignment.", "error");
        }
    };
    
    const confirmDeleteAssignment = (id) => {
        const assignmentToDelete = assignments.find(a => a.id === id);
        if (!assignmentToDelete) return;
        
        setConfirmAction({
            title: "Delete Assignment",
            message: "Are you sure you want to permanently delete this assignment?",
            action: async () => {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, id));
                showToast("Assignment deleted.");
            }
        });
    };
    
    const toggleEmployee = (employeeId) => {
        setExpandedEmployeeId(prevId => prevId === employeeId ? null : employeeId);
    };

    return (
        <div className="h-full flex flex-col p-4 gap-4">
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

            <div className="flex-shrink-0 flex justify-end items-center gap-2">
                <span className={`mr-2 text-sm font-medium ${currentTheme.subtleText}`}>Sort by:</span>
                <button onClick={() => setSortBy('firstName')} className={`px-4 py-1.5 rounded-md text-sm ${sortBy === 'firstName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>First Name</button>
                <button onClick={() => setSortBy('lastName')} className={`px-4 py-1.5 rounded-md text-sm ${sortBy === 'lastName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Last Name</button>
            </div>
            
            <div className={`flex-grow overflow-y-auto pr-2 ${currentTheme.cardBg} rounded-lg p-4 space-y-2`}>
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
        </div>
    );
};

export default TeamConsole;