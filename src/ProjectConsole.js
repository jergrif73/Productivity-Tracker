import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialHighlight } from './App';
import ProjectDetailView from './ProjectDetailView.js';
// Removed unused deleteDoc import, kept updateDoc and doc
import { doc, getDoc } from 'firebase/firestore';

const ProjectConsole = ({ db, detailers, projects, assignments, accessLevel, currentTheme, appId, showToast, initialProjectConsoleFilter, setInitialProjectConsoleFilter }) => {
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [filters, setFilters] = useState({ query: '', detailerId: '', startDate: '', endDate: '' });
    const [projectTradeFilters, setProjectTradeFilters] = useState({});
    const [projectDisciplines, setProjectDisciplines] = useState({});
    const [showChargeCodeManager, setShowChargeCodeManager] = useState(false);
    
    // Use a ref for caching to avoid dependency issues
    const disciplinesCacheRef = useRef({});

    // Keyboard shortcut listener for Charge Code Manager and Escape
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Check for Ctrl+Alt+Shift+C
            if (event.ctrlKey && event.altKey && event.shiftKey && event.code === 'KeyC') {
                event.preventDefault();
                if (accessLevel === 'taskmaster') {
                    if (expandedProjectId) { // Only toggle if a project is expanded
                        setShowChargeCodeManager(prev => !prev);
                        showToast(`Charge Code Manager ${!showChargeCodeManager ? 'shown' : 'hidden'}.`, 'info');
                    } else {
                        showToast("Expand a project first to manage charge codes.", "warning");
                    }
                } else {
                     showToast("Charge Code management requires Taskmaster access.", "warning");
                }
            }
            // Check for Escape key to hide the manager
            if (event.key === 'Escape') {
                setShowChargeCodeManager(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    // Include showChargeCodeManager in dependencies to update toast message correctly
    }, [accessLevel, expandedProjectId, showToast, showChargeCodeManager]);

    // Fetch disciplines for a project - Uses ref for caching to avoid dependency issues
    const fetchDisciplines = useCallback(async (projectId) => {
        // Check cache in ref first
        if (disciplinesCacheRef.current[projectId]) {
            console.log("Using cached disciplines for project", projectId, ":", disciplinesCacheRef.current[projectId]);
            return disciplinesCacheRef.current[projectId];
        }
        try {
            // Use projectActivities collection now
            const docRef = doc(db, `artifacts/${appId}/public/data/projectActivities`, projectId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Get disciplines from the projectActivities document
                let disciplines = data?.actionTrackerDisciplines || [];
                
                // AUTO-POPULATE: If actionTrackerDisciplines is empty but activities exist, auto-populate
                if (disciplines.length === 0 && data.activities && Object.keys(data.activities).length > 0) {
                    console.log("🔧 AUTO-POPULATE: actionTrackerDisciplines is empty but activities exist");
                    
                    const standardLabels = {
                        'sheetmetal': 'Sheet Metal / HVAC',
                        'piping': 'Mechanical Piping',
                        'plumbing': 'Plumbing',
                        'management': 'Management',
                        'vdc': 'VDC'
                    };
                    
                    const activityKeys = Object.keys(data.activities);
                    disciplines = activityKeys.map(key => ({
                        key: key,
                        label: standardLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)
                    }));
                    
                    console.log("🔧 Auto-populated disciplines in ProjectConsole:", disciplines);
                }
                
                console.log("Fetched disciplines for project", projectId, ":", disciplines);
                // Cache in ref
                disciplinesCacheRef.current[projectId] = disciplines;
                // Return disciplines
                return disciplines;
            } else {
                console.warn("No projectActivities document found for project", projectId);
                return [];
            }
        } catch (error) {
            console.error("Error fetching project disciplines:", error);
            return [];
        }
    }, [db, appId]); // Removed projectDisciplines from dependencies

    // Handle initial project filter from navigation - MODIFIED: Sets all states
     useEffect(() => {
        const handleInitialFilter = async () => {
            if (initialProjectConsoleFilter && projects.length > 0) {
                const projectToExpand = projects.find(p => p.id === initialProjectConsoleFilter);

                if (projectToExpand) {
                    setFilters(prev => ({ ...prev, query: projectToExpand.name || projectToExpand.projectId }));
                    
                    // --- FIX: Set all states from here ---
                    // 1. Await disciplines
                    const disciplines = await fetchDisciplines(projectToExpand.id);
                    
                    // 2. Set disciplines state
                    setProjectDisciplines(prev => ({ ...prev, [projectToExpand.id]: disciplines }));

                    // 3. Set filters state
                    setProjectTradeFilters(prevFilters => {
                        if (!prevFilters.hasOwnProperty(projectToExpand.id)) {
                            return { ...prevFilters, [projectToExpand.id]: disciplines.map(d => d.key) };
                        }
                        return prevFilters;
                    });
                    
                    // 4. Hide charge code manager
                    setShowChargeCodeManager(false);

                    // 5. NOW expand
                    setExpandedProjectId(projectToExpand.id);
                }
                setInitialProjectConsoleFilter(null); // Clear the initial filter trigger
            }
        };
        handleInitialFilter();
    // Added fetchDisciplines dependency
    }, [initialProjectConsoleFilter, projects, setInitialProjectConsoleFilter, fetchDisciplines]);

    // Update search query when expanding a project
    useEffect(() => {
        if (expandedProjectId) {
            const currentProject = projects.find(p => p.id === expandedProjectId);
            // Update query only if it doesn't already match name or ID
            if (currentProject && filters.query !== currentProject.name && filters.query !== currentProject.projectId) {
                setFilters(prev => ({ ...prev, query: currentProject.name || currentProject.projectId }));
            }
        }
    }, [expandedProjectId, projects, filters.query]);


    // Handle clicking a project card to expand/collapse - MODIFIED: Sets all states
    const handleProjectClick = useCallback(async (projectId) => { // <-- Made the handler async
        if (expandedProjectId === projectId) {
            // Collapsing: clear search if it matches, hide charge manager
            const project = projects.find(p => p.id === projectId);
             if (project && (filters.query === project.name || filters.query === project.projectId)) {
                setFilters(prev => ({ ...prev, query: '' }));
            }
            setShowChargeCodeManager(false); // Hide manager on collapse
            setExpandedProjectId(null); // Collapse
        } else {
            // Expanding: set search, fetch disciplines, init filters if needed, hide manager
            const newProject = projects.find(p => p.id === projectId);
            setFilters(prev => ({ ...prev, query: newProject ? (newProject.name || newProject.projectId) : '' }));
            
            // --- FIX: Set all states from here ---
            // 1. Await the fetch for disciplines (this will use cache if available)
            const disciplines = await fetchDisciplines(projectId);
            
            // 2. Set disciplines state
            setProjectDisciplines(prev => ({ ...prev, [projectId]: disciplines }));

            // 3. Set the trade filters state
            setProjectTradeFilters(prevFilters => {
                if (!prevFilters.hasOwnProperty(projectId)) { // Use hasOwnProperty
                    return { ...prevFilters, [projectId]: disciplines.map(d => d.key) };
                }
                return prevFilters;
            });

            // 4. Now that filter state is set, expand the project
            setShowChargeCodeManager(false); // Ensure manager is hidden
            setExpandedProjectId(projectId); // Expand *after* filters are set
        }
    }, [projects, filters.query, fetchDisciplines, expandedProjectId]); // Removed projectDisciplines

    // Toggle a specific trade filter for an expanded project
    const handleTradeFilterToggleForProject = useCallback((projectId, tradeKey) => {
        const allDisciplines = projectDisciplines[projectId] || disciplinesCacheRef.current[projectId] || [];
        setProjectTradeFilters(prevFilters => {
            // Use hasOwnProperty to safely check for an empty array []
            const currentTrades = prevFilters.hasOwnProperty(projectId) 
                ? prevFilters[projectId]
                : allDisciplines.map(d => d.key);
            const newTradesSet = new Set(currentTrades);
            if (newTradesSet.has(tradeKey)) {
                newTradesSet.delete(tradeKey);
            } else {
                newTradesSet.add(tradeKey);
            }
            return { ...prevFilters, [projectId]: Array.from(newTradesSet) };
        });
    }, [projectDisciplines]); // Keep projectDisciplines for now to trigger re-renders

    // Select/Deselect all trades for an expanded project
    const handleSelectAllTradesForProject = useCallback((projectId, disciplinesFromChild) => {
        const allDisciplines = disciplinesFromChild || [];
        
        // Update both state and ref cache when disciplines are provided
        if (disciplinesFromChild && disciplinesFromChild.length > 0) {
            disciplinesCacheRef.current[projectId] = disciplinesFromChild;
            setProjectDisciplines(prev => ({ ...prev, [projectId]: disciplinesFromChild }));
        }
        
        setProjectTradeFilters(prevFilters => {
            const currentTrades = prevFilters.hasOwnProperty(projectId) 
                ? prevFilters[projectId] 
                : allDisciplines.map(d => d.key); // Default to all if not set
            
            const allKeys = allDisciplines.map(d => d.key);
            
            // Check if all keys from the definitive list are currently in the active filters
            const allKeysSet = new Set(allKeys);
            const currentTradesSet = new Set(currentTrades);
            
            let allSelectedCheck = allKeys.length > 0; // Must have at least one discipline
            for (const key of allKeysSet) {
                if (!currentTradesSet.has(key)) {
                    allSelectedCheck = false;
                    break;
                }
            }
            
            const areAllSelected = allSelectedCheck && allKeysSet.size === currentTradesSet.size;
            
            return { ...prevFilters, [projectId]: areAllSelected ? [] : allKeys };
        });
    }, []); // No dependencies needed since we're using the ref

    // Filter projects based on search, detailer, and date range
    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => !p.archived) // Exclude archived projects
            .filter(p => {
                const { query, detailerId, startDate, endDate } = filters;
                const searchLower = query.toLowerCase();

                // Match name or ID
                const nameMatch = (p.name || '').toLowerCase().includes(searchLower);
                const idMatch = (p.projectId || '').toLowerCase().includes(searchLower);

                // Check assignments for detailer match
                const projectAssignments = assignments.filter(a => a.projectId === p.id);
                const detailerMatch = !detailerId || projectAssignments.some(a => a.detailerId === detailerId);

                // Check assignments for date range overlap
                const dateMatch = (!startDate && !endDate) || projectAssignments.some(a => {
                    // Ensure dates are valid Date objects before comparing
                    const assignStart = a.startDate ? new Date(a.startDate + 'T00:00:00') : null; // Add T00:00:00 for correct local date
                    const assignEnd = a.endDate ? new Date(a.endDate + 'T00:00:00') : null;
                    const filterStart = startDate ? new Date(startDate + 'T00:00:00') : null;
                    const filterEnd = endDate ? new Date(endDate + 'T00:00:00') : null;

                    // Skip comparison if assignment dates are invalid
                    if (!assignStart || !assignEnd || isNaN(assignStart.getTime()) || isNaN(assignEnd.getTime())) {
                        return false;
                    }

                    if (filterStart && filterEnd) return assignStart <= filterEnd && assignEnd >= filterStart;
                    if (filterStart) return assignEnd >= filterStart;
                    if (filterEnd) return assignStart <= filterEnd;
                    return true; // No date filter applied
                });

                return (nameMatch || idMatch) && detailerMatch && dateMatch;
            })
            // Sort by project ID numerically
            .sort((a, b) => (a.projectId || '').localeCompare(b.projectId || '', undefined, { numeric: true }));
    }, [projects, assignments, filters]);

    // Handle changes in the filter inputs
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="h-full flex flex-col p-4 gap-4">
            {/* Filter UI Section */}
            <TutorialHighlight tutorialKey="projectFilters">
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
                        {detailers.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                    </select>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                </div>
            </div>
            </TutorialHighlight>

            {/* Project List Section */}
            <div className="flex-grow overflow-y-auto space-y-4 pr-4 hide-scrollbar-on-hover">
                {filteredProjects.map((p, index) => {
                    const isExpanded = expandedProjectId === p.id;
                    const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;
                    
                    // --- FIX: Check for data readiness ---
                    // 1. Get the disciplines (or undefined if not loaded)
                    const allDisciplinesForProject = projectDisciplines[p.id]; 
                    // 2. Check if filters are set for this project
                    const filtersAreSet = projectTradeFilters.hasOwnProperty(p.id);
                    // 3. The data is "ready" only if all three conditions are met
                    const dataIsReady = isExpanded && allDisciplinesForProject && filtersAreSet;
                    
                    // We no longer need 'currentActiveTrades' here, we'll pass the definite state

                    return (
                        <TutorialHighlight tutorialKey="projectCard" key={p.id}>
                            <motion.div
                                layout
                                className={`${bgColor} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}
                            >
                                {/* Project Header (Clickable to expand/collapse) */}
                                <motion.div layout="position" className="flex justify-between items-start cursor-pointer" onClick={() => handleProjectClick(p.id)}>
                                    <div>
                                        <h3 className="text-lg font-semibold">{p.name}</h3>
                                        <p className={`text-sm ${currentTheme.subtleText}`}>Project ID: {p.projectId}</p>
                                    </div>
                                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </motion.div>
                                </motion.div>

                                {/* Expanded Project Detail View */}
                                <AnimatePresence>
                                {/* FIX: Use the 'dataIsReady' flag here */}
                                {dataIsReady && (
                                    <motion.div
                                        key={`detail-${p.id}`}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                        onClick={e => e.stopPropagation()} // Prevent clicks inside details from collapsing
                                    >
                                        <ProjectDetailView
                                            db={db}
                                            project={p}
                                            projectId={p.id} // Pass projectId explicitly
                                            accessLevel={accessLevel}
                                            currentTheme={currentTheme}
                                            appId={appId}
                                            showToast={showToast}
                                            // Pass down state and handlers for trade filters
                                            // FIX: Pass the guaranteed, ready state data
                                            activeTrades={projectTradeFilters[p.id]}
                                            allDisciplines={allDisciplinesForProject} 
                                            onTradeFilterToggle={handleTradeFilterToggleForProject}
                                            onSelectAllTrades={handleSelectAllTradesForProject}
                                            // Pass down state for charge code manager visibility
                                            showChargeCodeManager={showChargeCodeManager}
                                        />
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </motion.div>
                        </TutorialHighlight>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectConsole;