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
        return Object.keys(detailer?.disciplineSkillsets || {});
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


const WorkloaderConsole = ({ db, detailers, projects, assignments, theme, setTheme, accessLevel, currentTheme, appId, showToast }) => {
    const [startDate, setStartDate] = useState(new Date());
    const [sortBy, setSortBy] = useState('name');
    const [dragFillStart, setDragFillStart] = useState(null);
    const [dragFillEnd, setDragFillEnd] = useState(null);
    const [editingCell, setEditingCell] = useState(null);
    const popupRef = useRef(null);
    const [isCondensedView, setIsCondensedView] = useState(true);
    const [expandedProjectIds, setExpandedProjectIds] = useState(new Set());

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

    const groupedData = useMemo(() => {
        const assignmentsByProject = assignments.reduce((acc, assignment) => {
            const projId = assignment.projectId;
            if (!acc[projId]) acc[projId] = [];
            acc[projId].push(assignment);
            return acc;
        }, {});

        return projects
            .filter(p => !p.archived)
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
                if (sortBy === 'name') {
                    return a.name.localeCompare(b.name);
                }
                return a.projectId.localeCompare(b.projectId, undefined, { numeric: true });
            });

    }, [projects, assignments, detailers, sortBy]);

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
    }, [dragFillStart, dragFillEnd, weekDates, appId, db, showToast]);
    
    const toggleProjectExpansion = (projectId) => {
        setExpandedProjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    };

    const handleToggleAllProjects = () => {
        if (expandedProjectIds.size === groupedData.length) {
            setExpandedProjectIds(new Set());
        } else {
            setExpandedProjectIds(new Set(groupedData.map(p => p.id)));
        }
    };

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

    return (
        <div className="space-y-4 h-full flex flex-col">
             <div className={`sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-center p-2 bg-opacity-80 backdrop-blur-sm ${currentTheme.headerBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4`}>
                 <div className="flex items-center gap-2">
                     <button onClick={() => handleDateNav(-7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<'}</button>
                     <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                     <button onClick={() => handleDateNav(7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'>'}</button>
                     <span className={`font-semibold text-sm ml-4 ${currentTheme.textColor}`}>{getWeekDisplay(weekDates[0])}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setIsCondensedView(!isCondensedView)} className={`px-3 py-1 text-sm rounded-md ${isCondensedView ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>
                        {isCondensedView ? 'Detailed View' : 'Condensed View'}
                    </button>
                    {isCondensedView && (
                        <button onClick={handleToggleAllProjects} className={`px-3 py-1 text-sm rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>
                            {expandedProjectIds.size === groupedData.length ? 'Collapse All' : 'Expand All'}
                        </button>
                    )}
                    <span className={`text-sm font-medium ${currentTheme.subtleText} ml-4`}>Sort by:</span>
                    <button onClick={() => setSortBy('name')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'name' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Alphabetical</button>
                    <button onClick={() => setSortBy('projectId')} className={`px-3 py-1 text-sm rounded-md ${sortBy === 'projectId' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Project ID</button>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setTheme('light')} className={`px-3 py-1 text-sm rounded-md ${theme === 'light' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Light</button>
                    <button onClick={() => setTheme('grey')} className={`px-3 py-1 text-sm rounded-md ${theme === 'grey' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Grey</button>
                    <button onClick={() => setTheme('dark')} className={`px-3 py-1 text-sm rounded-md ${theme === 'dark' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Dark</button>
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

            <div className={`overflow-auto border rounded-lg ${currentTheme.cardBg} ${currentTheme.borderColor} shadow-sm flex-grow`}>
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className={`${currentTheme.headerBg} sticky top-0 z-10`}>
                        <tr>
                            <th className={`p-1 font-semibold w-16 min-w-[64px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>DETAILER</th>
                            <th className={`p-1 font-semibold w-11 min-w-[44px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>TRADE</th>
                            <th className={`p-1 font-semibold w-9 min-w-[36px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>%</th>
                            {weekDates.map(date => {
                                const weekStart = new Date(date);
                                const weekEnd = new Date(weekStart);
                                weekEnd.setDate(weekEnd.getDate() + 6);
                                const isCurrentWeek = new Date() >= weekStart && new Date() <= weekEnd;
                                return (
                                <th key={date.toISOString()} className={`p-1 font-semibold w-5 min-w-[20px] text-center border ${currentTheme.borderColor} ${currentTheme.textColor} ${isCurrentWeek ? 'bg-blue-200 text-black' : ''}`}>
                                    {`${date.getMonth() + 1}/${date.getDate()}`}
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.map(project => {
                            const isProjectExpanded = expandedProjectIds.has(project.id);
                            return (
                                <React.Fragment key={project.id}>
                                    <tr className={`${currentTheme.altRowBg} sticky top-10`}>
                                        <th colSpan={3 + weekDates.length} className={`p-1 text-left font-bold ${currentTheme.textColor} border ${currentTheme.borderColor} cursor-pointer`} onClick={() => isCondensedView && toggleProjectExpansion(project.id)}>
                                            <div className="flex items-center">
                                                {isCondensedView && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 transition-transform ${isProjectExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                )}
                                                {project.name} ({project.projectId})
                                            </div>
                                        </th>
                                    </tr>
                                    {(!isCondensedView || isProjectExpanded) && project.assignments.map(assignment => {
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
                                </React.Fragment>
                            )
                        })}
                    </tbody>
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
