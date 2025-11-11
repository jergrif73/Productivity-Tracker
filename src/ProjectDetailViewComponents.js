import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
// Import necessary Firestore functions
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialHighlight } from './App';

// --- Helper Functions & Components (ConfirmationModal, Tooltip, formatCurrency) ---

export const formatCurrency = (value) => {
    const numberValue = Number(value) || 0;
    return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center justify-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && text && ( // Added check for non-empty text
                <div className="absolute bottom-full mb-2 w-max max-w-xs px-3 py-2 bg-gray-900 text-white text-xs rounded-md z-20 shadow-lg border border-gray-700">
                    <p className="font-mono whitespace-pre-wrap">{text}</p>
                </div>
            )}
        </div>
    );
};

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children, currentTheme }) => {
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

// --- Normalization Helper ---
export function normalizeDesc(str = '') {
  return String(str)
    // strip common zero‑width/invisible characters
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    // collapse all whitespace runs to a single space
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Standard Activities Definition (Based on the new CSV) ---
export const standardChargeCodes = [
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
    { description: "Project Coordination Management​", chargeCode: "9630762" } // Includes zero-width space
];

// Apply normalization when creating the standard list
export const standardActivitiesToAdd = standardChargeCodes.map(item => ({
    id: `std_${item.chargeCode}_${Math.random().toString(16).slice(2)}`,
    description: normalizeDesc(item.description), // Normalize here
    chargeCode: item.chargeCode,
    estimatedHours: 0,
    hoursUsed: 0,
    percentComplete: 0,
    subsets: []
}));

// --- Helper function to group activities ---
// *** UPDATED groupActivities function ***
export const groupActivities = (activityArray, actionTrackerDisciplines) => {
    // Initialize groups based on actionTrackerDisciplines
    const defaultGroups = {};
    (actionTrackerDisciplines || []).forEach(disc => {
        defaultGroups[disc.key] = [];
    });

    const managementKeywords = [
        'Detailing Management',
        'Project Content Development',
        'Project Coordination Management'
    ];
    const vdcKeywords = [
        'Project VDC Admin',
        'Project Setup',
        'Project Data Management',
        'Project Closeout'
    ];

    console.log("Grouping activities. Input count:", activityArray.length);
    console.log("Available disciplines:", actionTrackerDisciplines);

    const groupedResult = activityArray.reduce((acc, act) => {
        const descRaw = act.description ?? '';
        const desc = normalizeDesc(descRaw);
        let groupKeyToUse = null;

        // Try to match to custom disciplines first
        const disciplines = actionTrackerDisciplines || [];
        
        // 1. Check for MH prefix -> match to discipline with "Duct" or "Sheet" in label
        if (/^MH\s*/i.test(desc)) {
            const match = disciplines.find(d => 
                d.label.toLowerCase().includes('duct') || 
                d.label.toLowerCase().includes('sheet')
            );
            groupKeyToUse = match?.key || 'sheetmetal'; // Fallback to standard key
        }
        // 2. Check for MP prefix -> match to discipline with "Piping" or "Pipe" in label  
        else if (/^MP\s*/i.test(desc)) {
            const match = disciplines.find(d => 
                d.label.toLowerCase().includes('piping') || 
                d.label.toLowerCase().includes('pipe')
            );
            groupKeyToUse = match?.key || 'piping'; // Fallback to standard key
        }
        // 3. Check for PL prefix -> match to discipline with "Plumb" in label
        else if (/^PL\s*/i.test(desc)) {
            const match = disciplines.find(d => 
                d.label.toLowerCase().includes('plumb')
            );
            groupKeyToUse = match?.key || 'plumbing'; // Fallback to standard key
        }
        // 4. Check Management keywords -> match to discipline with "Manage" in label
        else if (managementKeywords.some(keyword => desc.toLowerCase().includes(keyword.toLowerCase()))) {
            const match = disciplines.find(d => 
                d.label.toLowerCase().includes('manage') ||
                d.label.toLowerCase().includes('coord')
            );
            groupKeyToUse = match?.key || 'management'; // Fallback to standard key
        }
        // 5. Check VDC keywords -> match to discipline with "VDC" in label
        else if (vdcKeywords.some(keyword => desc.toLowerCase().includes(keyword.toLowerCase()))) {
            const match = disciplines.find(d => 
                d.label.toLowerCase().includes('vdc')
            );
            groupKeyToUse = match?.key || 'vdc'; // Fallback to standard key
        }
        // 6. Fallback: Check discipline prefixes based on first 2 chars of description
        else {
            const disciplineMatch = disciplines.find(d => 
                desc.toUpperCase().startsWith(d.label.substring(0, 2).toUpperCase())
            );
            groupKeyToUse = disciplineMatch?.key;
        }

        // If still no match found, put in 'uncategorized' group
        if (!groupKeyToUse) {
            console.warn(`Activity "${desc}" could not be matched to any discipline. Adding to 'uncategorized'.`);
            groupKeyToUse = 'uncategorized';
        }

        // Ensure the target group exists
        if (!acc[groupKeyToUse]) {
            acc[groupKeyToUse] = [];
        }

        // Add activity if not already present (checking normalized description)
        if (!acc[groupKeyToUse].some(existingAct => normalizeDesc(existingAct.description) === desc)) {
            acc[groupKeyToUse].push({ ...act, description: desc });
        }

        return acc;
    }, { ...defaultGroups }); // Start with a fresh copy of defaultGroups

    console.log("Grouping result keys:", Object.keys(groupedResult));
    console.log("Grouping result:", groupedResult);
    return groupedResult;
};


// --- Constants & Animation Variants ---
export const animationVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeInOut" } }
};

// --- Sub-Components (FinancialSummary, BudgetImpactLog, etc.) ---

export const FinancialSummary = ({ project, activityTotals, currentTheme, currentBudget }) => {
    if (!project || !activityTotals) return null;
    const allocatedHours = activityTotals.estimated;
    const spentToDate = activityTotals.totalActualCost;
    const earnedValue = activityTotals.totalEarnedValue;
    const projectedFinalCost = activityTotals.totalProjectedCost;
    const costToComplete = projectedFinalCost - spentToDate;
    const productivity = spentToDate > 0 ? earnedValue / spentToDate : 0;
    const variance = currentBudget - projectedFinalCost;

    return (
        <TutorialHighlight tutorialKey="financialSummary">
            <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-center`}>
                 <div><p className={`text-sm ${currentTheme.subtleText}`}>Current Budget</p><p className="text-lg font-bold">{formatCurrency(currentBudget)}</p></div>
                 <div><p className={`text-sm ${currentTheme.subtleText}`}>Allocated Hrs</p><Tooltip text="Sum of all Est. Hrs in Activity Tracker"><p className="text-lg font-bold">{allocatedHours.toFixed(2)}</p></Tooltip></div>
                 <div><p className={`text-sm ${currentTheme.subtleText}`}>Spent to Date</p><Tooltip text="Sum of (Hrs Used * Rate) for each activity"><p className="text-lg font-bold">{formatCurrency(spentToDate)}</p></Tooltip></div>
                 <div><p className={`text-sm ${currentTheme.subtleText}`}>Earned Value</p><Tooltip text="Sum of (Budget * % Comp) for each activity"><p className="text-lg font-bold">{formatCurrency(earnedValue)}</p></Tooltip></div>
                 <div><p className={`text-sm ${currentTheme.subtleText}`}>Cost to Complete</p><Tooltip text={"Projected Final Cost - Spent to Date"}><p className="text-lg font-bold">{formatCurrency(costToComplete)}</p></Tooltip></div>
                 <div><p className={`text-sm ${currentTheme.subtleText}`}>Est. Final Cost</p><Tooltip text="Sum of (Projected Hrs * Rate)"><p className="text-lg font-bold">{formatCurrency(projectedFinalCost)}</p></Tooltip></div>
                 <div><p className={`text-sm ${currentTheme.subtleText}`}>Variance</p><Tooltip text="Current Budget - Est. Final Cost"><p className={`text-lg font-bold ${variance < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(variance)}</p></Tooltip></div>
                 <div><p className={`text-sm ${currentTheme.subtleText}`}>Productivity</p><Tooltip text="Earned Value / Spent to Date"><p className={`text-lg font-bold ${productivity < 1 ? 'text-red-500' : 'text-green-500'}`}>{productivity.toFixed(2)}</p></Tooltip></div>
            </div>
        </TutorialHighlight>
    );
};

export const BudgetImpactLog = ({ impacts, onAdd, onDelete, currentTheme, project, activities }) => {

    const tradeActivityOptions = useMemo(() => {
        const options = new Set();
        if (activities) {
            Object.values(activities).flat().forEach(activity => {
                options.add(normalizeDesc(activity.description)); // Normalize options
            });
        }
        return Array.from(options).sort();
    }, [activities]);


    const [newImpact, setNewImpact] = useState({ date: new Date().toISOString().split('T')[0], description: '', tradeOrActivity: '', hours: 0, rateType: 'Detailing Rate' });

    const blendedRate = project.blendedRate || 0;
    const vdcBlendedRate = project.vdcBlendedRate || 0;
    const rateToUse = newImpact.rateType === 'VDC Rate' ? vdcBlendedRate : blendedRate;
    const calculatedAmount = (Number(newImpact.hours) || 0) * rateToUse;

    const handleAdd = () => {
        if (newImpact.description && newImpact.hours > 0 && newImpact.tradeOrActivity) {
            onAdd({
                ...newImpact,
                id: `impact_${Date.now()}`,
                amount: calculatedAmount
            });
            setNewImpact({ date: new Date().toISOString().split('T')[0], description: '', tradeOrActivity: '', hours: 0, rateType: 'Detailing Rate' });
        }
    };

    const handleInputChange = (field, value) => {
        setNewImpact(prev => ({...prev, [field]: value}));
    };

    return (
        <div className="space-y-2">
            <table className="min-w-full text-sm table-fixed">
                <thead className={currentTheme.altRowBg}>
                    <tr>
                        <th className="p-2 text-left font-semibold w-[10%]">Date</th>
                        <th className="p-2 text-left font-semibold w-[35%]">Description</th>
                        <th className="p-2 text-left font-semibold w-[15%]">Activity</th>
                        <th className="p-2 text-left font-semibold w-[15%]">Hours</th>
                        <th className="p-2 text-left font-semibold w-[15%]">Rate Type</th>
                        <th className="p-2 text-left font-semibold w-[10%]">Impact ($)</th>
                        <th className="p-2 text-left font-semibold w-[5%]"></th>
                    </tr>
                </thead>
                <tbody>
                    {(impacts || []).map(impact => (
                        <tr key={impact.id} className="border-b border-gray-500/20">
                            <td className="p-2">{new Date(impact.date + 'T00:00:00').toLocaleDateString()}</td>
                            <td className="p-2 truncate">{impact.description}</td>
                            <td className="p-2">{impact.tradeOrActivity}</td>
                            <td className="p-2">{impact.hours}</td>
                            <td className="p-2">{impact.rateType}</td>
                            <td className={`p-2 ${impact.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(impact.amount)}</td>
                            <td className="p-2 text-right">
                                <button onClick={() => onDelete(impact.id)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                 <tfoot>
                    <tr>
                        <td className="p-1"><input type="date" value={newImpact.date} onChange={e => handleInputChange('date', e.target.value)} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} /></td>
                        <td className="p-1"><input type="text" placeholder="Description" value={newImpact.description} onChange={e => handleInputChange('description', e.target.value)} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} /></td>
                        <td className="p-1">
                            <select value={newImpact.tradeOrActivity} onChange={e => handleInputChange('tradeOrActivity', e.target.value)} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">Select Activity...</option>
                                {tradeActivityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </td>
                        <td className="p-1"><input type="number" placeholder="Hours" value={newImpact.hours} onChange={e => handleInputChange('hours', e.target.value)} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} /></td>
                        <td className="p-1">
                             <select value={newImpact.rateType} onChange={e => handleInputChange('rateType', e.target.value)} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="Detailing Rate">Detailing Rate</option>
                                <option value="VDC Rate">VDC Rate</option>
                            </select>
                        </td>
                        <td className="p-1 text-center">{formatCurrency(calculatedAmount)}</td>
                        <td className="p-1"><button onClick={handleAdd} className={`w-full p-1 rounded ${currentTheme.buttonBg} hover:bg-opacity-80`}>Add</button></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export const FinancialForecastChart = ({ project, weeklyHours, activityTotals, currentBudget, currentTheme }) => {
    const svgRef = React.useRef(null);

    const chartData = useMemo(() => {
        if (!weeklyHours || Object.keys(weeklyHours).length === 0) return null;

        const allWeeks = new Set();
        Object.values(weeklyHours).forEach(tradeData => {
            Object.keys(tradeData).forEach(week => allWeeks.add(week));
        });

        const sortedWeeks = Array.from(allWeeks).sort();
        if (sortedWeeks.length === 0) return null;

        let cumulativeCost = 0;
        const plannedSpend = sortedWeeks.map(week => {
            let weeklyTotalHours = 0;
            Object.keys(weeklyHours).forEach(trade => {
                weeklyTotalHours += weeklyHours[trade]?.[week] || 0; // Added safety check
            });
            cumulativeCost += weeklyTotalHours * (project.blendedRate || 0);
            return { date: new Date(week), value: cumulativeCost };
        });

        return {
            plannedSpend,
            startDate: new Date(sortedWeeks[0]),
            endDate: new Date(sortedWeeks[sortedWeeks.length - 1]),
        };
    }, [weeklyHours, project.blendedRate]);

    useEffect(() => {
        if (!chartData || !svgRef.current || !activityTotals) return; // Added check for activityTotals

        const { plannedSpend, startDate, endDate } = chartData;
        const { totalEarnedValue = 0, totalActualCost = 0, totalProjectedCost = 0 } = activityTotals; // Provide defaults

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 120, bottom: 30, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleTime().domain([startDate, endDate]).range([0, width]);
        const yMax = d3.max([currentBudget, totalProjectedCost, d3.max(plannedSpend, d => d.value)]);
        const y = d3.scaleLinear().domain([0, yMax > 0 ? yMax : 100]).range([height, 0]);

        const xAxis = g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));
        xAxis.selectAll("text").style("fill", currentTheme.textColor);
        xAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

        const yAxis = g.append('g').call(d3.axisLeft(y).tickFormat(d3.format("$,.0f")));
        yAxis.selectAll("text").style("fill", currentTheme.textColor);
        yAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

        g.append('path')
            .datum(plannedSpend)
            .attr('fill', 'none')
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 2)
            .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.value)));

        g.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(currentBudget)).attr('y2', y(currentBudget)).attr('stroke', '#22c55e').attr('stroke-width', 2).attr('stroke-dasharray', '5,5');
        g.append('text').attr('x', width + 5).attr('y', y(currentBudget)).text('Budget').attr('fill', '#22c55e').attr('alignment-baseline', 'middle');

        g.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(totalProjectedCost)).attr('y2', y(totalProjectedCost)).attr('stroke', '#ef4444').attr('stroke-width', 2).attr('stroke-dasharray', '5,5');
        g.append('text').attr('x', width + 5).attr('y', y(totalProjectedCost)).text('Projected').attr('fill', '#ef4444').attr('alignment-baseline', 'middle');

        const today = new Date();
        if (today >= startDate && today <= endDate) {
            g.append('line').attr('x1', x(today)).attr('x2', x(today)).attr('y1', 0).attr('y2', height).attr('stroke', currentTheme.textColor).attr('stroke-width', 1).attr('stroke-dasharray', '2,2');
            g.append('text').attr('x', x(today)).attr('y', -5).text('Today').attr('fill', currentTheme.textColor).attr('text-anchor', 'middle');

            g.append('circle').attr('cx', x(today)).attr('cy', y(totalEarnedValue)).attr('r', 5).attr('fill', '#14b8a6');
            g.append('text').attr('x', x(today) + 8).attr('y', y(totalEarnedValue)).text(`Earned: ${formatCurrency(totalEarnedValue)}`).attr('fill', '#14b8a6').attr('alignment-baseline', 'middle');

            g.append('circle').attr('cx', x(today)).attr('cy', y(totalActualCost)).attr('r', 5).attr('fill', '#f97316');
            g.append('text').attr('x', x(today) + 8).attr('y', y(totalActualCost) + 15).text(`Actual: ${formatCurrency(totalActualCost)}`).attr('fill', '#f97316').attr('alignment-baseline', 'middle');
        }

    }, [chartData, activityTotals, currentBudget, currentTheme]);

    if (!chartData) {
        return <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm text-center`}>Enter weekly hour forecasts in the Admin Console to see the financial forecast chart.</div>;
    }

    return (
        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
            <h3 className="text-lg font-semibold mb-2">Financial Forecast</h3>
            <svg ref={svgRef} width="800" height="400"></svg>
        </div>
    );
};

export const ProjectBreakdown = ({ mainItems, onAdd, onUpdate, onDelete, onReorder, currentTheme }) => {
    const [newItemName, setNewItemName] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [draggingItem, setDraggingItem] = useState(null);

    const handleAdd = () => {
        if (newItemName.trim()) {
            onAdd({ id: `main_${Date.now()}`, name: newItemName.trim(), order: mainItems.length });
            setNewItemName('');
        }
    };

    const handleUpdate = () => {
        if (editingItem && editingItem.name.trim()) {
            onUpdate(editingItem);
            setEditingItem(null);
        }
    };

    const handleDragStart = (e, item) => {
        setDraggingItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id); // Use item.id for data transfer
    };

     const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropTargetId) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === dropTargetId) {
             setDraggingItem(null);
             return; // No drop if same item or no dragged item
        }

        const updatedItems = [...mainItems];
        const draggedItemIndex = updatedItems.findIndex(item => item.id === draggedId);
        const targetIndex = updatedItems.findIndex(item => item.id === dropTargetId);

        if (draggedItemIndex === -1 || targetIndex === -1) {
             setDraggingItem(null);
             return; // Safety check
        }

        // Remove from old position and insert at new position
        const [reorderedItem] = updatedItems.splice(draggedItemIndex, 1);
        updatedItems.splice(targetIndex, 0, reorderedItem);

        onReorder(updatedItems);
        setDraggingItem(null);
    };

     const handleDragEnd = () => {
        // Reset dragging state if drag is cancelled
        setDraggingItem(null);
    };

    return (
        <>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4 hide-scrollbar-on-hover pr-2"> {/* Added pr-2 */}
                {(mainItems || []).map((item, index) => (
                    <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-move transition-opacity ${draggingItem?.id === item.id ? 'opacity-40 bg-blue-400/30' : 'bg-gray-500/10'}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onDragEnd={handleDragEnd} // Add drag end handler
                    >
                        {editingItem?.id === item.id ? (
                            <input
                                type="text"
                                value={editingItem.name}
                                onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                                onBlur={handleUpdate}
                                onKeyPress={e => e.key === 'Enter' && handleUpdate()}
                                className={`flex-grow p-1 border rounded ${currentTheme.inputBg}`}
                                autoFocus
                            />
                        ) : (
                            <span className="flex-grow">{item.name}</span>
                        )}
                        <div className="flex gap-2 flex-shrink-0 ml-2"> {/* Added flex-shrink-0 and ml-2 */}
                            <button onClick={() => setEditingItem({...item})} className="text-blue-500 text-sm">Edit</button>
                            <button onClick={() => onDelete(item.id)} className="text-red-500 text-sm">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 border-t pt-2 border-gray-500/20"> {/* Added border color */}
                <input
                    type="text"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="New Main Name..."
                    className={`flex-grow p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
                <button onClick={handleAdd} className={`p-1 px-3 rounded ${currentTheme.buttonBg} hover:bg-opacity-80`}>Add</button>
            </div>
        </>
    );
};


export const ActionTrackerDisciplineManager = ({ disciplines, onAdd, onDelete, currentTheme }) => {
    const [newDisciplineName, setNewDisciplineName] = useState('');

    const handleAdd = () => {
        if (newDisciplineName.trim()) {
            const newKey = newDisciplineName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (disciplines.some(d => d.key === newKey || d.label === newDisciplineName.trim())) {
                alert('Discipline with this name or key already exists.');
                return;
            }
            onAdd({ key: newKey, label: newDisciplineName.trim() });
            setNewDisciplineName('');
        }
    };

    return (
        <div className="space-y-2">
            <div className="space-y-2 max-h-60 overflow-y-auto mb-2 hide-scrollbar-on-hover pr-2">
                {disciplines.map(disc => (
                    <div key={disc.key} className="flex items-center justify-between p-2 bg-gray-500/10 rounded-md">
                        <span>{disc.label}</span>
                        <button onClick={() => onDelete(disc.key)} className="text-red-500 text-sm">Delete</button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 border-t pt-2 border-gray-500/20"> {/* Added border color */}
                <input
                    type="text"
                    value={newDisciplineName}
                    onChange={e => setNewDisciplineName(e.target.value)}
                    placeholder="New Discipline Name..."
                    className={`flex-grow p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
                <button onClick={handleAdd} className={`p-1 px-3 rounded ${currentTheme.buttonBg} hover:bg-opacity-80`}>Add</button>
            </div>
        </div>
    );
};

export const ActionTracker = ({ mainItems, activities, totalProjectHours, onUpdateActivityCompletion, onUpdatePercentage, onDeleteActivityFromActionTracker, actionTrackerData, currentTheme, actionTrackerDisciplines, tradeColorMapping, isTradePercentageEditable, isActivityCompletionEditable, collapsedSections, onToggle, activeTrades, projectWideActivities }) => {

    const handlePercentageChange = (mainId, trade, value) => {
        onUpdatePercentage(mainId, trade, 'tradePercentage', value);
    };

    const handleActivityCompleteChange = (mainId, trade, activityId, value) => {
        const numericValue = value === '' ? '' : Number(value);
        if (numericValue > 100) return;
        onUpdateActivityCompletion(mainId, trade, activityId, numericValue);
    };

    // Filter project-wide disciplines based on whether they are active and designated as project-wide
    const projectWideDisciplines = (actionTrackerDisciplines || []).filter(disc =>
        projectWideActivities?.includes(disc.key) && activeTrades.includes(disc.key)
    );

    return (
        <div className="space-y-4">
            {/* Project-Wide Activities Section */}
            {projectWideDisciplines.length > 0 && (
                 <div className="p-3 rounded-md bg-black/20">
                    <h4 className="font-bold text-md mb-2">Project-Wide Activities</h4>
                    <div className="space-y-3 pt-2">
                        {projectWideDisciplines.map(discipline => {
                            const trade = discipline.key;
                            const style = tradeColorMapping[trade] || { bg: 'bg-gray-500/70', text: 'text-white' };
                            const tradeActivities = activities?.[trade] || []; // Safety check
                            const tradeSectionId = `project_wide_trade_${trade}`;

                            return (
                                <div key={trade}>
                                    {/* Header Button */}
                                    <button onClick={() => onToggle(tradeSectionId)} className={`w-full p-2 rounded-t-md ${style.bg} ${style.text} flex justify-between items-center`}>
                                        <span className="font-bold text-sm">{discipline.label}</span>
                                        <motion.svg
                                            animate={{ rotate: collapsedSections[tradeSectionId] ? 0 : 180 }}
                                            transition={{ duration: 0.2 }}
                                            xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </motion.svg>
                                    </button>
                                    {/* Collapsible Content */}
                                    <AnimatePresence>
                                    {!collapsedSections[tradeSectionId] && (
                                        <motion.div
                                            key={`trade-content-${tradeSectionId}`}
                                            variants={animationVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="overflow-hidden"
                                        >
                                            <div className="p-2 rounded-b-md bg-gray-500/10">
                                                 <div className="grid grid-cols-2 font-semibold text-xs mb-1">
                                                    <span>Activity Description</span>
                                                    <span className="text-right">% Complete</span>
                                                </div>
                                                {tradeActivities.length === 0 ? (
                                                    <div className="text-center py-4 text-sm opacity-60">
                                                        No activities yet. Add activities in the <strong>Activity Values Breakdown</strong> section below.
                                                    </div>
                                                ) : (
                                                    tradeActivities.map(act => {
                                                        // Get completion from project_wide structure
                                                        const activityCompletion = (actionTrackerData?.project_wide?.[trade]?.[act.id]) ?? '';
                                                        return (
                                                            <div key={act.id} className="grid grid-cols-[1fr,auto,auto] items-center text-sm py-1 gap-2">
                                                                <span>{act.description}</span>
                                                                <input
                                                                    type="number"
                                                                    value={activityCompletion}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => handleActivityCompleteChange(null, trade, act.id, e.target.value)} // Pass null for mainId
                                                                    className={`w-20 p-1 rounded-md text-right ml-auto ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                                                    placeholder="%"
                                                                    disabled={!isActivityCompletionEditable}
                                                                />
                                                                {isActivityCompletionEditable && (
                                                                     <button onClick={() => onDeleteActivityFromActionTracker(act.id)} className="text-red-500 hover:text-red-700">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </div>
                 </div>
            )}

            {/* Mains-Specific Activities Section */}
            {(mainItems || []).map(main => (
                <div key={main.id} className="p-3 rounded-md bg-black/20">
                     {/* Main Header Button */}
                    <button onClick={() => onToggle(`main_${main.id}`)} className="w-full flex justify-between items-center text-left mb-2">
                        <h4 className="font-bold text-md">{main.name}</h4>
                        <motion.svg
                            animate={{ rotate: collapsedSections[`main_${main.id}`] ? 0 : 180 }}
                            transition={{ duration: 0.2 }}
                            xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                    </button>
                    {/* Collapsible Content for Main */}
                    <AnimatePresence>
                    {!collapsedSections[`main_${main.id}`] && (
                        <motion.div
                            key={`main-content-${main.id}`}
                            variants={animationVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="overflow-hidden"
                        >
                            <div className="space-y-3 pt-2">
                                {/* Filter disciplines: NOT project-wide AND active */}
                                {(actionTrackerDisciplines || [])
                                    .filter(disc => !projectWideActivities?.includes(disc.key) && activeTrades.includes(disc.key))
                                    .map(discipline => {
                                    const trade = discipline.key;
                                    const style = tradeColorMapping[trade] || { bg: 'bg-gray-500/70', text: 'text-white' };
                                    if(!style) return null;

                                    const tradeActivities = activities?.[trade] || []; // Safety check

                                    const tradeTotalHours = tradeActivities.reduce((sum, act) => sum + Number(act.estimatedHours || 0), 0);
                                    const percentageOfProject = totalProjectHours > 0 ? (tradeTotalHours / totalProjectHours) * 100 : 0;

                                    // Get data for this specific main and trade
                                    const tradeData = actionTrackerData?.[main.id]?.[trade] || {};
                                    const tradePercentage = tradeData.tradePercentage ?? ''; // Use ?? for empty string default
                                    const tradeSectionId = `main_${main.id}_trade_${trade}`;

                                    return (
                                        <div key={trade}>
                                            {/* Trade Header Button */}
                                            <button onClick={() => onToggle(tradeSectionId)} className={`w-full p-2 rounded-t-md ${style.bg} ${style.text} flex justify-between items-center`}>
                                                <span className="font-bold text-sm">{discipline.label}</span>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span>Percentage of Est. Hrs. ({percentageOfProject.toFixed(2)}%)</span>
                                                    <input
                                                        type="number"
                                                        value={tradePercentage}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => { e.stopPropagation(); handlePercentageChange(main.id, trade, e.target.value); }}
                                                        className="w-20 p-1 rounded-md bg-white/30 text-black text-center"
                                                        placeholder="% of Hrs."
                                                        disabled={!isTradePercentageEditable}
                                                    />
                                                    <motion.svg
                                                        animate={{ rotate: collapsedSections[tradeSectionId] ? 0 : 180 }}
                                                        transition={{ duration: 0.2 }}
                                                        xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </motion.svg>
                                                </div>
                                            </button>
                                            {/* Collapsible Content for Trade within Main */}
                                            <AnimatePresence>
                                            {!collapsedSections[tradeSectionId] && (
                                                <motion.div
                                                    key={`trade-content-${tradeSectionId}`}
                                                    variants={animationVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="exit"
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-2 rounded-b-md bg-gray-500/10">
                                                        <div className="grid grid-cols-2 font-semibold text-xs mb-1">
                                                            <span>Activity Description</span>
                                                            <span className="text-right">% Complete</span>
                                                        </div>
                                                        {tradeActivities.length === 0 ? (
                                                            <div className="text-center py-4 text-sm opacity-60">
                                                                No activities yet. Add activities in the <strong>Activity Values Breakdown</strong> section below.
                                                            </div>
                                                        ) : (
                                                            tradeActivities.map(act => {
                                                                // Get completion for this specific activity within this main/trade
                                                                const activityCompletion = (tradeData.activities?.[act.id]) ?? '';
                                                                return (
                                                                    <div key={act.id} className="grid grid-cols-[1fr,auto,auto] items-center text-sm py-1 gap-2">
                                                                        <span>{act.description}</span>
                                                                        <input
                                                                            type="number"
                                                                            value={activityCompletion}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onChange={(e) => handleActivityCompleteChange(main.id, trade, act.id, e.target.value)} // Pass main.id
                                                                            className={`w-20 p-1 rounded-md text-right ml-auto ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                                                            placeholder="%"
                                                                            disabled={!isActivityCompletionEditable}
                                                                        />
                                                                        {isActivityCompletionEditable && (
                                                                             <button onClick={() => onDeleteActivityFromActionTracker(act.id)} className="text-red-500 hover:text-red-700">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};


export const ActivityRow = React.memo(({ activity, groupKey, index, onChange, onDelete, project, currentTheme, totalProjectHours, accessLevel, rateType }) => {
    const { percentComplete = 0, costToDate = 0, estimatedHours = 0 } = activity;

    const rateToUse = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);

    // Budget and Earned Value are still based on Estimated Hours
    const rawBudget = (Number(estimatedHours) || 0) * rateToUse;
    const lineItemBudget = Math.ceil(rawBudget / 5) * 5;
    const earnedValue = lineItemBudget * (Number(percentComplete) / 100);
    
    // Actual Cost is now the user-provided costToDate
    const actualCost = Number(costToDate) || 0;
    
    const percentOfProject = totalProjectHours > 0 ? (Number(estimatedHours) / totalProjectHours) * 100 : 0;


    // Projected Cost calculation
    const calculateProjectedCost = (act) => {
        const localCostToDate = Number(act.costToDate) || 0;
        const localPercentComplete = Number(act.percentComplete) || 0;
        if (localPercentComplete <= 0) {
             // If 0% complete, projected cost is the estimated budget
             const estHrs = Number(act.estimatedHours) || 0;
             const rate = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
             const budget = Math.ceil((estHrs * rate) / 5) * 5;
             return budget > 0 ? budget : 0;
        }
        return (localCostToDate / localPercentComplete) * 100;
    };
    const projectedCost = calculateProjectedCost(activity);

    return (
        <tr key={activity.id} className={currentTheme.cardBg}>
            <td className="p-1"><input type="text" value={activity.description} onChange={(e) => onChange(groupKey, index, 'description', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1"><input type="text" value={activity.chargeCode || ''} onChange={(e) => onChange(groupKey, index, 'chargeCode', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1 w-24"><input type="number" value={estimatedHours} onChange={(e) => onChange(groupKey, index, 'estimatedHours', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text={`Est. Hours * Rate (Raw: ${formatCurrency(rawBudget)})`}><p>{formatCurrency(lineItemBudget)}</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Est. Hrs / Total Est. Hrs) * 100"><p>{percentOfProject.toFixed(2)}%</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}>
                <p>{Number(percentComplete || 0).toFixed(2)}%</p> {/* Display only */}
            </td>
            
            {/* --- "Actual Cost ($)" is now the input field --- */}
            <td className={`p-1 w-24 text-center`}>
                {accessLevel === 'taskmaster' ? (
                    <input
                        type="number"
                        value={costToDate}
                        onChange={(e) => onChange(groupKey, index, 'costToDate', e.target.value)}
                        className={`w-full p-1 bg-transparent rounded text-center ${currentTheme.inputText}`}
                    />
                ) : (
                    <p>{formatCurrency(costToDate)}</p>
                )}
            </td>
            
            {/* --- "Earned ($)" display column --- */}
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Budget * % Comp)"><p>{formatCurrency(earnedValue)}</p></Tooltip></td>

            {/* --- "Proj. Cost" display column --- */}
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Cost to Date / % Comp) * 100"><p>{formatCurrency(projectedCost)}</p></Tooltip></td>
            <td className="p-1 text-center w-12">
                 {accessLevel === 'taskmaster' && (
                     <button onClick={() => onDelete(groupKey, index)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                 )}
             </td>
        </tr>
    );
});


export const CollapsibleActivityTable = React.memo(({ title, data, groupKey, colorClass, onAdd, onDelete, onChange, isCollapsed, onToggle, project, currentTheme, totalProjectHours, accessLevel, groupTotals, rateType, onRateTypeChange, onDeleteGroup, onRenameGroup, isProjectWide, onToggleProjectWide }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editableTitle, setEditableTitle] = useState(title);

    useEffect(() => { setEditableTitle(title); }, [title]);

    const handleTitleSave = () => {
        setIsEditingTitle(false);
        onRenameGroup(groupKey, editableTitle);
    };

    return (
        <div className={`border-b ${currentTheme.borderColor}`}>
            {/* Header */}
            <div className={`w-full p-2 text-left font-bold flex justify-between items-center ${colorClass}`}>
                <div className="flex-grow flex items-center">
                    {/* Toggle Icon */}
                    <motion.svg onClick={onToggle}
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                        xmlns="http://www.w3.org/2000/svg" className="cursor-pointer h-5 w-5 transition-transform flex-shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>
                    {/* Editable Title */}
                    {isEditingTitle ? (
                         <input
                            type="text" value={editableTitle}
                            onChange={(e) => setEditableTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleTitleSave(); }}
                            className="bg-transparent text-white font-bold text-xs p-1 rounded-md outline-none ring-1 ring-blue-400"
                            autoFocus onClick={e => e.stopPropagation()}
                         />
                     ) : (
                         <span className="font-bold text-xs cursor-text" onClick={(e) => { e.stopPropagation(); if (accessLevel === 'taskmaster') setIsEditingTitle(true); }}>
                            {title}
                         </span>
                    )}
                    {/* --- MODIFICATION START: Changed grid-cols-9 to grid-cols-8 and removed groupTotals.used --- */}
                    <div className="flex-grow grid grid-cols-8 text-xs ml-4">
                        <span></span> {/* Spacer for Activity/Charge Code */}
                        <span className="text-center">{groupTotals.estimated.toFixed(2)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.budget)}</span>
                        <span></span> {/* Spacer for % of Proj */}
                        <span className="text-center">{groupTotals.percentComplete.toFixed(2)}%</span>
                        {/* <span className="text-center">{groupTotals.used.toFixed(2)}</span> -- REMOVED "Hrs Used" TOTAL -- */}
                        <span className="text-center">{formatCurrency(groupTotals.earnedValue)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.actualCost)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.projected)}</span> {/* Renamed to Proj. Cost logic */}
                    </div>
                    {/* --- MODIFICATION END --- */}
                </div>
                {/* Header Controls */}
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                     {accessLevel === 'taskmaster' && (
                        <TutorialHighlight tutorialKey="projectWideActivities">
                           <div className="flex items-center gap-1 text-white text-xs">
                               <input type="checkbox" checked={isProjectWide} onChange={() => onToggleProjectWide(groupKey)} onClick={(e) => e.stopPropagation()} id={`project-wide-${groupKey}`} />
                               <label htmlFor={`project-wide-${groupKey}`} className="cursor-pointer">Project-Wide</label>
                           </div>
                        </TutorialHighlight>
                     )}
                     <select value={rateType} onChange={(e) => { e.stopPropagation(); onRateTypeChange(groupKey, e.target.value); }} onClick={(e) => e.stopPropagation()} className="bg-white/20 text-white text-xs rounded p-1">
                        <option value="Detailing Rate">Detailing Rate</option>
                        <option value="VDC Rate">VDC Rate</option>
                     </select>
                     {accessLevel === 'taskmaster' && ( // Only allow delete if taskmaster
                         <button onClick={(e) => { e.stopPropagation(); onDeleteGroup(groupKey); }} className="text-white hover:text-red-300 font-bold text-lg">&times;</button>
                     )}
                </div>
            </div>
            {/* Collapsible Content */}
            <AnimatePresence>
            {!isCollapsed && (
                <motion.div
                    key={`table-${groupKey}`}
                    variants={animationVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="overflow-hidden"
                >
                    <div className="overflow-x-auto hide-scrollbar-on-hover" onClick={e => e.stopPropagation()}>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className={currentTheme.altRowBg}>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Activity Description</th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Charge Code</th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Est. Hrs</th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Budget ($)</th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>% of Project</th>
                                    <th className={`p-2 text-center font-semibold ${currentTheme.textColor}`}><Tooltip text="Calculated automatically from the Action Tracker section.">% Comp</Tooltip></th>
                                    {/* --- MODIFICATION START: Removed "Hrs Used", changed "Actual ($)" to input, changed "Proj. Hrs" to "Proj. Cost" --- */}
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Actual Cost ($)</th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Earned ($)</th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Proj. Cost ($)</th>
                                    {/* --- MODIFICATION END --- */}
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
                                        totalProjectHours={totalProjectHours}
                                        accessLevel={accessLevel}
                                        rateType={rateType}
                                    />
                                ))}
                                 {accessLevel === 'taskmaster' && ( // Only allow add if taskmaster
                                     <tr>
                                        {/* --- MODIFICATION START: Changed colSpan from 11 to 10 --- */}
                                        <td colSpan="10"><button onClick={() => onAdd(groupKey)} className="text-sm text-blue-600 hover:underline">+ Add Activity</button></td>
                                        {/* --- MODIFICATION END --- */}
                                    </tr>
                                 )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    )
});