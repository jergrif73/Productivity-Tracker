import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { TutorialHighlight } from './App';

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

// --- Components copied from AdminConsole.js for the Detailer Editor ---

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

const NoteEditorModal = ({ disciplineName, initialNote, onSave, onClose, currentTheme }) => {
    const [note, setNote] = useState(initialNote || '');

    const handleSave = () => {
        onSave(disciplineName, note);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex justify-center items-center">
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-lg shadow-2xl w-full max-w-md`}>
                <h3 className="text-lg font-bold mb-4">Notes for {disciplineName}</h3>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows="6"
                    className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    placeholder="Enter notes about this skill..."
                />
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className={`px-4 py-2 rounded-md ${currentTheme.buttonBg} hover:bg-opacity-80`}>Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save Note</button>
                </div>
            </div>
        </div>
    );
};

const EditEmployeeModal = ({ employee, onSave, onClose, currentTheme, unionLocals }) => {
    const [editableEmployee, setEditableEmployee] = useState(null);
    const [newDiscipline, setNewDiscipline] = useState('');
    const [draggedDiscipline, setDraggedDiscipline] = useState(null);
    const [dragOverDiscipline, setDragOverDiscipline] = useState(null);
    const [editingNoteFor, setEditingNoteFor] = useState(null);

    const skillCategories = ["Model Knowledge", "VDC Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
    const disciplineOptions = ["Duct", "Plumbing", "Piping", "Structural", "Coordination", "GIS/GPS", "VDC"];
    const titleOptions = [
        "Detailer I", "Detailer II", "Detailer III", "VDC Specialist", "Programmatic Detailer",
        "Project Constructability Lead", "Project Constructability Lead, Sr.",
        "Trade Constructability Lead", "Constructability Manager"
    ];

    useEffect(() => {
        if (employee) {
            let skills = employee.disciplineSkillsets;
            if (skills && !Array.isArray(skills)) {
                skills = Object.entries(skills).map(([name, score]) => ({ name, score, note: '' }));
            }
            setEditableEmployee({ ...employee, disciplineSkillsets: skills || [] });
        }
    }, [employee]);

    if (!editableEmployee) return null;

    const handleSkillChange = (skillName, score) => {
        setEditableEmployee(prev => ({
            ...prev,
            skills: { ...prev.skills, [skillName]: score }
        }));
    };

    const handleAddDiscipline = () => {
        if (newDiscipline && editableEmployee) {
            const currentDisciplines = editableEmployee.disciplineSkillsets || [];
            if (!currentDisciplines.some(d => d.name === newDiscipline)) {
                setEditableEmployee(prev => ({
                    ...prev,
                    disciplineSkillsets: [...(prev.disciplineSkillsets || []), { name: newDiscipline, score: 0, note: '' }]
                }));
                setNewDiscipline('');
            }
        }
    };

    const handleRemoveDiscipline = (disciplineToRemove) => {
        setEditableEmployee(prev => ({
            ...prev,
            disciplineSkillsets: (prev.disciplineSkillsets || []).filter(d => d.name !== disciplineToRemove)
        }));
    };

    const handleDisciplineRatingChange = (name, score) => {
        setEditableEmployee(prev => ({
            ...prev,
            disciplineSkillsets: (prev.disciplineSkillsets || []).map(d =>
                d.name === name ? { ...d, score } : d
            )
        }));
    };

    const handleSaveDisciplineNote = (disciplineName, note) => {
        setEditableEmployee(prev => ({
            ...prev,
            disciplineSkillsets: (prev.disciplineSkillsets || []).map(d =>
                d.name === disciplineName ? { ...d, note: note } : d
            )
        }));
    };

    const handleDragStart = (e, disciplineName) => {
        setDraggedDiscipline(disciplineName);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, disciplineName) => {
        e.preventDefault();
        if (disciplineName !== draggedDiscipline && disciplineName !== dragOverDiscipline) {
            setDragOverDiscipline(disciplineName);
        }
    };

    const handleDragLeave = () => {
        setDragOverDiscipline(null);
    };

    const handleDrop = (e, dropTargetName) => {
        e.preventDefault();
        if (!draggedDiscipline || draggedDiscipline === dropTargetName) {
            setDraggedDiscipline(null);
            setDragOverDiscipline(null);
            return;
        }

        const skillsetsArray = [...(editableEmployee.disciplineSkillsets || [])];
        const draggedIndex = skillsetsArray.findIndex(d => d.name === draggedDiscipline);
        const targetIndex = skillsetsArray.findIndex(d => d.name === dropTargetName);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedDiscipline(null);
            setDragOverDiscipline(null);
            return;
        }

        const [removed] = skillsetsArray.splice(draggedIndex, 1);
        skillsetsArray.splice(targetIndex, 0, removed);

        setEditableEmployee(prev => ({
            ...prev,
            disciplineSkillsets: skillsetsArray
        }));

        setDraggedDiscipline(null);
        setDragOverDiscipline(null);
    };


    const handleSaveChanges = () => {
        onSave(editableEmployee);
        onClose();
    };

    const handleDataChange = (e) => {
        const { name, value } = e.target;
        setEditableEmployee(prev => ({ ...prev, [name]: value }));
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            {editingNoteFor && (
                <NoteEditorModal
                    disciplineName={editingNoteFor.name}
                    initialNote={editingNoteFor.note}
                    onSave={handleSaveDisciplineNote}
                    onClose={() => setEditingNoteFor(null)}
                    currentTheme={currentTheme}
                />
            )}
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar-on-hover`}>
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold">Edit Employee: {employee.firstName} {employee.lastName}</h2>
                    <button onClick={onClose} className={`text-2xl font-bold ${currentTheme.subtleText} hover:${currentTheme.textColor}`}>&times;</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Basic Info</h3>
                        <input name="firstName" value={editableEmployee.firstName} onChange={handleDataChange} placeholder="First Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                        <input name="lastName" value={editableEmployee.lastName} onChange={handleDataChange} placeholder="Last Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                        <input type="email" name="email" value={editableEmployee.email || ''} onChange={handleDataChange} placeholder="Email" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                        <select name="title" value={editableEmployee.title || ''} onChange={handleDataChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            <option value="" disabled>Select a Title</option>
                            {titleOptions.map(title => <option key={title} value={title}>{title}</option>)}
                        </select>
                        <input name="employeeId" value={editableEmployee.employeeId} onChange={handleDataChange} placeholder="Employee ID" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        <input name="wage" type="number" value={editableEmployee.wage || ''} onChange={handleDataChange} placeholder="Wage/hr" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                        <input name="percentAboveScale" type="number" value={editableEmployee.percentAboveScale || ''} onChange={handleDataChange} placeholder="% Above Scale" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                        <select name="unionLocal" value={editableEmployee.unionLocal || ''} onChange={handleDataChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            <option value="">Select Union Local...</option>
                            {(unionLocals || []).map(local => (
                                <option key={local.id} value={local.name}>{local.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Skills & Disciplines Section */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Skill Assessment</h3>
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
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Discipline Skillsets</h3>
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <select value={newDiscipline} onChange={(e) => setNewDiscipline(e.target.value)} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                    <option value="">Select a discipline...</option>
                                    {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <button onClick={handleAddDiscipline} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Add Discipline</button>
                            </div>
                            <div className="space-y-4">
                                {(editableEmployee.disciplineSkillsets || []).map(discipline => (
                                    <div
                                        key={discipline.name}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, discipline.name)}
                                        onDragOver={(e) => handleDragOver(e, discipline.name)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, discipline.name)}
                                        className={`relative p-3 ${currentTheme.altRowBg} rounded-md border ${currentTheme.borderColor} cursor-move ${draggedDiscipline === discipline.name ? 'opacity-50' : ''}`}
                                    >
                                        {dragOverDiscipline === discipline.name && (
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />
                                        )}
                                        <div className="flex justify-between items-start">
                                           <div className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${currentTheme.subtleText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                </svg>
                                                <span className="font-medium">{discipline.name}</span>
                                                <button onClick={() => setEditingNoteFor(discipline)} className={`ml-2 text-gray-400 hover:text-white transition-colors ${discipline.note ? 'text-cyan-400' : ''}`} title="Edit Notes">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                {discipline.note && (
                                                    <Tooltip text={discipline.note}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                    </Tooltip>
                                                )}
                                           </div>
                                           <button onClick={() => handleRemoveDiscipline(discipline.name)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                                        </div>
                                        <BubbleRating score={discipline.score} onScoreChange={(newScore) => handleDisciplineRatingChange(discipline.name, newScore)} currentTheme={currentTheme} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end mt-6 pt-4 border-t">
                     <button onClick={handleSaveChanges} className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600">Save All Changes</button>
                </div>
            </div>
        </div>
    );
};

// --- New Editor Component for Detailers ---

const DetailerEditor = ({ item, onBack, onSave, currentTheme, allData }) => {
    return (
        <EditEmployeeModal
            employee={item}
            onSave={onSave}
            onClose={onBack}
            currentTheme={currentTheme}
            unionLocals={allData.unionLocals || []}
        />
    );
};


const GenericEditorModal = ({ item, config, onSave, onCancel, currentTheme, allData }) => {
    const isNew = !item.id;
    const initialItem = isNew ? config.columns.reduce((acc, col) => ({ ...acc, [col.accessor]: '' }), {}) : item;
    const [editableItem, setEditableItem] = useState(initialItem);

    const handleChange = (field, value) => {
        const columnConfig = config.columns.find(c => c.accessor === field);
        let newValue = value;
        if (columnConfig?.type === 'number') {
            newValue = Number(value);
        }
        setEditableItem(prev => ({ ...prev, [field]: newValue }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}>
                <h2 className="text-xl font-bold mb-4">{isNew ? 'Add New Item' : `Editing Item`}</h2>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {config.columns.map(col => {
                        const inputClasses = `w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`;
                        return (
                            <div key={col.header}>
                                <label className="block text-sm font-medium mb-1">{col.header}</label>
                                {col.type === 'select' ? (
                                    <select
                                        value={editableItem[col.accessor] || ''}
                                        onChange={e => handleChange(col.accessor, e.target.value)}
                                        className={inputClasses}
                                    >
                                        <option value="">-- Select --</option>
                                        {(allData[col.optionsSource] || []).map(optionItem => (
                                            <option key={optionItem[col.optionsValue]} value={optionItem[col.optionsValue]}>
                                                {typeof col.optionsLabel === 'function' ? col.optionsLabel(optionItem) : optionItem[col.optionsLabel]}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={col.type || 'text'}
                                        value={editableItem[col.accessor] || ''}
                                        onChange={e => handleChange(col.accessor, e.target.value)}
                                        className={inputClasses}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-600">
                    <button onClick={onCancel} className={`px-4 py-2 rounded-md ${currentTheme.buttonBg} hover:bg-opacity-80`}>Cancel</button>
                    <button onClick={() => onSave(editableItem)} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">Save</button>
                </div>
            </div>
        </div>
    );
};


const ProjectEditor = ({ item, onBack, onSave, currentTheme }) => {
    const [editableItem, setEditableItem] = useState(JSON.parse(JSON.stringify(item)));

    const handleChange = (field, value) => {
        const originalValue = editableItem[field];
        let newValue = value;
        if (typeof originalValue === 'number' || ['initialBudget', 'blendedRate', 'vdcBlendedRate', 'contingency'].includes(field)) {
            newValue = Number(value);
        }
        setEditableItem(prev => ({ ...prev, [field]: newValue }));
    };

    const renderField = (label, field, type = 'text') => {
        const inputClasses = `w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`;
        return (
            <div>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                    type={type}
                    value={editableItem[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className={inputClasses}
                />
            </div>
        );
    };

    return (
        <div className={`flex-grow flex flex-col p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} shadow-sm min-h-0`}>
            <div className="flex-shrink-0 mb-4 flex justify-between items-center">
                <div>
                    <button onClick={onBack} className="text-blue-400 hover:underline mb-2">&larr; Back to Projects</button>
                    <h2 className="text-xl font-bold">Editing Project: {item.name}</h2>
                </div>
            </div>
            <div className="flex-grow overflow-auto hide-scrollbar-on-hover pr-2 space-y-4">
                {renderField("Project Name", "name")}
                {renderField("Project ID", "projectId")}
                <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select value={editableItem.status || 'Planning'} onChange={(e) => handleChange('status', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                        <option>Planning</option>
                        <option>Conducting</option>
                        <option>Controlling</option>
                        <option>Archive</option>
                    </select>
                </div>
                {renderField("Initial Budget ($)", "initialBudget", "number")}
                {renderField("Detailing Rate ($/hr)", "blendedRate", "number")}
                {renderField("VDC Rate ($/hr)", "vdcBlendedRate", "number")}
                {renderField("Contingency ($)", "contingency", "number")}
                {renderField("Dashboard URL", "dashboardUrl", "url")}
            </div>
            <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-600 flex justify-end">
                <button onClick={() => onSave(editableItem)} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save Changes</button>
            </div>
        </div>
    );
};

const JobFamilyDataEditor = ({ item, onBack, onSave, currentTheme }) => {
    const [editableItem, setEditableItem] = useState(JSON.parse(JSON.stringify(item)));

    const handleChange = (field, value) => {
        setEditableItem(prev => ({ ...prev, [field]: value }));
    };

    const handleListChange = (field, index, value) => {
        const newList = [...(editableItem[field] || [])];
        newList[index] = value;
        setEditableItem(prev => ({ ...prev, [field]: newList }));
    };

    const handleAddListItem = (field) => {
        setEditableItem(prev => ({ ...prev, [field]: [...(editableItem[field] || []), ''] }));
    };

    const handleRemoveListItem = (field, index) => {
        const newList = [...(editableItem[field] || [])];
        newList.splice(index, 1);
        setEditableItem(prev => ({ ...prev, [field]: newList }));
    };

    const renderListSection = (title, fieldName) => (
        <div>
            <label className="block text-sm font-medium mb-1">{title}</label>
            {(editableItem[fieldName] || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2 mb-1">
                    <input type="text" value={item} onChange={(e) => handleListChange(fieldName, index, e.target.value)} className={`flex-grow p-1 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                    <button onClick={() => handleRemoveListItem(fieldName, index)} className="text-red-500 font-bold text-xl">&times;</button>
                </div>
            ))}
            <button onClick={() => handleAddListItem(fieldName)} className="text-blue-400 text-sm mt-1 hover:underline">+ Add Item</button>
        </div>
    );

    return (
        <div className={`flex-grow flex flex-col p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} shadow-sm min-h-0`}>
            <div className="flex-shrink-0 mb-4 flex justify-between items-center">
                <div>
                    <button onClick={onBack} className="text-blue-400 hover:underline mb-2">&larr; Back to Job Family Data</button>
                    <h2 className="text-xl font-bold">Editing Job Family: {item.title}</h2>
                </div>
            </div>
            <div className="flex-grow overflow-auto hide-scrollbar-on-hover pr-2 space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Position Title</label>
                    <input
                        type="text"
                        value={editableItem.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                </div>
                {renderListSection('Primary Responsibilities', 'primaryResponsibilities')}
                {renderListSection('Knowledge and Skills', 'knowledgeAndSkills')}
                {renderListSection('Independence and Decision-Making', 'independenceAndDecisionMaking')}
                {renderListSection('Leadership', 'leadership')}
                {renderListSection('Education', 'education')}
                {renderListSection('Years of Experience Preferred', 'yearsOfExperiencePreferred')}
            </div>
            <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-600 flex justify-end">
                <button onClick={() => onSave(editableItem)} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save Changes</button>
            </div>
        </div>
    );
};


const ProjectActivitiesEditor = ({ item, collectionName, onBack, onSave, currentTheme, allData }) => {
    const [editableItem, setEditableItem] = useState(JSON.parse(JSON.stringify(item))); // Deep copy
    const projectName = allData.projects?.find(p => p.id === item.id)?.name || item.id;

    const handleRemoveDuplicateActivities = () => {
        const allActivities = Object.values(editableItem.activities || {}).flat();
        if (allActivities.length === 0) return;

        const activityMap = new Map();
        for (const activity of allActivities) {
            const key = activity.description.trim();
            if (activityMap.has(key)) {
                const existing = activityMap.get(key);
                existing.estimatedHours = (Number(existing.estimatedHours) || 0) + (Number(activity.estimatedHours) || 0);
            } else {
                activityMap.set(key, { ...activity, estimatedHours: Number(activity.estimatedHours) || 0 });
            }
        }

        const uniqueActivities = Array.from(activityMap.values());

        const regroupedActivities = uniqueActivities.reduce((acc, act) => {
            const trade = Object.keys(item.activities).find(trade =>
                item.activities[trade].some(a => a.description === act.description)
            ) || 'general';
            if (!acc[trade]) acc[trade] = [];
            acc[trade].push(act);
            return acc;
        }, {});

        setEditableItem(prev => ({ ...prev, activities: regroupedActivities }));
    };

    const handleRemoveDuplicateDisciplines = () => {
        const disciplines = editableItem.actionTrackerDisciplines || [];
        if (disciplines.length === 0) return;

        const uniqueDisciplinesMap = new Map();
        disciplines.forEach(disc => {
            if (!uniqueDisciplinesMap.has(disc.key)) {
                uniqueDisciplinesMap.set(disc.key, disc);
            }
        });

        const uniqueDisciplines = Array.from(uniqueDisciplinesMap.values());
        setEditableItem(prev => ({ ...prev, actionTrackerDisciplines: uniqueDisciplines }));
    };

    const handleListChange = (field, index, subField, value) => {
        const newList = [...(editableItem[field] || [])];
        newList[index] = { ...newList[index], [subField]: value };
        setEditableItem(prev => ({ ...prev, [field]: newList }));
    };

    const handleAddListItem = (field, newItem) => {
        setEditableItem(prev => ({ ...prev, [field]: [...(prev[field] || []), newItem] }));
    };

    const handleRemoveListItem = (field, index) => {
        const newList = [...(editableItem[field] || [])];
        newList.splice(index, 1);
        setEditableItem(prev => ({ ...prev, [field]: newList }));
    };

    const handleActivityChange = (trade, actIndex, field, value) => {
        const newActivities = { ...editableItem.activities };
        const parsedValue = field === 'estimatedHours' ? Number(value) : value;
        newActivities[trade][actIndex][field] = parsedValue;
        setEditableItem(prev => ({ ...prev, activities: newActivities }));
    };

    const handleAddActivity = (trade) => {
        const newActivity = { id: `act_${Date.now()}`, description: "New Activity", estimatedHours: 0 };
        const newActivities = { ...editableItem.activities };
        if (!newActivities[trade]) newActivities[trade] = [];
        newActivities[trade].push(newActivity);
        setEditableItem(prev => ({ ...prev, activities: newActivities }));
    };

    const handleRemoveActivity = (trade, actIndex) => {
        const newActivities = { ...editableItem.activities };
        newActivities[trade].splice(actIndex, 1);
        setEditableItem(prev => ({ ...prev, activities: newActivities }));
    };

    const renderEditableList = (title, field, fieldsConfig, onRemoveDuplicates) => {
        const items = editableItem[field] || [];
        return (
            <div>
                <h4 className="font-semibold text-md mt-4 mb-2 border-b border-gray-600 pb-1 flex justify-between items-center">
                    <span>{title}</span>
                    {onRemoveDuplicates && (
                         <button onClick={onRemoveDuplicates} className="text-sm px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700">Remove Duplicates</button>
                    )}
                </h4>
                <div className="space-y-2">
                    {items.map((listItem, index) => (
                        <div key={listItem.id || index} className={`p-2 rounded-md ${currentTheme.altRowBg} flex items-center gap-2`}>
                            {fieldsConfig.map(config => (
                                <input
                                    key={config.field}
                                    type={config.type || 'text'}
                                    placeholder={config.placeholder}
                                    value={listItem[config.field] || ''}
                                    onChange={(e) => handleListChange(field, index, config.field, e.target.value)}
                                    className={`p-1 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder} ${config.className || 'flex-grow'}`}
                                />
                            ))}
                            <button onClick={() => handleRemoveListItem(field, index)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                        </div>
                    ))}
                    <button onClick={() => handleAddListItem(field, fieldsConfig.reduce((acc, curr) => ({...acc, [curr.field]: ''}), {id: `${field}_${Date.now()}`}))} className="text-blue-400 text-sm mt-1 hover:underline">+ Add {title.slice(0, -1)}</button>
                </div>
            </div>
        );
    };

    const renderEditableActivities = () => {
        const activities = editableItem.activities || {};
        return (
            <div>
                <h4 className="font-semibold text-md mt-4 mb-2 border-b border-gray-600 pb-1 flex justify-between items-center">
                    <span>Activities</span>
                    <button onClick={handleRemoveDuplicateActivities} className="text-sm px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700">Remove Duplicates</button>
                </h4>
                <div className="space-y-4 text-sm">
                    {Object.entries(activities).map(([trade, activityList]) => (
                        <div key={trade}>
                            <h5 className="font-semibold capitalize text-blue-300 mb-2">{trade}</h5>
                            <div className="space-y-2 pl-4">
                                {activityList.map((act, index) => (
                                    <div key={act.id} className={`p-2 rounded-md ${currentTheme.altRowBg} flex items-center gap-2`}>
                                        <input type="text" value={act.description} onChange={(e) => handleActivityChange(trade, index, 'description', e.target.value)} placeholder="Description" className={`flex-grow p-1 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                        <input type="number" value={act.estimatedHours || 0} onChange={(e) => handleActivityChange(trade, index, 'estimatedHours', e.target.value)} placeholder="Est. Hrs" className={`w-24 p-1 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                        <button onClick={() => handleRemoveActivity(trade, index)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                                    </div>
                                ))}
                                <button onClick={() => handleAddActivity(trade)} className="text-blue-400 text-sm mt-1 hover:underline">+ Add Activity to {trade}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={`flex-grow flex flex-col p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} shadow-sm min-h-0`}>
            <div className="flex-shrink-0 mb-4 flex justify-between items-center">
                <div>
                    <button onClick={onBack} className="text-blue-400 hover:underline mb-2">&larr; Back to {collectionName}</button>
                    <h2 className="text-xl font-bold">Editing Details for: {projectName}</h2>
                </div>
            </div>
            <div className="flex-grow overflow-auto hide-scrollbar-on-hover pr-2">
                {renderEditableList("Mains Defined", 'mainItems', [{ field: 'name', placeholder: 'Main Name' }])}
                {renderEditableList("Action Tracker Disciplines", 'actionTrackerDisciplines', [{ field: 'key', placeholder: 'Key (e.g., piping)' }, { field: 'label', placeholder: 'Label (e.g., Piping)' }], handleRemoveDuplicateDisciplines)}
                {renderEditableList("Budget Impacts", 'budgetImpacts', [{ field: 'description', placeholder: 'Description' }, { field: 'amount', placeholder: 'Amount ($)', type: 'number', className: 'w-32' }])}
                {renderEditableActivities()}
            </div>
            <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-600 flex justify-end">
                <button onClick={() => onSave(editableItem)} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save Changes</button>
            </div>
        </div>
    );
};


const DatabaseConsole = ({ db, appId, currentTheme, showToast }) => {
    const [allData, setAllData] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedCollection, setSelectedCollection] = useState('detailers');
    const [searchTerm, setSearchTerm] = useState('');
    const [itemToDelete, setItemToDelete] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [editingItem, setEditingItem] = useState(null);
    const [sortBy, setSortBy] = useState('lastName'); // New state for specific sorting

    const collectionsToFetch = useMemo(() => [
        'detailers', 'projects', 'assignments', 'tasks',
        'taskLanes', 'jobFamilyData', 'unionLocals', 'projectActivities'
    ], []);

    useEffect(() => {
        if (!db || !appId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const unsubscribers = collectionsToFetch.map(name => {
            const collRef = collection(db, `artifacts/${appId}/public/data/${name}`);
            return onSnapshot(collRef, snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllData(prev => ({ ...prev, [name]: data }));
            }, err => console.error(`Error fetching ${name}:`, err));
        });

        // Set loading to false after setting up listeners
        setLoading(false);


        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [db, appId, collectionsToFetch]);

    const collectionConfig = useMemo(() => ({
        'detailers': {
             customEditor: DetailerEditor,
             displayColumns: [
                { header: 'First Name', accessor: 'firstName' },
                { header: 'Last Name', accessor: 'lastName' },
                { header: 'Title', accessor: 'title' },
                { header: 'Employee ID', accessor: 'employeeId' },
             ]
        },
        'projects': { 
            customEditor: ProjectEditor,
            displayColumns: [
                { header: 'Name', accessor: 'name' },
                { header: 'Project ID', accessor: 'projectId' },
                { header: 'Status', accessor: 'status' },
                { header: 'Initial Budget', accessor: item => `$${Number(item.initialBudget || 0).toLocaleString()}` },
                { header: 'Blended Rate', accessor: item => `$${Number(item.blendedRate || 0).toFixed(2)}/hr` },
            ]
        },
        'assignments': {
            displayColumns: [
                { header: 'Employee', accessor: item => { const d = allData.detailers?.find(d => d.id === item.detailerId); return d ? `${d.firstName} ${d.lastName}` : item.detailerId || 'Unknown' } },
                { header: 'Project', accessor: item => allData.projects?.find(p => p.id === item.projectId)?.name || item.projectId || 'Unknown' },
                { header: 'Trade', accessor: 'trade' },
                { header: 'Dates', accessor: item => `${item.startDate} to ${item.endDate}` },
                { header: 'Allocation', accessor: item => `${item.allocation}%` },
            ],
            columns: [
                { header: 'Employee', accessor: 'detailerId', type: 'select', optionsSource: 'detailers', optionsLabel: item => `${item.firstName} ${item.lastName}`, optionsValue: 'id' },
                { header: 'Project', accessor: 'projectId', type: 'select', optionsSource: 'projects', optionsLabel: 'name', optionsValue: 'id' },
                { header: 'Trade', accessor: 'trade', type: 'text' },
                { header: 'Start Date', accessor: 'startDate', type: 'date' },
                { header: 'End Date', accessor: 'endDate', type: 'date' },
                { header: 'Allocation', accessor: 'allocation', type: 'number' },
            ]
        },
        'tasks': {
            displayColumns: [
                { header: 'Task Name', accessor: 'taskName' },
                { header: 'Project', accessor: item => allData.projects?.find(p => p.id === item.projectId)?.name || 'N/A' },
                { header: 'Assignee', accessor: item => { const d = allData.detailers?.find(d => d.id === item.detailerId); return d ? `${d.firstName} ${d.lastName}` : 'N/A' } },
                { header: 'Status', accessor: 'status' },
                { header: 'Due Date', accessor: 'dueDate' },
            ],
            columns: [
                { header: 'Task Name', accessor: 'taskName', type: 'text' },
                { header: 'Project', accessor: 'projectId', type: 'select', optionsSource: 'projects', optionsLabel: 'name', optionsValue: 'id' },
                { header: 'Assignee', accessor: 'detailerId', type: 'select', optionsSource: 'detailers', optionsLabel: item => `${item.firstName} ${item.lastName}`, optionsValue: 'id' },
                { header: 'Status', accessor: 'status', type: 'text' },
                { header: 'Due Date', accessor: 'dueDate', type: 'date' },
            ]
        },
        'taskLanes': { columns: [{ header: 'Name', accessor: 'name', type: 'text' }, { header: 'Order', accessor: 'order', type: 'number' }] },
        'jobFamilyData': { 
            customEditor: JobFamilyDataEditor,
            displayColumns: [
                { header: 'Title', accessor: 'title' },
                { header: 'Primary Responsibilities', accessor: item => item.primaryResponsibilities?.length || 0 },
                { header: 'Knowledge & Skills', accessor: item => item.knowledgeAndSkills?.length || 0 },
                { header: 'Years Experience', accessor: item => item.yearsOfExperiencePreferred?.[0] || 'N/A' },
            ]
        },
        'unionLocals': { columns: [{ header: 'Name', accessor: 'name', type: 'text' }] },
        'projectActivities': {
            customEditor: ProjectActivitiesEditor,
            displayColumns: [
                {
                    header: 'Project Name',
                    // --- FIX: Correct accessor for projectActivities ---
                    accessor: item => {
                        // The item.id *is* the projectId for this collection
                        return allData.projects?.find(p => p.id === item.id)?.name || item.id; // Use item.id for lookup
                    }
                    // --- END FIX ---
                }
            ]
        },
    }), [allData]); // Added allData dependency

    const handleSelectCollection = (name) => {
        setSelectedCollection(name);
        setSearchTerm('');
        setSortConfig({ key: null, direction: 'ascending' });
        setEditingItem(null);
        // Set default sort for specific collections
        if (name === 'detailers') setSortBy('lastName');
        else if (name === 'projects') setSortBy('projectId');
        else setSortBy('');
    };

    const confirmDelete = (collectionName, docId, name) => {
        setItemToDelete({ collectionName, docId, name });
    };

    const executeDelete = async () => {
        if (!itemToDelete) return;
        const { collectionName, docId } = itemToDelete;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, docId));
            showToast(`Successfully deleted item from ${collectionName}.`, 'success');
        } catch (error) {
            showToast(`Error deleting item: ${error.message}`, 'error');
            console.error("Error deleting document:", error);
        } finally {
            setItemToDelete(null);
        }
    };

    const handleSaveItem = async (collectionName, itemData) => {
        const { id, ...dataToSave } = itemData;
        const isNew = !id;

        try {
            if (isNew) {
                await addDoc(collection(db, `artifacts/${appId}/public/data/${collectionName}`), dataToSave);
                showToast("Item created successfully!", "success");
            } else {
                const docRef = doc(db, `artifacts/${appId}/public/data/${collectionName}`, id);
                await updateDoc(docRef, dataToSave);
                showToast("Item saved successfully!", "success");
            }
            setEditingItem(null);
        } catch (error) {
            showToast(`Error saving item: ${error.message}`, 'error');
            console.error("Error updating document:", error);
        }
    };

    // Header click sorting
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setSortBy(''); // Clear button-based sort
    };

    // Button-based sorting
    const handleSortBy = (key) => {
        setSortBy(key);
        setSortConfig({ key: null, direction: 'ascending' }); // Clear header-based sort
    };

    const filteredAndSortedData = useMemo(() => {
        const currentData = allData[selectedCollection] || [];
        const config = collectionConfig[selectedCollection];
        if (!config) return [];

        let data = [...currentData];

        const displayColumnsForFiltering = config.displayColumns || config.columns;

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            data = data.filter(item => {
                // --- FIX: Ensure displayColumnsForFiltering is defined before using .some ---
                return displayColumnsForFiltering && displayColumnsForFiltering.some(col => {
                // --- END FIX ---
                    const value = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
                    return String(value).toLowerCase().includes(lowercasedTerm);
                });
            });
        }

        // --- NEW SORTING LOGIC ---
        if (sortBy) { // Prioritize button-based sorting
            if (selectedCollection === 'detailers') {
                data.sort((a, b) => (a[sortBy] || '').localeCompare(b[sortBy] || '')); // Added safety checks for undefined
            } else if (selectedCollection === 'projects') {
                if (sortBy === 'projectId') {
                    data.sort((a, b) => (a.projectId || '').localeCompare(b.projectId || '', undefined, { numeric: true })); // Added safety checks
                } else { // sortBy === 'name'
                    data.sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Added safety checks
                }
            }
        } else if (sortConfig.key && displayColumnsForFiltering) { // Fallback to header-click sorting
            const sortColumn = displayColumnsForFiltering.find(c => c.header === sortConfig.key);
             if (sortColumn) {
                data.sort((a, b) => {
                    const aValue = typeof sortColumn.accessor === 'function' ? sortColumn.accessor(a) : a[sortColumn.accessor];
                    const bValue = typeof sortColumn.accessor === 'function' ? sortColumn.accessor(b) : b[sortColumn.accessor];

                    // --- FIX: Handle potential undefined/null values during comparison ---
                    const valA = aValue ?? ''; // Default to empty string if null/undefined
                    const valB = bValue ?? ''; // Default to empty string if null/undefined

                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    // --- END FIX ---
                    return 0;
                });
            }
        }
        // --- END NEW SORTING LOGIC ---

        return data;
    }, [allData, selectedCollection, collectionConfig, searchTerm, sortConfig, sortBy]);

    const config = collectionConfig[selectedCollection];
    const EditorComponent = editingItem?.collectionName ? collectionConfig[editingItem.collectionName]?.customEditor : null;

    // --- FIX: Moved useMemo for displayColumns *before* the conditional return ---
    const displayColumns = useMemo(() => {
        const currentConfig = collectionConfig[selectedCollection];
        if (!currentConfig) return [];

        // If displayColumns is explicitly defined, use it
        if (currentConfig.displayColumns) return currentConfig.displayColumns;

        // If customEditor exists but no displayColumns, provide defaults based on collection
        if (currentConfig.customEditor) {
            switch (selectedCollection) {
                case 'projects':
                    return [{ header: 'Project Name', accessor: 'name' }, { header: 'Project ID', accessor: 'projectId' }];
                case 'jobFamilyData':
                    return [{ header: 'Title', accessor: 'title' }];
                case 'projectActivities': // Added this case
                     return [{
                        header: 'Project Name',
                        accessor: item => allData.projects?.find(p => p.id === item.id)?.name || item.id
                    }];
                case 'detailers': // Added detailers default if needed
                    return [
                        { header: 'First Name', accessor: 'firstName' },
                        { header: 'Last Name', accessor: 'lastName' },
                        { header: 'Title', accessor: 'title' },
                        { header: 'Employee ID', accessor: 'employeeId' },
                    ];
                default:
                    // Fallback if custom editor has no explicit displayColumns or default case
                    return currentConfig.columns || [];
            }
        }

        // Otherwise, use the standard 'columns' definition
        return currentConfig.columns || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCollection, collectionConfig, allData.projects]); // Ensure dependencies are correct
    // --- END FIX ---

    // Conditional return for the editor component
    if (editingItem && EditorComponent) {
        return (
             <div className="p-4 h-full flex flex-col gap-4">
                 <EditorComponent
                    item={editingItem.item}
                    collectionName={editingItem.collectionName}
                    onBack={() => setEditingItem(null)}
                    onSave={(item) => handleSaveItem(editingItem.collectionName, item)}
                    currentTheme={currentTheme}
                    allData={allData}
                />
            </div>
        )
    }

    // Main component return
    return (
        <TutorialHighlight tutorialKey="database">
            <div className="p-4 h-full flex flex-col gap-4">
                <ConfirmationModal
                    isOpen={!!itemToDelete}
                    onClose={() => setItemToDelete(null)}
                    onConfirm={executeDelete}
                    title={`Confirm Deletion`}
                    currentTheme={currentTheme}
                >
                    Are you sure you want to permanently delete this item?
                    <br />
                    <strong>{itemToDelete?.name}</strong> from <strong>{itemToDelete?.collectionName}</strong>
                    <br />
                    This action cannot be undone.
                </ConfirmationModal>

                {editingItem && !EditorComponent && (
                    <GenericEditorModal
                        item={editingItem.item}
                        config={config}
                        onSave={(item) => handleSaveItem(selectedCollection, item)}
                        onCancel={() => setEditingItem(null)}
                        currentTheme={currentTheme}
                        allData={allData}
                    />
                )}


                <h1 className={`text-2xl font-bold ${currentTheme.textColor}`}>Database Console</h1>
                <TutorialHighlight tutorialKey="navigateCollections">
                    <div className={`p-2 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} shadow-sm`}>
                        <div className="flex flex-wrap gap-2">
                            {collectionsToFetch.map(name => (
                                <button
                                    key={name}
                                    onClick={() => handleSelectCollection(name)}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${selectedCollection === name ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                >
                                    {name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCollection === name ? 'bg-blue-800' : currentTheme.altRowBg}`}>{allData[name]?.length || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </TutorialHighlight>

                <div className={`flex-grow flex flex-col p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} shadow-sm min-h-0`}>
                    <TutorialHighlight tutorialKey="searchAndSortData">
                        <div className="flex-shrink-0 mb-4 flex justify-between items-center">
                            <input
                                type="text"
                                placeholder={`Search in ${selectedCollection}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full max-w-sm p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                            />
                            <div className="flex items-center gap-4">
                                {selectedCollection === 'detailers' && (
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${currentTheme.subtleText}`}>Sort by:</span>
                                        <button onClick={() => handleSortBy('firstName')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'firstName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>First Name</button>
                                        <button onClick={() => handleSortBy('lastName')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'lastName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Last Name</button>
                                    </div>
                                )}
                                {selectedCollection === 'projects' && (
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${currentTheme.subtleText}`}>Sort by:</span>
                                        <button onClick={() => handleSortBy('name')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'name' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Name</button>
                                        <button onClick={() => handleSortBy('projectId')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'projectId' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Project ID</button>
                                    </div>
                                )}
                                {/* Ensure config exists before checking customEditor */}
                                {config && !config.customEditor && (
                                    <TutorialHighlight tutorialKey="addDeleteData">
                                        <button onClick={() => setEditingItem({ item: {} })} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                            Add New {selectedCollection.slice(0, -1)}
                                        </button>
                                    </TutorialHighlight>
                                )}
                            </div>
                        </div>
                    </TutorialHighlight>
                    {loading ? <p>Loading data...</p> : (
                        <div className="flex-grow overflow-auto min-h-0 hide-scrollbar-on-hover" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className={`${currentTheme.headerBg} sticky top-0 z-10`}>
                                    <tr>
                                        {displayColumns?.map(col => (
                                            <th key={col.header} className={`p-2 font-semibold border ${currentTheme.borderColor} cursor-pointer`} onClick={() => requestSort(col.header)}>
                                                {col.header}
                                                {sortConfig.key === col.header && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                                            </th>
                                        ))}
                                        <th className={`p-2 font-semibold border ${currentTheme.borderColor}`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedData.map((item, index) => (
                                        <tr key={item.id} className={`hover:${currentTheme.altRowBg}`}>
                                        {displayColumns?.map(col => (
                                                <td key={`${item.id}-${col.header}`} className={`p-2 border ${currentTheme.borderColor} max-w-xs truncate`}>
                                                    {col.accessor ? (typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor]) : ''}
                                                </td>
                                            ))}
                                            <td className={`p-2 border ${currentTheme.borderColor} text-center`}>
                                                <div className="flex justify-center items-center gap-2">
                                                    <TutorialHighlight tutorialKey={index === 0 ? "editData" : ""}>
                                                        <button onClick={() => setEditingItem({ collectionName: selectedCollection, item: item })} className="text-blue-400 hover:underline">Edit</button>
                                                    </TutorialHighlight>
                                                    <TutorialHighlight tutorialKey={index === 0 ? "addDeleteData" : ""}>
                                                         {/* Ensure displayColumns exists before trying to access it */}
                                                        <button onClick={() => confirmDelete(selectedCollection, item.id, (displayColumns && displayColumns.length > 0 && displayColumns[0]?.accessor ? (typeof displayColumns[0].accessor === 'function' ? displayColumns[0].accessor(item) : item[displayColumns[0].accessor]) : item.id))} className="text-red-500 hover:text-red-700">Delete</button>
                                                    </TutorialHighlight>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </TutorialHighlight>
    );
};

export default DatabaseConsole;