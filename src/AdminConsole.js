import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot, setDoc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion'; // Import Framer Motion
import { TutorialHighlight } from './App'; // Import TutorialHighlight

// --- Helper Components ---

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

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

const EditEmployeeModal = ({ employee, onSave, onClose, currentTheme, unionLocals }) => {
    const [editableEmployee, setEditableEmployee] = useState(null);
    const [newDiscipline, setNewDiscipline] = useState('');
    const [draggedDiscipline, setDraggedDiscipline] = useState(null);
    const [dragOverDiscipline, setDragOverDiscipline] = useState(null);

    const skillCategories = ["Model Knowledge", "BIM Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
    const disciplineOptions = ["Duct", "Plumbing", "Piping", "Structural", "Coordination", "GIS/GPS", "BIM"];
    const titleOptions = [
        "Detailer I", "Detailer II", "Detailer III", "BIM Specialist", "Programmatic Detailer",
        "Project Constructability Lead", "Project Constructability Lead, Sr.",
        "Trade Constructability Lead", "Constructability Manager"
    ];
    
    useEffect(() => {
        if (employee) {
            let skills = employee.disciplineSkillsets;
            if (skills && !Array.isArray(skills)) {
                skills = Object.entries(skills).map(([name, score]) => ({ name, score }));
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
                    disciplineSkillsets: [...(prev.disciplineSkillsets || []), { name: newDiscipline, score: 0 }]
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
                            {unionLocals.map(local => (
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


const titleOptions = [
    "Detailer I", "Detailer II", "Detailer III", "BIM Specialist", "Programmatic Detailer",
    "Project Constructability Lead", "Project Constructability Lead, Sr.",
    "Trade Constructability Lead", "Constructability Manager"
];

const projectStatuses = ["Planning", "Conducting", "Controlling", "Archive"];
const disciplineOptions = ["Duct", "Piping", "Plumbing", "BIM", "Structural", "Coordination", "GIS/GPS"];

const statusDescriptions = {
    Planning: "Estimated",
    Conducting: "Booked but not Sold",
    Controlling: "Operational",
    Archive: "Completed"
};

const WeeklyTimeline = ({ project, db, appId, currentTheme, showToast }) => {
    const [startDate, setStartDate] = useState(new Date());
    const [weeklyHours, setWeeklyHours] = useState({});
    const [activeTrades, setActiveTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newTrade, setNewTrade] = useState('');

    const [dragState, setDragState] = useState(null);
    const dragStateRef = useRef(null);

    useEffect(() => {
        dragStateRef.current = dragState;
    }, [dragState]);

    const weekCount = 52;

    const getWeekDates = (from, count) => {
        const monday = new Date(from);
        monday.setHours(0, 0, 0, 0);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        monday.setDate(diff);

        const weeks = [];
        for (let i = 0; i < count; i++) {
            const weekStart = new Date(monday);
            weekStart.setDate(monday.getDate() + (i * 7));
            weeks.push(weekStart.toISOString().split('T')[0]);
        }
        return weeks;
    };

    const weekDates = useMemo(() => getWeekDates(startDate, weekCount), [startDate]);
    
    useEffect(() => {
        setLoading(true);
        const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
        const unsubscribe = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().activeTrades) {
                setActiveTrades(docSnap.data().activeTrades);
            } else {
                setActiveTrades([]);
            }
        });

        const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`);
        const unsubscribeHours = onSnapshot(weeklyHoursRef, (snapshot) => {
            const hoursData = {};
            snapshot.docs.forEach(doc => {
                if (doc.id !== '_config') {
                    hoursData[doc.id] = doc.data();
                }
            });
            setWeeklyHours(hoursData);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            unsubscribeHours();
        };
    }, [project.id, db, appId]);

    const handleHoursChange = (trade, week, hours) => {
        const newWeeklyHours = {
            ...weeklyHours,
            [trade]: {
                ...weeklyHours[trade],
                [week]: parseInt(hours, 10) || 0,
            }
        };
        setWeeklyHours(newWeeklyHours);
    };

    const debouncedWeeklyHours = useDebounce(weeklyHours, 1500);

    useEffect(() => {
        if (loading || !project.id || Object.keys(debouncedWeeklyHours).length === 0) return;
        const saveData = async () => {
            const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`);
            const promises = Object.entries(debouncedWeeklyHours).map(([trade, weekData]) => {
                if (activeTrades.includes(trade)) {
                    return setDoc(doc(weeklyHoursRef, trade), weekData, { merge: true });
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
        };
        saveData();
    }, [debouncedWeeklyHours, activeTrades, project.id, loading, db, appId]);

    const handleAddTrade = async () => {
        if (newTrade && !activeTrades.includes(newTrade)) {
            const updatedTrades = [...activeTrades, newTrade];
            const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
            await setDoc(configRef, { activeTrades: updatedTrades });
            setIsAdding(false);
            setNewTrade('');
        }
    };

    const handleDeleteTrade = async (tradeToDelete) => {
        const updatedTrades = activeTrades.filter(t => t !== tradeToDelete);
        const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
        await setDoc(configRef, { activeTrades: updatedTrades });

        const tradeHoursRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, tradeToDelete);
        await deleteDoc(tradeHoursRef);
    };

    const handleMouseEnter = (trade, week) => {
        const currentDragState = dragStateRef.current;
        if (!currentDragState || currentDragState.startTrade !== trade) return;
        
        const startIndex = weekDates.indexOf(currentDragState.startWeek);
        const currentIndex = weekDates.indexOf(week);
        
        const newSelection = {};
        const min = Math.min(startIndex, currentIndex);
        const max = Math.max(startIndex, currentIndex);

        for(let i = min; i <= max; i++) {
            newSelection[weekDates[i]] = true;
        }

        setDragState(prev => ({ ...prev, selection: newSelection }));
    };

    const handleMouseUp = useCallback(() => {
        const currentDragState = dragStateRef.current;
        if (!currentDragState) return;

        const { startTrade, fillValue, selection } = currentDragState;
        
        setWeeklyHours(prevWeeklyHours => {
            const updatedHours = { ...(prevWeeklyHours[startTrade] || {}) };
            Object.keys(selection).forEach(weekKey => {
                updatedHours[weekKey] = fillValue;
            });
            return {
                ...prevWeeklyHours,
                [startTrade]: updatedHours
            };
        });

        setDragState(null);
    }, []);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseUp]);
    
    const handlePaste = (event, startTrade, startWeekDate) => {
        event.preventDefault();
        const pasteData = event.clipboardData.getData('text');
        const rows = pasteData.split(/\r?\n/).filter(row => row.length > 0);
        const parsedData = rows.map(row => row.split('\t'));

        const startTradeIndex = activeTrades.indexOf(startTrade);
        const startWeekIndex = weekDates.indexOf(startWeekDate);

        if (startTradeIndex === -1 || startWeekIndex === -1) return;

        const newWeeklyHours = { ...weeklyHours };

        parsedData.forEach((rowData, rowIndex) => {
            const currentTradeIndex = startTradeIndex + rowIndex;
            if (currentTradeIndex < activeTrades.length) {
                const currentTrade = activeTrades[currentTradeIndex];
                if (!newWeeklyHours[currentTrade]) {
                    newWeeklyHours[currentTrade] = {};
                }

                rowData.forEach((cellData, colIndex) => {
                    const currentWeekIndex = startWeekIndex + colIndex;
                    if (currentWeekIndex < weekDates.length) {
                        const currentWeek = weekDates[currentWeekIndex];
                        const value = parseInt(cellData, 10);
                        if (!isNaN(value)) {
                            newWeeklyHours[currentTrade][currentWeek] = value;
                        }
                    }
                });
            }
        });
        setWeeklyHours(newWeeklyHours);
    };

    const handleDateNav = (offset) => {
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };

    const availableTrades = disciplineOptions.filter(opt => !activeTrades.includes(opt));

    return (
        <TutorialHighlight tutorialKey="weeklyForecast">
            <div className="mt-4 pt-4 border-t border-gray-500/50 space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end items-center gap-2 mb-2">
                    <button onClick={() => handleDateNav(-28)} className={`p-1 text-xs rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<< 4w'}</button>
                    <button onClick={() => setStartDate(new Date())} className={`p-1 px-2 text-xs border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                    <button onClick={() => handleDateNav(28)} className={`p-1 text-xs rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'4w >>'}</button>
                </div>
                <div className="overflow-x-auto hide-scrollbar-on-hover">
                    <table className="min-w-full text-sm text-center border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className={`p-2 font-semibold border ${currentTheme.borderColor} ${currentTheme.headerBg} sticky left-0 z-20`}>Trade</th>
                                {weekDates.map(week => (
                                    <th key={week} className={`p-2 font-semibold border ${currentTheme.borderColor} ${currentTheme.headerBg}`}>
                                        {new Date(week + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeTrades.map(trade => (
                                <tr key={trade}>
                                    <td className={`p-2 font-semibold border ${currentTheme.borderColor} ${currentTheme.altRowBg} sticky left-0 z-10`}>
                                        <div className="flex justify-between items-center">
                                            <span>{trade}</span>
                                            <button onClick={() => handleDeleteTrade(trade)} className="text-red-500 hover:text-red-700 ml-2 font-bold text-lg">&times;</button>
                                        </div>
                                    </td>
                                    {weekDates.map((week, weekIndex) => {
                                        const isSelected = dragState?.startTrade === trade && dragState?.selection[week];
                                        return (
                                        <td key={`${trade}-${week}`} 
                                            className={`p-0 border relative ${currentTheme.borderColor}`} 
                                            onMouseEnter={() => handleMouseEnter(trade, week)}
                                            onPaste={(e) => handlePaste(e, trade, week)}
                                        >
                                            <input
                                                type="number"
                                                value={weeklyHours[trade]?.[week] || ''}
                                                onChange={(e) => handleHoursChange(trade, week, e.target.value)}
                                                disabled={loading}
                                                className={`w-full h-full p-1 text-center bg-transparent focus:bg-blue-200 focus:text-black outline-none no-arrows ${currentTheme.inputText} ${isSelected ? 'bg-blue-300/50' : ''}`}
                                            />
                                            <div 
                                                className="absolute bottom-0 right-0 w-2 h-2 bg-blue-600 cursor-crosshair"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); e.stopPropagation();
                                                    const valueToFill = weeklyHours[trade]?.[week] || 0;
                                                    setDragState({ 
                                                        startTrade: trade,
                                                        startWeek: week, 
                                                        fillValue: valueToFill,
                                                        selection: { [week]: true }
                                                    });
                                                }}
                                            ></div>
                                        </td>
                                    )})}
                                </tr>
                            ))}
                            {isAdding && (
                                <tr>
                                    <td className={`p-2 border ${currentTheme.borderColor} ${currentTheme.altRowBg} sticky left-0 z-10`}>
                                        <div className="flex gap-2">
                                            <select value={newTrade} onChange={(e) => setNewTrade(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                                <option value="">Select a trade...</option>
                                                {availableTrades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            <button onClick={handleAddTrade} className="bg-green-500 text-white px-4 py-2 rounded-md">Add</button>
                                            <button onClick={() => setIsAdding(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md">Cancel</button>
                                        </div>
                                    </td>
                                    <td colSpan={weekDates.length}></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {!isAdding && <button onClick={() => setIsAdding(true)} className="text-sm text-blue-500 hover:underline mt-2">+ Add Trade</button>}
            </div>
        </TutorialHighlight>
    );
};

const AdminConsole = ({ db, detailers, projects, currentTheme, appId, showToast }) => {
    const [newEmployee, setNewEmployee] = useState({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '', wage: '', percentAboveScale: '', unionLocal: '' });
    const [newProject, setNewProject] = useState({ name: '', projectId: '', initialBudget: 0, blendedRate: 0, bimBlendedRate: 0, contingency: 0, dashboardUrl: '', status: 'Planning' });
    
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectData, setEditingProjectData] = useState(null);
    const [employeeSortBy, setEmployeeSortBy] = useState('firstName');
    const [projectSortBy, setProjectSortBy] = useState('projectId');
    const [activeStatuses, setActiveStatuses] = useState(["Planning", "Conducting", "Controlling"]);
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({ addEmployee: true, addProject: true });
    const [confirmAction, setConfirmAction] = useState(null);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [projectSearchTerm, setProjectSearchTerm] = useState('');
    
    const [unionLocals, setUnionLocals] = useState([]);
    const [newUnionLocalName, setNewUnionLocalName] = useState('');
    const [editingUnionLocal, setEditingUnionLocal] = useState(null);
    const [showUnionManagement, setShowUnionManagement] = useState(false);

    // Fetch and manage Union Locals
    useEffect(() => {
        const unionLocalsRef = collection(db, `artifacts/${appId}/public/data/unionLocals`);
        
        const checkForInitialData = async () => {
            const querySnapshot = await getDocs(unionLocalsRef);
            if (querySnapshot.empty) {
                const initialLocals = [
                    { name: 'UA Local 290' },
                    { name: 'UA Local 598' },
                    { name: 'SMART Local 55' },
                    { name: 'SMART Local 16' }
                ];
                const batch = [];
                initialLocals.forEach(local => {
                    batch.push(addDoc(unionLocalsRef, local));
                });
                await Promise.all(batch);
            }
        };

        checkForInitialData();

        const unsubscribe = onSnapshot(unionLocalsRef, (snapshot) => {
            const localsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUnionLocals(localsData.sort((a, b) => a.name.localeCompare(b.name)));
        });

        return () => unsubscribe();
    }, [db, appId]);

    const handleAddUnionLocal = async () => {
        if (newUnionLocalName.trim() === '') return;
        const unionLocalsRef = collection(db, `artifacts/${appId}/public/data/unionLocals`);
        await addDoc(unionLocalsRef, { name: newUnionLocalName.trim() });
        setNewUnionLocalName('');
    };

    const handleUpdateUnionLocal = async () => {
        if (!editingUnionLocal || editingUnionLocal.name.trim() === '') {
            setEditingUnionLocal(null);
            return;
        };
        const unionLocalRef = doc(db, `artifacts/${appId}/public/data/unionLocals`, editingUnionLocal.id);
        await updateDoc(unionLocalRef, { name: editingUnionLocal.name.trim() });
        setEditingUnionLocal(null);
    };

    const handleDeleteUnionLocal = async (id) => {
        const unionLocalRef = doc(db, `artifacts/${appId}/public/data/unionLocals`, id);
        await deleteDoc(unionLocalRef);
    };


    const handleToggleCollapse = (section) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

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
        } catch (error) {
            console.error("Error updating project status:", error);
        }
    };

    const filteredEmployees = useMemo(() => {
        const sorted = [...detailers].sort((a, b) => {
            if (employeeSortBy === 'lastName') {
                return a.lastName.localeCompare(b.lastName);
            }
            return a.firstName.localeCompare(b.firstName);
        });

        if (!employeeSearchTerm) return sorted;

        const lowercasedTerm = employeeSearchTerm.toLowerCase();
        return sorted.filter(e => 
            e.firstName.toLowerCase().includes(lowercasedTerm) ||
            e.lastName.toLowerCase().includes(lowercasedTerm) ||
            e.employeeId.includes(lowercasedTerm) ||
            (e.email || '').toLowerCase().includes(lowercasedTerm)
        );
    }, [detailers, employeeSortBy, employeeSearchTerm]);

    const filteredProjects = useMemo(() => {
        const sorted = [...projects]
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
        
        if (!projectSearchTerm) return sorted;

        const lowercasedTerm = projectSearchTerm.toLowerCase();
        return sorted.filter(p => 
            p.name.toLowerCase().includes(lowercasedTerm) ||
            p.projectId.toLowerCase().includes(lowercasedTerm)
        );
    }, [projects, projectSortBy, activeStatuses, projectSearchTerm]);


    const handleAdd = async (type) => {
        if (!db) return;
        if (type === 'employee') {
            if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.employeeId) {
                console.error('Please fill all employee fields.');
                return;
            }
            await addDoc(collection(db, `artifacts/${appId}/public/data/detailers`), { ...newEmployee, wage: Number(newEmployee.wage) || 0, percentAboveScale: Number(newEmployee.percentAboveScale) || 0, skills: {}, disciplineSkillsets: {} });
            setNewEmployee({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '', wage: '', percentAboveScale: '', unionLocal: '' });
        } else if (type === 'project') {
            if (!newProject.name || !newProject.projectId) {
                console.error('Please fill all project fields.');
                return;
            }
            const payload = {
                ...newProject,
                initialBudget: Number(newProject.initialBudget),
                blendedRate: Number(newProject.blendedRate),
                bimBlendedRate: Number(newProject.bimBlendedRate),
                contingency: Number(newProject.contingency),
                archived: newProject.status === "Archive",
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/projects`), payload);
            setNewProject({ name: '', projectId: '', initialBudget: 0, blendedRate: 0, bimBlendedRate: 0, contingency: 0, dashboardUrl: '', status: 'Planning' });
        }
    };

    const handleDelete = async (type, id) => {
        const collectionName = type === 'employee' ? 'detailers' : 'projects';
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id));
        setConfirmAction(null);
    };
    
    const confirmDelete = (type, item) => {
        const name = type === 'employee' ? `${item.firstName} ${item.lastName}` : item.name;
        setConfirmAction({
            title: `Delete ${type}`,
            message: `Are you sure you want to permanently delete ${name}? This action cannot be undone.`,
            action: () => handleDelete(type, item.id)
        });
    };
    
    const handleEditProject = (project) => {
        setEditingProjectId(project.id);
        setEditingProjectData({ status: "Controlling", ...project });
    };

    const handleUpdateProject = async () => {
        if (!editingProjectData) return;
        const { id, ...data } = editingProjectData;
        const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, id);
        await updateDoc(projectRef, {
            ...data,
            initialBudget: Number(data.initialBudget),
            blendedRate: Number(data.blendedRate),
            bimBlendedRate: Number(data.bimBlendedRate),
            contingency: Number(data.contingency),
            archived: data.status === "Archive",
        });
        setEditingProjectId(null);
        setEditingProjectData(null);
    };

    const handleUpdateEmployee = async (employeeData) => {
        const { id, ...data } = employeeData;
        const employeeRef = doc(db, `artifacts/${appId}/public/data/detailers`, id);
        await updateDoc(employeeRef, {...data, wage: Number(data.wage) || 0, percentAboveScale: Number(data.percentAboveScale) || 0});
    };
    
    const handleEditDataChange = (e, type) => {
        const { name, value } = e.target;
        if (type === 'project') {
            setEditingProjectData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const isEditing = editingEmployee || editingProjectId;

    return (
        <TutorialHighlight tutorialKey="admin">
            <div className="p-4">
                {editingEmployee && (
                    <EditEmployeeModal 
                        employee={editingEmployee}
                        onSave={handleUpdateEmployee}
                        onClose={() => setEditingEmployee(null)}
                        currentTheme={currentTheme}
                        unionLocals={unionLocals}
                    />
                )}
                <ConfirmationModal
                    isOpen={!!confirmAction}
                    onClose={() => setConfirmAction(null)}
                    onConfirm={() => {
                        if(confirmAction?.action) confirmAction.action();
                    }}
                    title={confirmAction?.title}
                    currentTheme={currentTheme}
                >
                    {confirmAction?.message}
                </ConfirmationModal>

                <style>{`.no-arrows::-webkit-inner-spin-button,.no-arrows::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}.no-arrows{-moz-appearance:textfield;}`}</style>

                <AnimatePresence mode="wait">
                    {expandedProjectId ? (
                        <motion.div
                            key="timeline"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto', transition: { type: "spring", stiffness: 200, damping: 25 } }}
                            exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                            className="overflow-hidden"
                        >
                            <div className={`p-4 ${currentTheme.consoleBg} h-full`}>
                                <div 
                                    className="cursor-pointer mb-4" 
                                    onClick={() => setExpandedProjectId(null)}
                                >
                                    <h2 className="text-2xl font-bold text-blue-500 hover:underline">&larr; Back to All Projects</h2>
                                    <p className="text-lg font-semibold">{projects.find(p => p.id === expandedProjectId)?.name} ({projects.find(p => p.id === expandedProjectId)?.projectId})</p>
                                </div>
                                <TutorialHighlight tutorialKey="weeklyForecast">
                                    <WeeklyTimeline 
                                        project={projects.find(p => p.id === expandedProjectId)}
                                        db={db}
                                        appId={appId}
                                        currentTheme={currentTheme}
                                        showToast={showToast}
                                    />
                                </TutorialHighlight>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className={`py-2`}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <TutorialHighlight tutorialKey="manageEmployees">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-xl font-bold">Manage Employees</h2>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">Sort by:</span>
                                                <button onClick={() => setEmployeeSortBy('firstName')} className={`px-2 py-1 text-xs rounded-md ${employeeSortBy === 'firstName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>First</button>
                                                <button onClick={() => setEmployeeSortBy('lastName')} className={`px-2 py-1 text-xs rounded-md ${employeeSortBy === 'lastName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Last</button>
                                            </div>
                                        </div>
                                    </TutorialHighlight>
                                    <TutorialHighlight tutorialKey="manageProjects">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-xl font-bold">Manage Projects</h2>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">Sort by:</span>
                                                <button onClick={() => setProjectSortBy('name')} className={`px-2 py-1 text-xs rounded-md ${projectSortBy === 'name' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Alpha</button>
                                                <button onClick={() => setProjectSortBy('projectId')} className={`px-2 py-1 text-xs rounded-md ${projectSortBy === 'projectId' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>ID</button>
                                            </div>
                                        </div>
                                    </TutorialHighlight>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                                    <input type="text" placeholder="Search employees..." value={employeeSearchTerm} onChange={(e) => setEmployeeSearchTerm(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                    <TutorialHighlight tutorialKey="projectStatusImpact">
                                        <div className="flex items-center gap-2">
                                            <input type="text" placeholder="Search projects..." value={projectSearchTerm} onChange={(e) => setProjectSearchTerm(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                            {projectStatuses.map(status => (
                                                <Tooltip key={status} text={statusDescriptions[status]}>
                                                    <button 
                                                        onClick={() => handleStatusFilterToggle(status)}
                                                        className={`px-3 py-1 text-xs rounded-full transition-colors ${activeStatuses.includes(status) ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                                    >
                                                        {status.charAt(0)}
                                                    </button>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </TutorialHighlight>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 overflow-y-auto h-[calc(100vh-250px)] hide-scrollbar-on-hover"> 
                                <div>
                                    <TutorialHighlight tutorialKey="addEmployeeFields">
                                        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4`}>
                                            <button onClick={() => handleToggleCollapse('addEmployee')} className="w-full flex justify-between items-center font-semibold mb-2">
                                                <h3>Add New Employee</h3>
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${collapsedSections.addEmployee ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {!collapsedSections.addEmployee && (
                                                <div className={`mt-2 pt-4 border-t ${currentTheme.borderColor} ${isEditing ? 'opacity-50' : ''}`}>
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
                                                        <input type="number" value={newEmployee.wage} onChange={e => setNewEmployee({...newEmployee, wage: e.target.value})} placeholder="Wage/hr" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                                                        <input type="number" value={newEmployee.percentAboveScale} onChange={e => setNewEmployee({...newEmployee, percentAboveScale: e.target.value})} placeholder="% Above Scale" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                                                        <TutorialHighlight tutorialKey="manageUnionLocals">
                                                            <div className="flex items-center gap-2">
                                                                <select value={newEmployee.unionLocal} onChange={e => setNewEmployee({...newEmployee, unionLocal: e.target.value})} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing}>
                                                                    <option value="">Select Union Local...</option>
                                                                    {unionLocals.map(local => (
                                                                        <option key={local.id} value={local.name}>{local.name}</option>
                                                                    ))}
                                                                </select>
                                                                <button type="button" onClick={() => setShowUnionManagement(!showUnionManagement)} className={`text-sm p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} flex-shrink-0`}>Manage</button>
                                                            </div>
                                                        </TutorialHighlight>
                                                        <AnimatePresence>
                                                        {showUnionManagement && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="mt-2 pt-2 border-t border-dashed border-gray-500/50"
                                                            >
                                                                <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                                                                    {unionLocals.map((local, index) => {
                                                                        const bgColor = index % 2 === 0 ? 'bg-transparent' : 'bg-white/5';
                                                                        return (
                                                                            <div key={local.id} className={`flex justify-between items-center p-2 rounded-md ${bgColor}`}>
                                                                                {editingUnionLocal?.id === local.id ? (
                                                                                    <input 
                                                                                        type="text"
                                                                                        value={editingUnionLocal.name}
                                                                                        onChange={(e) => setEditingUnionLocal({...editingUnionLocal, name: e.target.value})}
                                                                                        onBlur={handleUpdateUnionLocal}
                                                                                        onKeyPress={e => e.key === 'Enter' && handleUpdateUnionLocal()}
                                                                                        className={`w-full p-1 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                                                                        autoFocus
                                                                                    />
                                                                                ) : (
                                                                                    <p className="text-sm">{local.name}</p>
                                                                                )}
                                                                                <div className="flex gap-2">
                                                                                    <button onClick={() => setEditingUnionLocal(local)} className="text-blue-500 hover:text-blue-700 text-xs">Edit</button>
                                                                                    <button onClick={() => handleDeleteUnionLocal(local.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <input value={newUnionLocalName} onChange={e => setNewUnionLocalName(e.target.value)} placeholder="New Union Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                                                    <button onClick={handleAddUnionLocal} className="bg-blue-500 text-white px-4 rounded-md hover:bg-blue-600 text-sm">Add</button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                        </AnimatePresence>
                                                    </div>
                                                    <button onClick={() => handleAdd('employee')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600" disabled={isEditing}>Add Employee</button>
                                                </div>
                                            )}
                                        </div>
                                    </TutorialHighlight>
                                    <TutorialHighlight tutorialKey="editEmployeeDetails">
                                        <div className="space-y-2">
                                            {filteredEmployees.map((e, index) => {
                                                const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;
                                                return (
                                                <div key={e.id} className={`${bgColor} p-3 border ${currentTheme.borderColor} rounded-md shadow-sm`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold">{e.firstName} {e.lastName}</p>
                                                            <p className={`text-sm ${currentTheme.subtleText}`}>{e.title || 'N/A'} ({e.employeeId})</p>
                                                            <p className={`text-xs ${currentTheme.subtleText}`}>
                                                                Wage: ${e.wage || 0}/hr | % Above Scale: {e.percentAboveScale || 0}% | Union: {e.unionLocal || 'N/A'}
                                                            </p>
                                                            <a href={`mailto:${e.email}`} className="text-xs text-blue-500 hover:underline">{e.email}</a>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setEditingEmployee(e)} className="text-blue-500 hover:text-blue-700" disabled={isEditing}>Edit</button>
                                                            <button onClick={() => confirmDelete('employee', e)} className="text-red-500 hover:text-red-700" disabled={isEditing}>Delete</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    </TutorialHighlight>
                                </div>

                                <div>
                                    <TutorialHighlight tutorialKey="addProjectFields">
                                        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4`}>
                                            <button onClick={() => handleToggleCollapse('addProject')} className="w-full flex justify-between items-center font-semibold mb-2">
                                                <h3>Add New Project</h3>
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${collapsedSections.addProject ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {!collapsedSections.addProject && (
                                                <div className={`mt-2 pt-4 border-t ${currentTheme.borderColor} ${isEditing ? 'opacity-50' : ''}`}>
                                                    <div className="space-y-2 mb-4">
                                                        <input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="Project Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                                                        <input value={newProject.projectId} onChange={e => setNewProject({...newProject, projectId: e.target.value})} placeholder="Project ID" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                                                        <select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing}>
                                                            {projectStatuses.map(status => (
                                                                <option key={status} value={status}>{status}</option>
                                                            ))}
                                                        </select>
                                                        <div className="flex items-center gap-2"><label className="w-32">Initial Budget ($):</label><input type="number" value={newProject.initialBudget} onChange={e => setNewProject({...newProject, initialBudget: e.target.value})} placeholder="e.g. 50000" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                        <div className="flex items-center gap-2"><label className="w-32">Blended Rate ($/hr):</label><input type="number" value={newProject.blendedRate} onChange={e => setNewProject({...newProject, blendedRate: e.target.value})} placeholder="e.g. 75" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                        <div className="flex items-center gap-2"><label className="w-32">BIM Blended Rate ($/hr):</label><input type="number" value={newProject.bimBlendedRate} onChange={e => setNewProject({...newProject, bimBlendedRate: e.target.value})} placeholder="e.g. 95" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                        <div className="flex items-center gap-2"><label className="w-32">Contingency ($):</label><input type="number" value={newProject.contingency} onChange={e => setNewProject({...newProject, contingency: e.target.value})} placeholder="e.g. 5000" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                        <div className="flex items-center gap-2"><label className="w-32">Project Dashboard:</label><input type="url" value={newProject.dashboardUrl} onChange={e => setNewProject({...newProject, dashboardUrl: e.target.value})} placeholder="https://..." className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                    </div>
                                                    <button onClick={() => handleAdd('project')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600" disabled={isEditing}>Add Project</button>
                                                </div>
                                            )}
                                        </div>
                                    </TutorialHighlight>
                                    <TutorialHighlight tutorialKey="editProjectDetails">
                                        <div className="space-y-2 mb-8">
                                            {filteredProjects.map((p, index) => {
                                                const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;
                                                const currentStatus = p.status || (p.archived ? "Archive" : "Controlling");
                                                return (
                                                    <div key={p.id} className={`${bgColor} p-3 border ${currentTheme.borderColor} rounded-md shadow-sm`}>
                                                    {editingProjectId === p.id ? (
                                                        <div className="space-y-2">
                                                            <input name="name" value={editingProjectData.name} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                            <input name="projectId" value={editingProjectData.projectId} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                            <select name="status" value={editingProjectData.status} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                                                {projectStatuses.map(status => (<option key={status} value={status}>{status}</option>))}
                                                            </select>
                                                            <div className="flex items-center gap-2"><label className="w-32">Initial Budget ($):</label><input name="initialBudget" value={editingProjectData.initialBudget || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Initial Budget ($)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">Blended Rate ($/hr):</label><input name="blendedRate" value={editingProjectData.blendedRate || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Blended Rate ($/hr)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">BIM Blended Rate ($/hr):</label><input name="bimBlendedRate" value={editingProjectData.bimBlendedRate || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="BIM Blended Rate ($/hr)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">Contingency ($):</label><input name="contingency" value={editingProjectData.contingency || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Contingency ($)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">Project Dashboard:</label><input name="dashboardUrl" value={editingProjectData.dashboardUrl || ''} onChange={e => handleEditDataChange(e, 'project')} placeholder="https://..." className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                            <div className="flex gap-2 pt-4"><button onClick={() => handleUpdateProject()} className="flex-grow bg-green-500 text-white p-2 rounded-md hover:bg-green-600">Save</button><button onClick={() => setEditingProjectId(null)} className="flex-grow bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Cancel</button></div>
                                                        </div>
                                                    ) : (
                                                        <div className="cursor-pointer" onClick={() => setExpandedProjectId(p.id)}>
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <p className="font-semibold">{p.name} ({p.projectId})</p>
                                                                    <p className={`text-xs ${currentTheme.subtleText}`}>Budget: {formatCurrency(p.initialBudget)} | Rate: ${p.blendedRate || 0}/hr | BIM Rate: ${p.bimBlendedRate || 0}/hr | Contingency: {formatCurrency(p.contingency)}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    {projectStatuses.map(status => (<Tooltip key={status} text={statusDescriptions[status]}><button onClick={(e) => { e.stopPropagation(); handleProjectStatusChange(p.id, status); }} className={`px-2 py-1 text-xs rounded-md transition-colors ${currentStatus === status ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-blue-400`}`}>{status.charAt(0)}</button></Tooltip>))}
                                                                    <button onClick={(e) => { e.stopPropagation(); handleEditProject(p); }} className="ml-2 text-blue-500 hover:text-blue-700 text-sm" disabled={isEditing}>Edit</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); confirmDelete('project', p); }} className="text-red-500 hover:text-red-700 text-sm" disabled={isEditing}>Delete</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )})}
                                        </div>
                                    </TutorialHighlight>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </TutorialHighlight>
    );
};

export default AdminConsole;
