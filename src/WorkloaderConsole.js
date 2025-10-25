import React, { useState, useMemo, useEffect, useCallback, useRef, useContext } from 'react';
import { collection, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
// Fix: Add .js extension to the import path
import { NavigationContext, TutorialHighlight } from './App.js'; // Import TutorialHighlight

// Note: The Tooltip component would also be moved to its own file in a full refactor.

// --- Date normalization helper: construct local date at midnight from Date or "YYYY-MM-DD" ---
const toLocalDate = (d) => {
    if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (typeof d === 'string') {
        const [y, m, day] = d.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
            return new Date(y, m - 1, day);
        }
        const tmp = new Date(d);
        return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate());
    }
    const tmp = new Date(d);
    return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate());
};
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

// Confirmation Modal Component (Re-used from other files for consistency)
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



// NEW: Reconciliation Modal for drag changes with editable dates
const DragReconciliationModal = ({ isOpen, onClose, onConfirm, dragChanges, currentTheme }) => {
    const [editedStartDate, setEditedStartDate] = useState('');
    const [editedEndDate, setEditedEndDate] = useState('');

    useEffect(() => {
        if (dragChanges) {
            setEditedStartDate(dragChanges.newStartDate);
            setEditedEndDate(dragChanges.newEndDate);
        }
    }, [dragChanges]);

    if (!isOpen || !dragChanges) return null;

    const { type, assignment, oldStartDate, oldEndDate } = dragChanges;

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleConfirm = () => {
        onConfirm(editedStartDate, editedEndDate);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center">
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-lg shadow-2xl w-full max-w-lg`}>
                <h3 className="text-lg font-bold mb-4">Edit Assignment Dates</h3>
                
                <div className="mb-6 space-y-3">
                    <div className={`p-3 rounded-md ${currentTheme.altRowBg}`}>
                        <div className="font-semibold mb-2">Assignment Details:</div>
                        <div className="text-sm space-y-1">
                            <div><span className="font-medium">Employee:</span> {assignment.detailerName}</div>
                            <div><span className="font-medium">Project:</span> {assignment.projectName || assignment.projectId}</div>
                            <div><span className="font-medium">Trade:</span> {assignment.trade}</div>
                            <div><span className="font-medium">Allocation:</span> {assignment.allocation}%</div>
                        </div>
                    </div>

                    <div className={`p-3 rounded-md ${currentTheme.altRowBg}`}>
                        <div className="font-semibold mb-3">Edit Dates:</div>
                        <div className="space-y-3">
                            {(type === 'move-start' || type === 'new-assignment') && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Start Date: {oldStartDate && <span className="text-red-500 line-through ml-2">{formatDate(oldStartDate)}</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={editedStartDate}
                                        onChange={(e) => setEditedStartDate(e.target.value)}
                                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    />
                                </div>
                            )}
                            {(type === 'extend-end' || type === 'new-assignment') && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        End Date: {oldEndDate && <span className="text-red-500 line-through ml-2">{formatDate(oldEndDate)}</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={editedEndDate}
                                        onChange={(e) => setEditedEndDate(e.target.value)}
                                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button 
                        onClick={onClose} 
                        className={`px-4 py-2 rounded-md ${currentTheme.buttonBg} hover:bg-opacity-80`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const AssignmentEditPopup = ({ assignment, detailer, onSave, onClose, position, currentTheme, weekIndex }) => {
    const [trade, setTrade] = useState(assignment.trade);
    const [allocation, setAllocation] = useState(assignment.allocation);

    const availableTrades = useMemo(() => {
        if (!detailer || !detailer.disciplineSkillsets) return [];
        if (Array.isArray(detailer.disciplineSkillsets)) {
            return detailer.disciplineSkillsets.map(s => s.name);
        }
        return Object.keys(detailer.disciplineSkillsets);
    }, [detailer]);

    const handleSave = () => {
        onSave(assignment.id, { trade, allocation: Number(allocation) }, weekIndex);
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
                <div>
                    <label className="block text-sm font-medium mb-1">Allocation (%)</label>
                    <input
                        type="number"
                        value={allocation}
                        onChange={e => setAllocation(e.target.value)}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                        min="0"
                        max="1000" // Allow over-allocation
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className={`px-3 py-1 rounded-md text-sm ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>Cancel</button>
                <button onClick={handleSave} className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white">Save</button>
            </div>
        </div>
    );
};


const WorkloaderConsole = ({ db, detailers, projects, assignments, theme, setTheme, accessLevel, currentTheme, appId, showToast, initialSelectedEmployeeInWorkloader, setInitialSelectedEmployeeInWorkloader, initialSelectedProjectInWorkloader, setInitialSelectedProjectInWorkloader }) => {
    const { navigateToTeamConsoleForEmployee, navigateToProjectConsoleForProject } = useContext(NavigationContext);

    const [startDate, setStartDate] = useState(new Date());
    const [groupBy, setGroupBy] = useState('project');
    const [sortBy, setSortBy] = useState('projectId');
    const [searchTerm, setSearchTerm] = useState('');
    const [dragState, setDragState] = useState(null);
    const [editingCell, setEditingCell] = useState(null);
    const [inlineEditing, setInlineEditing] = useState(null);
    const popupRef = useRef(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [assignmentToDelete, setAssignmentToDelete] = useState(null); // State for confirmation modal
    const [pendingDragChanges, setPendingDragChanges] = useState(null); // NEW: State for drag reconciliation

    const isEditor = accessLevel === 'taskmaster' || accessLevel === 'tcl';

    const tradeColorMapping = {
        Piping: { bg: 'bg-green-500', text: 'text-white' },
        Duct: { bg: 'bg-yellow-400', text: 'text-black' },
        Plumbing: { bg: 'bg-blue-500', text: 'text-white' },
        Coordination: { bg: 'bg-pink-500', text: 'text-white' },
        VDC: { bg: 'bg-indigo-600', text: 'text-white' },
        Structural: { bg: 'bg-amber-700', text: 'text-white' },
        "GIS/GPS": { bg: 'bg-teal-500', text: 'text-white' },
    };

    const legendColorMapping = {
        Piping: 'bg-green-500',
        Duct: 'bg-yellow-400',
        Plumbing: 'bg-blue-500',
        Coordination: 'bg-pink-500',
        VDC: 'bg-indigo-600',
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

    // NEW: Function to merge contiguous assignments
    // NOTE: mergeContiguousAssignments function disabled to preserve split assignments with different allocations
    // This was intentionally disabled in the original code
    /*
    const mergeContiguousAssignments = useCallback(async (detailerId, projectId) => {
        // Get ALL assignments for the detailer/project combination
        const allAssignmentsForProject = assignments
            .filter(a => a.detailerId === detailerId && a.projectId === projectId)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        if (allAssignmentsForProject.length <= 1) return;

        // Group by contiguous properties (trade and allocation)
        const groupsToMerge = [];
        let currentGroup = [];

        for (const assignment of allAssignmentsForProject) {
            if (currentGroup.length === 0) {
                currentGroup.push(assignment);
            } else {
                const lastAssignmentInGroup = currentGroup[currentGroup.length - 1];
                // Check for same trade and allocation
                if (assignment.trade === lastAssignmentInGroup.trade &&
                    Number(assignment.allocation) === Number(lastAssignmentInGroup.allocation)) {

                    // Check for date contiguity
                    const lastEnd = toLocalDate(lastAssignmentInGroup.endDate);
                    const nextStart = toLocalDate(assignment.startDate);
                    const dayDifference = (nextStart - lastEnd) / (1000 * 60 * 60 * 24);

                    if (dayDifference <= 1) {
                        // It's a contiguous block, add to the current group
                        currentGroup.push(assignment);
                    } else {
                        // Gap detected, finalize the previous group and start a new one
                        if (currentGroup.length > 1) groupsToMerge.push(currentGroup);
                        currentGroup = [assignment];
                    }
                } else {
                    // Different properties, finalize previous group and start a new one
                    if (currentGroup.length > 1) groupsToMerge.push(currentGroup);
                    currentGroup = [assignment];
                }
            }
        }
        // Add the last group if it needs merging
        if (currentGroup.length > 1) groupsToMerge.push(currentGroup);

        if (groupsToMerge.length === 0) return;

        const batch = writeBatch(db);
        const assignmentsRef = collection(db, `artifacts/${appId}/public/data/assignments`);

        for (const group of groupsToMerge) {
            // Delete all segments in the group
            group.forEach(assignment => {
                // Ensure we don't try to delete a virtual ID
                if (!assignment.id.startsWith('virtual-')) {
                    batch.delete(doc(assignmentsRef, assignment.id));
                }
            });

            // Create the new merged assignment
            const firstSegment = group[0];
            const lastSegment = group[group.length - 1];
            const mergedAssignment = {
                ...firstSegment, // retains trade, allocation, etc.
                startDate: firstSegment.startDate,
                endDate: lastSegment.endDate,
            };
            delete mergedAssignment.id; // Remove old ID
            if (mergedAssignment.segments) delete mergedAssignment.segments; // clean up virtual props
            if (mergedAssignment.isVirtualConsolidated) delete mergedAssignment.isVirtualConsolidated; // clean up virtual props

            batch.set(doc(assignmentsRef), mergedAssignment);
        }

        try {
            await batch.commit();
        } catch(e) {
            console.error("Error committing merge batch:", e);
        }

    }, [assignments, db, appId]);
    */

    // Helper function to consolidate assignments for display
    // Groups by detailer + project + trade (without allocation)
    // All segments for same person+project+trade appear on ONE row
    const consolidateAssignments = (assignments) => {
        // Group by detailer + project + trade (WITHOUT allocation)
        const groups = assignments.reduce((acc, assignment) => {
            const key = `${assignment.detailerId}-${assignment.projectId}-${assignment.trade}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(assignment);
            return acc;
        }, {});

        const consolidated = [];

        Object.entries(groups).forEach(([key, group]) => {
            if (group.length === 1) {
                // Single assignment, just add it
                consolidated.push(group[0]);
            } else {
                // Multiple assignments - ALWAYS consolidate on one row
                const sorted = group.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                
                // Create a virtual consolidated assignment showing all segments on one row
                const virtualAssignment = {
                    ...sorted[0],
                    id: `virtual-${sorted.map(s => s.id).join('-')}`,
                    startDate: sorted[0].startDate,
                    endDate: sorted[sorted.length - 1].endDate,
                    allocation: sorted[0].allocation, // Use first segment's allocation for display
                    segments: sorted.map(s => ({ 
                        ...s, 
                        locked: s.locked || false 
                    })),
                    isVirtualConsolidated: true
                };
                consolidated.push(virtualAssignment);
            }
        });

        return consolidated;
    };


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
                        detailerName: detailer ? `${detailer.firstName.charAt(0)}. ${detailer.lastName}` : 'Unknown',
                        detailerId: detailer ? detailer.id : null
                    };
                });

                // Consolidate assignments for display
                const consolidatedAssignments = consolidateAssignments(projectAssignments);

                // Sort the assignments by detailer last name
                consolidatedAssignments.sort((a, b) => {
                    const detailerA = detailers.find(d => d.id === a.detailerId);
                    const detailerB = detailers.find(d => d.id === b.detailerId);

                    if (detailerA && detailerB) {
                        return detailerA.lastName.localeCompare(detailerB.lastName);
                    }
                    if (detailerA) return -1;
                    if (detailerB) return 1;
                    return 0;
                });

                return { ...project, assignments: consolidatedAssignments };
            })
            .filter(p => p.assignments.length > 0 || (
                searchTerm &&
                (p.name.toLowerCase().includes(lowercasedTerm) ||
                 p.projectId.toLowerCase().includes(lowercasedTerm))
            ))
            .sort((a,b) => {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                return a.projectId.localeCompare(b.projectId, undefined, { numeric: true });
            });

    }, [projects, assignments, detailers, sortBy, searchTerm]);

    const employeeGroupedData = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return detailers
            .filter(d => (`${d.firstName} ${d.lastName}`.toLowerCase().includes(lowercasedTerm)))
            .map(detailer => {
                const employeeAssignments = assignments
                    .filter(a => a.detailerId === detailer.id)
                    .map(a => ({...a, projectName: projects.find(p => p.id === a.projectId)?.name || 'Unknown Project'}));

                // Consolidate assignments for display
                const consolidatedAssignments = consolidateAssignments(employeeAssignments);

                return {
                    ...detailer,
                    assignments: consolidatedAssignments
                };
            })
            .filter(d => d.assignments.length > 0)
            .sort((a,b) => {
                if (sortBy === 'firstName') return a.firstName.localeCompare(b.firstName);
                return a.lastName.localeCompare(b.lastName);
            });
    }, [detailers, assignments, projects, sortBy, searchTerm]);

    const displayableWeekDates = useMemo(() => {
        const allAssignments = groupBy === 'project'
            ? projectGroupedData.flatMap(p => p.assignments)
            : employeeGroupedData.flatMap(e => e.assignments);

        const activeWeekStrings = new Set();

        allAssignments.forEach(ass => {
            const assignStart = new Date(ass.startDate);
            const assignEnd = new Date(ass.endDate);

            for (const weekStart of weekDates) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                if (assignStart <= weekEnd && assignEnd >= weekStart) {
                    activeWeekStrings.add(weekStart.toISOString().split('T')[0]);
                }
            }
        });

        return weekDates.filter(week => activeWeekStrings.has(week.toISOString().split('T')[0]));

    }, [weekDates, groupBy, projectGroupedData, employeeGroupedData]);

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
        if (!dragState) {
            if (!isEditor) return;

            // If this is a virtual consolidated assignment, we need to find the actual assignment for this week
            let targetAssignment = assignment;
            if (assignment.isVirtualConsolidated && assignment.segments) {
                const weekStart = toLocalDate(displayableWeekDates[weekIndex]);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                // Find which segment this week belongs to
                targetAssignment = assignment.segments.find(segment => {
                    const segmentStart = toLocalDate(segment.startDate);
                    const segmentEnd = toLocalDate(segment.endDate);
                    return segmentStart <= weekEnd && segmentEnd >= weekStart;
                });

                if (!targetAssignment) return; // No segment found for this week
            }

            const rect = e.currentTarget.getBoundingClientRect();
            setEditingCell({
                assignment: targetAssignment,
                position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
                weekIndex
            });
        }
    };

    // MODIFIED: Updated function with merging logic
    // MODIFIED: Split assignment from edit week forward, but keep displaying on same row
    const handleSplitAndUpdateAssignment = async (assignmentId, updates, editWeekIndex) => {
        const originalAssignment = assignments.find(a => a.id === assignmentId);

        const hasTradeChanged = 'trade' in updates && originalAssignment.trade !== updates.trade;
        const hasAllocationChanged = 'allocation' in updates && Number(originalAssignment.allocation) !== Number(updates.allocation);
        if (!originalAssignment || (!hasTradeChanged && !hasAllocationChanged)) {
            setEditingCell(null);
            setInlineEditing(null);
            return;
        }

        const batch = writeBatch(db);
        const assignmentsRef = collection(db, `artifacts/${appId}/public/data/assignments`);

        const changeDate = new Date(displayableWeekDates[editWeekIndex]);
        changeDate.setUTCHours(0, 0, 0, 0);

        const originalStartDate = new Date(originalAssignment.startDate);
        originalStartDate.setUTCHours(0, 0, 0, 0);

        const originalEndDate = new Date(originalAssignment.endDate);
        originalEndDate.setUTCHours(0, 0, 0, 0);

        // Delete the original assignment
        batch.delete(doc(assignmentsRef, originalAssignment.id));

        // Create "before" segment with original values (if needed)
        const dayBeforeChange = new Date(changeDate);
        dayBeforeChange.setUTCDate(dayBeforeChange.getUTCDate() - 1);
        if (originalStartDate < changeDate) {
            const beforeSegment = {
                ...originalAssignment,
                endDate: dayBeforeChange.toISOString().split('T')[0],
                locked: originalAssignment.locked || false
            };
            delete beforeSegment.id;
            batch.set(doc(assignmentsRef), beforeSegment);
        }

        // Create "after" segment with new values
        const changedAndForwardSegment = {
            ...originalAssignment,
            ...updates,
            startDate: changeDate.toISOString().split('T')[0],
            endDate: originalEndDate.toISOString().split('T')[0],
            locked: false  // New segments are always unlocked
        };
        delete changedAndForwardSegment.id;
        batch.set(doc(assignmentsRef), changedAndForwardSegment);
        try {
            await batch.commit();
            showToast("Assignment updated from this week forward", "success");
        } catch (e) {
            console.error("Error during split-update operation:", e);
            showToast("Error updating assignment", "error");
        } finally {
            setEditingCell(null);
            setInlineEditing(null);
        }
    };

    const isWeekInRange = useCallback((assignment, weekIndex) => {
        if (weekIndex < 0 || weekIndex >= displayableWeekDates.length) return false;
        const weekStart = toLocalDate(displayableWeekDates[weekIndex]);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const assignStart = toLocalDate(assignment.startDate);
        const assignEnd = toLocalDate(assignment.endDate);
        return assignStart <= weekEnd && assignEnd >= weekStart;
    }, [displayableWeekDates]);

    const handleMouseUp = useCallback(async () => {
        if (!dragState) return;

        const { type, assignment, initialWeekIndex, currentWeekIndex } = dragState;
        const dragStartWeek = toLocalDate(displayableWeekDates[Math.min(initialWeekIndex, currentWeekIndex)]);
        const dragEndWeek = toLocalDate(displayableWeekDates[Math.max(initialWeekIndex, currentWeekIndex)]);
        dragEndWeek.setDate(dragEndWeek.getDate() + 6);

        let newStartDate, newEndDate;

        switch (type) {
            case 'move-start':
                if (currentWeekIndex < initialWeekIndex && isWeekInRange(assignment, currentWeekIndex - 1)) {
                    newStartDate = dragStartWeek.toISOString().split('T')[0];
                } else if (currentWeekIndex > initialWeekIndex) {
                    newStartDate = dragEndWeek.toISOString().split('T')[0];
                } else {
                    newStartDate = dragStartWeek.toISOString().split('T')[0];
                }
                newEndDate = assignment.endDate;
                break;
            case 'extend-end':
                newStartDate = assignment.startDate;
                newEndDate = dragEndWeek.toISOString().split('T')[0];
                break;
            case 'new-assignment':
                const finalStartWeekIndex = Math.min(initialWeekIndex, currentWeekIndex);
                const finalEndWeekIndex = Math.max(initialWeekIndex, currentWeekIndex);
                newStartDate = displayableWeekDates[finalStartWeekIndex].toISOString().split('T')[0];
                const tempEndDate = new Date(displayableWeekDates[finalEndWeekIndex]);
                tempEndDate.setDate(tempEndDate.getDate() + 6);
                newEndDate = tempEndDate.toISOString().split('T')[0];
                break;
            default:
                setDragState(null);
                return;
        }

        // Show reconciliation modal instead of directly updating
        setPendingDragChanges({
            type,
            assignment,
            oldStartDate: assignment.startDate,
            oldEndDate: assignment.endDate,
            newStartDate,
            newEndDate
        });

        setDragState(null);
    }, [dragState, displayableWeekDates, isWeekInRange]);

    // NEW: Function to apply the reconciled changes with edited dates
    const applyDragChanges = useCallback(async (editedStartDate, editedEndDate) => {
        if (!pendingDragChanges) return;

        const { type, assignment } = pendingDragChanges;
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, assignment.id);

        try {
            switch (type) {
                case 'move-start':
                    await updateDoc(assignmentRef, { startDate: editedStartDate });
                    showToast("Assignment start date updated.", "success");
                    break;
                case 'extend-end':
                    await updateDoc(assignmentRef, { endDate: editedEndDate });
                    showToast("Assignment end date updated.", "success");
                    break;
                case 'new-assignment':
                    const updates = {
                        startDate: editedStartDate,
                        endDate: editedEndDate,
                        allocation: (Number(assignment.allocation) || 0) === 0 ? 100 : assignment.allocation,
                        trade: assignment.trade || 'Coordination',
                    };
                    await updateDoc(assignmentRef, updates);
                    showToast("Incomplete assignment updated with new dates and defaults.", "success");
                    break;
                default:
                    break;
            }
        } catch (e) {
            console.error("Error during drag-and-drop operation:", e);
            showToast("Error updating assignment dates.", "error");
        } finally {
            setPendingDragChanges(null);
        }
    }, [pendingDragChanges, db, appId, showToast]);

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
            if (inlineEditing && (!event.target.closest('.inline-edit-cell') || event.key === 'Enter')) {
                 setInlineEditing(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", (e) => {
            if (e.key === 'Escape') {
                 setInlineEditing(null);
                 setEditingCell(null);
            }
        });
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
             document.removeEventListener("keydown", () => {});
        }
    }, [inlineEditing]);

    const handleGoToEmployeeAssignments = (e, employeeId) => {
        e.stopPropagation();
        if (isEditor) {
            navigateToTeamConsoleForEmployee(employeeId);
        }
    };

    useEffect(() => {
        const handleInitialFilter = () => {
            if (initialSelectedEmployeeInWorkloader && detailers.length > 0) {
                const employee = detailers.find(e => e.id === initialSelectedEmployeeInWorkloader);
                if (employee) {
                    setGroupBy('employee');
                    setSearchTerm(`${employee.firstName} ${employee.lastName}`);
                    setExpandedIds(new Set([initialSelectedEmployeeInWorkloader]));
                    setInitialSelectedEmployeeInWorkloader(null);
                } else {
                    setInitialSelectedEmployeeInWorkloader(null);
                }
            }
        };

        if (detailers.length > 0) {
            handleInitialFilter();
        }
    }, [initialSelectedEmployeeInWorkloader, detailers, setInitialSelectedEmployeeInWorkloader]);

    useEffect(() => {
        const handleInitialFilter = () => {
             if (initialSelectedProjectInWorkloader && projects.length > 0) {
                const project = projects.find(p => p.id === initialSelectedProjectInWorkloader);

                if (project) {
                    setGroupBy('project');
                    setSearchTerm(project.name || project.projectId || '');
                    setExpandedIds(new Set([initialSelectedProjectInWorkloader]));
                    setInitialSelectedProjectInWorkloader(null);
                } else {
                    setInitialSelectedProjectInWorkloader(null);
                }
            }
        };

        if (projects.length > 0) {
            handleInitialFilter();
        }
    }, [initialSelectedProjectInWorkloader, projects, setInitialSelectedProjectInWorkloader]);


    const handleGoToProjectDetails = (e, projectId) => {
        e.stopPropagation();
        if (isEditor) {
            navigateToProjectConsoleForProject(projectId);
        }
    };

    const isAssignmentIncomplete = useCallback((assignment) => {
        const project = projects.find(p => p.id === assignment.projectId);
        const isUnknownProject = !project || project.name === 'Unknown Project';
        const isZeroAllocation = (Number(assignment.allocation) || 0) === 0;
        const isMissingTrade = !assignment.trade || assignment.trade.trim() === '';
        const isMissingProjectID = !assignment.projectId || assignment.projectId.trim() === '';

        return isUnknownProject && isZeroAllocation && (isMissingTrade || isMissingProjectID);
    }, [projects]);

    const confirmDeleteAssignment = (assignment) => {
        setAssignmentToDelete(assignment);
    };

    const executeDeleteAssignment = async () => {
        if (!assignmentToDelete) return;

        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignmentToDelete.id));

            showToast("Assignment permanently deleted.", "success");
        } catch (error) {
            console.error("Error permanently deleting assignment:", error);
            showToast("Failed to permanently delete assignment.", "error");
        } finally {
            setAssignmentToDelete(null);
        }
    };




    // Helper to get the preview weeks for dragging visualization
    const previewWeeks = dragState ? (() => {
        const { type, initialWeekIndex, currentWeekIndex } = dragState;
        const minWeek = Math.min(initialWeekIndex, currentWeekIndex);
        const maxWeek = Math.max(initialWeekIndex, currentWeekIndex);
        return { minWeek, maxWeek, type };
    })() : null;


    return (
        <TutorialHighlight tutorialKey="workloader">
        <div className="p-4 space-y-4 h-full flex flex-col">
            <ConfirmationModal
                isOpen={!!assignmentToDelete}
                onClose={() => setAssignmentToDelete(null)}
                onConfirm={executeDeleteAssignment}
                title="Confirm Assignment Deletion"
                currentTheme={currentTheme}
            >
                Are you sure you want to permanently delete this assignment? This action cannot be undone.
            </ConfirmationModal>

            <DragReconciliationModal
                isOpen={!!pendingDragChanges}
                onClose={() => setPendingDragChanges(null)}
                onConfirm={applyDragChanges}
                dragChanges={pendingDragChanges}
                currentTheme={currentTheme}
            />

             <div className={`sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-center p-2 bg-opacity-80 backdrop-blur-sm ${currentTheme.headerBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4 flex-shrink-0`}>
                 <div className="flex items-center gap-2">
                     <button onClick={() => handleDateNav(-7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<'}</button>
                     <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                     <button onClick={() => handleDateNav(7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'>'}</button>
                     <span className={`font-semibold text-sm ml-4 ${currentTheme.textColor}`}>{getWeekDisplay(weekDates[0])}</span>
                 </div>
                 <div className="flex items-center gap-4 flex-grow">
                    <TutorialHighlight tutorialKey="searchTimeline">
                        <input
                            type="text"
                            placeholder={`Search by ${groupBy}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder} w-full max-w-xs`}
                        />
                    </TutorialHighlight>
                    <TutorialHighlight tutorialKey="groupAndSort">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${currentTheme.subtleText}`}>Group by:</span>
                            <button onClick={() => handleGroupByChange('project')} className={`px-3 py-1 text-sm rounded-md ${groupBy === 'project' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Project</button>
                            <button onClick={() => handleGroupByChange('employee')} className={`px-3 py-1 text-sm rounded-md ${groupBy === 'employee' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Employee</button>
                        </div>
                    </TutorialHighlight>
                    <TutorialHighlight tutorialKey="groupAndSort">
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
                    </TutorialHighlight>
                    <TutorialHighlight tutorialKey="expandAndCollapse">
                        <button onClick={handleToggleAll} className={`px-3 py-1 text-sm rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>
                            {areAllExpanded ? 'Collapse All' : 'Expand All'}
                        </button>
                    </TutorialHighlight>
                    <TutorialHighlight tutorialKey="themeToggle">
                        <div className="flex items-center gap-2 ml-auto">
                            <span className={`text-sm font-medium ${currentTheme.subtleText}`}>Theme:</span>
                            <button onClick={() => setTheme('light')} className={`px-3 py-1 text-sm rounded-md ${theme === 'light' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Light</button>
                            <button onClick={() => setTheme('grey')} className={`px-3 py-1 text-sm rounded-md ${theme === 'grey' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Grey</button>
                            <button onClick={() => setTheme('dark')} className={`px-3 py-1 text-sm rounded-md ${theme === 'dark' ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}>Dark</button>
                        </div>
                    </TutorialHighlight>
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

            <TutorialHighlight tutorialKey="dynamicTimeline">
            {/* --- THE FIX IS HERE --- */}
            <div className={`border rounded-lg ${currentTheme.cardBg} ${currentTheme.borderColor} shadow-sm flex-grow overflow-auto min-h-0`} style={{ maxHeight: 'calc(100vh - 250px)', scrollbarWidth: 'auto', scrollbarColor: 'rgba(156, 163, 175, 0.7) transparent' }}>
            {/* --- END FIX --- */}
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className={`${currentTheme.headerBg} sticky top-0 z-10`}>
                        <tr>
                            <th className={`p-1 font-semibold w-48 min-w-[192px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>
                                {groupBy === 'project' ? 'Detailer' : 'Project'}
                            </th>
                            <th className={`p-1 font-semibold w-11 min-w-[44px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>Trade</th>
                            <th className={`p-1 font-semibold w-9 min-w-[36px] border ${currentTheme.borderColor} ${currentTheme.textColor}`}>%</th>
                            {displayableWeekDates.map(date => {
                                const weekStart = toLocalDate(date);
                                const weekEnd = new Date(weekStart);
                                weekEnd.setDate(weekStart.getDate() + 6);
                                const isCurrentWeek = toLocalDate(new Date()) >= weekStart && toLocalDate(new Date()) <= weekEnd;
                                return (
                                <th key={date.toISOString()} className={`p-1 font-semibold w-5 min-w-[20px] text-center border ${currentTheme.borderColor} ${currentTheme.textColor}`} style={isCurrentWeek ? { backgroundColor: '#5CB85C', color: 'white' } : {}}>
                                    {`${date.getMonth() + 1}/${date.getDate()}`}
                                </th>
                            )})}
                        </tr>
                    </thead>
                    {groupBy === 'project' ? (
                        projectGroupedData.map((project, projectIndex) => {
                            const isExpanded = expandedIds.has(project.id);
                            return (
                                <tbody key={project.id}>
                                    <tr>
                                        <th colSpan={3 + displayableWeekDates.length} className={`p-1 text-left font-bold ${currentTheme.altRowBg} ${currentTheme.textColor} border ${currentTheme.borderColor} cursor-pointer`} onClick={() => toggleExpansion(project.id)}>
                                            <TutorialHighlight tutorialKey={projectIndex === 0 ? "expandAndCollapse" : ""}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                                                    </svg>
                                                    {project.name} ({project.projectId})
                                                </div>
                                                {(isEditor) && (
                                                    <TutorialHighlight tutorialKey="goToProjectDetails">
                                                    <button
                                                        onClick={(e) => handleGoToProjectDetails(e, project.id)}
                                                        className={`ml-4 px-3 py-1 text-xs rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-80 transition-colors flex-shrink-0`}
                                                    >
                                                        Project Details
                                                    </button>
                                                    </TutorialHighlight>
                                                )}
                                            </div>
                                            </TutorialHighlight>
                                        </th>
                                    </tr>
                                    {isExpanded && project.assignments.map((assignment, assignmentIndex) => {
                                        const { bg: bgColor, text: textColor } = tradeColorMapping[assignment.trade] || {bg: 'bg-gray-200', text: 'text-black'};
                                        const isRowVisibleInCurrentView = displayableWeekDates.some(weekStart => {
                                            const weekEnd = new Date(weekStart);
                                            weekEnd.setDate(weekStart.getDate() + 6);
                                            const assignStart = toLocalDate(assignment.startDate);
                                            const assignEnd = toLocalDate(assignment.endDate);
                                            return assignStart <= weekEnd && assignEnd >= weekStart;
                                        });

                                        if (!isRowVisibleInCurrentView) {
                                            return null;
                                        }

                                        const showDeleteButton = isEditor && isAssignmentIncomplete(assignment);

                                        return (
                                            <tr key={assignment.id} className={`${currentTheme.cardBg} hover:${currentTheme.altRowBg} h-8`}>
                                                <td className={`p-1 font-medium border ${currentTheme.borderColor} ${currentTheme.textColor} flex items-center justify-between`}>
                                                    <span
                                                        className="cursor-pointer hover:underline"
                                                        onClick={(e) => handleGoToEmployeeAssignments(e, assignment.detailerId)}
                                                    >
                                                        {assignment.detailerName}
                                                    </span>
                                                    {showDeleteButton && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); confirmDeleteAssignment(assignment); }}
                                                            className="text-red-500 hover:text-red-700 ml-2 text-lg"
                                                            title="Delete incomplete assignment"
                                                        >
                                                            &times;
                                                        </button>
                                                    )}
                                                </td>
                                                <td className={`p-1 border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.trade}</td>
                                                <td className={`p-1 font-semibold border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.allocation}%</td>
                                                {displayableWeekDates.map((ws, weekIndex) => { const weekStart = toLocalDate(ws);
                                                    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);

                                                    let isAssigned = false;
                                                    let currentAllocation = assignment.allocation;
                                                    let actualAssignment = assignment;

                                                    // Handle virtual consolidated assignments
                                                    if (assignment.isVirtualConsolidated && assignment.segments) {
                                                        // Find which segment this week belongs to
                                                        const matchingSegment = assignment.segments.find(segment => {
                                                            const segmentStart = toLocalDate(segment.startDate);
                                                            const segmentEnd = toLocalDate(segment.endDate);
                                                            return segmentStart <= weekEnd && segmentEnd >= weekStart;
                                                        });

                                                        if (matchingSegment) {
                                                            isAssigned = true;
                                                            currentAllocation = matchingSegment.allocation;
                                                            actualAssignment = matchingSegment;
                                                        }
                                                    } else {
                                                        // Regular assignment check
                                                        const assignStart = toLocalDate(assignment.startDate);
                                                        const assignEnd = toLocalDate(assignment.endDate);
                                                        isAssigned = assignStart <= weekEnd && assignEnd >= weekStart;
                                                    }

                                                    const tooltipText = isAssigned ? `Trade: ${assignment.trade || 'N/A'}` : '';

                                                    const isNewAssignmentHighlighted = dragState &&
                                                        dragState.assignment.id === actualAssignment.id &&
                                                        weekIndex >= Math.min(dragState.initialWeekIndex, dragState.currentWeekIndex) &&
                                                        weekIndex <= Math.max(dragState.initialWeekIndex, dragState.currentWeekIndex);

                                                    const isHighlighted = dragState?.assignment?.id === actualAssignment.id && isWeekInRange(actualAssignment, weekIndex);

                                                    const isInlineEditingThisCell = inlineEditing && inlineEditing.assignmentId === actualAssignment.id && inlineEditing.weekIndex === weekIndex;

                                                    // NEW: Check if this cell is in the preview range
                                                    const isPreviewCell = previewWeeks && 
                                                        dragState?.assignment?.id === actualAssignment.id &&
                                                        weekIndex >= previewWeeks.minWeek && 
                                                        weekIndex <= previewWeeks.maxWeek;

                                                    return (
                                                        <td key={weekStart.toISOString()}
                                                            className={`p-0 border relative ${currentTheme.borderColor} ${isEditor ? 'cursor-pointer' : ''}`}
                                                            onMouseEnter={() => {
                                                                if (dragState && dragState.assignment?.id === actualAssignment.id) {
                                                                    setDragState(prev => ({ ...prev, currentWeekIndex: weekIndex }));
                                                                }
                                                            }}
                                                            onMouseDown={(e) => {
                                                                if (isEditor && isAssignmentIncomplete(actualAssignment)) {
                                                                    e.preventDefault();
                                                                    setDragState({
                                                                        type: 'new-assignment',
                                                                        assignment: actualAssignment,
                                                                        initialWeekIndex: weekIndex,
                                                                        currentWeekIndex: weekIndex,
                                                                    });
                                                                }
                                                            }}
                                                            onClick={(e) => handleCellClick(e, assignment, weekIndex)}
                                                        >
                                                        <TutorialHighlight tutorialKey={projectIndex === 0 && assignmentIndex === 0 && weekIndex === 0 ? "editAssignments" : ""}>
                                                            {/* NEW: Show preview overlay when dragging */}
                                                            {isPreviewCell && !isAssigned && (
                                                                <div className="absolute inset-0 bg-blue-400 opacity-40 border-2 border-blue-600 rounded z-10 pointer-events-none">
                                                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                                                        {currentAllocation}%
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {isPreviewCell && isAssigned && (
                                                                <div className="absolute inset-0 border-2 border-blue-600 rounded z-10 pointer-events-none"></div>
                                                            )}
                                                            
                                                            {(isAssigned || isHighlighted) && (
                                                            <Tooltip text={tooltipText}>
                                                                <div
                                                                    className={`h-full w-full flex items-center justify-center p-1 ${bgColor} ${textColor} text-xs font-bold rounded relative`}
                                                                    onDoubleClick={(e) => {
                                                                        if (isEditor) {
                                                                            e.stopPropagation();
                                                                            setInlineEditing({ assignmentId: actualAssignment.id, weekIndex, currentValue: currentAllocation });
                                                                        }
                                                                    }}
                                                                >
                                                                    {isInlineEditingThisCell ? (
                                                                        <input
                                                                            type="number"
                                                                            defaultValue={currentAllocation}
                                                                            className={`w-full h-full text-center bg-white text-black rounded inline-edit-cell`}
                                                                            autoFocus
                                                                            onBlur={(e) => {
                                                                                const newAllocation = e.target.value;
                                                                                if (newAllocation !== currentAllocation) {
                                                                                    handleSplitAndUpdateAssignment(actualAssignment.id, { allocation: Number(newAllocation) }, weekIndex);
                                                                                }
                                                                                setInlineEditing(null);
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    const newAllocation = e.target.value;
                                                                                    if (newAllocation !== currentAllocation) {
                                                                                       handleSplitAndUpdateAssignment(actualAssignment.id, { allocation: Number(newAllocation) }, weekIndex);
                                                                                    }
                                                                                    setInlineEditing(null);
                                                                                } else if (e.key === 'Escape') {
                                                                                    setInlineEditing(null);
                                                                                }
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        <span>{currentAllocation}%</span>
                                                                    )}

                                                                    {isEditor && isAssigned && !isInlineEditingThisCell  && (
                                                                        <>
                                                                        <div
                                                                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault(); e.stopPropagation();
                                                                                setDragState({ type: 'move-start', assignment: actualAssignment, initialWeekIndex: weekIndex, currentWeekIndex: weekIndex });
                                                                            }}
                                                                        >
                                                                            <div className="h-full w-1 bg-white/50 rounded"></div>
                                                                        </div>
                                                                        <div
                                                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault(); e.stopPropagation();
                                                                                setDragState({ type: 'extend-end', assignment: actualAssignment, initialWeekIndex: weekIndex, currentWeekIndex: weekIndex });
                                                                            }}
                                                                        >
                                                                            <div className="h-full w-1 bg-white/50 rounded"></div>
                                                                        </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </Tooltip>
                                                            )}
                                                            {isNewAssignmentHighlighted && !isAssigned && (
                                                                <div className={`h-full w-full flex items-center justify-center p-1 bg-purple-400 opacity-70 ${textColor} text-xs font-bold rounded relative`}>
                                                                    <span>{currentAllocation}%</span>
                                                                </div>
                                                            )}
                                                        </TutorialHighlight>
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
                        employeeGroupedData.map((employee, employeeIndex) => {
                            const isExpanded = expandedIds.has(employee.id);
                            return (
                            <tbody key={employee.id}>
                                <tr>
                                    <th colSpan={3 + displayableWeekDates.length} className={`p-1 text-left font-bold ${currentTheme.altRowBg} ${currentTheme.textColor} border ${currentTheme.borderColor} cursor-pointer`} onClick={() => toggleExpansion(employee.id)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
                                                </svg>
                                                <span
                                                    className="cursor-pointer hover:underline"
                                                    onClick={(e) => handleGoToEmployeeAssignments(e, employee.id)}
                                                >
                                                    {employee.firstName} {employee.lastName}
                                                </span>
                                            </div>
                                            {isEditor && (
                                                <TutorialHighlight tutorialKey="goToEmployeeAssignments">
                                                <button
                                                    onClick={(e) => handleGoToEmployeeAssignments(e, employee.id)}
                                                    className={`ml-4 px-3 py-1 text-xs rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-80 transition-colors flex-shrink-0`}
                                                >
                                                    Projects Assignment
                                                </button>
                                                </TutorialHighlight>
                                            )}
                                        </div>
                                    </th>
                                </tr>
                                {isExpanded && employee.assignments.map(assignment => {
                                    const { bg: bgColor, text: textColor } = tradeColorMapping[assignment.trade] || {bg: 'bg-gray-200', text: 'text-black'};
                                    const isRowVisibleInCurrentView = displayableWeekDates.some(weekStart => {
                                        const weekEnd = new Date(weekStart);
                                        weekEnd.setDate(weekStart.getDate() + 6);
                                        const assignStart = toLocalDate(assignment.startDate);
                                        const assignEnd = toLocalDate(assignment.endDate);
                                        return assignStart <= weekEnd && assignEnd >= weekStart;
                                    });

                                    if (!isRowVisibleInCurrentView) {
                                        return null;
                                    }

                                    const showDeleteButton = isEditor && isAssignmentIncomplete(assignment);

                                    return (
                                        <tr key={assignment.id} className={`${currentTheme.cardBg} hover:${currentTheme.altRowBg} h-8`}>
                                            <td className={`p-1 font-medium border ${currentTheme.borderColor} ${currentTheme.textColor} flex items-center justify-between`}>
                                                <span>{assignment.projectName}</span>
                                                {showDeleteButton && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); confirmDeleteAssignment(assignment); }}
                                                        className="text-red-500 hover:text-red-700 ml-2 text-lg"
                                                        title="Delete incomplete assignment"
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </td>
                                            <td className={`p-1 border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.trade}</td>
                                            <td className={`p-1 font-semibold border ${currentTheme.borderColor} ${currentTheme.textColor}`}>{assignment.allocation}%</td>
                                            {displayableWeekDates.map((ws, weekIndex) => { const weekStart = toLocalDate(ws);
                                                const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);

                                                let isAssigned = false;
                                                let currentAllocation = assignment.allocation;
                                                let actualAssignment = assignment;

                                                // Handle virtual consolidated assignments
                                                if (assignment.isVirtualConsolidated && assignment.segments) {
                                                    // Find which segment this week belongs to
                                                    const matchingSegment = assignment.segments.find(segment => {
                                                        const segmentStart = toLocalDate(segment.startDate);
                                                        const segmentEnd = toLocalDate(segment.endDate);
                                                        return segmentStart <= weekEnd && segmentEnd >= weekStart;
                                                    });

                                                    if (matchingSegment) {
                                                        isAssigned = true;
                                                        currentAllocation = matchingSegment.allocation;
                                                        actualAssignment = matchingSegment;
                                                    }
                                                } else {
                                                    // Regular assignment check
                                                    const assignStart = toLocalDate(assignment.startDate);
                                                    const assignEnd = toLocalDate(assignment.endDate);
                                                    isAssigned = assignStart <= weekEnd && assignEnd >= weekStart;
                                                }

                                                const tooltipText = isAssigned ? `Project: ${assignment.projectName}` : '';

                                                const isNewAssignmentHighlighted = dragState &&
                                                    dragState.assignment.id === actualAssignment.id &&
                                                    weekIndex >= Math.min(dragState.initialWeekIndex, dragState.currentWeekIndex) &&
                                                    weekIndex <= Math.max(dragState.initialWeekIndex, dragState.currentWeekIndex);

                                                const isHighlighted = dragState?.assignment?.id === actualAssignment.id && isWeekInRange(actualAssignment, weekIndex);

                                                const isInlineEditingThisCell = inlineEditing && inlineEditing.assignmentId === actualAssignment.id && inlineEditing.weekIndex === weekIndex;

                                                // NEW: Check if this cell is in the preview range
                                                const isPreviewCell = previewWeeks && 
                                                    dragState?.assignment?.id === actualAssignment.id &&
                                                    weekIndex >= previewWeeks.minWeek && 
                                                    weekIndex <= previewWeeks.maxWeek;

                                                return (
                                                    <td key={weekStart.toISOString()}
                                                        className={`p-0 border relative ${currentTheme.borderColor} ${isEditor ? 'cursor-pointer' : ''}`}
                                                        onMouseEnter={() => {
                                                            if (dragState && dragState.assignment?.id === actualAssignment.id) {
                                                                setDragState(prev => ({ ...prev, currentWeekIndex: weekIndex }));
                                                            }
                                                        }}
                                                        onMouseDown={(e) => {
                                                            if (isEditor && isAssignmentIncomplete(actualAssignment)) {
                                                                e.preventDefault();
                                                                setDragState({
                                                                    type: 'new-assignment',
                                                                    assignment: actualAssignment,
                                                                    initialWeekIndex: weekIndex,
                                                                    currentWeekIndex: weekIndex,
                                                                });
                                                            }
                                                        }}
                                                        onClick={(e) => handleCellClick(e, assignment, weekIndex)}
                                                    >
                                                        {/* NEW: Show preview overlay when dragging */}
                                                        {isPreviewCell && !isAssigned && (
                                                            <div className="absolute inset-0 bg-blue-400 opacity-40 border-2 border-blue-600 rounded z-10 pointer-events-none">
                                                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                                                    {currentAllocation}%
                                                                </span>
                                                            </div>
                                                        )}
                                                        {isPreviewCell && isAssigned && (
                                                            <div className="absolute inset-0 border-2 border-blue-600 rounded z-10 pointer-events-none"></div>
                                                        )}
                                                        
                                                        {(isAssigned || isHighlighted) && (
                                                        <Tooltip text={tooltipText}>
                                                            <div
                                                                className={`h-full w-full flex items-center justify-center p-1 ${bgColor} ${textColor} text-xs font-bold rounded relative`}
                                                                onDoubleClick={(e) => {
                                                                    if (isEditor) {
                                                                        e.stopPropagation();
                                                                        setInlineEditing({ assignmentId: actualAssignment.id, weekIndex, currentValue: currentAllocation });
                                                                    }
                                                                }}
                                                            >
                                                                {isInlineEditingThisCell ? (
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={currentAllocation}
                                                                        className={`w-full h-full text-center bg-white text-black rounded inline-edit-cell`}
                                                                        autoFocus
                                                                        onBlur={(e) => {
                                                                            const newAllocation = Number(e.target.value);
                                                                            if (newAllocation !== Number(currentAllocation) && !isNaN(newAllocation)) {
                                                                                handleSplitAndUpdateAssignment(actualAssignment.id, { allocation: newAllocation }, weekIndex);
                                                                            }
                                                                            setInlineEditing(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                const newAllocation = Number(e.target.value);
                                                                                if (newAllocation !== Number(currentAllocation) && !isNaN(newAllocation)) {
                                                                                    handleSplitAndUpdateAssignment(actualAssignment.id, { allocation: newAllocation }, weekIndex);
                                                                                }
                                                                                setInlineEditing(null);
                                                                            } else if (e.key === 'Escape') {
                                                                                setInlineEditing(null);
                                                                            }
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                ) : (
                                                                    <span>{currentAllocation}%</span>
                                                                )}
                                                                {isEditor && isAssigned && !isInlineEditingThisCell && (
                                                                    <>
                                                                    <div
                                                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            setDragState({ type: 'move-start', assignment: actualAssignment, initialWeekIndex: weekIndex, currentWeekIndex: weekIndex });
                                                                        }}
                                                                    >
                                                                        <div className="h-full w-1 bg-white/50 rounded"></div>
                                                                    </div>
                                                                    <div
                                                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            setDragState({ type: 'extend-end', assignment: actualAssignment, initialWeekIndex: weekIndex, currentWeekIndex: weekIndex });
                                                                        }}
                                                                    >
                                                                        <div className="h-full w-1 bg-white/50 rounded"></div>
                                                                    </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </Tooltip>
                                                        )}
                                                        {isNewAssignmentHighlighted && !isAssigned && (
                                                            <div className={`h-full w-full flex items-center justify-center p-1 bg-purple-400 opacity-70 ${textColor} text-xs font-bold rounded relative`}>
                                                                <span>{currentAllocation}%</span>
                                                            </div>
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
            </TutorialHighlight>
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
        </TutorialHighlight>
    );
};

export default WorkloaderConsole;