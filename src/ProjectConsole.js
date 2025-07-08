import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const formatCurrency = (value) => {
    const numberValue = Number(value) || 0;
    return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const initialActivityData = [
    { id: `act_${Date.now()}_1`, description: "SM Modeling", chargeCode: "96100-96-ENG-10", estimatedHours: 0 },
    { id: `act_${Date.now()}_2`, description: "SM Coordination", chargeCode: "96800-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_3`, description: "SM Deliverables", chargeCode: "96810-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_4`, description: "SM Spooling", chargeCode: "96210-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_5`, description: "SM Misc", chargeCode: "96830-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_6`, description: "PF Modeling", chargeCode: "96110-96-ENG-10", estimatedHours: 0 },
    { id: `act_${Date.now()}_7`, description: "PF Coordination", chargeCode: "96801-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_8`, description: "PF Deliverables", chargeCode: "96811-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_9`, description: "PF Spooling", chargeCode: "96211-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_10`, description: "PF Misc", chargeCode: "96831-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_11`, description: "PL Modeling", chargeCode: "96130-96-ENG-10", estimatedHours: 0 },
    { id: `act_${Date.now()}_12`, description: "PL Coordination", chargeCode: "96803-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_13`, description: "PL Deliverables", chargeCode: "96813-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_14`, description: "PL Spooling", chargeCode: "96213-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_15`, description: "PL Misc", chargeCode: "96833-96-ENG-61", estimatedHours: 0 },
    { id: `act_${Date.now()}_16`, description: "Detailing-In House-Cad Mgr", chargeCode: "96505-96-ENG-10", estimatedHours: 0 },
    { id: `act_${Date.now()}_17`, description: "Project Setup", chargeCode: "96301-96-ENG-62", estimatedHours: 0 },
];

const ActivityRow = React.memo(({ activity, groupKey, index, onChange, onDelete, project, currentTheme }) => {
    const blendedRate = project.blendedRate || 0;
    const earnedValue = (activity.estimatedHours * blendedRate) * (activity.percentComplete / 100);
    const actualCost = activity.hoursUsed * blendedRate;

    const calculateProjectedHours = (activity) => {
        const hoursUsed = Number(activity.hoursUsed) || 0;
        const percentComplete = Number(activity.percentComplete) || 0;
        if (!percentComplete || percentComplete === 0) return 0;
        return (hoursUsed / percentComplete) * 100;
    };
    const projected = calculateProjectedHours(activity);
    
    return (
        <tr key={activity.id}>
            <td className="p-1"><input type="text" value={activity.description} onChange={(e) => onChange(groupKey, index, 'description', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1"><input type="text" value={activity.chargeCode} onChange={(e) => onChange(groupKey, index, 'chargeCode', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1 w-24"><input type="text" value={activity.estimatedHours} onChange={(e) => onChange(groupKey, index, 'estimatedHours', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{activity.percentComplete.toFixed(2)}%</td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{activity.hoursUsed.toFixed(2)}</td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{formatCurrency(earnedValue)}</td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{formatCurrency(actualCost)}</td>
            <td className={`p-1 w-24 ${currentTheme.altRowBg}`}>{projected.toFixed(2)}</td>
            <td className="p-1 text-center w-12"><button onClick={() => onDelete(groupKey, index)} className="text-red-500 hover:text-red-700 font-bold">&times;</button></td>
        </tr>
    );
});


const CollapsibleActivityTable = React.memo(({ title, data, groupKey, colorClass, onAdd, onDelete, onChange, isCollapsed, onToggle, project, currentTheme }) => {
    return (
        <div className={`border-b ${currentTheme.borderColor}`}>
            <button
                onClick={onToggle}
                className={`w-full p-2 text-left font-bold flex justify-between items-center ${colorClass}`}
                disabled={onToggle === null}
            >
                <span>{title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {!isCollapsed && (
                <div className="overflow-x-auto" onClick={e => e.stopPropagation()}>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className={currentTheme.altRowBg}>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Activity Description</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Charge Code</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Est. Hrs</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>% Comp</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Hrs Used</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Earned ($)</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Actual ($)</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Proj. Hrs</th>
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data || []).map((activity, index) => (
                                <ActivityRow
                                    key={activity.id}
                                    activity={activity}
                                    groupKey={groupKey}
                                    index={index}
                                    onChange={onChange}
                                    onDelete={onDelete}
                                    project={project}
                                    currentTheme={currentTheme}
                                />
                            ))}
                             <tr>
                                <td colSpan="9" className="p-1"><button onClick={() => onAdd(groupKey)} className="text-sm text-blue-600 hover:underline">+ Add Activity</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
});

const FinancialSummary = ({ project, activityTotals, currentTheme }) => {
    if (!project || !activityTotals) return null;

    const initialBudget = project.initialBudget || 0;
    const contingency = project.contingency || 0;
    const blendedRate = project.blendedRate || 0;

    const spentToDate = activityTotals.used * blendedRate;
    
    const totalHours = activityTotals.estimated;
    const overallPercentComplete = totalHours > 0 ? (activityTotals.used / totalHours) * 100 : 0;
    
    const earnedValue = initialBudget * (overallPercentComplete / 100);
    const productivity = spentToDate > 0 ? earnedValue / spentToDate : 0;

    const costToComplete = (activityTotals.estimated - activityTotals.used) * blendedRate;
    const estFinalCost = spentToDate + costToComplete;

    return (
        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center`}>
            <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Initial Budget</p>
                <p className="text-lg font-bold">{formatCurrency(initialBudget)}</p>
            </div>
            <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Contingency</p>
                <p className="text-lg font-bold">{formatCurrency(contingency)}</p>
            </div>
            <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Spent to Date</p>
                <p className="text-lg font-bold">{formatCurrency(spentToDate)}</p>
            </div>
             <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Cost to Complete</p>
                <p className="text-lg font-bold">{formatCurrency(costToComplete)}</p>
            </div>
             <div>
                <p className={`text-sm ${currentTheme.subtleText}`}>Est. Final Cost</p>
                <p className="text-lg font-bold">{formatCurrency(estFinalCost)}</p>
            </div>
             <div >
                <p className={`text-sm ${currentTheme.subtleText}`}>Productivity</p>
                <p className={`text-lg font-bold ${productivity < 1 ? 'text-red-500' : 'text-green-500'}`}>{productivity.toFixed(2)}</p>
            </div>
        </div>
    )
}

const HourSummary = ({ project, activityTotals, currentTheme }) => {
    if (!project || !activityTotals) return null;

    const totalBudgetHours = (project.initialBudget || 0) / (project.blendedRate || 1);
    const allocatedHours = activityTotals.estimated;
    const unallocatedHours = totalBudgetHours - allocatedHours;

    return (
        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4`}>
            <div className="text-center">
                <p className={`text-sm ${currentTheme.subtleText}`}>Total Budgeted Hours</p>
                <p className="text-lg font-bold">{totalBudgetHours.toFixed(2)}</p>
            </div>
            <div className="text-center">
                <p className={`text-sm ${currentTheme.subtleText}`}>Total Allocated Hours</p>
                <p className="text-lg font-bold">{allocatedHours.toFixed(2)}</p>
            </div>
             <div className="text-center">
                <p className={`text-sm ${currentTheme.subtleText}`}>Unallocated Hours</p>
                <p className={`text-lg font-bold ${unallocatedHours < 0 ? 'text-red-500' : 'text-green-600'}`}>{unallocatedHours.toFixed(2)}</p>
            </div>
        </div>
    )
}

const ProjectDetailView = ({ db, project, projectId, accessLevel, currentTheme, appId, showToast }) => {
    const [draftData, setDraftData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newSubset, setNewSubset] = useState({ name: '', activityId: '', percentageOfProject: 0, percentComplete: 0, hoursUsed: 0, budget: 0 });
    const [editingSubsetId, setEditingSubsetId] = useState(null);
    const [editingSubsetData, setEditingSubsetData] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({
        projectBreakdown: false,
        sheetmetal: true,
        piping: true,
        plumbing: true,
        bim: true,
        structural: true,
        coordination: true,
        gis: true,
    });
    const isPCL = accessLevel === 'pcl';

    const docRef = useMemo(() => doc(db, `artifacts/${appId}/public/data/projectActivities`, projectId), [projectId, db, appId]);

    const allActivitiesList = useMemo(() => {
        if (!draftData) return [];
        return Object.values(draftData.activities).flat();
    }, [draftData]);


    const groupActivities = (activityArray) => {
        const defaultGroups = { sheetmetal: [], piping: [], plumbing: [], bim: [], structural: [], coordination: [], gis: [] };
        return activityArray.reduce((acc, act) => {
            const desc = act.description.toUpperCase();
            if (desc.startsWith('SM')) acc.sheetmetal.push(act);
            else if (desc.startsWith('PF')) acc.piping.push(act);
            else if (desc.startsWith('PL')) acc.plumbing.push(act);
            else if (desc.startsWith('ST')) acc.structural.push(act);
            else if (desc.startsWith('CO')) acc.coordination.push(act);
            else if (desc.startsWith('GIS')) acc.gis.push(act);
            else acc.bim.push(act);
            return acc;
        }, defaultGroups);
    };

    const calculateRollups = useCallback((activities, subsets) => {
        const newActivities = JSON.parse(JSON.stringify(activities));
        
        Object.keys(newActivities).forEach(group => {
            if (newActivities[group]) { // Check if group exists
                newActivities[group].forEach(activity => {
                    const relevantSubsets = subsets.filter(s => s.activityId === activity.id);
                    
                    const totalHoursUsed = relevantSubsets.reduce((sum, s) => sum + (Number(s.hoursUsed) || 0), 0);
                    
                    const totalPercentComplete = relevantSubsets.reduce((sum, s) => {
                        const subsetPercentOfProject = Number(s.percentageOfProject) || 0;
                        const subsetPercentComplete = Number(s.percentComplete) || 0;
                        return sum + ((subsetPercentOfProject / 100) * subsetPercentComplete);
                    }, 0);

                    activity.hoursUsed = totalHoursUsed;
                    activity.percentComplete = totalPercentComplete; 
                });
            }
        });
        return newActivities;
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            let initialData;
            const defaultActivityGroups = { sheetmetal: [], piping: [], plumbing: [], bim: [], structural: [], coordination: [], gis: [] };

            if (docSnap.exists()) {
                const data = docSnap.data();
                // FIX: Merge loaded activities with default structure to ensure all keys exist
                const activities = { ...defaultActivityGroups, ...(data.activities || {}) };
                const subsets = data.subsets || [];
                initialData = { activities, subsets };
            } else {
                const initialGroupedData = groupActivities(initialActivityData);
                initialData = { activities: initialGroupedData, subsets: [] };
                setDoc(docRef, initialData);
            }
            const rolledUpActivities = calculateRollups(initialData.activities, initialData.subsets);
            const fullData = {...initialData, activities: rolledUpActivities};
            
            setDraftData(JSON.parse(JSON.stringify(fullData)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching project data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, docRef, calculateRollups]);
    
    useEffect(() => {
        if (draftData) {
            const rolledUpActivities = calculateRollups(draftData.activities, draftData.subsets);
            if(JSON.stringify(rolledUpActivities) !== JSON.stringify(draftData.activities)){
                setDraftData(prev => ({ ...prev, activities: rolledUpActivities }));
            }
        }
    }, [draftData, calculateRollups]);


    const handleActivityChange = useCallback((group, index, field, value) => {
        setDraftData(prevDraft => {
            const newActivities = { ...prevDraft.activities };
            const newGroup = [...newActivities[group]];
            newGroup[index] = { ...newGroup[index], [field]: value };
            newActivities[group] = newGroup;

            return {
                ...prevDraft,
                activities: newActivities
            };
        });
    }, []);
    
    const handleSaveChanges = async (e) => {
        e.stopPropagation();
        const dataToSave = JSON.parse(JSON.stringify(draftData));

        dataToSave.subsets.forEach(subset => {
            subset.percentageOfProject = Number(subset.percentageOfProject) || 0;
            subset.percentComplete = Number(subset.percentComplete) || 0;
            subset.hoursUsed = Number(subset.hoursUsed) || 0;
            subset.budget = Number(subset.budget) || 0;
        });

        for (const groupKey of Object.keys(dataToSave.activities)) {
            dataToSave.activities[groupKey].forEach(activity => {
                delete activity.percentComplete;
                delete activity.hoursUsed;
            });
        }

        await setDoc(docRef, dataToSave, { merge: true });
        if (!isPCL) {
          showToast("Changes saved!");
        }
    };
    
    const handleEditingSubsetChange = (field, value) => {
        setEditingSubsetData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubsetFieldChange = useCallback((subsetId, field, value) => {
        setDraftData(prevDraft => {
            const newSubsets = prevDraft.subsets.map(s => {
                if (s.id === subsetId) {
                    const numericValue = Number(value);
                    return { ...s, [field]: isNaN(numericValue) ? 0 : numericValue };
                }
                return s;
            });
            return { ...prevDraft, subsets: newSubsets };
        });
    }, []);


    const handleAddNewSubset = () => {
        if (!newSubset.name.trim()) return;
        const subsetToAdd = { 
            ...newSubset, 
            id: `sub_${Date.now()}`, 
            percentageOfProject: Number(newSubset.percentageOfProject) || 0,
            percentComplete: Number(newSubset.percentComplete) || 0,
            hoursUsed: Number(newSubset.hoursUsed) || 0,
            budget: Number(newSubset.budget) || 0,
        };
        setDraftData(prevDraft => ({
            ...prevDraft,
            subsets: [...(prevDraft.subsets || []), subsetToAdd]
        }));
        setNewSubset({ name: '', activityId: '', percentageOfProject: 0, percentComplete: 0, hoursUsed: 0, budget: 0 });
    };

    const handleUpdateSubset = () => {
        if (!editingSubsetData || !editingSubsetData.name.trim()) return;
        setDraftData(prevDraft => ({
            ...prevDraft,
            subsets: prevDraft.subsets.map(s => 
                s.id === editingSubsetId 
                ? { ...editingSubsetData, 
                    percentageOfProject: Number(editingSubsetData.percentageOfProject) || 0,
                    percentComplete: Number(editingSubsetData.percentComplete) || 0,
                    hoursUsed: Number(editingSubsetData.hoursUsed) || 0,
                    budget: Number(editingSubsetData.budget) || 0,
                  } 
                : s
            )
        }));
        setEditingSubsetId(null);
        setEditingSubsetData(null);
    };

    const handleDeleteSubset = (subsetId) => {
        setDraftData(prevDraft => ({
            ...prevDraft,
            subsets: prevDraft.subsets.filter(s => s.id !== subsetId)
        }));
    };
    
    const handleAddNewActivity = useCallback((group) => {
        const newActivity = {
            id: `act_${Date.now()}`,
            description: "New Activity",
            chargeCode: "",
            estimatedHours: 0,
            percentComplete: 0,
            hoursUsed: 0,
        };
        setDraftData(prevDraft => ({
            ...prevDraft,
            activities: {
                ...prevDraft.activities,
                [group]: [...prevDraft.activities[group], newActivity]
            }
        }));
    }, []);

    const handleDeleteActivity = useCallback((group, index) => {
        setDraftData(prevDraft => {
            const newGroup = [...prevDraft.activities[group]];
            const deletedActivityId = newGroup[index].id;
            newGroup.splice(index, 1);
            return {
                ...prevDraft,
                activities: {
                    ...prevDraft.activities,
                    [group]: newGroup
                },
                subsets: prevDraft.subsets.filter(s => s.activityId !== deletedActivityId)
            };
        });
    }, []);

    const handleToggleCollapse = (e, section) => {
        e.stopPropagation();
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const activityTotals = useMemo(() => {
        if (!draftData) return null;
        const allActivities = Object.values(draftData.activities).flat();
        return allActivities.reduce((acc, activity) => {
            acc.estimated += Number(activity.estimatedHours || 0);
            acc.used += Number(activity.hoursUsed || 0);
            return acc;
        }, { estimated: 0, used: 0 });
    }, [draftData]);

    if (loading || !draftData || !project || !activityTotals) return <div className="p-4 text-center">Loading Project Details...</div>;
    
    return (
        <div className="space-y-6 mt-4 border-t pt-4">
             {!isPCL && (
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" onClick={e => e.stopPropagation()}>
                    <FinancialSummary project={project} activityTotals={activityTotals} currentTheme={currentTheme} />
                    <HourSummary project={project} activityTotals={activityTotals} currentTheme={currentTheme} />
                 </div>
             )}
            
            <div className={`${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                 <button
                    onClick={(e) => handleToggleCollapse(e, 'projectBreakdown')}
                    className={`w-full p-3 text-left font-bold flex justify-between items-center ${currentTheme.altRowBg} hover:bg-opacity-75 transition-colors`}
                >
                    <h3 className="text-lg font-semibold">Project Breakdown</h3>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform ${collapsedSections.projectBreakdown ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {!collapsedSections.projectBreakdown && (
                    <div className="p-4" onClick={e => e.stopPropagation()}>
                        <div className={`space-y-2 mb-4 ${isPCL ? 'w-full md:w-1/3' : ''}`}>
                            <div className={`hidden sm:grid ${isPCL ? 'grid-cols-4' : 'grid-cols-11'} gap-x-4 font-bold text-xs ${currentTheme.subtleText} px-2`}>
                                <span className="col-span-2">Name</span>
                                <span className="col-span-1">Activity</span>
                                {!isPCL && <span className="col-span-1">Budget ($)</span>}
                                {!isPCL && <span className="col-span-1">% of Project</span>}
                                <span className="col-span-1">% Complete</span>
                                {!isPCL && (
                                    <>
                                        <span className="col-span-1">Hours Used</span>
                                        <span className="col-span-1">Earned ($)</span>
                                        <span className="col-span-1">Actual ($)</span>
                                        <span className="col-span-1">Productivity</span>
                                        <span className="col-span-1">Actions</span>
                                    </>
                                )}
                            </div>
                            {(draftData.subsets || []).map((subset, index) => {
                                const earned = (subset.budget || 0) * (subset.percentComplete || 0) / 100;
                                const actual = (subset.hoursUsed || 0) * (project.blendedRate || 0);
                                const productivity = actual > 0 ? earned / actual : 0;
                                return (
                                    <div key={subset.id} className={`grid grid-cols-1 ${isPCL ? 'sm:grid-cols-4' : 'sm:grid-cols-11'} gap-x-4 items-center p-2 ${currentTheme.altRowBg} rounded-md`}>
                                        {editingSubsetId === subset.id && !isPCL ? (
                                            <>
                                                <input type="text" placeholder="Name" value={editingSubsetData.name} onChange={e => handleEditingSubsetChange('name', e.target.value)} className={`p-1 border rounded col-span-2 ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <select value={editingSubsetData.activityId} onChange={e => handleEditingSubsetChange('activityId', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                                    <option value="">Select Activity...</option>
                                                    {allActivitiesList.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
                                                </select>
                                                <input type="number" placeholder="Budget ($)" value={editingSubsetData.budget} onChange={e => handleEditingSubsetChange('budget', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <input type="number" placeholder="% of Project" value={editingSubsetData.percentageOfProject} onChange={e => handleEditingSubsetChange('percentageOfProject', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <input type="number" placeholder="% Complete" value={editingSubsetData.percentComplete} onChange={e => handleEditingSubsetChange('percentComplete', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <input type="number" placeholder="Hours Used" value={editingSubsetData.hoursUsed} onChange={e => handleEditingSubsetChange('hoursUsed', e.target.value)} className={`p-1 border rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}/>
                                                <div className="col-span-3"></div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleUpdateSubset} className="text-green-500 hover:text-green-700">Save</button>
                                                    <button onClick={() => setEditingSubsetId(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-medium col-span-2">{subset.name}</span>
                                                <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{allActivitiesList.find(a => a.id === subset.activityId)?.description || 'N/A'}</span>
                                                {!isPCL && <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{formatCurrency(subset.budget || 0)}</span>}
                                                {!isPCL && <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{subset.percentageOfProject}%</span>}
                                                
                                                {isPCL ? (
                                                    <div className="col-span-1">
                                                        <input
                                                            type="number"
                                                            value={subset.percentComplete}
                                                            onChange={(e) => handleSubsetFieldChange(subset.id, 'percentComplete', e.target.value)}
                                                            onBlur={handleSaveChanges}
                                                            className={`p-1 border-2 rounded w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.borderColor} border-yellow-400`}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{subset.percentComplete}%</span>
                                                )}

                                                {!isPCL && (
                                                    <>
                                                        <span className={`text-sm ${currentTheme.subtleText} col-span-1`}>{subset.hoursUsed}</span>
                                                        <span className={`text-sm font-semibold col-span-1`}>{formatCurrency(earned)}</span>
                                                        <span className={`text-sm font-semibold col-span-1`}>{formatCurrency(actual)}</span>
                                                        <span className={`text-sm font-bold col-span-1 ${productivity < 1 ? 'text-red-500' : 'text-green-500'}`}>{productivity.toFixed(2)}</span>
                                                        <div className="flex items-center gap-2 col-span-1">
                                                            <button onClick={() => {setEditingSubsetId(subset.id); setEditingSubsetData({...subset});}} className="text-blue-500 hover:text-blue-700">Edit</button>
                                                            <button onClick={() => handleDeleteSubset(subset.id)} className="text-red-500 hover:text-red-700">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                            )})}
                        </div>
                        {!isPCL && (
                            <div className="grid grid-cols-1 sm:grid-cols-9 gap-2 items-center p-2 border-t pt-4">
                                <input type="text" placeholder="Phase/Building/Area/Level" value={newSubset.name} onChange={e => setNewSubset({...newSubset, name: e.target.value})} className={`p-2 border rounded-md col-span-2 ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <select value={newSubset.activityId} onChange={e => setNewSubset({...newSubset, activityId: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                    <option value="">Select Activity...</option>
                                    {allActivitiesList.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
                                </select>
                                <input type="number" placeholder="Budget ($)" value={newSubset.budget} onChange={e => setNewSubset({...newSubset, budget: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <input type="number" placeholder="% of Proj" value={newSubset.percentageOfProject} onChange={e => setNewSubset({...newSubset, percentageOfProject: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <input type="number" placeholder="% Comp" value={newSubset.percentComplete} onChange={e => setNewSubset({...newSubset, percentComplete: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <input type="number" placeholder="Hrs Used" value={newSubset.hoursUsed} onChange={e => setNewSubset({...newSubset, hoursUsed: e.target.value})} className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />

                                <button onClick={handleAddNewSubset} className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 col-span-2">Add Subset</button>
                            </div>
                        )}
                    </div>
                 )}
            </div>

            {!isPCL && (
                <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`} onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold">Activity Tracker</h3>
                        <button onClick={handleSaveChanges} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm">
                            Save All Changes
                        </button>
                     </div>
                    <CollapsibleActivityTable title="Sheetmetal" data={draftData.activities.sheetmetal} groupKey="sheetmetal" colorClass="bg-yellow-400/70 text-black" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.sheetmetal} onToggle={(e) => handleToggleCollapse(e, 'sheetmetal')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="Piping" data={draftData.activities.piping} groupKey="piping" colorClass="bg-green-500/70 text-white" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.piping} onToggle={(e) => handleToggleCollapse(e, 'piping')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="Plumbing" data={draftData.activities.plumbing} groupKey="plumbing" colorClass="bg-blue-500/70 text-white" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.plumbing} onToggle={(e) => handleToggleCollapse(e, 'plumbing')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="BIM" data={draftData.activities.bim} groupKey="bim" colorClass="bg-indigo-600/70 text-white" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.bim} onToggle={(e) => handleToggleCollapse(e, 'bim')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="Structural" data={draftData.activities.structural} groupKey="structural" colorClass="bg-amber-700/70 text-white" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.structural} onToggle={(e) => handleToggleCollapse(e, 'structural')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="Coordination" data={draftData.activities.coordination} groupKey="coordination" colorClass="bg-pink-500/70 text-white" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.coordination} onToggle={(e) => handleToggleCollapse(e, 'coordination')} project={project} currentTheme={currentTheme}/>
                    <CollapsibleActivityTable title="GIS/GPS" data={draftData.activities.gis} groupKey="gis" colorClass="bg-teal-500/70 text-white" onAdd={handleAddNewActivity} onDelete={handleDeleteActivity} onChange={handleActivityChange} isCollapsed={collapsedSections.gis} onToggle={(e) => handleToggleCollapse(e, 'gis')} project={project} currentTheme={currentTheme}/>
                     <div className={`${currentTheme.altRowBg} font-bold p-2 flex justify-end gap-x-6`}>
                        <span className="text-right">Totals:</span>
                        <span>Est: {activityTotals.estimated.toFixed(2)}</span>
                        <span>Used: {activityTotals.used.toFixed(2)}</span>
                     </div>
                </div>
            )}
        </div>
    );
};


const ProjectConsole = ({ db, detailers, projects, assignments, accessLevel, currentTheme, appId, showToast }) => {
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [filters, setFilters] = useState({ query: '', detailerId: '', startDate: '', endDate: '' });

    const handleProjectClick = (projectId) => {
        setExpandedProjectId(prevId => (prevId === projectId ? null : projectId));
    };

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => !p.archived)
            .filter(p => {
                const { query, detailerId, startDate, endDate } = filters;
                const searchLower = query.toLowerCase();
                
                const nameMatch = p.name.toLowerCase().includes(searchLower);
                const idMatch = p.projectId.includes(searchLower);
                
                const projectAssignments = assignments.filter(a => a.projectId === p.id);
                
                const detailerMatch = !detailerId || projectAssignments.some(a => a.detailerId === detailerId);
                
                const dateMatch = (!startDate && !endDate) || projectAssignments.some(a => {
                    const assignStart = new Date(a.startDate);
                    const assignEnd = new Date(a.endDate);
                    const filterStart = startDate ? new Date(startDate) : null;
                    const filterEnd = endDate ? new Date(endDate) : null;

                    if (filterStart && filterEnd) return assignStart <= filterEnd && assignEnd >= filterStart;
                    if (filterStart) return assignEnd >= filterStart;
                    if (filterEnd) return assignStart <= filterEnd;
                    return true;
                });

                return (nameMatch || idMatch) && detailerMatch && dateMatch;
            })
            .sort((a, b) => a.projectId.localeCompare(b.projectId, undefined, { numeric: true }));
    }, [projects, assignments, filters]);

    const isViewer = accessLevel === 'viewer';
    
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="h-full flex flex-col p-4 gap-4">
            <div className={`flex-shrink-0 p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} shadow-md`}>
                <h2 className={`text-xl font-bold mb-4 ${currentTheme.textColor}`}>Project Overview & Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        name="query"
                        placeholder="Search by project name or ID..."
                        value={filters.query}
                        onChange={handleFilterChange}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                    <select name="detailerId" value={filters.detailerId} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                        <option value="">Filter by Detailer...</option>
                        {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                    </select>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-4">
                {filteredProjects.map((p, index) => {
                    const projectAssignments = assignments.filter(a => a.projectId === p.id);
                    const isExpanded = expandedProjectId === p.id;
                    const project = projects.find(proj => proj.id === p.id);
                    const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;

                    return (
                        <div 
                            key={p.id} 
                            className={`${bgColor} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm transition-all duration-300 ease-in-out`}
                            onClick={() => handleProjectClick(p.id)}
                        >
                            <div className="flex justify-between items-start cursor-pointer">
                                <div>
                                    <h3 className="text-lg font-semibold">{p.name}</h3>
                                    <p className={`text-sm ${currentTheme.subtleText}`}>Project ID: {p.projectId}</p>
                                </div>
                                {!isExpanded && (
                                     <span className={`text-xs ${currentTheme.subtleText}`}>Click to expand</span>
                                )}
                            </div>
                           
                            {isExpanded && (
                                <div onClick={e => e.stopPropagation()}>
                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="text-md font-semibold mb-2 border-b pb-1">Assigned Detailers:</h4>
                                            {projectAssignments.length === 0 ? (
                                                <p className={`text-sm ${currentTheme.subtleText}`}>None</p>
                                            ) : (
                                                <ul className="list-disc list-inside text-sm space-y-1">
                                                    {projectAssignments.map(a => {
                                                        const detailer = detailers.find(d => d.id === a.detailerId);
                                                        return (
                                                            <li key={a.id}>
                                                                {detailer ? `${detailer.firstName} ${detailer.lastName}` : 'Unknown Detailer'} - <span className="font-semibold">{a.allocation}%</span> ({a.trade})
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                        <div>
                                            {p.dashboardUrl && (
                                                <>
                                                    <h4 className="text-md font-semibold mb-2 border-b pb-1">Dashboard</h4>
                                                    <a
                                                        href={p.dashboardUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                        </svg>
                                                        Project Dashboard
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {!isViewer && <ProjectDetailView db={db} project={project} projectId={p.id} accessLevel={accessLevel} currentTheme={currentTheme} appId={appId} showToast={showToast} />}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectConsole;
