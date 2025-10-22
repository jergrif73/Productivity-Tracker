import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialHighlight } from './App';
import ProjectDetailView from './ProjectDetailView.js';
import { doc, getDoc } from 'firebase/firestore'; // Import getDoc

const ProjectConsole = ({ db, detailers, projects, assignments, accessLevel, currentTheme, appId, showToast, initialProjectConsoleFilter, setInitialProjectConsoleFilter }) => {
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [filters, setFilters] = useState({ query: '', detailerId: '', startDate: '', endDate: '' });
    // --- NEW STATE ---
    // Store active trades per project ID. e.g., { "project123": ["piping", "duct"], "project456": ["vdc"] }
    const [projectTradeFilters, setProjectTradeFilters] = useState({});
    // State to hold fetched disciplines per project
    const [projectDisciplines, setProjectDisciplines] = useState({});

    // --- NEW: Function to fetch disciplines for a project ---
    // Wrapped fetchDisciplines in useCallback
    const fetchDisciplines = useCallback(async (projectId) => {
        // Check local state first
        if (projectDisciplines[projectId]) {
            return projectDisciplines[projectId];
        }
        // Fetch if not in local state
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/projectActivities`, projectId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const disciplines = data?.actionTrackerDisciplines || [];
                setProjectDisciplines(prev => ({ ...prev, [projectId]: disciplines }));
                return disciplines;
            } else {
                 setProjectDisciplines(prev => ({ ...prev, [projectId]: [] })); // Set empty if doc doesn't exist
                return [];
            }
        } catch (error) {
            console.error("Error fetching project disciplines:", error);
            setProjectDisciplines(prev => ({ ...prev, [projectId]: [] })); // Set empty on error
            return [];
        }
    }, [db, appId, projectDisciplines]); // Added dependencies for useCallback


    useEffect(() => {
        const handleInitialFilter = async () => {
            if (initialProjectConsoleFilter && projects.length > 0) {
                const projectToExpand = projects.find(p => p.id === initialProjectConsoleFilter);

                if (projectToExpand) {
                    setFilters(prev => ({ ...prev, query: projectToExpand.name || projectToExpand.projectId }));
                    setExpandedProjectId(projectToExpand.id);
                    // Fetch disciplines and initialize filters if not already set
                    const disciplines = await fetchDisciplines(projectToExpand.id); // Use useCallback version
                    setProjectTradeFilters(prevFilters => {
                        if (!prevFilters[projectToExpand.id]) {
                            // Initialize with all disciplines selected
                            return { ...prevFilters, [projectToExpand.id]: disciplines.map(d => d.key) };
                        }
                        return prevFilters;
                    });
                }
                setInitialProjectConsoleFilter(null);
            }
        };
        handleInitialFilter();
    // Added fetchDisciplines to dependency array
    }, [initialProjectConsoleFilter, projects, setInitialProjectConsoleFilter, fetchDisciplines]);


    useEffect(() => {
        if (expandedProjectId) {
            const currentProject = projects.find(p => p.id === expandedProjectId);
            if (currentProject && filters.query !== currentProject.name && filters.query !== currentProject.projectId) {
                setFilters(prev => ({ ...prev, query: currentProject.name }));
            }
        }
    }, [expandedProjectId, projects, filters.query]);


    const handleProjectClick = async (projectId) => { // Made async
        setExpandedProjectId(prevId => {
            if (prevId === projectId) {
                // Collapsing: Keep filters, just clear search query if it matches
                const project = projects.find(p => p.id === projectId);
                 if (project && (filters.query === project.name || filters.query === project.projectId)) {
                    setFilters(prev => ({ ...prev, query: '' }));
                }
                return null;
            } else {
                // Expanding a new one
                const newProject = projects.find(p => p.id === projectId);
                setFilters(prev => ({ ...prev, query: newProject ? newProject.name : '' }));
                 // Fetch disciplines and initialize filters for this project if not already set
                 fetchDisciplines(projectId).then(disciplines => { // Use useCallback version
                    setProjectTradeFilters(prevFilters => {
                        if (!prevFilters[projectId]) {
                             // Initialize with all disciplines selected
                            return { ...prevFilters, [projectId]: disciplines.map(d => d.key) };
                        }
                        return prevFilters;
                    });
                 });
                return projectId;
            }
        });
    };

    // --- NEW HANDLERS ---
    const handleTradeFilterToggleForProject = (projectId, tradeKey) => {
        // Disciplines should be loaded by the time this is called
        const allDisciplines = projectDisciplines[projectId] || [];
        setProjectTradeFilters(prevFilters => {
            const currentTrades = prevFilters[projectId] || allDisciplines.map(d => d.key); // Default to all if not set

            const newTradesSet = new Set(currentTrades);
            if (newTradesSet.has(tradeKey)) {
                newTradesSet.delete(tradeKey);
            } else {
                newTradesSet.add(tradeKey);
            }
            return {
                ...prevFilters,
                [projectId]: Array.from(newTradesSet),
            };
        });
    };

    const handleSelectAllTradesForProject = (projectId) => {
         // Disciplines should be loaded by the time this is called
        const allDisciplines = projectDisciplines[projectId] || [];
        setProjectTradeFilters(prevFilters => {
            const currentTrades = prevFilters[projectId] || [];
            const allKeys = allDisciplines.map(d => d.key);
            const areAllSelected = currentTrades.length === allKeys.length && allKeys.length > 0 && allKeys.every(key => currentTrades.includes(key));

            return {
                ...prevFilters,
                [projectId]: areAllSelected ? [] : allKeys,
            };
        });
    };
    // --- END NEW HANDLERS ---


    const filteredProjects = useMemo(() => {
        // ... (filtering logic remains the same)
        return projects
            .filter(p => !p.archived)
            .filter(p => {
                const { query, detailerId, startDate, endDate } = filters;
                const searchLower = query.toLowerCase();

                const nameMatch = p.name.toLowerCase().includes(searchLower);
                const idMatch = p.projectId.toLowerCase().includes(searchLower);

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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="h-full flex flex-col p-4 gap-4">
            {/* Filter UI remains the same */}
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
                        {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                    </select>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                </div>
            </div>
            </TutorialHighlight>
            <div className="flex-grow overflow-y-auto space-y-4 pr-4 hide-scrollbar-on-hover">
                {filteredProjects.map((p, index) => {
                    const isExpanded = expandedProjectId === p.id;
                    const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;

                    // --- Determine current filters for this project ---
                    // Default to empty array if not yet initialized while fetching
                    const currentActiveTrades = projectTradeFilters[p.id] || [];
                    const allDisciplinesForProject = projectDisciplines[p.id] || [];
                    // ---

                    return (
                        <TutorialHighlight tutorialKey="projectCard" key={p.id}>
                            <motion.div
                                layout
                                className={`${bgColor} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}
                            >
                                <motion.div layout="position" className="flex justify-between items-start cursor-pointer" onClick={() => handleProjectClick(p.id)}>
                                    <div>
                                        <h3 className="text-lg font-semibold">{p.name}</h3>
                                        <p className={`text-sm ${currentTheme.subtleText}`}>Project ID: {p.projectId}</p>
                                    </div>
                                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </motion.div>
                                </motion.div>

                                <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        key={`detail-${p.id}`}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <ProjectDetailView
                                            db={db}
                                            project={p}
                                            projectId={p.id}
                                            accessLevel={accessLevel}
                                            currentTheme={currentTheme}
                                            appId={appId}
                                            showToast={showToast}
                                            // --- PASS DOWN STATE AND HANDLERS ---
                                            activeTrades={currentActiveTrades}
                                            allDisciplines={allDisciplinesForProject} // Pass all disciplines
                                            onTradeFilterToggle={handleTradeFilterToggleForProject}
                                            onSelectAllTrades={handleSelectAllTradesForProject}
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

