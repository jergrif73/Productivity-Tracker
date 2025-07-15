import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { collection, doc, updateDoc, writeBatch } from 'firebase/firestore';

// Note: The Tooltip component would also be moved to its own file in a full refactor.
const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center justify-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && text && (
                <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md z-10">
                    {text}
                </div>
            )}
        </div>
    );
};

const AssignmentEditPopup = ({ assignment, detailer, onSave, onClose, position, currentTheme, weekIndex }) => {
    const [trade, setTrade] = useState(assignment.trade);

    const availableTrades = useMemo(() => {
        if (!detailer || !detailer.disciplineSkillsets) return [];
        if (Array.isArray(detailer.disciplineSkillsets)) {
            return detailer.disciplineSkillsets.map(s => s.name);
        }
        return Object.keys(detailer.disciplineSkillsets);
    }, [detailer]);

    const handleSave = () => {
        onSave(assignment.id, { trade }, weekIndex);
        onClose();
    };

    if (!detailer) return null;

    const optionClasses = `${currentTheme.inputBg} ${currentTheme.inputText}`;

    return (
        <div
            style={{ top: position.top, left: position.left }}
            className={`absolute z-30 p-4 rounded-lg shadow-xl border ${currentTheme.cardBg} ${currentTheme.borderColor}`}
            onClick={e => e.stopPropagation()}
        >
            <h4 className="font-semibold mb-3">Edit Assignment</h4>
            <div className="space-y-3">
                <div className="relative">
                    <label className="block text-sm font-medium mb-1">Discipline (Trade)</label>
                    <div className={`relative ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-md`}>
                        <select
                            value={trade}
                            onChange={e => setTrade(e.target.value)}
                            className={`w-full p-2 appearance-none bg-transparent ${currentTheme.inputText}`}
                        >
                            {availableTrades.map(opt => <option className={optionClasses} key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                            <svg className={`fill-current h-4 w-4 ${currentTheme.inputText}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className={`px-3 py-1 rounded-md text-sm ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>Cancel</button>
                <button onClick={handleSave} className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white">Save</button>
            </div>
        </div>
    );
};


const WorkloaderConsole = ({ db, detailers, projects, assignments, theme, setTheme, accessLevel, currentTheme, appId, showToast, setView, setInitialSelectedEmployeeInTeamConsole, initialSelectedEmployeeInWorkloader, setInitialSelectedEmployeeInWorkloader, setInitialProjectConsoleFilter, initialSelectedProjectInWorkloader, setInitialSelectedProjectInWorkloader }) => {
    const [startDate, setStartDate] = useState(new Date());
    const [groupBy, setGroupBy] = useState('project');
    const [sortBy, setSortBy] = useState('projectId');
    const [searchTerm, setSearchTerm] = useState('');
    const [dragFillStart, setDragFillStart] = useState(null);
    const [dragFillEnd, setDragFillEnd] = useState(null);
    const [editingCell, setEditingCell] = useState(null);
    const popupRef = useRef(null);
    const [expandedIds, setExpandedIds] = useState(new Set());

    const isTaskmaster = accessLevel === 'taskmaster';
    
    const tradeColorMapping = {
        Piping: { bg: 'bg-green-500', text: 'text-white' },
        Duct: { bg: 'bg-yellow-400', text: 'text-black' },
        Plumbing: { bg: 'bg-blue-500', text: 'text-white' },
        Coordination: { bg: 'bg-pink-500', text: 'text-white' },
        BIM: { bg: 'bg-indigo-600', text: 'text-white' },
        Structural: { bg: 'bg-amber-700', text: 'text-white' },
        "GIS/GPS": { bg: 'bg-teal-500', text: 'text-white' },
    };
    
    const legendColorMapping = {
        Piping: 'bg-green-500',
        Duct: 'bg-yellow-400',
        Plumbing: 'bg-blue-500',
        Coordination: 'bg-pink-500',
        BIM: 'bg-indigo-600',
        Structural: 'bg-amber-700',
        "GIS/GPS": 'bg-teal-500',
    };

    const getWeekDates = (from) => {
        const sunday = new Date(from);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        const weeks = [];
        for (let i = 0; i < 25; i++) {
            const weekStart = new Date(sunday);
            weekStart.setDate(sunday.getDate() + (i * 7));
            weeks.push(weekStart);
        }
        return weeks;
    };
    
    const weekDates = useMemo(() => getWeekDates(startDate), [startDate]);

    const projectGroupedData = useMemo(() => {
        const assignmentsByProject = assignments.reduce((acc, assignment) => {
            const projId = assignment.projectId;
            if (!acc[projId]) acc[projId] = [];
            acc[projId].push(assignment);
            return acc;
        }, {});

        const lowercasedTerm = searchTerm.toLowerCase();

        return projects
            .filter(p => !p.archived && (p.name.toLowerCase().includes(lowercasedTerm) || p.projectId.toLowerCase().includes(lowercasedTerm)))
            .map(project => {
                const projectAssignments = (assignmentsByProject[project.id] || []).map(ass => {
                    const detailer = detailers.find(d => d.id === ass.detailerId);
                    return {
                        ...ass,
                        detailerName: detailer ? `${detailer.firstName.charAt(0)}. ${detailer.lastName}` : 'Unknown'
                    };
                });
                return { ...project, assignments: projectAssignments };
            })
            .filter(p => p.assignments.length > 0)
            .sort((a,b) => {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                return a.projectId.localeCompare(b.projectId, undefined, { numeric: true });
            });

    }, [projects, assignments, detailers, sortBy, searchTerm]);

    const employeeGroupedData = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return detailers
            .filter(d => d.firstName.toLowerCase().includes(lowercasedTerm) || d.lastName.toLowerCase().includes(lowercasedTerm))
            .map(detailer => ({
                ...detailer,
                assignments: assignments
                    .filter(a => a.detailerId === detailer.id)
                    .map(a => ({...a, projectName: projects.find(p => p.id === a.projectId)?.name || 'Unknown Project'}))
            }))
            .filter(d => d.assignments.length > 0)
            .sort((a,b) => {
                if (sortBy === 'firstName') return a.firstName.localeCompare(b.firstName);
                return a.lastName.localeCompare(b.lastName);
            });
    }, [detailers, assignments, projects, sortBy, searchTerm]);

    const handleDateNav = (offset) => {
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };
    
    const getWeekDisplay = (start) => {
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.getMonth()+1}/${start.getDate()}/${start.getFullYear()} - ${end.getMonth()+1}/${end.getDate()}/${end.getFullYear()}`;
    }

    const handleCellClick = (e, assignment, weekIndex) => {
        if (!isTaskmaster) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setEditingCell({
            assignment,
            position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
            weekIndex
        });
    };

    const handleSplitAndUpdateAssignment = async (assignmentId, updates, editWeekIndex) => {
        const originalAssignment = assignments.find(a => a.id === assignmentId);
        if (!originalAssignment || (originalAssignment.trade === updates.trade)) {
            setEditingCell(null);
            return;
        }
    
        const batch = writeBatch(db);
        const assignmentsRef = collection(db, `artifacts/${appId}/public/data/assignments`);
    
        const changeDate = new Date(weekDates[editWeekIndex]);
        changeDate.setUTCHours(0,0,0,0);

        const originalStartDate = new Date(originalAssignment.startDate);
        originalStartDate.setUTCHours(0,0,0,0);

        const originalEndDate = new Date(originalAssignment.endDate);
        originalEndDate.setUTCHours(0,0,0,0);
    
        batch.delete(doc(assignmentsRef, originalAssignment.id));
    
        const dayBeforeChange = new Date(changeDate);
        dayBeforeChange.setUTCDate(dayBeforeChange.getUTCDate() - 1);
        if (originalStartDate < changeDate) {
            const beforeSegment = { ...originalAssignment, endDate: dayBeforeChange.toISOString().split('T')[0] };
            delete beforeSegment.id;
            batch.set(doc(assignmentsRef), beforeSegment);
        }
    
        const changeWeekEndDate = new Date(changeDate);
        changeWeekEndDate.setUTCDate(changeWeekEndDate.getUTCDate() + 6);
        const finalEndDateForChangedSegment = changeWeekEndDate < originalEndDate ? changeWeekEndDate : originalEndDate;
        
        const changedSegment = {
            ...originalAssignment,
            ...updates,
            startDate: changeDate.toISOString().split('T')[0],
            endDate: finalEndDateForChangedSegment.toISOString().split('T')[0]
        };
        delete changedSegment.id;
        batch.set(doc(assignmentsRef), changedSegment);
    
        const dayAfterChangeWeek = new Date(changeWeekEndDate);
        dayAfterChangeWeek.setUTCDate(dayAfterChangeWeek.getUTCDate() + 1);
        if (originalEndDate > changeWeekEndDate) {
            const afterSegment = { ...originalAssignment, startDate: dayAfterChangeWeek.toISOString().split('T')[0] };
            delete afterSegment.id;
            batch.set(doc(assignmentsRef), afterSegment);
        }
    
        try {
            await batch.commit();
            showToast("Assignment updated and split.", "success");
        } catch (e) {
            console.error("Error during split-update operation:", e);
            showToast("Error updating assignment.", "error");
        } finally {
            setEditingCell(null);
        }
    };

    const handleMouseUp = useCallback(async () => {
        if (!dragFillStart || dragFillEnd === null) return;

        const { assignment } = dragFillStart;
        const { weekIndex: endIndex } = dragFillEnd;

        const newEndDate = new Date(weekDates[endIndex]);
        newEndDate.setDate(newEndDate.getDate() + 6);
        
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, assignment.id);
        try {
            await updateDoc(assignmentRef, {
                endDate: newEndDate.toISOString().split('T')[0]
            });
        } catch (e) {
            console.error("Error updating assignment end date:", e);
        }

        setDragFillStart(null);
        setDragFillEnd(null);
    }, [dragFillStart, dragFillEnd, weekDates, appId, db]);
    
    const toggleExpansion = (id) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleToggleAll = () => {
        const allIds = groupBy === 'project' ? projectGroupedData.map(p => p.id) : employeeGroupedData.map(e => e.id);
        if (expandedIds.size === allIds.length && allIds.length > 0) {
            setExpandedIds(new Set());
        } else {
            setExpandedIds(new Set(allIds));
        }
    };

    const handleGroupByChange = (newGroupBy) => {
        setGroupBy(newGroupBy);
        setExpandedIds(new Set());
        setSearchTerm('');
        if (newGroupBy === 'project') {
            setSortBy('projectId');
        } else {
            setSortBy('lastName');
        }
    };

    const allCurrentIds = useMemo(() => {
        return groupBy === 'project' ? projectGroupedData.map(p => p.id) : employeeGroupedData.map(e => e.id);
    }, [groupBy, projectGroupedData, employeeGroupedData]);

    const areAllExpanded = useMemo(() => {
        return expandedIds.size === allCurrentIds.length && allCurrentIds.length > 0;
    }, [expandedIds, allCurrentIds]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setEditingCell(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleGoToEmployeeAssignments = (e, employeeId) => {
        e.stopPropagation(); // Prevent the parent <th>'s onClick from firing
        if (isTaskmaster) {
            setInitialSelectedEmployeeInTeamConsole(employeeId);
            setView('detailers'); // Navigate to Team Console
        }
    };

    // useEffect to handle initial selection from Team Console
    useEffect(() => {
        if (initialSelectedEmployeeInWorkloader && employeeGroupedData.length > 0) {
            const employeeExists = employeeGroupedData.some(e => e.id === initialSelectedEmployeeInWorkloader);
            if (employeeExists) {
                setGroupBy('employee'); 
                setExpandedIds(new Set([initialSelectedEmployeeInWorkloader])); 
                setInitialSelectedEmployeeInWorkloader(null); 
            } else {
                setInitialSelectedEmployeeInWorkloader(null);
            }
        }
    }, [initialSelectedEmployeeInWorkloader, employeeGroupedData, setInitialSelectedEmployeeInWorkloader]);

    // useEffect to handle initial selection from Project Console
    useEffect(() => {
        if (initialSelectedProjectInWorkloader && projectGroupedData.length > 0) {
            const projectExists = projectGroupedData.some(p => p.id === initialSelectedProjectInWorkloader);
            if (projectExists) {
                setGroupBy('project');
                setExpandedIds(new Set([initialSelectedProjectInWorkloader]));
                setInitialSelectedProjectInWorkloader(null); 
            } else {
                setInitialSelectedProjectInWorkloader(null);
            }
        }
    }, [initialSelectedProjectInWorkloader, projectGroupedData, setInitialSelectedProjectInWorkloader]);

    // Function to handle navigation to Project Console
    const handleGoToProjectDetails = (e, projectId, projectName) => { // Added projectName
        e.stopPropagation();
        if (isTaskmaster) {
            setInitialProjectConsoleFilter(projectName); // Set the project name for filtering
            setView('projects');
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
             <div className={`sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-center p-2 bg-opacity-80 backdrop-blur-sm ${currentTheme.headerBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4`}>
                 <div className="flex items-center gap-2">
                     <button onClick={() => handleDateNav(-7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<'}</button>
                     <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                     <button onClick={() => handleDateNav(7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'>'}</button>
                     <span className={`font-semibold text-sm ml-4 ${currentTheme.textColor}`}>{getWeekDisplay(weekDates[0])}</span>
                 </div>
                 <div className="flex items-center gap-4 flex-grow">
                    <input
                        type="text"
                        placeholder={`Search by ${groupBy}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder} w-full max-w-xs`}
                    />
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${currentTheme.subtleText}`}>Group by:</span>
                        <button onClick={() => handleGroupByChange('project')} className={`px-3 py-1 text-sm rounded-md ${groupBy === 'project' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Project</button>
                        <button onClick={() => handleGroupByChange('employee')} className={`px-3 py-1 text-sm rounded-md ${groupBy === 'employee' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Employee</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${currentTheme.subtleText}`}>Sort by:</span>
                        {groupBy === 'project' ? (
                            <>
                                <button onClick={() => setSortBy('name')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'name' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Alphabetical</button>
                                <button onClick={() => setSortBy('projectId')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'projectId' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Project ID</button>
                            </>
                        ) : (
                             <>
                                <button onClick={() => setSortBy('firstName')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'firstName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>First Name</button>
                                <button onClick={() => setSortBy('lastName')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'lastName' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Last Name</button>
                            </>
                        )}
                    </div>
                    <button onClick={handleToggleAll} className={`px-3 py-1 text-sm rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>
                        {areAllExpanded ? 'Collapse All' : 'Expand All'}
                    </button>
                 </div>
                 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                     {Object.entries(legendColorMapping).map(([trade, color]) => (
                         <div key={trade} className="flex items-center gap-2">
                             <div className={`w-4 h-4 rounded-sm ${color}`}></div>
                             <span className={currentTheme.textColor}>{trade}</span>
                         </div>
                     ))}
                 </div>
             </div>

            <div className={`overflow-auto border rounded-lg ${currentTheme.cardBg} ${currentTheme.borderColor} shadow-sm flex-grow hide-scrollbar-on-hover`}>
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className={`${currentTheme.headerBg} sticky top-0 z-10`}>
                        <tr>
                            <th className={`p-1 font-semibold w-48 min-w-[192px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>
                                {groupBy === 'project' ? 'Detailer' : 'Project'}
                            </th>
                            <th className={`p-1 font-semibold w-11 min-w-[44px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>Trade</th>
                            <th className={`p-1 font-semibold w-9 min-w-[36px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>%</th>
                            {weekDates.map(date => {
                                const weekStart = new Date(date);
                                const weekEnd = new Date(weekStart);
                                weekEnd.setDate(weekStart.getDate() + 6);
                                const isCurrentWeek = new Date() >= weekStart && new Date() <= weekEnd;
                                return (
                                <th key={date.toISOString()} className={`p-1 font-semibold w-5 min-w-[20px] text-center border ${currentTheme.borderColor} ${currentTheme.textColor} ${isCurrentWeek ? 'bg-blue-200 text-black' : ''}`}>
                                    {`${date.getMonth() + 1}/${date.getDate()}`}
                                </th>
                            )})}
                        </tr>
                    </thead>
                    {groupBy === 'project' ? (
                        projectGroupedData.map(project => {
                            const isExpanded = expandedIds.has(project.id);
                            return (
                                <tbody key={project.id}>
                                    <tr>
                                        <th colSpan={3 + weekDates.length} className={`p-1 text-left font-bold ${currentTheme.altRowBg} ${currentTheme.textColor} border ${currentTheme.borderColor} cursor-pointer`} onClick={() => toggleExpansion(project.id)}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                                                    </svg>
                                                    {project.name} ({project.projectId})
                                                </div>
                                                {isTaskmaster && (
                                                    <button
                                                        onClick={(e) => handleGoToProjectDetails(e, project.id, project.name)} // Pass project.name
                                                        className={`ml-4 px-3 py-1 text-xs rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-80 transition-colors flex-shrink-0`}
                                                    >
                                                        Project Details
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                    {isExpanded && project.assignments.map(assignment => {
                                        const { bg: bgColor, text: textColor } = tradeColorMapping[assignment.trade] || {bg: 'bg-gray-200', text: 'text-black'};
                                        return (
                                            <tr key={assignment.id} className={`${currentTheme.cardBg} hover:${currentTheme.altRowBg} h-8`}>
                                                <td className={`p-1 font-medium border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.detailerName}</td>
                                                <td className={`p-1 border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.trade}</td>
                                                <td className={`p-1 font-semibold border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.allocation}%</td>
                                                {weekDates.map((weekStart, weekIndex) => {
                                                    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
                                                    const assignStart = new Date(assignment.startDate); const assignEnd = new Date(assignment.endDate);
                                                    let isAssigned = assignStart <= weekEnd && assignEnd >= weekStart;
                                                    const tooltipText = isAssigned ? `Trade: ${assignment.trade || 'N/A'}` : '';

                                                    let isFillHighlighted = false;
                                                    if (dragFillStart && dragFillStart.assignment.id === assignment.id && dragFillEnd) {
                                                        const minIndex = Math.min(dragFillStart.weekIndex, dragFillEnd.weekIndex);
                                                        const maxIndex = Math.max(dragFillStart.weekIndex, dragFillEnd.weekIndex);
                                                        if (weekIndex >= minIndex && weekIndex <= maxIndex) isFillHighlighted = true;
                                                    }

                                                    return (
                                                        <td key={weekStart.toISOString()} 
                                                            className={`p-0 border relative ${currentTheme.borderColor} ${isTaskmaster ? 'cursor-pointer' : ''}`}
                                                            onMouseEnter={() => { if (dragFillStart) setDragFillEnd({ weekIndex }); }}
                                                            onClick={(e) => handleCellClick(e, assignment, weekIndex)}
                                                        >
                                                            {(isAssigned || isFillHighlighted) && (
                                                            <Tooltip text={tooltipText}>
                                                                <div className={`h-full w-full flex items-center justify-center p-1 ${isFillHighlighted ? 'bg-blue-400 opacity-70' : bgColor} ${textColor} text-xs font-bold rounded relative`}>
                                                                    <span>{assignment.allocation}%</span>
                                                                    {isTaskmaster && isAssigned && (
                                                                        <div 
                                                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault(); e.stopPropagation();
                                                                                setDragFillStart({ assignment, weekIndex });
                                                                            }}
                                                                        >
                                                                            <div className="h-full w-1 bg-white/50 rounded"></div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </Tooltip>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            )
                        })
                    ) : (
                        employeeGroupedData.map(employee => {
                            const isExpanded = expandedIds.has(employee.id);
                            return (
                            <tbody key={employee.id}>
                                <tr>
                                    <th colSpan={3 + weekDates.length} className={`p-1 text-left font-bold ${currentTheme.altRowBg} ${currentTheme.textColor} border ${currentTheme.borderColor} cursor-pointer`} onClick={() => toggleExpansion(employee.id)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                                                </svg>
                                                {employee.firstName} {employee.lastName}
                                            </div>
                                            {isTaskmaster && (
                                                <button
                                                    onClick={(e) => handleGoToEmployeeAssignments(e, employee.id)}
                                                    className={`ml-4 px-3 py-1 text-xs rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-80 transition-colors flex-shrink-0`}
                                                >
                                                    Projects Assignment
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                </tr>
                                {isExpanded && employee.assignments.map(assignment => {
                                    const { bg: bgColor, text: textColor } = tradeColorMapping[assignment.trade] || {bg: 'bg-gray-200', text: 'text-black'};
                                    return (
                                        <tr key={assignment.id} className={`${currentTheme.cardBg} hover:${currentTheme.altRowBg} h-8`}>
                                            <td className={`p-1 font-medium border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.projectName}</td>
                                            <td className={`p-1 border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.trade}</td>
                                            <td className={`p-1 font-semibold border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.allocation}%</td>
                                            {weekDates.map((weekStart, weekIndex) => {
                                                const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
                                                const assignStart = new Date(assignment.startDate); const assignEnd = new Date(assignment.endDate);
                                                let isAssigned = assignStart <= weekEnd && assignEnd >= weekStart;
                                                const tooltipText = isAssigned ? `Project: ${assignment.projectName}` : '';
                                                
                                                let isFillHighlighted = false;
                                                if (dragFillStart && dragFillStart.assignment.id === assignment.id && dragFillEnd) {
                                                    const minIndex = Math.min(dragFillStart.weekIndex, dragFillEnd.weekIndex);
                                                    const maxIndex = Math.max(dragFillStart.weekIndex, dragFillEnd.weekIndex); 
                                                    if (weekIndex >= minIndex && weekIndex <= maxIndex) isFillHighlighted = true;
                                                }

                                                return (
                                                    <td key={weekStart.toISOString()} 
                                                        className={`p-0 border relative ${currentTheme.borderColor} ${isTaskmaster ? 'cursor-pointer' : ''}`}
                                                        onMouseEnter={() => { if (dragFillStart) setDragFillEnd({ weekIndex }); }}
                                                        onClick={(e) => handleCellClick(e, assignment, weekIndex)}
                                                    >
                                                        {(isAssigned || isFillHighlighted) && (
                                                        <Tooltip text={tooltipText}>
                                                            <div className={`h-full w-full flex items-center justify-center p-1 ${isFillHighlighted ? 'bg-blue-400 opacity-70' : bgColor} ${textColor} text-xs font-bold rounded relative`}>
                                                                <span>{assignment.allocation}%</span>
                                                                {isTaskmaster && isAssigned && (
                                                                    <div 
                                                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            setDragFillStart({ assignment, weekIndex });
                                                                        }}
                                                                    >
                                                                        <div className="h-full w-1 bg-white/50 rounded"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Tooltip>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        )})
                    )}
                </table>
            </div>
            {editingCell && (
                <div ref={popupRef}>
                    <AssignmentEditPopup 
                        assignment={editingCell.assignment}
                        detailer={detailers.find(d => d.id === editingCell.assignment.detailerId)}
                        position={editingCell.position}
                        onClose={() => setEditingCell(null)}
                        onSave={handleSplitAndUpdateAssignment}
                        currentTheme={currentTheme}
                        weekIndex={editingCell.weekIndex}
                    />
                </div>
            )}
        </div>
    );
};

export default WorkloaderConsole;