import React, { useState, useMemo, useEffect, useCallback } from 'react';
// --- FIX: Add query, where, writeBatch, getDocs ---
import { collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot, setDoc, getDocs, writeBatch, query, where } from 'firebase/firestore';
// --- END FIX ---
import { motion, AnimatePresence } from 'framer-motion'; // Import Framer Motion
import { TutorialHighlight } from './App'; // Import TutorialHighlight
import { jobFamilyData as updatedJobFamilyData } from './job-family-data'; // Import updated job family data

// --- Helper Components ---
// ... (useDebounce, formatCurrency, Tooltip, ConfirmationModal, BubbleRating, NoteEditorModal, EditEmployeeModal remain the same) ...
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

// Helper function to convert legacy trade names to abbreviations
const getTradeDisplayName = (trade) => {
    if (!trade) return trade;
    const normalized = trade.toLowerCase().trim();
    const displayMap = {
        // Standard mappings
        'bim': 'VDC',
        'piping': 'MP',
        'duct': 'MH',
        'plumbing': 'PL',
        'coordination': 'Coord',
        'management': 'MGMT',
        'structural': 'ST',
        'fire protection': 'FP',
        'process piping': 'PP',
        'processpiping': 'PP',
        'medical gas': 'PJ',
        // Additional common variations
        'vdc': 'VDC',
        'arnevdc': 'VDC',
        'mechanical piping': 'MP',
        'mech piping': 'MP',
        'mp': 'MP',
        'mechanical hvac': 'MH',
        'mech hvac': 'MH',
        'hvac': 'MH',
        'sheetmetal': 'MH',
        'sheet metal': 'MH',
        'mh': 'MH',
        'pl': 'PL',
        'plumb': 'PL',
        'fp': 'FP',
        'fire': 'FP',
        'fireprotection': 'FP',
        'sprinkler': 'FP',
        'st': 'ST',
        'struct': 'ST',
        'pp': 'PP',
        'process': 'PP',
        'pj': 'PJ',
        'med gas': 'PJ',
        'medgas': 'PJ',
        'medicalgas': 'PJ',
        'mgmt': 'MGMT',
        'mgt': 'MGMT',
        'coord': 'Coord',
        'gis': 'GIS/GPS',
        'gps': 'GIS/GPS',
        'gis/gps': 'GIS/GPS',
    };
    return displayMap[normalized] || trade;
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

const EditEmployeeModal = ({ employee, onSave, onClose, currentTheme, unionLocals }) => {
    const [editableEmployee, setEditableEmployee] = useState(null);
    const [newDiscipline, setNewDiscipline] = useState('');
    const [draggedDiscipline, setDraggedDiscipline] = useState(null);
    const [dragOverDiscipline, setDragOverDiscipline] = useState(null);
    const [editingNoteFor, setEditingNoteFor] = useState(null);

    const skillCategories = ["Model Knowledge", "VDC Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
    const disciplineOptions = [
        "MH", "MP", "PP", "PL", "FP", "PJ", "ST", "VDC", "Coord", "GIS/GPS", "MGMT"
    ];
    const titleOptions = [
        "Detailer I", "Detailer II", "Detailer III", "VDC Specialist", "Programmatic Detailer",
        "Lead Detailer", "Project Constructability Lead",
        "Trades Constructability Lead", "Division Constructability Manager"
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
                            {(unionLocals || []).map(local => ( // Added guard for unionLocals
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
    "Detailer I", "Detailer II", "Detailer III", "VDC Specialist", "Programmatic Detailer",
    "Lead Detailer", "Project Constructability Lead",
    "Trades Constructability Lead", "Division Constructability Manager"
];

const projectStatuses = ["Planning", "Conducting", "Controlling", "Archive"];
const disciplineOptions = [
    "MH", "MP", "PP", "PL", "FP", "PJ", "ST", "VDC", "Coord", "GIS/GPS", "MGMT"
];

const statusDescriptions = {
    Planning: "Estimated",
    Conducting: "Booked but not Sold",
    Controlling: "Operational",
    Archive: "Archived"
};

const WeeklyTimeline = ({ project, db, appId, currentTheme, showToast }) => {
    // Initialize startDate based on project.startDate or default to today
    const getInitialStartDate = () => {
        if (project.startDate) {
            return new Date(project.startDate + 'T00:00:00');
        }
        if (project.createdAt?.toDate) {
            return project.createdAt.toDate();
        }
        if (project.createdAt) {
            return new Date(project.createdAt);
        }
        return new Date();
    };
    
    const [startDate, setStartDate] = useState(getInitialStartDate);
    const [timelineRows, setTimelineRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newTrade, setNewTrade] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [dragState, setDragState] = useState(null);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [draggedRowId, setDraggedRowId] = useState(null);

    const [firestoreHours, setFirestoreHours] = useState({});
    const [pendingChanges, setPendingChanges] = useState({});
    const debouncedChanges = useDebounce(pendingChanges, 1000);

    // Forecast Configuration State
    const [showForecastConfig, setShowForecastConfig] = useState(false);
    const [forecastConfig, setForecastConfig] = useState({
        rampUpWeeks: 2,
        rampDownWeeks: 2,
        calculationMode: 'duration', // 'duration' = calculate from weekly hrs, 'weekly' = calculate from duration
        disciplines: {} // { MH: { totalHours: 773, weeklyHours: 40, durationWeeks: null }, ... }
    });
    const [activitiesData, setActivitiesData] = useState(null);

    // Fetch activities data for discipline totals
    useEffect(() => {
        const activitiesRef = doc(db, `artifacts/${appId}/public/data/projectActivities`, project.id);
        const unsubscribe = onSnapshot(activitiesRef, (docSnap) => {
            if (docSnap.exists()) {
                setActivitiesData(docSnap.data());
            }
        });
        return () => unsubscribe();
    }, [db, appId, project.id]);

    // Fetch forecast config from Firestore
    useEffect(() => {
        const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_forecastConfig');
        const unsubscribe = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                setForecastConfig(prev => ({ ...prev, ...docSnap.data() }));
            }
        });
        return () => unsubscribe();
    }, [db, appId, project.id]);

    // Calculate discipline totals from activities
    const disciplineTotals = useMemo(() => {
        if (!activitiesData?.activities) return {};
        const totals = {};
        const rateTypes = activitiesData.rateTypes || {};
        
        Object.entries(activitiesData.activities).forEach(([discipline, activities]) => {
            const rateType = rateTypes[discipline] || 'Detailing Rate';
            const rate = rateType === 'VDC Rate' 
                ? (project.vdcBlendedRate || project.blendedRate || 0) 
                : (project.blendedRate || 0);
            
            const totalHours = (activities || []).reduce((sum, act) => {
                return sum + (Number(act.estimatedHours) || 0);
            }, 0);
            
            const totalBudget = (activities || []).reduce((sum, act) => {
                const estHours = Number(act.estimatedHours) || 0;
                return sum + Math.ceil(estHours * rate);
            }, 0);
            
            if (totalHours > 0) {
                totals[discipline] = { totalHours, totalBudget };
            }
        });
        return totals;
    }, [activitiesData, project.blendedRate, project.vdcBlendedRate]);

    // Sync discipline totals to forecast config
    const handleSyncFromActivities = () => {
        if (Object.keys(disciplineTotals).length === 0) {
            showToast('No activities found. Add activities in the Project Console first.', 'warning');
            return;
        }
        
        const newDisciplines = {};
        Object.entries(disciplineTotals).forEach(([rawDiscipline, data]) => {
            // Normalize discipline name to standard abbreviation
            const discipline = getTradeDisplayName(rawDiscipline);
            
            // If this normalized name already exists, combine the hours
            if (newDisciplines[discipline]) {
                newDisciplines[discipline].totalHours += data.totalHours;
            } else {
                const existing = forecastConfig.disciplines[discipline] || {};
                const weeklyHours = existing.weeklyHours || 40;
                
                // Calculate initial duration based on weekly hours and ramps
                const result = calculateForecast(
                    discipline,
                    data.totalHours,
                    weeklyHours,
                    existing.durationWeeks,
                    forecastConfig.rampUpWeeks,
                    forecastConfig.rampDownWeeks,
                    'duration'
                );
                
                newDisciplines[discipline] = {
                    totalHours: data.totalHours,
                    weeklyHours: weeklyHours,
                    durationWeeks: result.durationWeeks || Math.ceil(data.totalHours / weeklyHours) + forecastConfig.rampUpWeeks + forecastConfig.rampDownWeeks
                };
            }
        });
        
        // Recalculate durations for any combined disciplines
        Object.keys(newDisciplines).forEach(discipline => {
            const d = newDisciplines[discipline];
            const result = calculateForecast(
                discipline,
                d.totalHours,
                d.weeklyHours,
                null,
                forecastConfig.rampUpWeeks,
                forecastConfig.rampDownWeeks,
                'duration'
            );
            d.durationWeeks = result.durationWeeks || Math.ceil(d.totalHours / d.weeklyHours) + forecastConfig.rampUpWeeks + forecastConfig.rampDownWeeks;
        });
        
        const newConfig = { ...forecastConfig, disciplines: newDisciplines };
        setForecastConfig(newConfig);
        saveForecastConfig(newConfig);
        showToast(`Synced ${Object.keys(newDisciplines).length} disciplines from Activities Breakdown`, 'success');
    };

    // Save forecast config to Firestore
    const saveForecastConfig = async (config) => {
        const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_forecastConfig');
        await setDoc(configRef, config, { merge: true });
    };

    // Calculate duration or weekly hours based on mode
    const calculateForecast = (discipline, totalHours, weeklyHours, durationWeeks, rampUp, rampDown, mode) => {
        if (mode === 'duration' && weeklyHours > 0) {
            // Calculate duration from weekly hours
            // Effective hours per week considering ramps:
            // Ramp up: average = weeklyHours/2 for rampUp weeks
            // Full: weeklyHours for middle weeks
            // Ramp down: average = weeklyHours/2 for rampDown weeks
            const rampUpHours = (weeklyHours / 2) * rampUp;
            const rampDownHours = (weeklyHours / 2) * rampDown;
            const remainingHours = totalHours - rampUpHours - rampDownHours;
            
            if (remainingHours <= 0) {
                // All hours fit in ramp periods
                const actualDuration = Math.ceil(totalHours / (weeklyHours / 2));
                return { durationWeeks: Math.max(rampUp + rampDown, actualDuration), weeklyHours };
            }
            
            const fullWeeks = Math.ceil(remainingHours / weeklyHours);
            return { durationWeeks: rampUp + fullWeeks + rampDown, weeklyHours };
        } else if (mode === 'weekly' && durationWeeks > 0) {
            // Calculate weekly hours from duration
            const fullWeeks = Math.max(0, durationWeeks - rampUp - rampDown);
            // Total capacity = rampUp * (wh/2) + fullWeeks * wh + rampDown * (wh/2)
            // totalHours = wh * (rampUp/2 + fullWeeks + rampDown/2)
            // wh = totalHours / (rampUp/2 + fullWeeks + rampDown/2)
            const effectiveWeeks = (rampUp / 2) + fullWeeks + (rampDown / 2);
            if (effectiveWeeks <= 0) return { durationWeeks, weeklyHours: 0 };
            const calculatedWeekly = Math.ceil(totalHours / effectiveWeeks);
            return { durationWeeks, weeklyHours: calculatedWeekly };
        }
        return { durationWeeks, weeklyHours };
    };

    // Update discipline config
    const handleDisciplineChange = (discipline, field, value) => {
        const numValue = value === '' ? 0 : Number(value);
        const currentDisc = forecastConfig.disciplines[discipline] || { totalHours: 0, weeklyHours: 40, durationWeeks: null };
        
        let updated = { ...currentDisc, [field]: numValue };
        
        // Recalculate based on mode
        if (field === 'weeklyHours' && forecastConfig.calculationMode === 'duration') {
            const result = calculateForecast(
                discipline, 
                updated.totalHours, 
                numValue, 
                updated.durationWeeks,
                forecastConfig.rampUpWeeks,
                forecastConfig.rampDownWeeks,
                'duration'
            );
            updated.durationWeeks = result.durationWeeks;
        } else if (field === 'durationWeeks' && forecastConfig.calculationMode === 'weekly') {
            const result = calculateForecast(
                discipline,
                updated.totalHours,
                updated.weeklyHours,
                numValue,
                forecastConfig.rampUpWeeks,
                forecastConfig.rampDownWeeks,
                'weekly'
            );
            updated.weeklyHours = result.weeklyHours;
        }
        
        const newConfig = {
            ...forecastConfig,
            disciplines: { ...forecastConfig.disciplines, [discipline]: updated }
        };
        setForecastConfig(newConfig);
        saveForecastConfig(newConfig);
    };

    // Update ramp settings and recalculate all
    const handleRampChange = (field, value) => {
        const numValue = Math.max(0, Number(value) || 0);
        const newConfig = { ...forecastConfig, [field]: numValue };
        
        // Recalculate all disciplines
        const updatedDisciplines = {};
        Object.entries(newConfig.disciplines).forEach(([disc, data]) => {
            const result = calculateForecast(
                disc,
                data.totalHours,
                data.weeklyHours,
                data.durationWeeks,
                field === 'rampUpWeeks' ? numValue : newConfig.rampUpWeeks,
                field === 'rampDownWeeks' ? numValue : newConfig.rampDownWeeks,
                newConfig.calculationMode
            );
            updatedDisciplines[disc] = { ...data, ...result };
        });
        
        newConfig.disciplines = updatedDisciplines;
        setForecastConfig(newConfig);
        saveForecastConfig(newConfig);
    };

    // Generate forecast rows and hours
    const handleGenerateForecast = async () => {
        if (Object.keys(forecastConfig.disciplines).length === 0) {
            showToast('No disciplines configured. Sync from Activities first.', 'warning');
            return;
        }

        const newRows = [];
        const newHoursData = {};
        const projectStartDate = project.startDate 
            ? new Date(project.startDate + 'T00:00:00') 
            : new Date();
        
        // Get Monday of start week
        const monday = new Date(projectStartDate);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);
        
        const timestamp = Date.now();

        Object.entries(forecastConfig.disciplines).forEach(([discipline, config], index) => {
            // Ensure discipline name is normalized
            const normalizedTrade = getTradeDisplayName(discipline);
            const rowId = `row_${normalizedTrade.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}_${index}`;
            newRows.push({
                id: rowId,
                trade: normalizedTrade,
                description: `Auto-generated from Activities`
            });

            const { totalHours, weeklyHours, durationWeeks } = config;
            const { rampUpWeeks, rampDownWeeks } = forecastConfig;
            
            if (!totalHours || totalHours <= 0) return;
            if (!weeklyHours || weeklyHours <= 0) return;
            
            // Calculate actual duration if not set
            const actualDuration = durationWeeks || Math.ceil(totalHours / weeklyHours) + rampUpWeeks + rampDownWeeks;
            
            const hoursPerWeek = {};
            let remainingHours = totalHours;
            const fullWeeks = Math.max(0, actualDuration - rampUpWeeks - rampDownWeeks);

            for (let week = 0; week < actualDuration && remainingHours > 0; week++) {
                const weekStart = new Date(monday);
                weekStart.setDate(monday.getDate() + (week * 7));
                const weekKey = weekStart.toISOString().split('T')[0];

                let weekHours = 0;
                if (week < rampUpWeeks && rampUpWeeks > 0) {
                    // Ramp up: linear increase from ~0 to full
                    const rampFactor = (week + 1) / rampUpWeeks;
                    weekHours = Math.round(weeklyHours * rampFactor);
                } else if (week >= rampUpWeeks + fullWeeks && rampDownWeeks > 0) {
                    // Ramp down: linear decrease from full to ~0
                    const rampWeek = week - rampUpWeeks - fullWeeks;
                    const rampFactor = 1 - ((rampWeek + 1) / rampDownWeeks);
                    weekHours = Math.round(weeklyHours * Math.max(0, rampFactor));
                } else {
                    // Full capacity
                    weekHours = weeklyHours;
                }

                // Don't exceed remaining hours
                weekHours = Math.min(weekHours, remainingHours);
                remainingHours -= weekHours;
                
                if (weekHours > 0) {
                    hoursPerWeek[weekKey] = weekHours;
                }
            }
            
            // If there are remaining hours, add them to the last week
            if (remainingHours > 0 && Object.keys(hoursPerWeek).length > 0) {
                const lastWeek = Object.keys(hoursPerWeek).pop();
                hoursPerWeek[lastWeek] += remainingHours;
            }

            newHoursData[rowId] = hoursPerWeek;
        });

        // Save to Firestore
        const batch = writeBatch(db);
        const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
        batch.set(configRef, { rows: newRows });

        Object.entries(newHoursData).forEach(([rowId, weekData]) => {
            const rowRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, rowId);
            batch.set(rowRef, weekData);
        });

        await batch.commit();
        setStartDate(monday);
        setShowForecastConfig(false);
        showToast(`Generated forecast for ${newRows.length} disciplines`, 'success');
    };

    // Handler to sync with project start date
    const handleSyncWithStartDate = () => {
        if (project.startDate) {
            setStartDate(new Date(project.startDate + 'T00:00:00'));
            showToast(`Synced to project start date: ${project.startDate}`, 'success');
        } else if (project.createdAt?.toDate) {
            setStartDate(project.createdAt.toDate());
            showToast('Synced to project creation date', 'success');
        } else if (project.createdAt) {
            setStartDate(new Date(project.createdAt));
            showToast('Synced to project creation date', 'success');
        } else {
            showToast('No start date or creation date available', 'warning');
        }
    };

    const displayHours = useMemo(() => {
        const merged = JSON.parse(JSON.stringify(firestoreHours));
        for (const rowId in pendingChanges) {
            if (!merged[rowId]) merged[rowId] = {};
            for (const week in pendingChanges[rowId]) {
                merged[rowId][week] = pendingChanges[rowId][week];
            }
        }
        return merged;
    }, [firestoreHours, pendingChanges]);

    const weekCount = 156;

    const getWeekDates = (from, count) => {
        const monday = new Date(from);
        monday.setHours(0, 0, 0, 0);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
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
        const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().rows) {
                setTimelineRows(docSnap.data().rows);
            } else {
                setTimelineRows([]);
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
            setFirestoreHours(hoursData);
            setLoading(false);
        });

        return () => {
            unsubscribeConfig();
            unsubscribeHours();
        };
    }, [project.id, db, appId]);

    useEffect(() => {
        if (Object.keys(debouncedChanges).length === 0) return;

        const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`);
        const batch = writeBatch(db);

        Object.entries(debouncedChanges).forEach(([rowId, weekData]) => {
            const rowRef = doc(weeklyHoursRef, rowId);
            const sanitizedData = {};
            Object.keys(weekData).forEach(week => {
                const val = weekData[week];
                sanitizedData[week] = (val === '' || isNaN(val)) ? 0 : Number(val);
            });
            batch.set(rowRef, sanitizedData, { merge: true });
        });

        batch.commit().then(() => {
            setPendingChanges({});
        });
    }, [debouncedChanges, appId, db, project.id]);

    const handleHoursChange = (rowId, week, hours) => {
        const numericValue = hours === '' ? '' : Number(hours);

        setPendingChanges(prev => {
            const newChanges = JSON.parse(JSON.stringify(prev));
            if (!newChanges[rowId]) newChanges[rowId] = {};
            newChanges[rowId][week] = numericValue;
            return newChanges;
        });
    };

    const handleDescriptionChange = async (rowId, newDescription) => {
        const updatedRows = timelineRows.map(row =>
            row.id === rowId ? { ...row, description: newDescription } : row
        );
        setTimelineRows(updatedRows);
        const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
        await setDoc(configRef, { rows: updatedRows }, { merge: true });
    };

    const handleAddTrade = async () => {
        if (newTrade) {
            const newRow = {
                id: `row_${Date.now()}`,
                trade: newTrade,
                description: newDescription || ''
            };
            const updatedRows = [...timelineRows, newRow];
            const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
            await setDoc(configRef, { rows: updatedRows });
            setIsAdding(false);
            setNewTrade('');
            setNewDescription('');
        }
    };

    const handleDeleteRow = async (rowIdToDelete) => {
        const updatedRows = timelineRows.filter(r => r.id !== rowIdToDelete);
        const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
        await setDoc(configRef, { rows: updatedRows });

        const rowHoursRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, rowIdToDelete);
        await deleteDoc(rowHoursRef);
    };

    const handleMouseEnter = (rowId, week) => {
        if (!dragState || dragState.startRowId !== rowId) return;

        const startIndex = weekDates.indexOf(dragState.startWeek);
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
        if (!dragState) return;
        const { startRowId, fillValue, selection } = dragState;

        const changesForDB = {};

        Object.keys(selection).forEach(weekKey => {
            changesForDB[weekKey] = fillValue;
        });

        setPendingChanges(prev => ({
            ...prev,
            [startRowId]: {
                ...(prev[startRowId] || {}),
                ...changesForDB,
            }
        }));

        setDragState(null);
    }, [dragState]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseUp]);

    const handlePaste = (event, startRowId, startWeekDate) => {
        event.preventDefault();
        const pasteData = event.clipboardData.getData('text');
        const rows = pasteData.split(/\r?\n/).filter(row => row.length > 0);
        const parsedData = rows.map(row => row.split('\t'));

        const startRowIndex = timelineRows.findIndex(r => r.id === startRowId);
        const startWeekIndex = weekDates.indexOf(startWeekDate);

        if (startRowIndex === -1 || startWeekIndex === -1) return;

        const dbChanges = { ...pendingChanges };

        parsedData.forEach((rowData, rowIndex) => {
            const currentRowIndex = startRowIndex + rowIndex;
            if (currentRowIndex < timelineRows.length) {
                const currentRow = timelineRows[currentRowIndex];
                if (!dbChanges[currentRow.id]) dbChanges[currentRow.id] = {};

                rowData.forEach((cellData, colIndex) => {
                    const currentWeekIndex = startWeekIndex + colIndex;
                    if (currentWeekIndex < weekDates.length) {
                        const currentWeek = weekDates[currentWeekIndex];
                        const value = parseInt(cellData, 10);
                        if (!isNaN(value)) {
                            dbChanges[currentRow.id][currentWeek] = value;
                        }
                    }
                });
            }
        });
        setPendingChanges(dbChanges);
    };

    const handleDateNav = (offset) => {
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };

    const handleClearForecast = async () => {
        const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`);
        const querySnapshot = await getDocs(weeklyHoursRef);

        const batch = writeBatch(db);

        querySnapshot.forEach((doc) => {
            // Don't delete the _config document
            if (doc.id !== '_config') {
                 batch.delete(doc.ref);
            }
        });
        // Clear the rows in the _config document
         const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
         batch.set(configRef, { rows: [] });


        try {
            await batch.commit();
            // State updates will happen via the onSnapshot listeners
            showToast("Forecast data for this project has been cleared.", "success");
        } catch (error) {
            console.error("Error clearing forecast data: ", error);
            showToast("Failed to clear forecast data.", "error");
        }
        setIsClearConfirmOpen(false);
    };

    // --- Drag and Drop Row Reordering Handlers ---
    const handleDragStart = (e, rowId) => {
        setDraggedRowId(rowId);
        e.dataTransfer.setData('text/plain', rowId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // This is necessary to allow dropping
    };

    const handleDragEnd = () => {
        setDraggedRowId(null);
    };

    const handleDrop = async (e, dropTargetRowId) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');

        if (draggedId === dropTargetRowId) {
            setDraggedRowId(null);
            return;
        }

        const reorderedRows = [...timelineRows];
        const draggedItem = reorderedRows.find(row => row.id === draggedId);
        const targetIndex = reorderedRows.findIndex(row => row.id === dropTargetRowId);
        const draggedIndex = reorderedRows.findIndex(row => row.id === draggedId);

        if (!draggedItem || targetIndex === -1 || draggedIndex === -1) return;

        // Remove from old position and insert at new position
        reorderedRows.splice(draggedIndex, 1);
        reorderedRows.splice(targetIndex, 0, draggedItem);

        // Update state for optimistic UI update
        setTimelineRows(reorderedRows);
        setDraggedRowId(null);

        // Update Firestore with the new order
        const configRef = doc(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`, '_config');
        await setDoc(configRef, { rows: reorderedRows }, { merge: true });
    };


    return (
        <TutorialHighlight tutorialKey="weeklyForecast">
             <ConfirmationModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={handleClearForecast}
                title="Confirm Clear Forecast"
                currentTheme={currentTheme}
            >
                Are you sure you want to permanently delete all weekly forecast hours and trades for this project? This action cannot be undone.
            </ConfirmationModal>
            <div className="mt-4 pt-4 border-t border-gray-500/50 space-y-2" onClick={(e) => e.stopPropagation()}>
                {/* Forecast Configuration Panel */}
                <div className="mb-4">
                    <button 
                        onClick={() => setShowForecastConfig(!showForecastConfig)}
                        className={`w-full p-2 text-left text-sm font-semibold rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} flex justify-between items-center`}
                    >
                        <span>📊 Forecast Configuration</span>
                        <span>{showForecastConfig ? '▲' : '▼'}</span>
                    </button>
                    
                    {showForecastConfig && (
                        <div 
                            className={`mt-2 p-4 rounded-md border ${currentTheme.borderColor} ${currentTheme.cardBg}`}
                        >
                            {/* Sync and Generate Buttons */}
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={handleSyncFromActivities}
                                    className="flex-1 p-2 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    🔄 Sync from Activities
                                </button>
                                <button 
                                    onClick={handleGenerateForecast}
                                    className="flex-1 p-2 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
                                >
                                    ⚡ Generate Forecast
                                </button>
                            </div>
                            
                            {/* Global Settings */}
                            <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-md bg-gray-700/30">
                                <div>
                                    <label className="block text-xs font-semibold mb-1">Ramp Up (weeks)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={forecastConfig.rampUpWeeks}
                                        onChange={(e) => handleRampChange('rampUpWeeks', e.target.value)}
                                        className={`w-full p-2 text-sm rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1">Ramp Down (weeks)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={forecastConfig.rampDownWeeks}
                                        onChange={(e) => handleRampChange('rampDownWeeks', e.target.value)}
                                        className={`w-full p-2 text-sm rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1">Calculation Mode</label>
                                    <select 
                                        value={forecastConfig.calculationMode}
                                        onChange={(e) => {
                                            const newConfig = { ...forecastConfig, calculationMode: e.target.value };
                                            setForecastConfig(newConfig);
                                            saveForecastConfig(newConfig);
                                        }}
                                        className={`w-full p-2 text-sm rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    >
                                        <option value="duration">Weekly Hrs → Duration</option>
                                        <option value="weekly">Duration → Weekly Hrs</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Discipline Configuration Table */}
                            {Object.keys(forecastConfig.disciplines).length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={currentTheme.headerBg}>
                                                <th className="p-2 text-left">Discipline</th>
                                                <th className="p-2 text-center">Total Hours</th>
                                                <th className="p-2 text-center">
                                                    Weekly Hrs
                                                    {forecastConfig.calculationMode === 'weekly' && <span className="text-yellow-400 ml-1">*</span>}
                                                </th>
                                                <th className="p-2 text-center">
                                                    Duration (wks)
                                                    {forecastConfig.calculationMode === 'duration' && <span className="text-yellow-400 ml-1">*</span>}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(forecastConfig.disciplines).map(([discipline, config]) => (
                                                <tr key={discipline} className={`border-t ${currentTheme.borderColor}`}>
                                                    <td className="p-2 font-semibold">{discipline}</td>
                                                    <td className="p-2 text-center">
                                                        <span className={`${currentTheme.subtleText}`}>{config.totalHours?.toLocaleString() || 0}</span>
                                                    </td>
                                                    <td className="p-2">
                                                        <input 
                                                            type="number"
                                                            min="1"
                                                            value={config.weeklyHours || ''}
                                                            onChange={(e) => handleDisciplineChange(discipline, 'weeklyHours', e.target.value)}
                                                            disabled={forecastConfig.calculationMode === 'weekly'}
                                                            className={`w-full p-1 text-center rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder} ${forecastConfig.calculationMode === 'weekly' ? 'opacity-60' : ''}`}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input 
                                                            type="number"
                                                            min="1"
                                                            value={config.durationWeeks || ''}
                                                            onChange={(e) => handleDisciplineChange(discipline, 'durationWeeks', e.target.value)}
                                                            disabled={forecastConfig.calculationMode === 'duration'}
                                                            className={`w-full p-1 text-center rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder} ${forecastConfig.calculationMode === 'duration' ? 'opacity-60' : ''}`}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className={`border-t-2 ${currentTheme.borderColor} font-semibold`}>
                                            <tr>
                                                <td className="p-2">Totals</td>
                                                <td className="p-2 text-center">
                                                    {Object.values(forecastConfig.disciplines).reduce((sum, d) => sum + (d.totalHours || 0), 0).toLocaleString()}
                                                </td>
                                                <td className="p-2 text-center">
                                                    {Math.round(Object.values(forecastConfig.disciplines).reduce((sum, d) => sum + (d.weeklyHours || 0), 0))}
                                                </td>
                                                <td className="p-2 text-center">
                                                    {Math.max(...Object.values(forecastConfig.disciplines).map(d => d.durationWeeks || 0))} (max)
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    <p className="text-xs mt-2 text-yellow-400">* Calculated field based on mode</p>
                                </div>
                            ) : (
                                <div className={`text-center p-4 ${currentTheme.subtleText}`}>
                                    <p>No disciplines configured.</p>
                                    <p className="text-xs mt-1">Click "Sync from Activities" to import disciplines from the Project Console's Activity Values Breakdown.</p>
                                </div>
                            )}
                            
                            {/* Available Disciplines from Activities */}
                            {Object.keys(disciplineTotals).length > 0 && (
                                <div className="mt-4 p-3 rounded-md bg-blue-900/30 border border-blue-500/50">
                                    <p className="text-sm font-semibold mb-2">Available from Activities Breakdown:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(disciplineTotals).map(([disc, data]) => {
                                            const normalizedName = getTradeDisplayName(disc);
                                            return (
                                                <span key={disc} className="px-2 py-1 bg-blue-600 rounded text-xs">
                                                    {normalizedName !== disc ? `${disc} → ${normalizedName}` : normalizedName}: {data.totalHours.toLocaleString()} hrs
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs mt-2 text-blue-300">Click "Sync from Activities" to import these disciplines.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex justify-between items-center gap-2 mb-2">
                     <button onClick={() => setIsClearConfirmOpen(true)} className={`p-1 px-3 text-xs rounded-md bg-red-600 text-white hover:bg-red-700`}>
                        Clear Forecast
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleDateNav(-28)} className={`p-1 text-xs rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<< 4w'}</button>
                        <button onClick={handleSyncWithStartDate} className={`p-1 px-2 text-xs border rounded-md bg-purple-600 text-white hover:bg-purple-700`}>
                            Sync Start
                        </button>
                        <button onClick={() => setStartDate(new Date())} className={`p-1 px-2 text-xs border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                        <button onClick={() => handleDateNav(28)} className={`p-1 text-xs rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'4w >>'}</button>
                    </div>
                </div>
                <div className="overflow-x-auto hide-scrollbar-on-hover">
                    <TutorialHighlight tutorialKey="weeklyForecastTips">
                    <table className="min-w-full text-sm text-center border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className={`p-2 font-semibold border ${currentTheme.borderColor} ${currentTheme.headerBg} sticky left-0 z-20 w-64`}>Trade / Description</th>
                                {weekDates.map(week => (
                                    <th key={week} className={`p-2 font-semibold border ${currentTheme.borderColor} ${currentTheme.headerBg}`}>
                                        {new Date(week + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timelineRows.map(row => (
                                <tr
                                    key={row.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, row.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, row.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`transition-opacity ${draggedRowId === row.id ? 'opacity-40' : 'opacity-100'}`}
                                >
                                    <td className={`p-1 border ${currentTheme.borderColor} ${currentTheme.altRowBg} sticky left-0 z-10`}>
                                        <div className="flex items-center gap-1">
                                            <div className="cursor-move p-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${currentTheme.subtleText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                </svg>
                                            </div>
                                            <button onClick={() => handleDeleteRow(row.id)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                                            <div className="flex-grow">
                                                <p className="font-semibold text-left">{row.trade}</p>
                                                <input
                                                    type="text"
                                                    value={row.description}
                                                    onChange={(e) => handleDescriptionChange(row.id, e.target.value)}
                                                    placeholder="Description..."
                                                    className={`w-full p-1 text-xs bg-transparent rounded ${currentTheme.subtleText} focus:bg-white focus:text-black`}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    {weekDates.map((week) => {
                                        const isSelected = dragState?.startRowId === row.id && dragState?.selection[week];
                                        const displayValue = displayHours[row.id]?.[week];
                                        return (
                                        <td key={`${row.id}-${week}`}
                                            className={`p-0 border relative ${currentTheme.borderColor}`}
                                            onMouseEnter={() => handleMouseEnter(row.id, week)}
                                            onPaste={(e) => handlePaste(e, row.id, week)}
                                        >
                                            <input
                                                type="number"
                                                value={displayValue ?? ''}
                                                onChange={(e) => handleHoursChange(row.id, week, e.target.value)}
                                                disabled={loading}
                                                className={`w-full h-full p-1 text-center bg-transparent focus:bg-blue-200 focus:text-black outline-none no-arrows ${currentTheme.inputText} ${isSelected ? 'bg-blue-300/50' : ''}`}
                                            />
                                            <div
                                                className="absolute bottom-0 right-0 w-2 h-2 bg-blue-600 cursor-crosshair"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); e.stopPropagation();
                                                    const valueToFill = displayValue || 0;
                                                    setDragState({
                                                        startRowId: row.id,
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
                                <TutorialHighlight tutorialKey="addForecastRow">
                                <tr>
                                    <td className={`p-2 border ${currentTheme.borderColor} ${currentTheme.altRowBg} sticky left-0 z-10`}>
                                        <div className="flex flex-col gap-2">
                                            <select value={newTrade} onChange={(e) => setNewTrade(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                                <option value="">Select a trade...</option>
                                                {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            <input
                                                type="text"
                                                value={newDescription}
                                                onChange={(e) => setNewDescription(e.target.value)}
                                                placeholder="Optional: e.g., Process, Mechanical"
                                                className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={handleAddTrade} className="bg-green-500 text-white px-4 py-2 rounded-md">Add</button>
                                                <button onClick={() => setIsAdding(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md">Cancel</button>
                                            </div>
                                        </div>
                                    </td>
                                    <td colSpan={weekDates.length}></td>
                                </tr>
                                </TutorialHighlight>
                            )}
                        </tbody>
                    </table>
                    </TutorialHighlight>
                </div>
                {!isAdding && <button onClick={() => setIsAdding(true)} className="text-sm text-blue-500 hover:underline mt-2">+ Add Forecast Row</button>}
            </div>
        </TutorialHighlight>
    );
};

const AdminConsole = ({ db, detailers, projects, currentTheme, appId, showToast }) => {
    // ... (rest of AdminConsole state remains the same) ...
    const [newEmployee, setNewEmployee] = useState({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '', wage: '', percentAboveScale: '', unionLocal: '' });
    const [newProject, setNewProject] = useState({ name: '', projectId: '', initialBudget: 0, blendedRate: 0, vdcBlendedRate: 0, contingency: 0, dashboardUrl: '', status: 'Planning', startDate: '', projectManager: '' });

    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectData, setEditingProjectData] = useState(null);
    const [employeeSortBy, setEmployeeSortBy] = useState('firstName');
    const [projectSortBy, setProjectSortBy] = useState('projectId');
    const [activeStatuses, setActiveStatuses] = useState(["Controlling"]);
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
                const batchOps = [];
                initialLocals.forEach(local => {
                    batchOps.push(addDoc(unionLocalsRef, local));
                });
                await Promise.all(batchOps);
            }
        };

        checkForInitialData();

        const unsubscribe = onSnapshot(unionLocalsRef, (snapshot) => {
            const localsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUnionLocals(localsData.sort((a, b) => a.name.localeCompare(b.name)));
        });

        return () => unsubscribe();
    }, [db, appId]);


    useEffect(() => {
        const handleClose = () => {
            setEditingEmployee(null);
            setConfirmAction(null);
            setShowUnionManagement(false);
        };
        window.addEventListener('close-overlays', handleClose);
        return () => window.removeEventListener('close-overlays', handleClose);
    }, []); // Empty dependency array ensures this runs only once.


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

    // Migration function to update job family data in Firebase
    const handleMigrateJobFamilies = async () => {
        const jobFamilyRef = collection(db, `artifacts/${appId}/public/data/jobFamilyData`);
        
        try {
            // Delete all existing job family documents
            const existingDocs = await getDocs(jobFamilyRef);
            const deletePromises = existingDocs.docs.map(docSnapshot => 
                deleteDoc(doc(db, `artifacts/${appId}/public/data/jobFamilyData`, docSnapshot.id))
            );
            await Promise.all(deletePromises);
            
            // Add new job family documents
            const batch = writeBatch(db);
            Object.values(updatedJobFamilyData).forEach(job => {
                const docRef = doc(jobFamilyRef);
                batch.set(docRef, job);
            });
            await batch.commit();
            
            showToast('Job Family data updated successfully!', 'success');
        } catch (error) {
            console.error('Error migrating job families:', error);
            showToast('Error updating Job Family data', 'error');
        }
    };

    // Migration function to update employee titles
    const handleMigrateEmployeeTitles = async () => {
        const titleMapping = {
            'Project Constructability Lead, Sr.': 'Project Constructability Lead',
            'Project Constructability Lead': 'Lead Detailer',
            'Trade Constructability Lead': 'Trades Constructability Lead',
            'Constructability Manager': 'Division Constructability Manager'
        };
        
        try {
            const employeesRef = collection(db, `artifacts/${appId}/public/data/detailers`);
            const snapshot = await getDocs(employeesRef);
            
            let updateCount = 0;
            const updatePromises = [];
            
            snapshot.docs.forEach(docSnapshot => {
                const data = docSnapshot.data();
                const oldTitle = data.title;
                const newTitle = titleMapping[oldTitle];
                
                if (newTitle) {
                    updatePromises.push(
                        updateDoc(doc(db, `artifacts/${appId}/public/data/detailers`, docSnapshot.id), {
                            title: newTitle
                        })
                    );
                    updateCount++;
                }
            });
            
            await Promise.all(updatePromises);
            showToast(`Updated ${updateCount} employee title(s) successfully!`, 'success');
        } catch (error) {
            console.error('Error migrating employee titles:', error);
            showToast('Error updating employee titles', 'error');
        }
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
                console.error('Please fill all required employee fields.');
                showToast('First Name, Last Name, and Employee ID are required.', 'error');
                return;
            }
            await addDoc(collection(db, `artifacts/${appId}/public/data/detailers`), { ...newEmployee, wage: Number(newEmployee.wage) || 0, percentAboveScale: Number(newEmployee.percentAboveScale) || 0, skills: {}, disciplineSkillsets: {} });
            setNewEmployee({ firstName: '', lastName: '', title: titleOptions[0], employeeId: '', email: '', wage: '', percentAboveScale: '', unionLocal: '' });
            showToast("Employee added.", "success");
        } else if (type === 'project') {
            if (!newProject.name || !newProject.projectId) {
                console.error('Please fill Project Name and Project ID.');
                showToast('Project Name and Project ID are required.', 'error');
                return;
            }
            const payload = {
                ...newProject,
                initialBudget: Number(newProject.initialBudget),
                blendedRate: Number(newProject.blendedRate),
                vdcBlendedRate: Number(newProject.vdcBlendedRate),
                contingency: Number(newProject.contingency),
                archived: newProject.status === "Archive",
            };
            
            // Create the project document and get its ID
            const projectDocRef = await addDoc(collection(db, `artifacts/${appId}/public/data/projects`), payload);
            const newProjectId = projectDocRef.id;
            
            // Initialize projectActivities document with standard activities
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
            
            // Normalize function
            const normalizeDesc = (str = '') => {
                return String(str)
                    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            };
            
            // Create activities with normalized descriptions
            const standardActivities = standardChargeCodes.map(item => ({
                id: `std_${item.chargeCode}_${Math.random().toString(16).slice(2)}`,
                description: normalizeDesc(item.description),
                chargeCode: item.chargeCode,
                estimatedHours: 0,
                hoursUsed: 0,
                percentComplete: 0,
                subsets: []
            }));
            
            // Group activities by discipline - keys must match actionTrackerDisciplines keys
            const vdcKeywords = ['Project VDC Admin', 'Project Setup', 'Project Data Management', 'Project Closeout'];
            const groupedActivities = {
                duct: standardActivities.filter(act => /^MH\s*/i.test(act.description)),
                piping: standardActivities.filter(act => /^MP\s*/i.test(act.description)),
                plumbing: standardActivities.filter(act => /^PL\s*/i.test(act.description)),
                management: standardActivities.filter(act => 
                    ['Detailing Management', 'Project Content Development', 'Project Coordination Management'].some(
                        keyword => act.description.toLowerCase().includes(keyword.toLowerCase())
                    )
                ),
                vdc: standardActivities.filter(act => 
                    vdcKeywords.some(keyword => act.description.toLowerCase().includes(keyword.toLowerCase()))
                )
            };
            
            // Create default disciplines
            const defaultDisciplines = [
                { key: 'duct', label: 'MH' },
                { key: 'piping', label: 'MP' },
                { key: 'plumbing', label: 'PL' },
                { key: 'management', label: 'MGMT' },
                { key: 'vdc', label: 'VDC' }
            ];
            
            // Create the projectActivities document
            // VDC defaults to VDC Rate, all others to Detailing Rate
            const defaultRateTypes = {
                duct: 'Detailing Rate',
                piping: 'Detailing Rate',
                plumbing: 'Detailing Rate',
                management: 'Detailing Rate',
                vdc: 'VDC Rate'
            };
            
            const projectActivitiesData = {
                activities: groupedActivities,
                actionTrackerDisciplines: defaultDisciplines,
                actionTrackerData: {},
                budgetImpacts: [],
                mainItems: [],
                projectWideActivities: [],
                rateTypes: defaultRateTypes
            };
            
            await setDoc(doc(db, `artifacts/${appId}/public/data/projectActivities`, newProjectId), projectActivitiesData);
            
            setNewProject({ name: '', projectId: '', initialBudget: 0, blendedRate: 0, vdcBlendedRate: 0, contingency: 0, dashboardUrl: '', status: 'Planning', startDate: '', projectManager: '' });
            showToast("Project added with standard activities.", "success");
        }
    };

    // --- UPDATED: handleDelete function ---
    const handleDelete = async (type, id) => {
        const collectionName = type === 'employee' ? 'detailers' : 'projects';
        const docRef = doc(db, `artifacts/${appId}/public/data/${collectionName}`, id);
        const batch = writeBatch(db); // Use batch for multi-document operations

        try {
            // 1. Delete the main document
            batch.delete(docRef);

            // 2. If deleting a project, delete related data
            if (type === 'project') {
                // Delete associated assignments
                const assignmentsRef = collection(db, `artifacts/${appId}/public/data/assignments`);
                const assignmentsQuery = query(assignmentsRef, where("projectId", "==", id));
                const assignmentsSnapshot = await getDocs(assignmentsQuery);
                assignmentsSnapshot.forEach((doc) => batch.delete(doc.ref));

                // Delete projectActivities document
                const activitiesRef = doc(db, `artifacts/${appId}/public/data/projectActivities`, id);
                batch.delete(activitiesRef); // It's okay if this doesn't exist, batch delete won't fail

                // Delete weeklyHours subcollection documents
                const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${id}/weeklyHours`);
                const weeklyHoursSnapshot = await getDocs(weeklyHoursRef);
                weeklyHoursSnapshot.forEach((doc) => batch.delete(doc.ref));
            }
            // 3. If deleting an employee, delete related assignments
            else if (type === 'employee') {
                 const assignmentsRef = collection(db, `artifacts/${appId}/public/data/assignments`);
                 const assignmentsQuery = query(assignmentsRef, where("detailerId", "==", id));
                 const assignmentsSnapshot = await getDocs(assignmentsQuery);
                 assignmentsSnapshot.forEach((doc) => batch.delete(doc.ref));
            }

            // 4. Commit the batch
            await batch.commit();

            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} and associated data deleted successfully.`, "success");

            // Reset UI state (moved inside try, after successful commit)
            if (type === 'employee' && editingEmployee?.id === id) { // Check if editingEmployee exists
                 setEditingEmployee(null); // Deselect if the deleted employee was being edited
            }
             if (type === 'project' && editingProjectId === id) {
                 setEditingProjectId(null); // Close editor if deleting the edited project
                 setEditingProjectData(null);
             }
             if (type === 'project' && expandedProjectId === id) {
                 setExpandedProjectId(null); // Close timeline if deleting the expanded project
             }

        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            showToast(`Failed to delete ${type}. Error: ${error.message}`, "error");
        } finally {
             // --- FIX: Ensure confirmAction is reset in finally block ---
             setConfirmAction(null);
        }
    };
    // --- END UPDATE ---

    const confirmDelete = (type, item) => {
        const name = type === 'employee' ? `${item.firstName} ${item.lastName}` : item.name;
        setConfirmAction({
            title: `Delete ${type}`,
            message: `Are you sure you want to permanently delete ${name}? This will also delete all associated assignments and project-specific data (activities, forecasts). This action cannot be undone.`,
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
        try {
            await updateDoc(projectRef, {
                ...data,
                initialBudget: Number(data.initialBudget) || 0,
                blendedRate: Number(data.blendedRate) || 0,
                vdcBlendedRate: Number(data.vdcBlendedRate) || 0,
                contingency: Number(data.contingency) || 0,
                archived: data.status === "Archive",
            });
            setEditingProjectId(null);
            setEditingProjectData(null);
            showToast("Project updated.", "success");
        } catch (error) {
             console.error("Error updating project:", error);
             showToast("Failed to update project.", "error");
        }
    };


    const handleUpdateEmployee = async (employeeData) => {
        const { id, ...data } = employeeData;
        const employeeRef = doc(db, `artifacts/${appId}/public/data/detailers`, id);
        try {
            await updateDoc(employeeRef, {...data, wage: Number(data.wage) || 0, percentAboveScale: Number(data.percentAboveScale) || 0});
            showToast("Employee details saved.", "success");
        } catch (error) {
             console.error("Error updating employee:", error);
             showToast("Failed to save employee details.", "error");
        }
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
                        // setConfirmAction(null); // Moved to finally block in handleDelete
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className={`p-4 ${currentTheme.consoleBg}`}>
                                <div
                                    className="cursor-pointer mb-4"
                                    onClick={() => setExpandedProjectId(null)}
                                >
                                    <h2 className="text-2xl font-bold text-blue-500 hover:underline">&larr; Back to All Projects</h2>
                                    {/* --- FIX: Added optional chaining for safety --- */}
                                    <p className="text-lg font-semibold">{projects.find(p => p.id === expandedProjectId)?.name} ({projects.find(p => p.id === expandedProjectId)?.projectId})</p>
                                    {/* --- END FIX --- */}
                                </div>
                                <WeeklyTimeline
                                     // --- FIX: Added optional chaining ---
                                    project={projects.find(p => p.id === expandedProjectId)}
                                    db={db}
                                    appId={appId}
                                    currentTheme={currentTheme}
                                    showToast={showToast}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Data Management Utilities */}
                            <div className={`mb-4 p-3 ${currentTheme.cardBg} border ${currentTheme.borderColor} rounded-lg`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${currentTheme.textColor}`}>Data Management</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleMigrateJobFamilies}
                                            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                        >
                                            Update Job Families
                                        </button>
                                        <button 
                                            onClick={handleMigrateEmployeeTitles}
                                            className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                        >
                                            Migrate Employee Titles
                                        </button>
                                    </div>
                                </div>
                            </div>

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
                                                        {statusDescriptions[status].charAt(0)}
                                                    </button>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </TutorialHighlight>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 overflow-y-auto h-[calc(100vh-250px)] hide-scrollbar-on-hover">
                                {/* Employee Section */}
                                <div>
                                    {/* Add Employee Form */}
                                    <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4`}>
                                        <button onClick={() => handleToggleCollapse('addEmployee')} className="w-full flex justify-between items-center font-semibold mb-2">
                                            <h3>Add New Employee</h3>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${collapsedSections.addEmployee ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {!collapsedSections.addEmployee && (
                                            <TutorialHighlight tutorialKey="addEmployeeFields">
                                            <div className={`mt-2 pt-4 border-t ${currentTheme.borderColor} ${isEditing ? 'opacity-50' : ''}`}>
                                                <div className="space-y-2 mb-4">
                                                    {/* ... (input fields remain the same) ... */}
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

                                                    {/* Union Local Management */}
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
                                            </TutorialHighlight>
                                        )}
                                    </div>
                                    {/* Employee List */}
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

                                {/* Project Section */}
                                <div>
                                    {/* Add Project Form */}
                                    <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4`}>
                                        <button onClick={() => handleToggleCollapse('addProject')} className="w-full flex justify-between items-center font-semibold mb-2">
                                            <h3>Add New Project</h3>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${collapsedSections.addProject ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {!collapsedSections.addProject && (
                                            <TutorialHighlight tutorialKey="addProjectFields">
                                            <div className={`mt-2 pt-4 border-t ${currentTheme.borderColor} ${isEditing ? 'opacity-50' : ''}`}>
                                                <div className="space-y-2 mb-4">
                                                    {/* ... (input fields remain the same) ... */}
                                                    <input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="Project Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                                                    <input value={newProject.projectId} onChange={e => setNewProject({...newProject, projectId: e.target.value})} placeholder="Project ID" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} />
                                                    <select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing}>
                                                        {projectStatuses.map(status => (
                                                            <option key={status} value={status}>{statusDescriptions[status]}</option>
                                                        ))}
                                                    </select>
                                                    <div className="flex items-center gap-2"><label className="w-32">Start Date:</label><input type="date" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                    <div className="flex items-center gap-2"><label className="w-32">Project Manager:</label><input type="text" value={newProject.projectManager} onChange={e => setNewProject({...newProject, projectManager: e.target.value})} placeholder="PM Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                    <div className="flex items-center gap-2"><label className="w-32">Initial Budget ($):</label><input type="number" value={newProject.initialBudget} onChange={e => setNewProject({...newProject, initialBudget: e.target.value})} placeholder="e.g. 50000" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                    <div className="flex items-center gap-2"><label className="w-32">Detailing Rate ($/hr):</label><input type="number" value={newProject.blendedRate} onChange={e => setNewProject({...newProject, blendedRate: e.target.value})} placeholder="e.g. 75" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                    <div className="flex items-center gap-2"><label className="w-32">VDC Rate ($/hr):</label><input type="number" value={newProject.vdcBlendedRate} onChange={e => setNewProject({...newProject, vdcBlendedRate: e.target.value})} placeholder="e.g. 95" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                    <div className="flex items-center gap-2"><label className="w-32">Contingency ($):</label><input type="number" value={newProject.contingency} onChange={e => setNewProject({...newProject, contingency: e.target.value})} placeholder="e.g. 5000" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                    <div className="flex items-center gap-2"><label className="w-32">Project Dashboard:</label><input type="url" value={newProject.dashboardUrl} onChange={e => setNewProject({...newProject, dashboardUrl: e.target.value})} placeholder="https://..." className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} disabled={isEditing} /></div>
                                                </div>
                                                <button onClick={() => handleAdd('project')} className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600" disabled={isEditing}>Add Project</button>
                                            </div>
                                            </TutorialHighlight>
                                        )}
                                    </div>
                                    {/* Project List */}
                                    <TutorialHighlight tutorialKey="editProjectDetails">
                                        <div className="space-y-2 mb-8">
                                            {filteredProjects.map((p, index) => {
                                                const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;
                                                const currentStatus = p.status || (p.archived ? "Archive" : "Controlling");
                                                return (
                                                    <div key={p.id} className={`${bgColor} p-3 border ${currentTheme.borderColor} rounded-md shadow-sm`}>
                                                    {editingProjectId === p.id ? (
                                                        <div className="space-y-2">
                                                            {/* ... (editing input fields remain the same) ... */}
                                                             <input name="name" value={editingProjectData.name} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                            <input name="projectId" value={editingProjectData.projectId} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                            <select name="status" value={editingProjectData.status} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                                                {projectStatuses.map(status => (<option key={status} value={status}>{statusDescriptions[status]}</option>))}
                                                            </select>
                                                            <div className="flex items-center gap-2"><label className="w-32">Start Date:</label><input type="date" name="startDate" value={editingProjectData.startDate || ''} onChange={e => handleEditDataChange(e, 'project')} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">Project Manager:</label><input name="projectManager" value={editingProjectData.projectManager || ''} onChange={e => handleEditDataChange(e, 'project')} placeholder="PM Name" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">Initial Budget ($):</label><input name="initialBudget" value={editingProjectData.initialBudget || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Initial Budget ($)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">Detailing Rate ($/hr):</label><input name="blendedRate" value={editingProjectData.blendedRate || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Detailing Rate ($/hr)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">VDC Rate ($/hr):</label><input name="vdcBlendedRate" value={editingProjectData.vdcBlendedRate || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="VDC Rate ($/hr)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">Contingency ($):</label><input name="contingency" value={editingProjectData.contingency || 0} onChange={e => handleEditDataChange(e, 'project')} placeholder="Contingency ($)" className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex items-center gap-2"><label className="w-32">Project Dashboard:</label><input name="dashboardUrl" value={editingProjectData.dashboardUrl || ''} onChange={e => handleEditDataChange(e, 'project')} placeholder="https://..." className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/></div>
                                                            <div className="flex gap-2 pt-4"><button onClick={() => handleUpdateProject()} className="flex-grow bg-green-500 text-white p-2 rounded-md hover:bg-green-600">Save</button><button onClick={() => setEditingProjectId(null)} className="flex-grow bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Cancel</button></div>
                                                        </div>
                                                    ) : (
                                                        <div className="cursor-pointer" onClick={() => setExpandedProjectId(p.id)}>
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <p className="font-semibold">{p.name} ({p.projectId})</p>
                                                                    <p className={`text-xs ${currentTheme.subtleText}`}>
                                                                        {p.startDate && `Start: ${p.startDate} | `}
                                                                        {p.projectManager && `PM: ${p.projectManager} | `}
                                                                        Budget: {formatCurrency(p.initialBudget)} | Detailing Rate: ${p.blendedRate || 0}/hr | VDC Rate: ${p.vdcBlendedRate || 0}/hr | Contingency: {formatCurrency(p.contingency)}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    {projectStatuses.map(status => (<Tooltip key={status} text={statusDescriptions[status]}><button onClick={(e) => { e.stopPropagation(); handleProjectStatusChange(p.id, status); }} className={`px-2 py-1 text-xs rounded-md transition-colors ${currentStatus === status ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-blue-400`}`}>{statusDescriptions[status].charAt(0)}</button></Tooltip>))}
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