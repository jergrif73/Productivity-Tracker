import React, { useState, useMemo } from 'react';
import { collection, doc, addDoc, setDoc, deleteDoc } from 'firebase/firestore'; // Added setDoc, removed updateDoc
import { motion, AnimatePresence } from 'framer-motion'; // Import Framer Motion

// --- Helper Components ---
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
    const [editableAssignment, setEditableAssignment] = useState({ ...assignment });

    const sortedProjects = useMemo(() => {
        return [...projects].sort((a, b) => a.name.localeCompare(b.name));
    }, [projects]);

    const handleSave = async () => {
        // Ensure allocation is treated as a number
        const updatedAssignment = {
            ...editableAssignment,
            allocation: Number(editableAssignment.allocation)
        };
        onUpdate(updatedAssignment);
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


const TeamConsole = ({ db, detailers, projects, assignments, currentTheme, appId, showToast, setViewingSkillsFor }) => {
    const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [assignmentToDelete, setAssignmentToDelete] = useState(null);
    const [visibleEmployees, setVisibleEmployees] = useState(15); // State to manage how many employees are visible

    const handleEmployeeClick = (employeeId) => {
        setExpandedEmployeeId(prevId => (prevId === employeeId ? null : employeeId));
    };

    const handleAddEmployee = async () => {
        const newEmployee = {
            firstName: 'New',
            lastName: 'Employee',
            employeeId: `EMP-${Date.now().toString().slice(-4)}`,
            title: 'Detailer I',
            email: '',
            skills: {},
            disciplineSkillsets: {}
        };
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/detailers`), newEmployee);
            showToast('New employee added!');
        } catch (error) {
            console.error("Error adding employee:", error);
            showToast('Failed to add employee.', 'error');
        }
    };

    const handleDeleteEmployee = async (id) => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/detailers`, id));
            // Also delete associated assignments
            const batch = [];
            assignments.filter(a => a.detailerId === id).forEach(assignment => {
                batch.push(deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignment.id)));
            });
            await Promise.all(batch);
            showToast('Employee and all assignments deleted.');
            setEmployeeToDelete(null);
            setExpandedEmployeeId(null); // Collapse if deleted
        } catch (error) {
            console.error("Error deleting employee:", error);
            showToast('Failed to delete employee.', 'error');
        }
    };

    const handleUpdateAssignment = async (updatedAssignment) => {
        try {
            await setDoc(doc(db, `artifacts/${appId}/public/data/assignments`, updatedAssignment.id), updatedAssignment, { merge: true });
            showToast('Assignment updated!');
        } catch (error) {
            console.error("Error updating assignment:", error);
            showToast('Failed to update assignment.', 'error');
        }
    };

    const handleDeleteAssignment = async (assignmentId) => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignmentId));
            showToast('Assignment deleted!');
            setAssignmentToDelete(null);
        } catch (error) {
            console.error("Error deleting assignment:", error);
            showToast('Failed to delete assignment.', 'error');
        }
    };

    const handleAddNewAssignment = async (detailerId) => {
        const newAssignment = {
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
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/assignments`), newAssignment);
            showToast('New assignment added! Please edit details.');
        } catch (error) {
            console.error("Error adding assignment:", error);
            showToast('Failed to add assignment.', 'error');
        }
    };

    const employeesWithSortedAssignments = useMemo(() => {
        return detailers.map(employee => {
            const employeeAssignments = assignments
                .filter(a => a.detailerId === employee.id)
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate)); // Sort by start date
            
            // Calculate current weekly allocation
            let currentWeekAllocation = 0;
            const today = new Date();
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())); // Sunday
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

            employeeAssignments.forEach(ass => {
                const assignStart = new Date(ass.startDate);
                const assignEnd = new Date(ass.endDate);

                if (assignStart <= endOfWeek && assignEnd >= startOfWeek) {
                    currentWeekAllocation += Number(ass.allocation);
                }
            });

            return { ...employee, assignments: employeeAssignments, currentWeekAllocation };
        }).sort((a, b) => a.lastName.localeCompare(b.lastName)); // Sort employees by last name
    }, [detailers, assignments]);

    return (
        <div className="p-4 space-y-4 h-full flex flex-col">
            <div className="flex justify-end items-center mb-4 gap-2 flex-shrink-0">
                <button onClick={handleAddEmployee} className={`${currentTheme.buttonBg} ${currentTheme.buttonText} px-4 py-2 rounded-lg hover:bg-opacity-80`}>
                    + Add New Employee
                </button>
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

            {/* Main scrollable area for employee cards */}
            <div className="flex-grow overflow-y-auto space-y-4 pr-4 hide-scrollbar-on-hover"> {/* Added hide-scrollbar-on-hover */}
                {employeesWithSortedAssignments.slice(0, visibleEmployees).map((employee, index) => {
                    const isExpanded = expandedEmployeeId === employee.id;
                    const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;
                    const allocationColor = employee.currentWeekAllocation > 100 ? 'text-red-500' : (employee.currentWeekAllocation < 80 ? 'text-yellow-500' : 'text-green-500');

                    return (
                        <motion.div
                            key={employee.id}
                            layout
                            className={`${bgColor} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}
                        >
                            <motion.div layout="position" className="flex justify-between items-start cursor-pointer" onClick={() => handleEmployeeClick(employee.id)}>
                                <div>
                                    <h3 className="text-lg font-semibold">{employee.firstName} {employee.lastName}</h3>
                                    <p className={`text-sm ${currentTheme.subtleText}`}>{employee.title || 'N/A'}</p>
                                    <p className={`text-sm ${currentTheme.subtleText}`}>Employee ID: {employee.employeeId}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-lg font-bold ${allocationColor}`}>{employee.currentWeekAllocation}%</span>
                                    <button onClick={(e) => { e.stopPropagation(); setViewingSkillsFor(employee); }} className="text-blue-500 hover:text-blue-700 text-sm">View Skills</button>
                                    <button onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(employee); }} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                                        </svg>
                                    </motion.div>
                                </div>
                            </motion.div>
                            
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        key={`detail-${employee.id}`}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="mt-4 pt-4 border-t space-y-3">
                                            <h4 className="font-semibold mb-2">Assignments:</h4>
                                            {employee.assignments.length > 0 ? (
                                                employee.assignments.map(asn => (
                                                    <InlineAssignmentEditor
                                                        key={asn.id}
                                                        db={db}
                                                        assignment={asn}
                                                        projects={projects}
                                                        detailerDisciplines={Object.keys(employee.disciplineSkillsets || {})}
                                                        onUpdate={handleUpdateAssignment}
                                                        onDelete={() => setAssignmentToDelete(asn)}
                                                        currentTheme={currentTheme}
                                                    />
                                                ))
                                            ) : (
                                                <p className={currentTheme.subtleText}>No assignments for this employee.</p>
                                            )}
                                            <button onClick={() => handleAddNewAssignment(employee.id)} className="text-sm text-blue-500 hover:underline">+ Add New Assignment</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
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
