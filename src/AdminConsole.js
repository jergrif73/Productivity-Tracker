import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const formatCurrency = (value) => {
    const numberValue = Number(value) || 0;
    return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && (
                <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md z-20 shadow-lg">
                    {text}
                </div>
            )}
        </div>
    );
};

const titleOptions = [
    "Detailer I", "Detailer II", "Detailer III", "BIM Specialist", "Programmatic Detailer",
    "Project Constructability Lead", "Project Constructability Lead, Sr.",
    "Trade Constructability Lead", "Constructability Manager"
];

const projectStatuses = ["Planning", "Conducting", "Controlling", "Archive"];
const disciplineOptions = ["Duct", "Plumbing", "Piping", "Structural", "Coordination", "GIS/GPS", "BIM"];

const statusDescriptions = {
    Planning: "Estimating",
    Conducting: "Booked but not Sold",
    Controlling: "Operational",
    Archive: "Completed"
};

const calculateHrsPerWk = (estimate) => {
    const { estimatedHours, startDate, endDate } = estimate;
    if (!estimatedHours || !startDate || !endDate) {
        return 0;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
        return 0;
    }
    const diffTime = end.getTime() - start.getTime();
    const diffDays = (diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays <= 0) return 0;

    const diffWeeks = diffDays / 7;

    if (diffWeeks < 1) { 
        return Math.round(estimatedHours);
    }

    return Math.round(Number(estimatedHours) / diffWeeks);
};


const TradeEstimateEditor = ({ estimate, onSave, onCancel, currentTheme }) => {
    const [localEstimate, setLocalEstimate] = useState({ rampUpPercent: 25, rampDownPercent: 25, ...estimate });

    const handleChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;
        if (name === 'rampUpPercent' || name === 'rampDownPercent' || name === 'estimatedHours') {
            processedValue = parseInt(value, 10) || 0;
        }
        setLocalEstimate(prev => ({ ...prev, [name]: processedValue }));
    };

    return (
        <div className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-500/10 rounded-md">
            <div className="col-span-2">
                <select name="trade" value={localEstimate.trade} onChange={handleChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                    {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>
            <div className="col-span-2">
                <input type="number" name="estimatedHours" value={localEstimate.estimatedHours} onChange={handleChange} placeholder="Hours" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
            </div>
            <div className="col-span-1 text-center font-bold">{calculateHrsPerWk(localEstimate)}</div>
            <div className="col-span-2">
                <input type="date" name="startDate" value={localEstimate.startDate} onChange={handleChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
            </div>
            <div className="col-span-2">
                <input type="date" name="endDate" value={localEstimate.endDate} onChange={handleChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
            </div>
            <div className="col-span-1">
                <input type="number" name="rampUpPercent" value={localEstimate.rampUpPercent} onChange={handleChange} placeholder="Up %" className={`w-full p-2 border rounded-md text-xs ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
            </div>
             <div className="col-span-1">
                <input type="number" name="rampDownPercent" value={localEstimate.rampDownPercent} onChange={handleChange} placeholder="Down %" className={`w-full p-2 border rounded-md text-xs ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
            </div>
            <div className="col-span-1 flex items-center justify-end gap-2">
                <button onClick={() => onSave(localEstimate)} className="text-green-500 hover:text-green-700">Save</button>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
        </div>
    );
};


const AdminConsole = ({ db, detailers, projects, currentTheme, appId, showToast }) => {
    const [newEmployee, setNewEmployee] = useState({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '' });
    const [newProject, setNewProject] = useState({ name: '', projectId: '', initialBudget: 0, blendedRate: 0, contingency: 0, dashboardUrl: '', status: 'Planning' });
    
    const [editingEmployeeId, setEditingEmployeeId] = useState(null);
    const [editingEmployeeData, setEditingEmployeeData] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectData, setEditingProjectData] = useState(null);
    const [employeeSortBy, setEmployeeSortBy] = useState('firstName');
    const [projectSortBy, setProjectSortBy] = useState('projectId');
    const [activeStatuses, setActiveStatuses] = useState(["Planning", "Conducting", "Controlling"]);
    
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [tradeEstimates, setTradeEstimates] = useState([]);
    const [editingEstimateId, setEditingEstimateId] = useState(null);
    const [newEstimate, setNewEstimate] = useState(null);

    useEffect(() => {
        if (!expandedProjectId) {
            setTradeEstimates([]);
            return;
        }

        const estimatesRef = collection(db, `artifacts/${appId}/public/data/projects/${expandedProjectId}/tradeEstimates`);
        const unsubscribe = onSnapshot(estimatesRef, (snapshot) => {
            const estimates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTradeEstimates(estimates);
        });

        return () => unsubscribe();

    }, [expandedProjectId, db, appId]);


    const handleStatusFilterToggle = (statusToToggle) => {
        setActiveStatuses(prev => {
            const newStatuses = new Set(prev);
            if (newStatuses.has(statusToToggle)) {
                newStatuses.delete(statusToToggle);
            } else {
                newStatuses.add(statusToToggle);
            }
            return Array.from(newStatuses);
        });
    };

    const handleProjectStatusChange = async (projectId, newStatus) => {
        const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, projectId);
        try {
            await updateDoc(projectRef, {
                status: newStatus,
                archived: newStatus === "Archive"
            });
            showToast(`Project status updated to ${newStatus}.`);
        } catch (error) {
            console.error("Error updating project status:", error);
            showToast("Failed to update status.", "error");
        }
    };

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
            .filter(p => {
                const projectStatus = p.status || (p.archived ? "Archive" : "Controlling");
                return activeStatuses.includes(projectStatus);
            })
            .sort((a, b) => {
                if (projectSortBy === 'name') {
                    return a.name.localeCompare(b.name);
                }
                return a.projectId.localeCompare(b.projectId, undefined, { numeric: true });
            });
    }, [projects, projectSortBy, activeStatuses]);


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
            const payload = {
                ...newProject,
                initialBudget: Number(newProject.initialBudget),
                blendedRate: Number(newProject.blendedRate),
                contingency: Number(newProject.contingency),
                archived: newProject.status === "Archive",
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/projects`), payload);
            setNewProject({ name: '', projectId: '', initialBudget: 0, blendedRate: 0, contingency: 0, dashboardUrl: '', status: 'Planning' });
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
            setEditingProjectData({ status: "Controlling", ...item }); // Default to controlling if no status
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
                    archived: data.status === "Archive",
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

    const handleSaveEstimate = async (estimateData) => {
        const { id, ...data } = estimateData;
        const estimatesRef = collection(db, `artifacts/${appId}/public/data/projects/${expandedProjectId}/tradeEstimates`);
        if (id) { // Update existing
            await updateDoc(doc(estimatesRef, id), data);
            setEditingEstimateId(null);
        } else { // Add new
            await addDoc(estimatesRef, data);
            setNewEstimate(null);
        }
        showToast("Estimate saved.");
    };

    const handleDeleteEstimate = async (estimateId) => {
        const estimateRef = doc(db, `artifacts/${appId}/public/data/projects/${expandedProjectId}/tradeEstimates`, estimateId);
        await deleteDoc(estimateRef);
        showToast("Estimate deleted.");
    };
    
    const isEditing = editingEmployeeId || editingProjectId;
    
    return (
        <div className="p-4">
            {/* --- Sticky Header --- */}
            <div className={`sticky top-0 z-10 ${currentTheme.consoleBg} py-2`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Employee Header */}
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Manage Employees</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Sort by:</span>
                            <button onClick={() => setEmployeeSortBy('firstName')} className={`px-2 py-1 text-xs rounded-md ${employeeSortBy === 'firstName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>First Name</button>
                            <button onClick={() => setEmployeeSortBy('lastName')} className={`px-2 py-1 text-xs rounded-md ${employeeSortBy === 'lastName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Last Name</button>
                        </div>
                    </div>
                    {/* Project Header */}
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Manage Projects</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Sort by:</span>
                            <button onClick={() => setProjectSortBy('name')} className={`px-2 py-1 text-xs rounded-md ${projectSortBy === 'name' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Alphabetical</button>
                            <button onClick={() => setProjectSortBy('projectId')} className={`px-2 py-1 text-xs rounded-md ${projectSortBy === 'projectId' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Project ID</button>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div></div> {/* Empty div for alignment */}
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-medium">Show:</span>
                        {projectStatuses.map(status => (
                             <Tooltip key={status} text={statusDescriptions[status]}>
                                <button 
                                    onClick={() => handleStatusFilterToggle(status)}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${activeStatuses.includes(status) ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                >
                                    {status}
                                </button>
                            </Tooltip>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- Scrollable Content --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Employee Content */}
                <div>
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

                {/* Project Content */}
                <div>
                    <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4 ${isEditing ? 'opacity-50' : ''}`}>
                        <h3 className="font-semibold mb-2">Add New Project</h3>
                        <div className="space-y-2 mb-4">
                            <input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="Project Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                            <input value={newProject.projectId} onChange={e => setNewProject({...newProject, projectId: e.target.value})} placeholder="Project ID" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                            <select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing}>
                                {projectStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
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
                            const currentStatus = p.status || (p.archived ? "Archive" : "Controlling");
                            const isExpanded = expandedProjectId === p.id;
                            
                            return (
                                <div key={p.id} className={`${bgColor} p-3 border ${currentTheme.borderColor} rounded-md shadow-sm`}>
                                {editingProjectId === p.id ? (
                                    <div className="space-y-2">
                                        <input name="name" value={editingProjectData.name} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                        <input name="projectId" value={editingProjectData.projectId} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                        <select name="status" value={editingProjectData.status} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                            {projectStatuses.map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
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
                                    <div className="cursor-pointer" onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{p.name} ({p.projectId})</p>
                                                <p className={`text-xs ${currentTheme.subtleText}`}>Budget: {formatCurrency(p.initialBudget)} | Rate: ${p.blendedRate || 0}/hr | Contingency: {formatCurrency(p.contingency)}</p>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {projectStatuses.map(status => (
                                                    <Tooltip key={status} text={statusDescriptions[status]}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleProjectStatusChange(p.id, status); }}
                                                            className={`px-2 py-1 text-xs rounded-md transition-colors ${currentStatus === status ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-blue-400`}`}
                                                        >
                                                            {status.charAt(0)}
                                                        </button>
                                                    </Tooltip>
                                                ))}
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit('project', p); }} className="ml-2 text-blue-500 hover:text-blue-700 text-sm" disabled={isEditing}>Edit</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete('project', p.id); }} className="text-red-500 hover:text-red-700 text-sm" disabled={isEditing}>Delete</button>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="mt-4 pt-4 border-t border-gray-500/50 space-y-2" onClick={(e) => e.stopPropagation()}>
                                                <div className="grid grid-cols-12 gap-2 items-center font-semibold text-xs px-2">
                                                    <span className="col-span-3">Trade</span>
                                                    <span className="col-span-2">Est. Hours</span>
                                                    <span className="col-span-1 text-center">Hrs/Wk</span>
                                                    <span className="col-span-2">Start Date</span>
                                                    <span className="col-span-2">End Date</span>
                                                    <span className="col-span-2 text-center">Ramp %</span>
                                                </div>
                                                {tradeEstimates.map(est => (
                                                    editingEstimateId === est.id ? 
                                                    <TradeEstimateEditor key={est.id} estimate={est} onSave={handleSaveEstimate} onCancel={() => setEditingEstimateId(null)} currentTheme={currentTheme} />
                                                    :
                                                    <div key={est.id} className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-gray-500/10 rounded-md">
                                                        <span className="col-span-3">{est.trade}</span>
                                                        <span className="col-span-2">{est.estimatedHours}</span>
                                                        <span className="col-span-1 text-center font-bold">{calculateHrsPerWk(est)}</span>
                                                        <span className="col-span-2">{est.startDate}</span>
                                                        <span className="col-span-2">{est.endDate}</span>
                                                        <div className="col-span-2 flex items-center justify-end gap-2">
                                                            <button onClick={() => setEditingEstimateId(est.id)} className="text-blue-500 hover:text-blue-700 text-sm">Edit</button>
                                                            <button onClick={() => handleDeleteEstimate(est.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {newEstimate ? 
                                                    <TradeEstimateEditor estimate={newEstimate} onSave={handleSaveEstimate} onCancel={() => setNewEstimate(null)} currentTheme={currentTheme} />
                                                    :
                                                    <button onClick={() => setNewEstimate({ trade: 'Duct', estimatedHours: 0, startDate: '', endDate: '', rampUpPercent: 25, rampDownPercent: 25 })} className="text-sm text-blue-500 hover:underline mt-2">+ Add Trade Estimate</button>
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            )})}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminConsole;
