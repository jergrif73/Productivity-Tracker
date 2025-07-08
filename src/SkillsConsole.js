import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';

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

    const skillCategories = ["Model Knowledge", "BIM Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
    const disciplineOptions = ["Duct", "Plumbing", "Piping", "Structural", "Coordination", "GIS/GPS", "BIM"];
    const titleOptions = [
        "Detailer I", "Detailer II", "Detailer III", "BIM Specialist", "Programmatic Detailer",
        "Project Constructability Lead", "Project Constructability Lead, Sr.",
        "Trade Constructability Lead", "Constructability Manager"
    ];

    useEffect(() => {
        const employee = detailers.find(d => d.id === selectedEmployeeId);
        if (employee) {
            setEditableEmployee({ ...employee });
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
            const currentDisciplines = editableEmployee.disciplineSkillsets || {};
            if (!currentDisciplines.hasOwnProperty(newDiscipline)) {
                setEditableEmployee(prev => ({
                    ...prev,
                    disciplineSkillsets: { ...(prev.disciplineSkillsets || {}), [newDiscipline]: 0 }
                }));
                setNewDiscipline('');
            }
        }
    };
    
    const handleRemoveDiscipline = (disciplineToRemove) => {
        setEditableEmployee(prev => {
            const { [disciplineToRemove]: _, ...remaining } = prev.disciplineSkillsets;
            return { ...prev, disciplineSkillsets: remaining };
        });
    };
    
    const handleDisciplineRatingChange = (name, score) => {
        setEditableEmployee(prev => ({
            ...prev,
            disciplineSkillsets: {
                ...prev.disciplineSkillsets,
                [name]: score,
            },
        }));
    };

    const handleSaveChanges = async () => {
        if (!db || !editableEmployee) return;
        const employeeRef = doc(db, `artifacts/${appId}/public/data/detailers`, editableEmployee.id);
        const { id, ...dataToSave } = editableEmployee;
        await setDoc(employeeRef, dataToSave, { merge: true });
        showToast("Changes saved successfully!");
    };
    
    return (
        <div className={currentTheme.textColor}>
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
                            {Object.entries(editableEmployee.disciplineSkillsets || {}).map(([name, score]) => (
                                <div key={name} className={`p-3 ${currentTheme.altRowBg} rounded-md border ${currentTheme.borderColor}`}>
                                    <div className="flex justify-between items-start">
                                       <span className="font-medium">{name}</span>
                                       <button onClick={() => handleRemoveDiscipline(name)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                                    </div>
                                    <BubbleRating score={score} onScoreChange={(newScore) => handleDisciplineRatingChange(name, newScore)} currentTheme={currentTheme} />
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

export default SkillsConsole;