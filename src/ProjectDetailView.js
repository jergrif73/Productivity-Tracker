import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
// Import necessary Firestore functions
import { doc, onSnapshot, setDoc, collection, updateDoc, deleteField } from 'firebase/firestore';
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
    parseCSV,
    CSVReviewModal // Replaced CSVImportModal with CSVReviewModal
} from './ProjectDetailViewComponents.js';

// Helper to convert old discipline labels to abbreviated versions
const abbreviateDisciplineLabel = (label) => {
    const labelMap = {
        'Duct': 'MH',
        'Sheet Metal': 'MH',
        'Sheet Metal / HVAC': 'MH',
        'Piping': 'MP',
        'Mechanical Piping': 'MP',
        'Process Piping': 'PP',
        'Plumbing': 'PL',
        'Fire Protection': 'FP',
        'Medical Gas': 'PJ',
        'Structural': 'ST',
        'Coordination': 'Coord',
        'Management': 'MGMT',
        'GIS/GPS': 'GIS/GPS',
        'VDC': 'VDC'
    };
    return labelMap[label] || label;
};

// Helper to abbreviate an array of discipline objects
const abbreviateDisciplines = (disciplines) => {
    if (!disciplines) return [];
    return disciplines.map(d => ({
        ...d,
        label: abbreviateDisciplineLabel(d.label)
    }));
};


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
                                'sheetmetal': 'MH',
                                'duct': 'MH',
                                'piping': 'MP',
                                'processpiping': 'PP',
                                'plumbing': 'PL',
                                'fireprotection': 'FP',
                                'medgas': 'PJ',
                                'structural': 'ST',
                                'coordination': 'Coord',
                                'gisgps': 'GIS/GPS',
                                'management': 'MGMT',
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
                        { key: 'duct', label: 'MH' },
                        { key: 'piping', label: 'MP' },
                        { key: 'plumbing', label: 'PL' },
                        { key: 'management', label: 'MGMT' },
                        { key: 'vdc', label: 'VDC' }
                    ]);
                    
                    const defaultDisciplines = [
                        { key: 'duct', label: 'MH' },
                        { key: 'piping', label: 'MP' },
                        { key: 'plumbing', label: 'PL' },
                        { key: 'management', label: 'MGMT' },
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

    // --- CSV Import Handlers (Interactive) ---
    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const rows = parseCSV(event.target.result);
                prepareCSVStaging(rows); // Replaced processCSVData with prepareCSVStaging
            } catch (err) {
                showToast(err.message, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = null; // Reset input
    };

    const prepareCSVStaging = (rows) => {
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

        const staging = rows.map((row, i) => {
            const normDesc = normalizeDesc(row.description);
            const existing = existingMap.get(normDesc);
            
            let status = 'New';
            let selection = { row: true, code: true, hours: true };

            if (existing) {
                // Robust numeric comparison to avoid false "Updates" from "120" vs 120
                const currentHours = Number(existing.estimatedHours) || 0;
                const newHours = Number(row.estimatedHours) || 0;
                const hoursDiffers = newHours !== currentHours;
                
                const codeDiffers = row.chargeCode && row.chargeCode !== existing.chargeCode;
                
                if (codeDiffers || hoursDiffers) {
                    status = 'Update';
                    selection = { row: true, code: codeDiffers, hours: hoursDiffers };
                } else {
                    status = 'Match';
                    selection = { row: false, code: false, hours: false };
                }
            }

            return {
                id: `stage_${i}`,
                csvData: row,
                existingData: existing || null,
                status: status,
                selection: selection
            };
        });

        setCsvImportState({ pendingData: staging, showModal: true });
    };

    const applyCSVChanges = async (reviewedRows) => {
        const newActivitiesByGroup = JSON.parse(JSON.stringify(projectData.activities || {}));
        
        let addedCount = 0;
        let updatedCount = 0;

        reviewedRows.forEach(item => {
            if (!item.selection.row) return; // Skip unchecked rows
            if (!item.targetGroup) return; // Skip rows without a target group

            if (item.existingData) {
                // UPDATE Logic - update existing activity
                const { group, index } = item.existingData;
                
                if (newActivitiesByGroup[group] && newActivitiesByGroup[group][index]) {
                    const activity = { ...newActivitiesByGroup[group][index] };
                    let changed = false;

                    if (item.selection.code && item.csvData.chargeCode) {
                        activity.chargeCode = item.csvData.chargeCode;
                        changed = true;
                    }
                    if (item.selection.hours) {
                        activity.estimatedHours = Number(item.csvData.estimatedHours) || 0;
                        changed = true;
                    }

                    if (changed) {
                        newActivitiesByGroup[group][index] = activity;
                        updatedCount++;
                    }
                }
            } else {
                // NEW Logic - add to the user-selected targetGroup
                const targetGroup = item.targetGroup;
                
                // Initialize group array if it doesn't exist
                if (!newActivitiesByGroup[targetGroup]) {
                    newActivitiesByGroup[targetGroup] = [];
                }
                
                // Check for duplicates
                const normalizedDesc = normalizeDesc(item.csvData.description);
                const isDuplicate = newActivitiesByGroup[targetGroup].some(
                    existingAct => normalizeDesc(existingAct.description) === normalizedDesc
                );
                
                if (!isDuplicate) {
                    const newActivity = {
                        id: `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        description: item.csvData.description,
                        chargeCode: item.selection.code ? item.csvData.chargeCode : '',
                        estimatedHours: item.selection.hours ? Number(item.csvData.estimatedHours) : 0,
                        percentComplete: 0,
                        costToDate: 0,
                        subsets: []
                    };
                    newActivitiesByGroup[targetGroup].push(newActivity);
                    addedCount++;
                }
            }
        });

        if (addedCount > 0 || updatedCount > 0) {
            // Update local state immediately for instant UI feedback
            setProjectData(prev => ({
                ...prev,
                activities: newActivitiesByGroup
            }));
            
            // Also save to Firebase (which will eventually trigger onSnapshot as well)
            await handleSaveData({ activities: newActivitiesByGroup });
            showToast(`Import Success: ${addedCount} added, ${updatedCount} updated.`, "success");
        } else {
            showToast("No changes applied.", "info");
        }

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
        // Default VDC discipline to VDC Rate, all others to Detailing Rate
        const defaultRateType = newDiscipline.key === 'vdc' || newDiscipline.label === 'VDC' ? 'VDC Rate' : 'Detailing Rate';
        const updatedRateTypes = { ...(projectData?.rateTypes || {}), [newDiscipline.key]: defaultRateType }; 
        handleSaveData({ 
            actionTrackerDisciplines: disciplines, 
            activities: updatedActivities, 
            rateTypes: updatedRateTypes 
        }); 
        setCollapsedSections(prev => ({ ...prev, [`group_${newDiscipline.key}`]: true }));
        onSelectAllTrades(projectId, disciplines); 
        showToast(`Discipline "${newDiscipline.label}" added.`, 'success');
    }, [projectData, handleSaveData, onSelectAllTrades, projectId, showToast]);
    const handleDeleteActionTrackerDiscipline = useCallback(async (disciplineKey) => { 
        const disciplineLabel = (projectData?.actionTrackerDisciplines || []).find(d => d.key === disciplineKey)?.label || disciplineKey;
        if (!window.confirm(`Delete "${disciplineLabel}" discipline and all its activities? This cannot be undone.`)) return;
        
        const disciplines = (projectData?.actionTrackerDisciplines || []).filter(d => d.key !== disciplineKey); 
        const updatedProjectWide = (projectData?.projectWideActivities || []).filter(k => k !== disciplineKey);
        
        try {
            // Use updateDoc with deleteField to actually remove the nested keys from Firestore
            await updateDoc(docRef, {
                actionTrackerDisciplines: disciplines,
                [`activities.${disciplineKey}`]: deleteField(),
                [`rateTypes.${disciplineKey}`]: deleteField(),
                projectWideActivities: updatedProjectWide
            });
            
            // Update parent's discipline list and trade filters
            onSelectAllTrades(projectId, disciplines);
            showToast(`Discipline "${disciplineLabel}" deleted.`, 'success');
        } catch (error) {
            console.error("Error deleting discipline:", error);
            showToast(`Failed to delete discipline: ${error.message}`, 'error');
        }
    }, [projectData, docRef, showToast, onSelectAllTrades, projectId]);
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
                // Core MEP Trades
                { key: 'duct', label: 'MH' },
                { key: 'piping', label: 'MP' },
                { key: 'processpiping', label: 'PP' },
                { key: 'plumbing', label: 'PL' },
                { key: 'fireprotection', label: 'FP' },
                { key: 'medgas', label: 'PJ' },
                // Structural & Electrical
                { key: 'structural', label: 'ST' },
                // VDC & Technology
                { key: 'vdc', label: 'VDC' },
                { key: 'coordination', label: 'Coord' },
                { key: 'gisgps', label: 'GIS/GPS' },
                // Management & Admin
                { key: 'management', label: 'MGMT' }
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

    const handleDeleteActivityGroup = useCallback(async (groupKey) => { 
        const groupLabel = (projectData?.actionTrackerDisciplines || []).find(d => d.key === groupKey)?.label || groupKey;
        if (!window.confirm(`Delete "${groupLabel}" section and all its activities? This cannot be undone.`)) return; 
        
        const newDisciplines = (projectData?.actionTrackerDisciplines || []).filter(d => d.key !== groupKey); 
        const updatedProjectWide = (projectData?.projectWideActivities || []).filter(k => k !== groupKey);
        
        try {
            // Use updateDoc with deleteField to actually remove the nested keys from Firestore
            await updateDoc(docRef, {
                actionTrackerDisciplines: newDisciplines,
                [`activities.${groupKey}`]: deleteField(),
                [`rateTypes.${groupKey}`]: deleteField(),
                projectWideActivities: updatedProjectWide
            });
            showToast(`Section "${groupLabel}" deleted.`, 'success'); 
        } catch (error) {
            console.error("Error deleting activity group:", error);
            showToast(`Failed to delete section: ${error.message}`, 'error');
        }
    }, [projectData, docRef, showToast]);

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
        const rateToUse = rateType === 'VDC Rate' ? (proj.vdcBlendedRate || proj.blendedRate || 0) : (proj.blendedRate || 0);
        return (activities || []).reduce((acc, activity) => {
            const estHours = Number(activity?.estimatedHours || 0);
            const costToDate = Number(activity?.costToDate || 0);
            const percentComplete = Number(activity?.percentComplete || 0);
            
            const budget = Math.ceil(estHours * rateToUse);
            const projectedCost = percentComplete > 0 ? (costToDate / (percentComplete / 100)) : (estHours > 0 ? budget : 0);
            const remainingHours = estHours * (1 - (percentComplete / 100));

            acc.estimated += estHours;
            acc.budget += budget;
            acc.actualCost += costToDate;
            acc.earnedValue += budget * (percentComplete / 100);
            acc.projected += projectedCost;
            acc.remainingHours += remainingHours;
            return acc;
        }, { estimated: 0, budget: 0, actualCost: 0, earnedValue: 0, projected: 0, remainingHours: 0, percentComplete: 0 }); 
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
             
             const budget = Math.ceil(estHours * rate);
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
        const disciplineKeys = (projectData?.actionTrackerDisciplines || []).map(d => d.key);
        return Object.fromEntries(
            Object.entries(projectData.activities)
                .filter(([groupKey]) => disciplineKeys.includes(groupKey)) // Only include disciplines in the list
                .map(([groupKey, acts]) => {
                const rateType = projectData.rateTypes?.[groupKey] || 'Detailing Rate';
                const totals = calculateGroupTotals(acts, project, rateType); 
                const totalBudgetForGroup = totals.budget;
                const weightedPercentComplete = (acts || []).reduce((acc, act) => { 
                    const estHours = Number(act.estimatedHours) || 0;
                    const percent = Number(act.percentComplete) || 0;
                    const rate = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate) : project.blendedRate;
                    const actBudget = Math.ceil(estHours * rate);
                    return totalBudgetForGroup > 0 ? acc + (percent * (actBudget / totalBudgetForGroup)) : acc;
                }, 0);
                totals.percentComplete = weightedPercentComplete;
                return [groupKey, totals];
            })
        );
    }, [projectData?.activities, projectData?.rateTypes, projectData?.actionTrackerDisciplines, project, calculateGroupTotals]); 

    const currentBudget = useMemo(() => {
        return (project?.initialBudget || 0) + (projectData?.budgetImpacts || []).reduce((sum, impact) => sum + impact.amount, 0);
    }, [project?.initialBudget, projectData?.budgetImpacts]); 

    const sortedMainItems = useMemo(() => {
        return [...(projectData?.mainItems || [])].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    }, [projectData?.mainItems]); 

    const standardToCustomMapping = useMemo(() => {
        const mapping = {};
        // Prefer projectData (real-time) over allDisciplines (cached)
        const disciplines = projectData?.actionTrackerDisciplines || allDisciplines || [];
        
        // Match by key instead of label for abbreviated labels
        const ductDiscipline = disciplines.find(d => d.key === 'duct' || d.key === 'sheetmetal' || d.label === 'MH');
        const pipingDiscipline = disciplines.find(d => d.key === 'piping' || d.label === 'MP');
        const plumbingDiscipline = disciplines.find(d => d.key === 'plumbing' || d.label === 'PL');
        const managementDiscipline = disciplines.find(d => d.key === 'management' || d.key === 'coordination' || d.label === 'MGMT' || d.label === 'Coord');
        const vdcDiscipline = disciplines.find(d => d.key === 'vdc' || d.label === 'VDC');
        
        if (ductDiscipline) mapping['sheetmetal'] = ductDiscipline.key;
        if (pipingDiscipline) mapping['piping'] = pipingDiscipline.key;
        if (plumbingDiscipline) mapping['plumbing'] = plumbingDiscipline.key;
        if (managementDiscipline) mapping['management'] = managementDiscipline.key;
        if (vdcDiscipline) mapping['vdc'] = vdcDiscipline.key;
        
        mapping['sheetmetal_label'] = 'MH';
        mapping['piping_label'] = 'MP';
        mapping['plumbing_label'] = 'PL';
        mapping['management_label'] = 'MGMT';
        mapping['vdc_label'] = 'VDC';
        mapping['uncategorized_label'] = 'Uncategorized';
        
        return mapping;
    }, [projectData?.actionTrackerDisciplines, allDisciplines]);

    const tradeColorMapping = useMemo(() => {
        const mapping = {};
        // Prefer projectData (real-time) over allDisciplines (cached)
        const disciplines = projectData?.actionTrackerDisciplines || allDisciplines || [];
        disciplines.forEach(d => {
             // Match by key for abbreviated labels
             if (d.key === 'piping' || d.key === 'processpiping' || d.label === 'MP' || d.label === 'PP') mapping[d.key] = { bg: 'bg-green-500/70', text: 'text-white' };
             else if (d.key === 'duct' || d.key === 'sheetmetal' || d.label === 'MH') mapping[d.key] = { bg: 'bg-yellow-400/70', text: 'text-black' };
             else if (d.key === 'plumbing' || d.label === 'PL') mapping[d.key] = { bg: 'bg-blue-500/70', text: 'text-white' };
             else if (d.key === 'coordination' || d.key === 'management' || d.label === 'Coord' || d.label === 'MGMT') mapping[d.key] = { bg: 'bg-pink-500/70', text: 'text-white' };
             else if (d.key === 'vdc' || d.label === 'VDC') mapping[d.key] = { bg: 'bg-indigo-600/70', text: 'text-white' };
             else if (d.key === 'structural' || d.label === 'ST') mapping[d.key] = { bg: 'bg-amber-700/70', text: 'text-white' };
             else if (d.key === 'gisgps' || d.label === 'GIS/GPS') mapping[d.key] = { bg: 'bg-teal-500/70', text: 'text-white' };
             else if (d.key === 'fireprotection' || d.label === 'FP') mapping[d.key] = { bg: 'bg-red-500/70', text: 'text-white' };
             else if (d.key === 'medgas' || d.label === 'PJ') mapping[d.key] = { bg: 'bg-cyan-500/70', text: 'text-white' };
             else mapping[d.key] = { bg: 'bg-gray-500/70', text: 'text-white' }; 
        });
        mapping['sheetmetal'] = { bg: 'bg-yellow-400/70', text: 'text-black' };
        mapping['duct'] = { bg: 'bg-yellow-400/70', text: 'text-black' };
        mapping['piping'] = { bg: 'bg-green-500/70', text: 'text-white' };
        mapping['processpiping'] = { bg: 'bg-green-600/70', text: 'text-white' };
        mapping['plumbing'] = { bg: 'bg-blue-500/70', text: 'text-white' };
        mapping['management'] = { bg: 'bg-pink-500/70', text: 'text-white' };
        mapping['coordination'] = { bg: 'bg-pink-400/70', text: 'text-white' };
        mapping['vdc'] = { bg: 'bg-indigo-600/70', text: 'text-white' };
        mapping['structural'] = { bg: 'bg-amber-700/70', text: 'text-white' };
        mapping['gisgps'] = { bg: 'bg-teal-500/70', text: 'text-white' };
        mapping['fireprotection'] = { bg: 'bg-red-500/70', text: 'text-white' };
        mapping['medgas'] = { bg: 'bg-cyan-500/70', text: 'text-white' };
        mapping['uncategorized'] = { bg: 'bg-gray-600/70', text: 'text-white' };
        return mapping;
    }, [projectData?.actionTrackerDisciplines, allDisciplines]);

    const availableDisciplinesToAdd = useMemo(() => {
        const disciplinesSource = projectData?.actionTrackerDisciplines || allDisciplines || [];
        
        if (disciplinesSource.length > 0) {
            return disciplinesSource.filter(d => !projectData?.activities || !projectData.activities[d.key]);
        }
        
        const standardDisciplines = [
            // Core MEP Trades
            { key: 'duct', label: 'MH' },
            { key: 'piping', label: 'MP' },
            { key: 'processpiping', label: 'PP' },
            { key: 'plumbing', label: 'PL' },
            { key: 'fireprotection', label: 'FP' },
            { key: 'medgas', label: 'PJ' },
            // Structural & Electrical
            { key: 'structural', label: 'ST' },
            // VDC & Technology
            { key: 'vdc', label: 'VDC' },
            { key: 'coordination', label: 'Coord' },
            { key: 'gisgps', label: 'GIS/GPS' },
            // Management & Admin
            { key: 'management', label: 'MGMT' }
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
        const disciplineKeys = (projectData?.actionTrackerDisciplines || []).map(d => d.key);
        return Object.entries(groupTotals).reduce((acc, [key, totals]) => {
            if (disciplineKeys.includes(key)) {
                 acc.estimated += totals.estimated;
                 acc.budget += totals.budget;
                 acc.earnedValue += totals.earnedValue;
                 acc.actualCost += totals.actualCost;
                 acc.projected += totals.projected;
                 acc.remainingHours += totals.remainingHours || 0;
            }
            return acc;
        }, { estimated: 0, budget: 0, earnedValue: 0, actualCost: 0, projected: 0, remainingHours: 0 }); 
    }, [groupTotals, projectData?.actionTrackerDisciplines]); 

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

            {/* CSV Review Modal (NEW) */}
            <CSVReviewModal
                isOpen={csvImportState.showModal}
                stagingData={csvImportState.pendingData}
                currentTheme={currentTheme}
                disciplines={projectData?.actionTrackerDisciplines || allDisciplines || []}
                onClose={() => setCsvImportState({ pendingData: null, showModal: false })}
                onConfirm={applyCSVChanges}
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
                            // Prefer projectData (real-time) over allDisciplines (cached)
                            let disciplinesToShow = projectData?.actionTrackerDisciplines || [];
                            
                            if (disciplinesToShow.length === 0) {
                                disciplinesToShow = allDisciplines || [];
                            }
                            
                            if (disciplinesToShow.length === 0 && projectData?.activities) {
                                const activityKeys = Object.keys(projectData.activities);
                                disciplinesToShow = activityKeys.map(key => ({
                                    key: key,
                                    label: standardToCustomMapping[`${key}_label`] || key
                                }));
                            }
                            
                            // Abbreviate labels for display
                            return abbreviateDisciplines(disciplinesToShow).map(d => (
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
                            // Prefer projectData (real-time) over allDisciplines (cached)
                            let disciplinesForButton = projectData?.actionTrackerDisciplines || [];
                            
                            if (disciplinesForButton.length === 0) {
                                disciplinesForButton = allDisciplines || [];
                            }
                            
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
                                                            disciplines={abbreviateDisciplines(projectData?.actionTrackerDisciplines || [])}
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
                                                // Prefer projectData (real-time) over allDisciplines (cached)
                                                let disciplines = [];
                                                if ((projectData?.actionTrackerDisciplines || []).length > 0) {
                                                    disciplines = projectData.actionTrackerDisciplines;
                                                } else if ((allDisciplines || []).length > 0) {
                                                    disciplines = allDisciplines;
                                                } else if (projectData?.activities) {
                                                    const activityKeys = Object.keys(projectData.activities);
                                                    disciplines = activityKeys.map(key => ({
                                                        key: key,
                                                        label: standardToCustomMapping[`${key}_label`] || key
                                                    }));
                                                }
                                                return abbreviateDisciplines(disciplines);
                                            })()}
                                            tradeColorMapping={tradeColorMapping}
                                            isTradePercentageEditable={accessLevel === 'taskmaster'}
                                            isActivityCompletionEditable={accessLevel === 'tcl' || accessLevel === 'taskmaster'}
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
                                         {/* Timestamp Button */}
                                         <button 
                                            onClick={() => {
                                                const now = new Date().toISOString();
                                                handleSaveData({ actualCostUpdatedAt: now });
                                                showToast('Actual Cost timestamp updated', 'success');
                                            }}
                                            className={`text-xs px-2 py-1 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} flex items-center gap-1 hover:opacity-80 transition-opacity`}
                                            title={projectData?.actualCostUpdatedAt ? `Last updated: ${new Date(projectData.actualCostUpdatedAt).toLocaleString()}` : 'Click to timestamp actual cost update'}
                                         >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {projectData?.actualCostUpdatedAt ? new Date(projectData.actualCostUpdatedAt).toLocaleDateString() : 'Stamp'}
                                         </button>
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
                                                    {abbreviateDisciplines(availableDisciplinesToAdd).map(d => (
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
                                        const currentDisciplines = projectData?.actionTrackerDisciplines || [];
                                        const disciplineKeys = currentDisciplines.map(d => d.key);
                                        const entries = Object.entries(projectData.activities || {});
                                        // Only show activities whose key exists in the disciplines list
                                        const filtered = entries.filter(([groupKey]) => 
                                            expandedActiveTrades.includes(groupKey) && disciplineKeys.includes(groupKey)
                                        );
                                        
                                        return filtered 
                                            .sort(([groupA], [groupB]) => {
                                                const customLabelA = currentDisciplines.find(d => d.key === groupA)?.label;
                                                const labelA = abbreviateDisciplineLabel(customLabelA || standardToCustomMapping[`${groupA}_label`] || groupA);
                                                const customLabelB = currentDisciplines.find(d => d.key === groupB)?.label;
                                                const labelB = abbreviateDisciplineLabel(customLabelB || standardToCustomMapping[`${groupB}_label`] || groupB);
                                                return labelA.localeCompare(labelB);
                                            })
                                            .map(([groupKey, acts]) => {
                                                 const customLabel = currentDisciplines.find(d => d.key === groupKey)?.label;
                                                 const groupLabel = abbreviateDisciplineLabel(customLabel || standardToCustomMapping[`${groupKey}_label`] || groupKey);
                                                 
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
                                                        groupTotals={groupTotals[groupKey] || { estimated: 0, used: 0, budget: 0, actualCost: 0, earnedValue: 0, projected: 0, remainingHours: 0, percentComplete: 0 }}
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
                                    <div className={`w-full mt-2 ${currentTheme.altRowBg}`}>
                                        <table className="w-full text-sm table-fixed">
                                            <colgroup>
                                                <col style={{ width: '14%' }} />
                                                <col style={{ width: '12%' }} />
                                                <col style={{ width: '6%' }} />
                                                <col style={{ width: '8%' }} />
                                                <col style={{ width: '7%' }} />
                                                <col style={{ width: '6%' }} />
                                                <col style={{ width: '9%' }} />
                                                <col style={{ width: '8%' }} />
                                                <col style={{ width: '9%' }} />
                                                <col style={{ width: '9%' }} />
                                                <col style={{ width: '12%' }} />
                                            </colgroup>
                                            <tbody>
                                                <tr>
                                                    <td className="p-1 font-bold text-xs">Grand Totals</td>
                                                    <td className="p-1"></td>
                                                    <td className="p-1 text-center text-xs font-bold">{grandTotals.estimated.toFixed(2)}</td>
                                                    <td className="p-1 text-center text-xs font-bold">{formatCurrency(grandTotals.budget)}</td>
                                                    <td className="p-1"></td>
                                                    <td className="p-1 text-center text-xs font-bold">--</td>
                                                    <td className="p-1 text-center text-xs font-bold">{formatCurrency(grandTotals.actualCost)}</td>
                                                    <td className="p-1 text-center text-xs font-bold">{formatCurrency(grandTotals.earnedValue)}</td>
                                                    <td className="p-1 text-center text-xs font-bold">{formatCurrency(grandTotals.projected)}</td>
                                                    <td className="p-1 text-center text-xs font-bold">{grandTotals.remainingHours.toFixed(2)}</td>
                                                    <td className="p-1"></td>
                                                </tr>
                                            </tbody>
                                        </table>
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