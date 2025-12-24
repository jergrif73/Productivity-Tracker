import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
// Import necessary Firestore functions
import { doc, onSnapshot, setDoc, collection, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialHighlight, NavigationContext } from './App';

// --- Import Components & Helpers from new file ---
import {
    formatCurrency,
    ConfirmationModal,
    normalizeDesc,
    standardActivitiesToAdd,
    groupActivities,
    animationVariants,
    FinancialSummary,
    BudgetImpactLog,
    FinancialForecastChart,
    ProjectBreakdown,
    ActionTrackerDisciplineManager,
    ActionTracker,
    CollapsibleActivityTable,
    parseCSV, // Imported new helper
    CSVImportModal // Imported new modal
} from './ProjectDetailViewComponents.js';


// --- Main ProjectDetailView Component ---
const ProjectDetailView = ({
    db, project, projectId, accessLevel, currentTheme, appId, showToast,
    activeTrades, allDisciplines, onTradeFilterToggle, onSelectAllTrades,
    showChargeCodeManager
}) => {
    // Component State
    const { navigateToWorkloaderForProject } = useContext(NavigationContext);
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [collapsedSections, setCollapsedSections] = useState({
        budgetLog: true, financialForecast: true, mainsManagement: true,
        actionTrackerSettings: true, actionTracker: true
        // Activity table sections managed dynamically
    });
    const [weeklyHours, setWeeklyHours] = useState({});
    const [newActivityGroup, setNewActivityGroup] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);
    const [csvImportState, setCsvImportState] = useState({ pendingData: null, showModal: false }); // New CSV State
    const docRef = useMemo(() => doc(db, `artifacts/${appId}/public/data/projectActivities`, projectId), [projectId, db, appId]);

    // Firestore listener for projectActivities
     useEffect(() => {
        let unsubscribe = () => {};
        setLoading(true);

        const setupListener = () => {
            unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    // MIGRATION: Check if activities are at top level (old structure) instead of nested
                    if (!data.activities || Object.keys(data.activities).length === 0) {
                        const migratedActivities = {};
                        const potentialKeys = ['sheetmetal', 'piping', 'plumbing', 'management', 'vdc', 'uncategorized'];
                        
                        potentialKeys.forEach(key => {
                            if (data[key] && Array.isArray(data[key])) {
                                migratedActivities[key] = data[key];
                            }
                        });
                        
                        if (Object.keys(migratedActivities).length > 0) {
                            data.activities = migratedActivities;
                            setDoc(docRef, { activities: migratedActivities }, { merge: true });
                        }
                    }
                    
                    // MIGRATION: Auto-populate actionTrackerDisciplines from activity keys if empty
                    if (data.activities && Object.keys(data.activities).length > 0) {
                        if (!data.actionTrackerDisciplines || data.actionTrackerDisciplines.length === 0) {
                            const standardLabels = {
                                'sheetmetal': 'Sheet Metal / HVAC',
                                'piping': 'Mechanical Piping',
                                'plumbing': 'Plumbing',
                                'management': 'Management',
                                'vdc': 'VDC'
                            };
                            
                            const activityKeys = Object.keys(data.activities);
                            const newDisciplines = activityKeys.map(key => ({
                                key: key,
                                label: standardLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)
                            }));
                            
                            setDoc(docRef, { actionTrackerDisciplines: newDisciplines }, { merge: true });
                        }
                    }
                    
                    setProjectData(data);
                    // Initialize collapsed state for activity groups
                    const activities = data.activities || {};
                    setCollapsedSections(prev => {
                        const newState = {...prev};
                        Object.keys(activities).forEach(groupKey => {
                            const sectionId = `group_${groupKey}`;
                            if (!(sectionId in newState)) newState[sectionId] = true; // Default collapsed
                        });
                        if(data.projectWideActivities?.length > 0) {
                             (data.projectWideActivities).forEach(tradeKey => { 
                                 const sectionId = `project_wide_trade_${tradeKey}`;
                                 if(!(sectionId in newState)) newState[sectionId] = true;
                             })
                        }
                        return newState;
                    });
                } else {
                    // Document doesn't exist - create it automatically with standard activities
                    // ... (Activity creation logic - largely static, keeping concise)
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
                        { description: "Project VDC Admin", chargeCode: "9630062" },
                        { description: "Project Setup", chargeCode: "9630162" },
                        { description: "Project Data Management", chargeCode: "9630262" },
                        { description: "Project Closeout", chargeCode: "9630562" },
                        { description: "Project Coordination Management​", chargeCode: "9630762" }
                    ];
                    
                    const standardActivities = standardChargeCodes.map(item => ({
                        id: `std_${item.chargeCode}_${Math.random().toString(16).slice(2)}`,
                        description: normalizeDesc(item.description),
                        chargeCode: item.chargeCode,
                        estimatedHours: 0,
                        hoursUsed: 0,
                        percentComplete: 0,
                        subsets: []
                    }));
                    
                    const groupedActivities = groupActivities(standardActivities, [
                        { key: 'sheetmetal', label: 'Sheet Metal / HVAC' },
                        { key: 'piping', label: 'Mechanical Piping' },
                        { key: 'plumbing', label: 'Plumbing' },
                        { key: 'management', label: 'Management' },
                        { key: 'vdc', label: 'VDC' }
                    ]);
                    
                    const defaultDisciplines = [
                        { key: 'sheetmetal', label: 'Sheet Metal / HVAC' },
                        { key: 'piping', label: 'Mechanical Piping' },
                        { key: 'plumbing', label: 'Plumbing' },
                        { key: 'management', label: 'Management' },
                        { key: 'vdc', label: 'VDC' }
                    ];
                    
                    const projectActivitiesData = {
                        activities: groupedActivities,
                        actionTrackerDisciplines: defaultDisciplines,
                        actionTrackerData: {},
                        budgetImpacts: [],
                        mainItems: [],
                        projectWideActivities: []
                    };
                    
                    setDoc(docRef, projectActivitiesData).then(() => {
                        showToast("Project initialized with standard activities", "success");
                    }).catch(err => {
                        console.error("Error creating projectActivities:", err);
                        setProjectData(null);
                        setLoading(false);
                    });
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching project activities:", error);
                setProjectData(null);
                setLoading(false);
            });
        };
        setupListener();
        return () => unsubscribe();
    }, [docRef, showToast]); 

    // Fetch Weekly Hours
    useEffect(() => {
        const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${projectId}/weeklyHours`);
        const unsubscribe = onSnapshot(weeklyHoursRef, (snapshot) => {
            const hoursData = {};
            snapshot.docs.forEach(doc => { if (doc.id !== '_config') hoursData[doc.id] = doc.data(); });
            setWeeklyHours(hoursData);
        });
        return () => unsubscribe();
    }, [projectId, db, appId]);

    // --- Data Saving Handler ---
    const handleSaveData = useCallback(async (dataToSave) => {
        if (!projectId) return;
        try {
            await setDoc(docRef, dataToSave, { merge: true });
        } catch (error) {
            console.error("Error saving project data:", error);
            showToast("Failed to save changes.", "error");
        }
    }, [projectId, docRef, showToast]);

    // --- CSV Import Handlers (NEW) ---
    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const rows = parseCSV(event.target.result);
                processCSVData(rows);
            } catch (err) {
                showToast(err.message, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = null; // Reset input
    };

    const processCSVData = (rows) => {
        const changes = {
            newActivities: [],
            updates: [], // { group, index, activityData }
            conflicts: [] // { group, index, description, currentHours, newHours, fullData }
        };

        // Create a flat map of existing activities for easier lookup
        // Key: Normalized Description -> Value: { group, index, ...activity }
        const existingMap = new Map();
        if (projectData && projectData.activities) {
            Object.entries(projectData.activities).forEach(([group, acts]) => {
                acts.forEach((act, idx) => {
                    existingMap.set(normalizeDesc(act.description), { group, index: idx, ...act });
                });
            });
        }

        rows.forEach(row => {
            const normDesc = normalizeDesc(row.description);
            const existing = existingMap.get(normDesc);

            if (existing) {
                // Step 1: Activity Exists. Move to Step 2.
                let updateNeeded = false;
                const updatePayload = { ...existing }; // Clone to modify

                // Step 2: Check Charge Code
                // If it doesn't exist in the record, add it from CSV.
                // If CSV charge code differs and existing is present? Logic says "If it doesn't, add to corresponding". 
                // Implicitly, if existing has one, we skip step 2 logic and go to step 3.
                // BUT, often users want to update codes. Let's strictly follow: "If it doesn't [exist in activity], add to corresponding"
                if (!updatePayload.chargeCode && row.chargeCode) {
                    updatePayload.chargeCode = row.chargeCode;
                    updateNeeded = true;
                }

                // Step 3: Check Est Hours
                const csvHours = Number(row.estimatedHours) || 0;
                const currentHours = Number(updatePayload.estimatedHours) || 0;

                if (csvHours > 0) {
                    if (currentHours > 0) {
                         // Step 3a: Exists -> Prompt
                         if (csvHours !== currentHours) {
                             changes.conflicts.push({
                                 description: row.description, // Use CSV casing for display
                                 currentHours: currentHours,
                                 newHours: csvHours,
                                 // We need to pass the potentially updated charge code too
                                 fullData: { ...updatePayload, estimatedHours: csvHours }
                             });
                             // Do not mark updateNeeded yet, wait for user resolution
                             return; 
                         }
                    } else {
                        // Step 3b: Doesn't exist -> Add to corresponding
                        updatePayload.estimatedHours = csvHours;
                        updateNeeded = true;
                    }
                }

                if (updateNeeded) {
                    changes.updates.push({ 
                        group: existing.group, 
                        index: existing.index, 
                        activityData: updatePayload 
                    });
                }

            } else {
                // Step 1b: Activity code doesn't exist -> Add to appropriate discipline
                changes.newActivities.push({
                    id: `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    description: row.description,
                    chargeCode: row.chargeCode || '',
                    estimatedHours: Number(row.estimatedHours) || 0,
                    percentComplete: 0,
                    costToDate: 0,
                    subsets: []
                });
            }
        });

        if (changes.conflicts.length > 0) {
            setCsvImportState({ pendingData: changes, showModal: true });
        } else {
            // No conflicts, apply immediately
            applyCSVChanges(changes);
        }
    };

    const applyCSVChanges = (changes, overwriteConflicts = false) => {
        const newActivitiesByGroup = { ...projectData.activities };
        const disciplines = projectData.actionTrackerDisciplines || allDisciplines || [];

        // 1. Apply Updates (non-conflicting)
        changes.updates.forEach(update => {
            if (newActivitiesByGroup[update.group] && newActivitiesByGroup[update.group][update.index]) {
                newActivitiesByGroup[update.group][update.index] = update.activityData;
            }
        });

        // 2. Apply Conflicts (if overwrite is true)
        // If overwrite is FALSE, we might still need to apply Charge Code updates if they happened in Step 2 for these items?
        // The conflict object carries 'fullData' which has the charge code update applied.
        // If overwrite=false, we should strictly NOT update hours. But should we update code?
        // Logic interpretation: Step 3 is gated. If user picks No to Step 3, we skip Step 3.
        // But Step 2 happened before Step 3. 
        // Let's assume 'No' means "Don't touch this record's hours", but we still want the charge code fix.
        let appliedConflicts = 0;
        changes.conflicts.forEach(conflict => {
            // Note: conflict.fullData contains the necessary group and index information.
            
            if (newActivitiesByGroup[conflict.fullData.group] && newActivitiesByGroup[conflict.fullData.group][conflict.fullData.index]) {
                 if (overwriteConflicts) {
                     newActivitiesByGroup[conflict.fullData.group][conflict.fullData.index] = conflict.fullData;
                     appliedConflicts++;
                 } else {
                     // If skipping hours overwrite, we check if we still need to update Charge Code
                     // conflict.fullData has the NEW charge code. The activity in DB has OLD (or empty).
                     // If the logic was "Step 2: If code doesn't exist, update it", we should persist that part.
                     const original = newActivitiesByGroup[conflict.fullData.group][conflict.fullData.index];
                     if (!original.chargeCode && conflict.fullData.chargeCode) {
                         newActivitiesByGroup[conflict.fullData.group][conflict.fullData.index] = {
                             ...original,
                             chargeCode: conflict.fullData.chargeCode
                         };
                         appliedConflicts++; // Technically an update
                     }
                 }
            }
        });

        // 3. Process New Activities (Step 1b)
        // Use groupActivities helper to sort them into correct buckets
        if (changes.newActivities.length > 0) {
            const groupedNew = groupActivities(changes.newActivities, disciplines);
            Object.entries(groupedNew).forEach(([key, acts]) => {
                if (!newActivitiesByGroup[key]) newActivitiesByGroup[key] = [];
                // Filter out if for some reason duplicates exist in the new batch
                const existingDescs = new Set(newActivitiesByGroup[key].map(a => normalizeDesc(a.description)));
                acts.forEach(act => {
                    if (!existingDescs.has(normalizeDesc(act.description))) {
                        newActivitiesByGroup[key].push(act);
                    }
                });
            });
        }

        handleSaveData({ activities: newActivitiesByGroup });
        showToast(`Imported: ${changes.newActivities.length} new, ${changes.updates.length + appliedConflicts} updated.`, "success");
        setCsvImportState({ pendingData: null, showModal: false });
    };

    // --- Charge Code Management Handlers ---
    const handleAddStandardCodes = useCallback(async () => {
        if (!projectData || !projectData.activities) {
            showToast("Project data not loaded yet.", "warning");
            setConfirmAction(null);
            return;
        }
        const currentDisciplines = projectData.actionTrackerDisciplines || allDisciplines || [];
        const existingActivities = Object.values(projectData.activities).flat();
        const existingDescriptions = new Set(existingActivities.map(act => normalizeDesc(act.description)));
        const activitiesToActuallyAdd = standardActivitiesToAdd.filter(stdAct => !existingDescriptions.has(normalizeDesc(stdAct.description)));

        if (activitiesToActuallyAdd.length === 0) {
            showToast("All standard activities already exist.", "info");
            setConfirmAction(null);
            return;
        }
        const mergedActivities = [...existingActivities, ...activitiesToActuallyAdd];
        const regroupedActivities = groupActivities(mergedActivities, currentDisciplines);

        try {
            await updateDoc(docRef, { activities: regroupedActivities });
            showToast(`${activitiesToActuallyAdd.length} new standard activities added.`, 'success');
        } catch (error) {
            console.error("Error adding standard activities:", error);
            showToast('Failed to add standard activities.', 'error');
        } finally {
            setConfirmAction(null);
        }
    }, [projectData, allDisciplines, docRef, showToast]); 

    const handleDeleteAllActivities = useCallback(async () => {
        try {
            await updateDoc(docRef, { activities: {} });
            showToast('All project activities deleted.', 'success');
        } catch (error) {
            console.error("Error deleting activities:", error);
            showToast('Failed to delete activities.', 'error');
        } finally {
            setConfirmAction(null);
        }
    }, [docRef, showToast]);

    // Confirmation Triggers
    const confirmAddCodes = useCallback(() => { setConfirmAction({ title: "Confirm Add Standard Activities", message: "This will add any standard activities from the charge code list that are currently missing from this project. Existing activities will remain.", action: handleAddStandardCodes }); }, [handleAddStandardCodes]);
    const confirmDeleteAll = useCallback(() => { setConfirmAction({ title: "Confirm Delete All Activities", message: "This will permanently delete ALL activities currently defined for this project. This cannot be undone.", action: handleDeleteAllActivities }); }, [handleDeleteAllActivities]);

    // --- Other Handlers (Budget, Mains, Action Tracker, Activities) ---
    const handleAddImpact = useCallback((impact) => { handleSaveData({ budgetImpacts: [...(projectData?.budgetImpacts || []), impact] }); }, [projectData, handleSaveData]);
    const handleDeleteImpact = useCallback((impactId) => { handleSaveData({ budgetImpacts: (projectData?.budgetImpacts || []).filter(i => i.id !== impactId) }); }, [projectData, handleSaveData]);
    const handleAddMain = useCallback((main) => { handleSaveData({ mainItems: [...(projectData?.mainItems || []), main] }); }, [projectData, handleSaveData]);
    const handleUpdateMain = useCallback((updatedMain) => { handleSaveData({ mainItems: (projectData?.mainItems || []).map(m => m.id === updatedMain.id ? updatedMain : m) }); }, [projectData, handleSaveData]);
    const handleDeleteMain = useCallback((mainId) => { handleSaveData({ mainItems: (projectData?.mainItems || []).filter(m => m.id !== mainId) }); }, [projectData, handleSaveData]);
    const handleReorderMains = useCallback((reorderedMains) => { handleSaveData({ mainItems: reorderedMains.map((main, index) => ({ ...main, order: index })) }); }, [handleSaveData]);
    const handleToggleCollapse = useCallback((id) => { setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] })); }, []);
    const handleAddActionTrackerDiscipline = useCallback((newDiscipline) => { 
        const disciplines = [...(projectData?.actionTrackerDisciplines || []), newDiscipline]; 
        const updatedActivities = { ...(projectData?.activities || {}), [newDiscipline.key]: [] }; 
        const updatedRateTypes = { ...(projectData?.rateTypes || {}), [newDiscipline.key]: 'Detailing Rate' }; 
        handleSaveData({ 
            actionTrackerDisciplines: disciplines, 
            activities: updatedActivities, 
            rateTypes: updatedRateTypes 
        }); 
        setCollapsedSections(prev => ({ ...prev, [`group_${newDiscipline.key}`]: true }));
        onSelectAllTrades(projectId, disciplines); 
        showToast(`Discipline "${newDiscipline.label}" added.`, 'success');
    }, [projectData, handleSaveData, onSelectAllTrades, projectId, showToast]);
    const handleDeleteActionTrackerDiscipline = useCallback((disciplineKey) => { const disciplines = (projectData?.actionTrackerDisciplines || []).filter(d => d.key !== disciplineKey); handleSaveData({ actionTrackerDisciplines: disciplines }); onTradeFilterToggle(projectId, disciplineKey); }, [projectData, handleSaveData, onTradeFilterToggle, projectId]);
    const handleUpdateActionTrackerPercentage = useCallback((mainId, trade, field, value) => { const data = JSON.parse(JSON.stringify(projectData?.actionTrackerData || {})); if (!data[mainId]) data[mainId] = {}; if (!data[mainId][trade]) data[mainId][trade] = {}; data[mainId][trade][field] = value; handleSaveData({ actionTrackerData: data }); }, [projectData, handleSaveData]);
    const handleUpdateActivityCompletion = useCallback((mainId, trade, activityId, newPercentage) => {
        const localActionData = JSON.parse(JSON.stringify(projectData?.actionTrackerData || {}));
        const updatedActivities = JSON.parse(JSON.stringify(projectData?.activities || {}));
        let activityModified = false;
        const isProjectWide = projectData?.projectWideActivities?.includes(trade);

        if (isProjectWide) {
            if (!localActionData.project_wide) localActionData.project_wide = {};
            if (!localActionData.project_wide[trade]) localActionData.project_wide[trade] = {};
            localActionData.project_wide[trade][activityId] = newPercentage;
            if (updatedActivities[trade]) {
                const actIndex = updatedActivities[trade].findIndex(a => a.id === activityId);
                if (actIndex !== -1) { updatedActivities[trade][actIndex].percentComplete = newPercentage === '' ? 0 : Number(newPercentage); activityModified = true; }
            }
        } else {
            if (!mainId) return;
            if (!localActionData[mainId]) localActionData[mainId] = {};
            if (!localActionData[mainId][trade]) localActionData[mainId][trade] = {};
            if (!localActionData[mainId][trade].activities) localActionData[mainId][trade].activities = {};
            localActionData[mainId][trade].activities[activityId] = newPercentage;
            if (updatedActivities[trade]) {
                 const actIndex = updatedActivities[trade].findIndex(a => a.id === activityId);
                 if (actIndex !== -1) {
                    let totalWeightedCompletion = 0, totalWeight = 0;
                    (projectData?.mainItems || []).forEach(main => {
                        const mainTradeData = localActionData[main.id]?.[trade];
                        if (mainTradeData) {
                            const weight = parseFloat(mainTradeData.tradePercentage) || 0;
                            const completion = parseFloat(mainTradeData.activities?.[activityId]) || 0;
                            if (weight > 0) { totalWeightedCompletion += (completion / 100) * (weight / 100); totalWeight += (weight / 100); }
                        }
                    });
                    const overallCompletion = totalWeight > 0 ? (totalWeightedCompletion / totalWeight) * 100 : 0;
                    updatedActivities[trade][actIndex].percentComplete = overallCompletion;
                    activityModified = true;
                }
            }
        }
        const dataToSave = { actionTrackerData: localActionData };
        if (activityModified) dataToSave.activities = updatedActivities;
        handleSaveData(dataToSave);
    }, [projectData, handleSaveData]);
    const handleUpdateActivity = useCallback((group, index, field, value) => { const acts = JSON.parse(JSON.stringify(projectData?.activities || {})); if (acts[group]?.[index]) { acts[group][index][field] = value; handleSaveData({ activities: acts }); } }, [projectData, handleSaveData]);
    const handleAddActivity = useCallback((group) => { const newAct = { id: `act_${Date.now()}`, description: "New Activity", chargeCode: "", estimatedHours: 0, costToDate: 0, percentComplete: 0, subsets: [] }; const acts = JSON.parse(JSON.stringify(projectData?.activities || {})); if (!acts[group]) acts[group] = []; acts[group].push(newAct); handleSaveData({ activities: acts }); }, [projectData, handleSaveData]);
    const handleDeleteActivity = useCallback((group, index) => { const acts = JSON.parse(JSON.stringify(projectData?.activities || {})); if (acts[group]?.[index]) { acts[group].splice(index, 1); handleSaveData({ activities: acts }); } }, [projectData, handleSaveData]);
    const handleDeleteActivityFromActionTracker = useCallback((activityId) => { const acts = JSON.parse(JSON.stringify(projectData?.activities || {})); let removed = false; Object.keys(acts).forEach(k => { const len = acts[k].length; acts[k] = acts[k].filter(a => a.id !== activityId); if(acts[k].length < len) removed = true; }); if (removed) { handleSaveData({ activities: acts }); showToast("Activity removed.", "success"); } }, [projectData, handleSaveData, showToast]);
    const handleSetRateType = useCallback((groupKey, rateType) => { handleSaveData({ rateTypes: { ...(projectData?.rateTypes || {}), [groupKey]: rateType } }); }, [projectData, handleSaveData]);
    const handleAddActivityGroup = useCallback(async () => { 
        if (!newActivityGroup) {
            showToast("Please select a discipline first.", "warning");
            return;
        }
        if (projectData?.activities?.[newActivityGroup]) { 
            showToast("This discipline section already exists.", "warning"); 
            return; 
        } 
        
        const disciplinesSource = projectData?.actionTrackerDisciplines || allDisciplines || [];
        let details = disciplinesSource.find(d => d.key === newActivityGroup);
        if (!details) {
            const standardDisciplines = [
                { key: 'sheetmetal', label: 'Sheet Metal / HVAC' },
                { key: 'piping', label: 'Mechanical Piping' },
                { key: 'plumbing', label: 'Plumbing' },
                { key: 'management', label: 'Management' },
                { key: 'vdc', label: 'VDC' }
            ];
            details = standardDisciplines.find(d => d.key === newActivityGroup);
        }
        
        if (!details) { 
            showToast(`Error: Could not find discipline "${newActivityGroup}".`, "error"); 
            return; 
        } 
        
        const current = projectData?.actionTrackerDisciplines || []; 
        const exists = current.some(d => d.key === newActivityGroup); 
        
        const data = { activities: { ...(projectData?.activities || {}), [newActivityGroup]: [] } }; 
        if (!exists) {
            data.actionTrackerDisciplines = [...current, { key: details.key, label: details.label }];
        }
        
        try {
            await handleSaveData(data);
            setNewActivityGroup(''); 
            showToast(`Section "${details.label}" added.`, "success"); 
            if (!exists) {
                onSelectAllTrades(projectId, data.actionTrackerDisciplines); 
            }
        } catch (error) {
            console.error("Error in handleAddActivityGroup:", error);
            showToast("Failed to add discipline section.", "error");
        }
    }, [newActivityGroup, projectData, allDisciplines, handleSaveData, showToast, onSelectAllTrades, projectId]);
    
    const handleRemoveDuplicateActivities = useCallback(() => { if (!projectData?.activities) { showToast("No activities.", "info"); return; } const flat = Object.values(projectData.activities).flat(); const map = new Map(); flat.forEach(a => { const k = normalizeDesc(a.description); if (map.has(k)) { const e = map.get(k); e.estimatedHours = (Number(e.estimatedHours)||0)+(Number(a.estimatedHours)||0); e.costToDate = (Number(e.costToDate)||0)+(Number(a.costToDate)||0); if(!e.chargeCode && a.chargeCode) e.chargeCode = a.chargeCode; } else map.set(k, {...a, description: k, estimatedHours: Number(a.estimatedHours)||0, costToDate: Number(a.costToDate)||0 }); }); const unique = Array.from(map.values()); const removed = flat.length - unique.length; if (removed > 0) { const regrouped = groupActivities(unique, projectData.actionTrackerDisciplines || allDisciplines); handleSaveData({ activities: regrouped }); showToast(`${removed} duplicates merged.`, "success"); } else showToast("No duplicates found.", "info"); }, [projectData, allDisciplines, handleSaveData, showToast]);

    const handleDeleteActivityGroup = useCallback((groupKey) => { 
        if (!window.confirm(`Delete "${groupKey}" section and all its activities? This cannot be undone.`)) return; 
        const { [groupKey]: _, ...restActs } = projectData?.activities || {}; 
        const { [groupKey]: __, ...restRates } = projectData?.rateTypes || {}; 
        const newDisciplines = (projectData?.actionTrackerDisciplines || []).filter(d => d.key !== groupKey); 
        handleSaveData({ activities: restActs, rateTypes: restRates, actionTrackerDisciplines: newDisciplines }); 
        onTradeFilterToggle(projectId, groupKey); 
        showToast(`Section "${groupKey}" deleted.`, 'success'); 
    }, [projectData, handleSaveData, onTradeFilterToggle, projectId, showToast]);

    const handleRenameActivityGroup = useCallback((groupKey, newLabel) => { 
        if (!newLabel.trim()) return; 
        const disciplines = (projectData?.actionTrackerDisciplines || []).map(d => d.key === groupKey ? { ...d, label: newLabel.trim() } : d); 
        handleSaveData({ actionTrackerDisciplines: disciplines }); 
        showToast(`Renamed to "${newLabel.trim()}".`, 'success'); 
    }, [projectData, handleSaveData, showToast]);

    const handleToggleProjectWide = useCallback((groupKey) => { 
        const current = projectData?.projectWideActivities || []; 
        const newWide = current.includes(groupKey) ? current.filter(k => k !== groupKey) : [...current, groupKey]; 
        handleSaveData({ projectWideActivities: newWide }); 
    }, [projectData, handleSaveData]);

    // Calculation Memos 
    const calculateGroupTotals = useCallback((activities, proj, rateType) => {
        return (activities || []).reduce((acc, activity) => {
            const estHours = Number(activity?.estimatedHours || 0);
            const costToDate = Number(activity?.costToDate || 0);
            const percentComplete = Number(activity?.percentComplete || 0);
            const rateToUse = rateType === 'VDC Rate' ? (proj.vdcBlendedRate || proj.blendedRate || 0) : (proj.blendedRate || 0);
            
            const budget = Math.ceil((estHours * rateToUse) / 5) * 5;
            const projectedCost = percentComplete > 0 ? (costToDate / (percentComplete / 100)) : (estHours > 0 ? budget : 0);

            acc.estimated += estHours;
            acc.budget += budget;
            acc.actualCost += costToDate;
            acc.earnedValue += budget * (percentComplete / 100);
            acc.projected += projectedCost; 
            return acc;
        }, { estimated: 0, budget: 0, actualCost: 0, earnedValue: 0, projected: 0, percentComplete: 0 }); 
    }, []); 

    const activityTotals = useMemo(() => {
        if (!projectData?.activities || !project) return { estimated: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 };
        const allActivitiesFlat = Object.entries(projectData.activities).flatMap(([groupKey, acts]) => {
            const rateType = projectData.rateTypes?.[groupKey] || 'Detailing Rate';
            return (acts || []).map(act => ({ ...act, rateType })); 
        });
        return allActivitiesFlat.reduce((acc, activity) => {
             const estHours = Number(activity?.estimatedHours || 0);
             const costToDate = Number(activity?.costToDate || 0);
             const percentComplete = Number(activity?.percentComplete || 0);
             const rate = activity.rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
             
             const budget = Math.ceil((estHours * rate) / 5) * 5;
             const projectedCost = percentComplete > 0 ? (costToDate / (percentComplete / 100)) : (estHours > 0 ? budget : 0);

             acc.estimated += estHours;
             acc.totalActualCost += costToDate;
             acc.totalEarnedValue += budget * (percentComplete / 100);
             acc.totalProjectedCost += projectedCost;
             return acc;
        }, { estimated: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 }); 
    }, [projectData?.activities, projectData?.rateTypes, project]); 

    const groupTotals = useMemo(() => {
        if (!projectData?.activities || !project) return {};
        return Object.fromEntries(
            Object.entries(projectData.activities).map(([groupKey, acts]) => {
                const rateType = projectData.rateTypes?.[groupKey] || 'Detailing Rate';
                const totals = calculateGroupTotals(acts, project, rateType); 
                const totalBudgetForGroup = totals.budget;
                const weightedPercentComplete = (acts || []).reduce((acc, act) => { 
                    const estHours = Number(act.estimatedHours) || 0;
                    const percent = Number(act.percentComplete) || 0;
                    const rate = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate) : project.blendedRate;
                    const actBudget = Math.ceil((estHours * rate) / 5) * 5;
                    return totalBudgetForGroup > 0 ? acc + (percent * (actBudget / totalBudgetForGroup)) : acc;
                }, 0);
                totals.percentComplete = weightedPercentComplete;
                return [groupKey, totals];
            })
        );
    }, [projectData?.activities, projectData?.rateTypes, project, calculateGroupTotals]); 

    const currentBudget = useMemo(() => {
        return (project?.initialBudget || 0) + (projectData?.budgetImpacts || []).reduce((sum, impact) => sum + impact.amount, 0);
    }, [project?.initialBudget, projectData?.budgetImpacts]); 

    const sortedMainItems = useMemo(() => {
        return [...(projectData?.mainItems || [])].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    }, [projectData?.mainItems]); 

    const standardToCustomMapping = useMemo(() => {
        const mapping = {};
        const disciplines = allDisciplines || [];
        
        const ductDiscipline = disciplines.find(d => d.label.toLowerCase().includes('duct') || d.label.toLowerCase().includes('sheet'));
        const pipingDiscipline = disciplines.find(d => d.label.toLowerCase().includes('piping') || d.label.toLowerCase().includes('pipe'));
        const plumbingDiscipline = disciplines.find(d => d.label.toLowerCase().includes('plumb'));
        const managementDiscipline = disciplines.find(d => d.label.toLowerCase().includes('manage') || d.label.toLowerCase().includes('coord'));
        const vdcDiscipline = disciplines.find(d => d.label.toLowerCase().includes('vdc'));
        
        if (ductDiscipline) mapping['sheetmetal'] = ductDiscipline.key;
        if (pipingDiscipline) mapping['piping'] = pipingDiscipline.key;
        if (plumbingDiscipline) mapping['plumbing'] = plumbingDiscipline.key;
        if (managementDiscipline) mapping['management'] = managementDiscipline.key;
        if (vdcDiscipline) mapping['vdc'] = vdcDiscipline.key;
        
        mapping['sheetmetal_label'] = 'Sheet Metal / HVAC';
        mapping['piping_label'] = 'Mechanical Piping';
        mapping['plumbing_label'] = 'Plumbing';
        mapping['management_label'] = 'Management';
        mapping['vdc_label'] = 'VDC';
        mapping['uncategorized_label'] = 'Uncategorized';
        
        return mapping;
    }, [allDisciplines]);

    const tradeColorMapping = useMemo(() => {
        const mapping = {};
        (allDisciplines || []).forEach(d => {
             if (d.label.toLowerCase().includes('pip')) mapping[d.key] = { bg: 'bg-green-500/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('duct') || d.label.toLowerCase().includes('sheet')) mapping[d.key] = { bg: 'bg-yellow-400/70', text: 'text-black' };
             else if (d.label.toLowerCase().includes('plumb')) mapping[d.key] = { bg: 'bg-blue-500/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('coord') || d.label.toLowerCase().includes('manage')) mapping[d.key] = { bg: 'bg-pink-500/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('vdc')) mapping[d.key] = { bg: 'bg-indigo-600/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('struct')) mapping[d.key] = { bg: 'bg-amber-700/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('gis')) mapping[d.key] = { bg: 'bg-teal-500/70', text: 'text-white' };
             else mapping[d.key] = { bg: 'bg-gray-500/70', text: 'text-white' }; 
        });
        mapping['sheetmetal'] = { bg: 'bg-yellow-400/70', text: 'text-black' };
        mapping['piping'] = { bg: 'bg-green-500/70', text: 'text-white' };
        mapping['plumbing'] = { bg: 'bg-blue-500/70', text: 'text-white' };
        mapping['management'] = { bg: 'bg-pink-500/70', text: 'text-white' };
        mapping['vdc'] = { bg: 'bg-indigo-600/70', text: 'text-white' };
        mapping['uncategorized'] = { bg: 'bg-gray-600/70', text: 'text-white' };
        return mapping;
    }, [allDisciplines]);

    const availableDisciplinesToAdd = useMemo(() => {
        const disciplinesSource = projectData?.actionTrackerDisciplines || allDisciplines || [];
        
        if (disciplinesSource.length > 0) {
            return disciplinesSource.filter(d => !projectData?.activities || !projectData.activities[d.key]);
        }
        
        const standardDisciplines = [
            { key: 'sheetmetal', label: 'Sheet Metal / HVAC' },
            { key: 'piping', label: 'Mechanical Piping' },
            { key: 'plumbing', label: 'Plumbing' },
            { key: 'management', label: 'Management' },
            { key: 'vdc', label: 'VDC' }
        ];
        
        return standardDisciplines.filter(d => !projectData?.activities || !projectData.activities[d.key]);
    }, [projectData?.actionTrackerDisciplines, projectData?.activities, allDisciplines]);

    const expandedActiveTrades = useMemo(() => {
        const expanded = new Set(activeTrades || []);
        Object.entries(standardToCustomMapping).forEach(([standardKey, customKey]) => {
            if (activeTrades.includes(customKey)) {
                expanded.add(standardKey);
            }
        });
        return Array.from(expanded);
    }, [activeTrades, standardToCustomMapping]);

    const grandTotals = useMemo(() => {
        const allKeys = Object.keys(projectData?.activities || {});
        return Object.entries(groupTotals).reduce((acc, [key, totals]) => {
            if (allKeys.includes(key)) {
                 acc.estimated += totals.estimated;
                 acc.budget += totals.budget;
                 acc.earnedValue += totals.earnedValue;
                 acc.actualCost += totals.actualCost;
                 acc.projected += totals.projected; 
            }
            return acc;
        }, { estimated: 0, budget: 0, earnedValue: 0, actualCost: 0, projected: 0 }); 
    }, [groupTotals, projectData?.activities]); 

    // --- Render logic ---
    if (loading) return <div className="p-4 text-center">Loading Project Details...</div>;
    if (!projectData) return <div className="p-4 text-center text-red-500">Project activity data not found or failed to load.</div>;

    return (
        <div className="space-y-6 mt-4 border-t pt-4 border-gray-600/50">
             <ConfirmationModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => confirmAction?.action()}
                title={confirmAction?.title}
                currentTheme={currentTheme}
            >
                {confirmAction?.message}
            </ConfirmationModal>

            {/* CSV Import Modal */}
            <CSVImportModal
                isOpen={csvImportState.showModal}
                conflicts={csvImportState.pendingData?.conflicts || []}
                currentTheme={currentTheme}
                onClose={() => setCsvImportState({ pendingData: null, showModal: false })}
                onConfirm={(overwrite) => applyCSVChanges(csvImportState.pendingData, overwrite)}
            />

            {/* --- Charge Code Manager Section --- */}
            {showChargeCodeManager && accessLevel === 'taskmaster' && (
                <motion.div
                     initial={{ opacity: 0, y: -20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     className={`p-4 rounded-lg border ${currentTheme.borderColor} ${currentTheme.altRowBg} shadow-md mb-6 border-yellow-400`}
                >
                    <h3 className="text-lg font-semibold mb-3 text-yellow-300">Charge Code Management (Project: {project.name})</h3>
                    <p className="text-sm mb-4 text-yellow-200">
                        Use these actions to manage activities based on standard charge codes for THIS project. Triggered by Ctrl+Alt+Shift+C. Press Esc to hide.
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={confirmAddCodes}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                            Add Standard Activities (if missing)
                        </button>
                        <button
                            onClick={confirmDeleteAll}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                            Delete All Activities
                        </button>
                    </div>
                </motion.div>
            )}

             {/* Trade Filters */}
            <TutorialHighlight tutorialKey="tradeFiltersProjectConsole">
                <div className={`p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4 ${currentTheme.cardBg}`}>
                    <h4 className="text-sm font-semibold mb-2 text-center">Activity & Action Tracker Filters</h4>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {(() => {
                            let disciplinesToShow = allDisciplines || [];
                            
                            if (disciplinesToShow.length === 0 && projectData?.activities) {
                                const activityKeys = Object.keys(projectData.activities);
                                disciplinesToShow = activityKeys.map(key => ({
                                    key: key,
                                    label: standardToCustomMapping[`${key}_label`] || key
                                }));
                            }
                            
                            return disciplinesToShow.map(d => (
                                <button
                                    key={d.key}
                                    onClick={() => onTradeFilterToggle(projectId, d.key)}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                        activeTrades.includes(d.key) 
                                            ? 'bg-blue-600 text-white' 
                                            : `${currentTheme.buttonBg} ${currentTheme.buttonText}`
                                    }`}
                                >
                                    {d.label}
                                </button>
                            ));
                        })()}
                        {(() => {
                            let disciplinesForButton = allDisciplines || [];
                            
                            if (disciplinesForButton.length === 0 && projectData?.activities) {
                                const activityKeys = Object.keys(projectData.activities);
                                disciplinesForButton = activityKeys.map(key => ({
                                    key: key,
                                    label: standardToCustomMapping[`${key}_label`] || key
                                }));
                            }
                            
                            if (disciplinesForButton.length === 0) {
                                return null;
                            }
                            
                            const allKeys = disciplinesForButton.map(d => d.key);
                            const areAllSelected = activeTrades.length === allKeys.length && allKeys.every(key => activeTrades.includes(key));
                            
                            return (
                                <button
                                    onClick={() => onSelectAllTrades(projectId, disciplinesForButton)} 
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                        areAllSelected
                                            ? 'bg-green-600 text-white'
                                            : `${currentTheme.buttonBg} ${currentTheme.buttonText}`
                                    }`}
                                >
                                    {areAllSelected ? 'Deselect All' : 'Select All'}
                                </button>
                            );
                        })()}
                    </div>
                </div>
            </TutorialHighlight>

            {/* Financial Summary, Budget Log, Links etc. */}
             {(accessLevel === 'taskmaster' || accessLevel === 'tcl') && (
                <>
                    {accessLevel === 'taskmaster' && (
                        <FinancialSummary project={project} activityTotals={activityTotals} currentTheme={currentTheme} currentBudget={currentBudget} />
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {accessLevel === 'taskmaster' && (
                            <TutorialHighlight tutorialKey="financialForecast">
                                <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                                    <button onClick={() => handleToggleCollapse('financialForecast')} className="w-full text-left font-bold flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-semibold">Financial Forecast</h3>
                                        <motion.svg animate={{ rotate: collapsedSections.financialForecast ? 0 : 180 }} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></motion.svg>
                                    </button>
                                    <AnimatePresence>
                                    {!collapsedSections.financialForecast && (
                                        <motion.div key="ff-content" variants={animationVariants} initial="hidden" animate="visible" exit="exit" className="overflow-hidden pt-2 mt-2 border-t border-gray-500/20">
                                            <FinancialForecastChart project={project} weeklyHours={weeklyHours} activityTotals={activityTotals} currentBudget={currentBudget} currentTheme={currentTheme} />
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </div>
                            </TutorialHighlight>
                        )}
                        <TutorialHighlight tutorialKey="budgetImpactLog">
                            <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                                <button onClick={() => handleToggleCollapse('budgetLog')} className="w-full text-left font-bold flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold">Budget Impact Log</h3>
                                    <motion.svg animate={{ rotate: collapsedSections.budgetLog ? 0 : 180 }} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></motion.svg>
                                </button>
                                <AnimatePresence>
                                {!collapsedSections.budgetLog && (
                                    <motion.div key="bil-content" variants={animationVariants} initial="hidden" animate="visible" exit="exit" className="overflow-hidden pt-2 mt-2 border-t border-gray-500/20">
                                        <BudgetImpactLog
                                            impacts={projectData?.budgetImpacts || []}
                                            onAdd={handleAddImpact}
                                            onDelete={handleDeleteImpact}
                                            currentTheme={currentTheme}
                                            project={project}
                                            activities={projectData?.activities}
                                        />
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        </TutorialHighlight>
                    </div>
                </>
            )}

            {/* Project Links */}
             {(project.dashboardUrl || accessLevel === 'taskmaster' || accessLevel === 'tcl') && (
                <TutorialHighlight tutorialKey="projectDashboardLink">
                    <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm text-center`}>
                        <h3 className="text-lg font-semibold mb-2">Project Links</h3>
                         <div className="flex justify-center items-center gap-4">
                            {project.dashboardUrl && (<a href={project.dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">Go to External Dashboard <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>)}
                            {(accessLevel === 'taskmaster' || accessLevel === 'tcl') && (<button onClick={(e) => navigateToWorkloaderForProject(project.id)} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm">Project Workloader <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5z" /></svg></button>)}
                         </div>
                    </div>
                </TutorialHighlight>
            )}


             {/* Layout: Mains/Action Tracker (Left), Activity Breakdown (Right) */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column: Mains Management & Action Tracker */}
                <div className="w-full md:w-1/3 flex flex-col gap-6">
                     {/* Mains Management */}
                    {accessLevel === 'taskmaster' && (
                        <TutorialHighlight tutorialKey="mainsManagement">
                            <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                                {/* Mains Collapse Button & Content */}
                                <button onClick={() => handleToggleCollapse('mainsManagement')} className="w-full text-left font-bold flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold">Mains Management</h3>
                                    <motion.svg animate={{ rotate: collapsedSections.mainsManagement ? 0 : 180 }} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></motion.svg>
                                </button>
                                <AnimatePresence>
                                {!collapsedSections['mainsManagement'] && (
                                    <motion.div key="mains-content" variants={animationVariants} initial="hidden" animate="visible" exit="exit" className="overflow-hidden pt-2 mt-2 border-t border-gray-500/20">
                                        <ProjectBreakdown
                                            mainItems={sortedMainItems}
                                            onAdd={handleAddMain}
                                            onUpdate={handleUpdateMain}
                                            onDelete={handleDeleteMain}
                                            onReorder={handleReorderMains}
                                            currentTheme={currentTheme}
                                        />
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        </TutorialHighlight>
                    )}
                    {/* Action Tracker */}
                    {(projectData?.mainItems?.length > 0 || (projectData?.projectWideActivities || []).length > 0) && ( // Show if mains OR project-wide exist
                        <TutorialHighlight tutorialKey={accessLevel === 'tcl' ? 'actionTracker-tcl' : 'actionTracker-taskmaster'}>
                         <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                             {/* Action Tracker Header & Settings Button */}
                             <div className="w-full flex justify-between items-center mb-2">
                                <button onClick={() => handleToggleCollapse('actionTracker')} className="flex items-center text-left font-bold">
                                    <h3 className="text-lg font-semibold">Action Tracker</h3>
                                    <motion.svg animate={{ rotate: collapsedSections.actionTracker ? 0 : 180 }} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></motion.svg>
                                </button>
                                {!collapsedSections.actionTracker && accessLevel === 'taskmaster' && (<button onClick={() => handleToggleCollapse('actionTrackerSettings')} className={`text-xs px-2 py-1 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>Settings</button>)}
                             </div>
                             {/* Collapsible Content: Settings & Tracker */}
                             <AnimatePresence>
                             {!collapsedSections.actionTracker && (
                                <motion.div key="at-content" variants={animationVariants} initial="hidden" animate="visible" exit="exit" className="overflow-hidden">
                                    {/* Action Tracker Settings (Taskmaster only) */}
                                    {accessLevel === 'taskmaster' && (
                                        <AnimatePresence>
                                        {!collapsedSections['actionTrackerSettings'] && (
                                            <motion.div key="at-settings" variants={animationVariants} initial="hidden" animate="visible" exit="exit" className="overflow-hidden mb-4">
                                                 <div className="pt-2 mt-2 border-t border-gray-500/20 space-y-4 p-3 bg-black/10 rounded-md">
                                                     {/* Discipline Manager */}
                                                     <div>
                                                         <h4 className="font-semibold text-md mb-2">Disciplines</h4>
                                                         <ActionTrackerDisciplineManager
                                                            disciplines={allDisciplines || []}
                                                            onAdd={handleAddActionTrackerDiscipline}
                                                            onDelete={handleDeleteActionTrackerDiscipline}
                                                            currentTheme={currentTheme}
                                                         />
                                                     </div>
                                                     {/* Data Cleanup */}
                                                     <div className="pt-4 border-t border-gray-700/50">
                                                        <h4 className="font-semibold text-md mb-2">Data Cleanup</h4>
                                                        <button onClick={handleRemoveDuplicateActivities} className={`w-full text-sm px-2 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700`}>
                                                            Merge Duplicate Activities
                                                        </button>
                                                     </div>
                                                 </div>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    )}
                                    {/* Action Tracker Component */}
                                    <div className="pt-2 mt-2 border-t border-gray-500/20">
                                        <ActionTracker
                                            mainItems={sortedMainItems}
                                            activities={projectData?.activities}
                                            totalProjectHours={activityTotals.estimated}
                                            onUpdatePercentage={handleUpdateActionTrackerPercentage}
                                            onUpdateActivityCompletion={handleUpdateActivityCompletion}
                                            onDeleteActivityFromActionTracker={handleDeleteActivityFromActionTracker}
                                            actionTrackerData={projectData?.actionTrackerData || {}}
                                            currentTheme={currentTheme}
                                            actionTrackerDisciplines={(() => {
                                                if ((allDisciplines || []).length > 0) {
                                                    return allDisciplines;
                                                }
                                                if (projectData?.activities) {
                                                    const activityKeys = Object.keys(projectData.activities);
                                                    return activityKeys.map(key => ({
                                                        key: key,
                                                        label: standardToCustomMapping[`${key}_label`] || key
                                                    }));
                                                }
                                                return [];
                                            })()}
                                            tradeColorMapping={tradeColorMapping}
                                            isTradePercentageEditable={accessLevel === 'taskmaster'}
                                            isActivityCompletionEditable={accessLevel === 'tcl'}
                                            collapsedSections={collapsedSections}
                                            onToggle={handleToggleCollapse}
                                            activeTrades={expandedActiveTrades}
                                            projectWideActivities={projectData?.projectWideActivities}
                                        />
                                    </div>
                                </motion.div>
                             )}
                             </AnimatePresence>
                        </div>
                        </TutorialHighlight>
                    )}
                </div>

                 {/* Right Column: Activity Breakdown */}
                 {accessLevel === 'taskmaster' && (
                    <div className="w-full md:w-2/3">
                        <TutorialHighlight tutorialKey="activityBreakdown">
                            <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                                {/* Header and Add Group Controls */}
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold">Activity Values Breakdown</h3>
                                     <div className="flex items-center gap-2">
                                         {/* CSV Import Button */}
                                         <label className={`text-xs px-2 py-1 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Import CSV
                                            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                                         </label>
                                         <span className="text-gray-500">|</span>

                                        {availableDisciplinesToAdd.length === 0 ? (
                                            <div className="text-sm text-gray-400 italic">
                                                All disciplines added.
                                            </div>
                                        ) : (
                                            <>
                                                <select 
                                                    value={newActivityGroup} 
                                                    onChange={(e) => {
                                                        setNewActivityGroup(e.target.value);
                                                    }} 
                                                    className={`text-xs p-1 rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                                >
                                                    <option value="">Add Discipline Section...</option>
                                                    {availableDisciplinesToAdd.map(d => (
                                                        <option key={d.key} value={d.key}>{d.label}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleAddActivityGroup()} 
                                                    className={`text-xs px-2 py-1 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`} 
                                                    disabled={!newActivityGroup}
                                                >
                                                    Add
                                                </button>
                                            </>
                                        )}
                                     </div>
                                </div>
                                {/* Activity Tables */}
                                <div className="space-y-1">
                                    {(() => {
                                        const entries = Object.entries(projectData.activities || {});
                                        const filtered = entries.filter(([groupKey]) => expandedActiveTrades.includes(groupKey));
                                        
                                        return filtered 
                                            .sort(([groupA], [groupB]) => {
                                                const customLabelA = (allDisciplines || []).find(d => d.key === groupA)?.label;
                                                const labelA = customLabelA || standardToCustomMapping[`${groupA}_label`] || groupA;
                                                const customLabelB = (allDisciplines || []).find(d => d.key === groupB)?.label;
                                                const labelB = customLabelB || standardToCustomMapping[`${groupB}_label`] || groupB;
                                                return labelA.localeCompare(labelB);
                                            })
                                            .map(([groupKey, acts]) => {
                                                 const customLabel = (allDisciplines || []).find(d => d.key === groupKey)?.label;
                                                 const groupLabel = customLabel || standardToCustomMapping[`${groupKey}_label`] || groupKey;
                                                 
                                                 const colorInfo = tradeColorMapping[groupKey];
                                                 const colorClass = colorInfo ? `${colorInfo.bg} ${colorInfo.text}` : 'bg-gray-500/70 text-white';
                                                 const rateType = projectData.rateTypes?.[groupKey] || 'Detailing Rate';
                                                 const sectionId = `group_${groupKey}`;
                                                 return (
                                                    <CollapsibleActivityTable
                                                        key={sectionId}
                                                        title={groupLabel}
                                                        data={acts}
                                                        groupKey={groupKey}
                                                        colorClass={colorClass}
                                                        onAdd={handleAddActivity}
                                                        onDelete={handleDeleteActivity}
                                                        onChange={handleUpdateActivity}
                                                        isCollapsed={!!collapsedSections[sectionId]}
                                                        onToggle={() => handleToggleCollapse(sectionId)}
                                                        project={project}
                                                        currentTheme={currentTheme}
                                                        totalProjectHours={activityTotals.estimated}
                                                        accessLevel={accessLevel}
                                                        groupTotals={groupTotals[groupKey] || { estimated: 0, used: 0, budget: 0, actualCost: 0, earnedValue: 0, projected: 0, percentComplete: 0 }}
                                                        rateType={rateType}
                                                        onRateTypeChange={handleSetRateType}
                                                        onDeleteGroup={handleDeleteActivityGroup}
                                                        onRenameGroup={handleRenameActivityGroup}
                                                        isProjectWide={(projectData.projectWideActivities || []).includes(groupKey)}
                                                        onToggleProjectWide={handleToggleProjectWide}
                                                    />
                                                 );
                                            });
                                    })()}
                                </div>
                                {/* Grand Totals */}
                                <TutorialHighlight tutorialKey="activityGrandTotals">
                                    <div className={`w-full p-2 text-left font-bold flex justify-between items-center mt-2 ${currentTheme.altRowBg}`}>
                                        <div className="flex-grow grid grid-cols-9 text-xs font-bold">
                                             <span>Grand Totals</span>
                                             <span></span> 
                                             <span className="text-center">{grandTotals.estimated.toFixed(2)}</span>
                                             <span className="text-center">{formatCurrency(grandTotals.budget)}</span>
                                             <span></span> 
                                             <span className="text-center">--</span> 
                                             <span className="text-center">{formatCurrency(grandTotals.earnedValue)}</span>
                                             <span className="text-center">{formatCurrency(grandTotals.actualCost)}</span>
                                             <span className="text-center">{formatCurrency(grandTotals.projected)}</span>
                                        </div>
                                    </div>
                                </TutorialHighlight>
                            </div>
                        </TutorialHighlight>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDetailView;