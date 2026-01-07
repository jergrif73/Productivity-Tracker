import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';

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

const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && text && (
                <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md z-20 shadow-lg">
                    {text}
                </div>
            )}
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
                <h3 className="text-lg font-bold mb-4">Notes for {getTradeDisplayName(disciplineName)}</h3>
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

const SkillsConsole = ({ db, detailers, singleDetailerMode = false, currentTheme, appId, showToast }) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(singleDetailerMode && detailers[0] ? detailers[0].id : '');
    const [editableEmployee, setEditableEmployee] = useState(null);
    const [newDiscipline, setNewDiscipline] = useState('');
    const [draggedDiscipline, setDraggedDiscipline] = useState(null);
    const [dragOverDiscipline, setDragOverDiscipline] = useState(null);
    const [editingNoteFor, setEditingNoteFor] = useState(null);


    const skillCategories = ["Model Knowledge", "VDC Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
    const disciplineOptions = ["MH", "PL", "MP", "PP", "FP", "PJ", "ST", "Coord", "GIS/GPS", "VDC", "MGMT"];
    const titleOptions = [
        "Detailer I", "Detailer II", "Detailer III", "VDC Specialist", "Programmatic Detailer",
        "Project Constructability Lead", "Project Constructability Lead, Sr.",
        "Trade Constructability Lead", "Constructability Manager"
    ];

    useEffect(() => {
        const employee = detailers.find(d => d.id === selectedEmployeeId);
        if (employee) {
            let skills = employee.disciplineSkillsets;
            // Backward compatibility: Convert old object format to new array format
            if (skills && !Array.isArray(skills)) {
                skills = Object.entries(skills).map(([name, score]) => ({ name, score, note: '' }));
            }
            setEditableEmployee({ ...employee, disciplineSkillsets: skills || [] });
        } else {
            setEditableEmployee(null);
        }
    }, [selectedEmployeeId, detailers]);

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
        if (disciplineName !== dragOverDiscipline) {
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
        
        const updatedEmployee = {
            ...editableEmployee,
            disciplineSkillsets: skillsetsArray
        };

        setEditableEmployee(updatedEmployee);
        handleSaveChanges(updatedEmployee, false); // Autosave on reorder

        setDraggedDiscipline(null);
        setDragOverDiscipline(null);
    };

    const handleSaveChanges = async (employeeData = editableEmployee, showSuccessToast = true) => {
        if (!db || !employeeData) return;
        const employeeRef = doc(db, `artifacts/${appId}/public/data/detailers`, employeeData.id);
        const { id, ...dataToSave } = employeeData;
        try {
            await setDoc(employeeRef, dataToSave, { merge: true });
            if (showSuccessToast) showToast("Changes saved successfully!", "success");
        } catch (error) {
             console.error("Error saving employee data:", error);
             if (showToast) showToast("Failed to save changes.", "error");
        }
    };
    
    return (
        <div className={`${currentTheme.textColor} max-h-[75vh] overflow-y-auto hide-scrollbar-on-hover pr-4`}>
             {editingNoteFor && (
                <NoteEditorModal
                    disciplineName={editingNoteFor.name}
                    initialNote={editingNoteFor.note}
                    onSave={handleSaveDisciplineNote}
                    onClose={() => setEditingNoteFor(null)}
                    currentTheme={currentTheme}
                />
            )}
            <h2 className="text-xl font-bold mb-4">Modify Employee Skills & Info</h2>
            {!singleDetailerMode && (
                <div className="mb-4">
                    <select onChange={e => setSelectedEmployeeId(e.target.value)} value={selectedEmployeeId} className={`w-full max-w-xs p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                        <option value="" disabled>Select an employee...</option>
                        {detailers.map(e => (
                            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                        ))}
                    </select>
                </div>
            )}

            {editableEmployee && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Basic Info for {editableEmployee.firstName} {editableEmployee.lastName}</h3>
                        <div className="space-y-2">
                            <input value={editableEmployee.firstName} onChange={e => setEditableEmployee({...editableEmployee, firstName: e.target.value})} placeholder="First Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                            <input value={editableEmployee.lastName} onChange={e => setEditableEmployee({...editableEmployee, lastName: e.target.value})} placeholder="Last Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                            <input type="email" value={editableEmployee.email || ''} onChange={e => setEditableEmployee({...editableEmployee, email: e.target.value})} placeholder="Email" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                             <select value={editableEmployee.title || ''} onChange={e => setEditableEmployee({...editableEmployee, title: e.target.value})} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="" disabled>Select a Title</option>
                                {titleOptions.map(title => (
                                    <option key={title} value={title}>{title}</option>
                                ))}
                            </select>
                            <input value={editableEmployee.employeeId} onChange={e => setEditableEmployee({...editableEmployee, employeeId: e.target.value})} placeholder="Employee ID" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Skill Assessment</h3>
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
                        <h3 className="text-lg font-semibold mb-2">Discipline Skillsets</h3>
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
                                            <span className="font-medium">{getTradeDisplayName(discipline.name)}</span>
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

                    <button onClick={() => handleSaveChanges()} className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600 mt-4">Save All Changes</button>
                </div>
            )}
        </div>
    );
};

export default SkillsConsole;