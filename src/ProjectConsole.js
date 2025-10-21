import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialHighlight } from './App';
import ProjectDetailView from './ProjectDetailView.js';

const ProjectConsole = ({ db, detailers, projects, assignments, accessLevel, currentTheme, appId, showToast, initialProjectConsoleFilter, setInitialProjectConsoleFilter }) => {
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [filters, setFilters] = useState({ query: '', detailerId: '', startDate: '', endDate: '' });

    useEffect(() => {
        if (initialProjectConsoleFilter && projects.length > 0) {
            const projectToExpand = projects.find(p => p.id === initialProjectConsoleFilter);

            if (projectToExpand) {
                setFilters(prev => ({ ...prev, query: projectToExpand.name || projectToExpand.projectId }));
                setExpandedProjectId(projectToExpand.id);
            }
            setInitialProjectConsoleFilter(null);
        }
    }, [initialProjectConsoleFilter, projects, setInitialProjectConsoleFilter]);


    useEffect(() => {
        if (expandedProjectId) {
            const currentProject = projects.find(p => p.id === expandedProjectId);
            if (currentProject && filters.query !== currentProject.name && filters.query !== currentProject.projectId) {
                setFilters(prev => ({ ...prev, query: currentProject.name }));
            }
        }
    }, [expandedProjectId, projects, filters.query]);


    const handleProjectClick = (projectId) => {
        setExpandedProjectId(prevId => {
            if (prevId === projectId) {
                setFilters(prev => ({ ...prev, query: '' }));
                return null;
            } else {
                const newProject = projects.find(p => p.id === projectId);
                setFilters(prev => ({ ...prev, query: newProject ? newProject.name : '' }));
                return projectId;
            }
        });
    };

    const filteredProjects = useMemo(() => {
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
