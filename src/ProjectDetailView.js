import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
// Import necessary Firestore functions
import { doc, onSnapshot, setDoc, collection, updateDoc } from 'firebase/firestore';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialHighlight, NavigationContext } from './App';

// --- Helper Functions & Components (ConfirmationModal, Tooltip, formatCurrency) ---

const formatCurrency = (value) => {
    const numberValue = Number(value) || 0;
    return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const Tooltip = ({ text, children }) => {
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

// --- Normalization Helper ---
function normalizeDesc(str = '') {
  return String(str)
    // strip common zero‑width/invisible characters
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    // collapse all whitespace runs to a single space
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Standard Activities Definition (Based on the new CSV) ---
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
    { description: "Project Coordination Management​", chargeCode: "9630762" } // Includes zero-width space
];

// Apply normalization when creating the standard list
const standardActivitiesToAdd = standardChargeCodes.map(item => ({
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
const groupActivities = (activityArray, actionTrackerDisciplines) => {
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
const animationVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeInOut" } }
};

// --- Sub-Components (FinancialSummary, BudgetImpactLog, etc.) ---
// Full implementations included below.

const FinancialSummary = ({ project, activityTotals, currentTheme, currentBudget }) => {
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

const BudgetImpactLog = ({ impacts, onAdd, onDelete, currentTheme, project, activities }) => {

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

const FinancialForecastChart = ({ project, weeklyHours, activityTotals, currentBudget, currentTheme }) => {
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

const ProjectBreakdown = ({ mainItems, onAdd, onUpdate, onDelete, onReorder, currentTheme }) => {
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


const ActionTrackerDisciplineManager = ({ disciplines, onAdd, onDelete, currentTheme }) => {
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

const ActionTracker = ({ mainItems, activities, totalProjectHours, onUpdateActivityCompletion, onUpdatePercentage, onDeleteActivityFromActionTracker, actionTrackerData, currentTheme, actionTrackerDisciplines, tradeColorMapping, isTradePercentageEditable, isActivityCompletionEditable, collapsedSections, onToggle, activeTrades, projectWideActivities }) => {

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


const ActivityRow = React.memo(({ activity, groupKey, index, onChange, onDelete, project, currentTheme, totalProjectHours, accessLevel, rateType }) => {
    const { percentComplete = 0, hoursUsed = 0, estimatedHours = 0 } = activity;

    const rateToUse = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);

    const earnedValue = (Number(estimatedHours) * rateToUse) * (Number(percentComplete) / 100);
    const actualCost = Number(hoursUsed) * rateToUse;
    const percentOfProject = totalProjectHours > 0 ? (Number(estimatedHours) / totalProjectHours) * 100 : 0;

    // Budget calculation with rounding to nearest 5
    const rawBudget = (Number(estimatedHours) || 0) * rateToUse;
    const lineItemBudget = Math.ceil(rawBudget / 5) * 5;

    // Projected hours calculation
    const calculateProjectedHours = (act) => {
        const localHoursUsed = Number(act.hoursUsed) || 0;
        const localPercentComplete = Number(act.percentComplete) || 0;
        if (localPercentComplete <= 0) return Number(act.estimatedHours) || 0; // If 0% complete, projected is estimated
        return (localHoursUsed / localPercentComplete) * 100;
    };
    const projected = calculateProjectedHours(activity);

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
            <td className={`p-1 w-24 text-center`}>
                {accessLevel === 'taskmaster' ? (
                    <input
                        type="number"
                        value={hoursUsed}
                        onChange={(e) => onChange(groupKey, index, 'hoursUsed', e.target.value)}
                        className={`w-full p-1 bg-transparent rounded text-center ${currentTheme.inputText}`}
                    />
                ) : (
                    <p>{hoursUsed}</p>
                )}
            </td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Budget * % Comp)"><p>{formatCurrency(earnedValue)}</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="Hrs Used * Rate"><p>{formatCurrency(actualCost)}</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Hrs Used / % Comp) * 100"><p>{projected.toFixed(2)}</p></Tooltip></td>
            <td className="p-1 text-center w-12">
                 {accessLevel === 'taskmaster' && (
                     <button onClick={() => onDelete(groupKey, index)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                 )}
             </td>
        </tr>
    );
});


const CollapsibleActivityTable = React.memo(({ title, data, groupKey, colorClass, onAdd, onDelete, onChange, isCollapsed, onToggle, project, currentTheme, totalProjectHours, accessLevel, groupTotals, rateType, onRateTypeChange, onDeleteGroup, onRenameGroup, isProjectWide, onToggleProjectWide }) => {
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
                    {/* Group Totals */}
                    <div className="flex-grow grid grid-cols-9 text-xs ml-4">
                        <span></span> {/* Spacer */}
                        <span className="text-center">{groupTotals.estimated.toFixed(2)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.budget)}</span>
                        <span></span> {/* Spacer */}
                        <span className="text-center">{groupTotals.percentComplete.toFixed(2)}%</span>
                        <span className="text-center">{groupTotals.used.toFixed(2)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.earnedValue)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.actualCost)}</span>
                        <span className="text-center">{groupTotals.projected.toFixed(2)}</span> {/* Projected Hours */}
                    </div>
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
                                        totalProjectHours={totalProjectHours}
                                        accessLevel={accessLevel}
                                        rateType={rateType}
                                    />
                                ))}
                                 {accessLevel === 'taskmaster' && ( // Only allow add if taskmaster
                                     <tr>
                                        <td colSpan="11" className="p-1"><button onClick={() => onAdd(groupKey)} className="text-sm text-blue-600 hover:underline">+ Add Activity</button></td>
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
                        console.log("Detected old data structure, migrating...");
                        const migratedActivities = {};
                        const potentialKeys = ['sheetmetal', 'piping', 'plumbing', 'management', 'vdc', 'uncategorized'];
                        
                        potentialKeys.forEach(key => {
                            if (data[key] && Array.isArray(data[key])) {
                                console.log(`Migrating ${key} from top level to activities.${key}`);
                                migratedActivities[key] = data[key];
                            }
                        });
                        
                        if (Object.keys(migratedActivities).length > 0) {
                            data.activities = migratedActivities;
                            console.log("Migration complete. Activities now under 'activities' field:", data.activities);
                            
                            // Automatically save the migrated structure back to database
                            console.log("Saving migrated structure to database...");
                            setDoc(docRef, { activities: migratedActivities }, { merge: true }).then(() => {
                                console.log("Migration saved successfully");
                                showToast("Data structure updated to new format", "info");
                            }).catch(err => {
                                console.error("Error saving migration:", err);
                            });
                        }
                    }
                    
                    // MIGRATION: Auto-populate actionTrackerDisciplines from activity keys if empty
                    if (data.activities && Object.keys(data.activities).length > 0) {
                        if (!data.actionTrackerDisciplines || data.actionTrackerDisciplines.length === 0) {
                            console.log("🔧 MIGRATION: actionTrackerDisciplines is empty but activities exist. Auto-populating...");
                            
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
                            
                            console.log("🔧 Auto-populated disciplines:", newDisciplines);
                            data.actionTrackerDisciplines = newDisciplines;
                            
                            // Save to Firestore
                            setDoc(docRef, { actionTrackerDisciplines: newDisciplines }, { merge: true }).then(() => {
                                console.log("✅ actionTrackerDisciplines saved successfully");
                                showToast("Discipline tracking initialized", "success");
                            }).catch(err => {
                                console.error("❌ Error saving actionTrackerDisciplines:", err);
                            });
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
                        // Add collapsed state for project-wide if it exists
                        if(data.projectWideActivities?.length > 0) {
                             (data.projectWideActivities).forEach(tradeKey => { // Ensure iteration safety
                                 const sectionId = `project_wide_trade_${tradeKey}`;
                                 if(!(sectionId in newState)) newState[sectionId] = true;
                             })
                        }
                        return newState;
                    });
                } else {
                    // Document doesn't exist - create it automatically with standard activities
                    console.log("🔧 No projectActivities document found. Creating with standard activities...");
                    
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
                    
                    // Create activities with normalized descriptions
                    const standardActivities = standardChargeCodes.map(item => ({
                        id: `std_${item.chargeCode}_${Math.random().toString(16).slice(2)}`,
                        description: normalizeDesc(item.description),
                        chargeCode: item.chargeCode,
                        estimatedHours: 0,
                        hoursUsed: 0,
                        percentComplete: 0,
                        subsets: []
                    }));
                    
                    // Group activities by discipline
                    const groupedActivities = {
                        sheetmetal: standardActivities.filter(act => /^MH\s*/i.test(act.description)),
                        piping: standardActivities.filter(act => /^MP\s*/i.test(act.description)),
                        plumbing: standardActivities.filter(act => /^PL\s*/i.test(act.description)),
                        management: standardActivities.filter(act => 
                            ['Detailing Management', 'Project Content Development', 'Project Coordination Management'].some(
                                keyword => act.description.toLowerCase().includes(keyword.toLowerCase())
                            )
                        ),
                        vdc: standardActivities.filter(act => 
                            ['Project VDC Admin', 'Project Setup', 'Project Data Management', 'Project Closeout'].some(
                                keyword => act.description.toLowerCase().includes(keyword.toLowerCase())
                            )
                        )
                    };
                    
                    // Create default disciplines
                    const defaultDisciplines = [
                        { key: 'sheetmetal', label: 'Sheet Metal / HVAC' },
                        { key: 'piping', label: 'Mechanical Piping' },
                        { key: 'plumbing', label: 'Plumbing' },
                        { key: 'management', label: 'Management' },
                        { key: 'vdc', label: 'VDC' }
                    ];
                    
                    // Create the projectActivities document
                    const projectActivitiesData = {
                        activities: groupedActivities,
                        actionTrackerDisciplines: defaultDisciplines,
                        actionTrackerData: {},
                        budgetImpacts: [],
                        mainItems: [],
                        projectWideActivities: []
                    };
                    
                    // Save to Firestore
                    setDoc(docRef, projectActivitiesData).then(() => {
                        console.log("✅ ProjectActivities document created successfully");
                        showToast("Project initialized with standard activities", "success");
                        // Data will be loaded by the snapshot listener automatically
                    }).catch(err => {
                        console.error("❌ Error creating projectActivities document:", err);
                        showToast("Error initializing project. Please refresh and try again.", "error");
                        setProjectData(null);
                        setLoading(false);
                    });
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching project activities:", error);
                setProjectData(null);
                setLoading(false);
                showToast("Error loading project details.", "error");
            });
        };
        setupListener();
        return () => unsubscribe();
    }, [docRef, showToast]); // Re-run listener if docRef changes

    // Fetch Weekly Hours
    useEffect(() => {
        const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${projectId}/weeklyHours`);
        const unsubscribe = onSnapshot(weeklyHoursRef, (snapshot) => {
            const hoursData = {};
            snapshot.docs.forEach(doc => { if (doc.id !== '_config') hoursData[doc.id] = doc.data(); });
            setWeeklyHours(hoursData);
        }, (error) => console.error("Error fetching weekly hours:", error));
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

    // --- Charge Code Management Handlers ---
    const handleAddStandardCodes = useCallback(async () => {
        if (!projectData || !projectData.activities) {
            showToast("Project data not loaded yet.", "warning");
            setConfirmAction(null);
            return;
        }
        const currentDisciplines = projectData.actionTrackerDisciplines || allDisciplines || [];
        const existingActivities = Object.values(projectData.activities).flat();
        // Normalize existing descriptions before creating the Set
        const existingDescriptions = new Set(existingActivities.map(act => normalizeDesc(act.description)));
        // standardActivitiesToAdd already has normalized descriptions
        const activitiesToActuallyAdd = standardActivitiesToAdd.filter(stdAct => !existingDescriptions.has(stdAct.description));

        if (activitiesToActuallyAdd.length === 0) {
            showToast("All standard activities already exist.", "info");
            setConfirmAction(null);
            return;
        }
        // Ensure activities being merged also have normalized descriptions
        const mergedActivities = [...existingActivities.map(a => ({...a, description: normalizeDesc(a.description)})), ...activitiesToActuallyAdd];
        const regroupedActivities = groupActivities(mergedActivities, currentDisciplines); // groupActivities now handles normalization internally too

        // Log the structure before saving
        console.log("Regrouped Activities to save:", regroupedActivities);

        try {
            await updateDoc(docRef, { activities: regroupedActivities });
            showToast(`${activitiesToActuallyAdd.length} new standard activities added.`, 'success');
        } catch (error) {
            console.error("Error adding standard activities:", error);
            showToast('Failed to add standard activities.', 'error');
        } finally {
            setConfirmAction(null);
        }
    }, [projectData, allDisciplines, docRef, showToast]); // Dependencies updated

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
    }, [docRef, showToast]); // Dependencies updated

    // Confirmation Triggers
    const confirmAddCodes = useCallback(() => { setConfirmAction({ title: "Confirm Add Standard Activities", message: "This will add any standard activities from the charge code list that are currently missing from this project. Existing activities will remain.", action: handleAddStandardCodes }); }, [handleAddStandardCodes]);
    const confirmDeleteAll = useCallback(() => { setConfirmAction({ title: "Confirm Delete All Activities", message: "This will permanently delete ALL activities currently defined for this project. This cannot be undone.", action: handleDeleteAllActivities }); }, [handleDeleteAllActivities]);

    // --- Other Handlers (Budget, Mains, Action Tracker, Activities) - Use useCallback ---
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
        // Initialize collapsed state for the new discipline group
        setCollapsedSections(prev => ({
            ...prev,
            [`group_${newDiscipline.key}`]: true // Default collapsed
        }));
        onSelectAllTrades(projectId, disciplines); 
        showToast(`Discipline "${newDiscipline.label}" added. You can now add activities to it.`, 'success');
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
            if (!mainId) return; // Need mainId for non-project-wide
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
    const handleAddActivity = useCallback((group) => { const newAct = { id: `act_${Date.now()}`, description: "New Activity", chargeCode: "", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] }; const acts = JSON.parse(JSON.stringify(projectData?.activities || {})); if (!acts[group]) acts[group] = []; acts[group].push(newAct); handleSaveData({ activities: acts }); }, [projectData, handleSaveData]);
    const handleDeleteActivity = useCallback((group, index) => { const acts = JSON.parse(JSON.stringify(projectData?.activities || {})); if (acts[group]?.[index]) { acts[group].splice(index, 1); handleSaveData({ activities: acts }); } }, [projectData, handleSaveData]);
    const handleDeleteActivityFromActionTracker = useCallback((activityId) => { const acts = JSON.parse(JSON.stringify(projectData?.activities || {})); let removed = false; Object.keys(acts).forEach(k => { const len = acts[k].length; acts[k] = acts[k].filter(a => a.id !== activityId); if(acts[k].length < len) removed = true; }); if (removed) { handleSaveData({ activities: acts }); showToast("Activity removed.", "success"); } }, [projectData, handleSaveData, showToast]);
    const handleSetRateType = useCallback((groupKey, rateType) => { handleSaveData({ rateTypes: { ...(projectData?.rateTypes || {}), [groupKey]: rateType } }); }, [projectData, handleSaveData]);
    const handleAddActivityGroup = useCallback(async () => { 
        console.log("=== handleAddActivityGroup START ===");
        console.log("newActivityGroup:", newActivityGroup);
        console.log("projectData?.activities:", projectData?.activities);
        console.log("projectData?.actionTrackerDisciplines:", projectData?.actionTrackerDisciplines);
        console.log("allDisciplines prop:", allDisciplines);
        
        if (!newActivityGroup) {
            console.error("No activity group selected");
            showToast("Please select a discipline first.", "warning");
            return;
        }
        
        if (projectData?.activities?.[newActivityGroup]) { 
            console.warn("Group already exists:", newActivityGroup);
            showToast("This discipline section already exists.", "warning"); 
            return; 
        } 
        
        // CRITICAL FIX: Use projectData.actionTrackerDisciplines as source of truth
        const disciplinesSource = projectData?.actionTrackerDisciplines || allDisciplines || [];
        console.log("Using disciplinesSource:", disciplinesSource);
        
        // Try to find details in the source disciplines first
        let details = disciplinesSource.find(d => d.key === newActivityGroup);
        console.log("Found in disciplinesSource:", details);
        
        if (!details) {
            // Check if it's a standard discipline
            const standardDisciplines = [
                { key: 'sheetmetal', label: 'Sheet Metal / HVAC' },
                { key: 'piping', label: 'Mechanical Piping' },
                { key: 'plumbing', label: 'Plumbing' },
                { key: 'management', label: 'Management' },
                { key: 'vdc', label: 'VDC' }
            ];
            details = standardDisciplines.find(d => d.key === newActivityGroup);
            console.log("Found in standardDisciplines:", details);
        }
        
        if (!details) { 
            console.error(`No discipline details found for key: ${newActivityGroup}`);
            showToast(`Error: Could not find discipline "${newActivityGroup}".`, "error"); 
            return; 
        } 
        
        const current = projectData?.actionTrackerDisciplines || []; 
        const exists = current.some(d => d.key === newActivityGroup); 
        console.log("Discipline exists in actionTrackerDisciplines?", exists);
        
        const data = { activities: { ...(projectData?.activities || {}), [newActivityGroup]: [] } }; 
        if (!exists) {
            data.actionTrackerDisciplines = [...current, { key: details.key, label: details.label }];
            console.log("Will add to actionTrackerDisciplines:", { key: details.key, label: details.label });
        }
        
        console.log("Saving data to Firestore:", data);
        try {
            await handleSaveData(data);
            console.log("Save successful");
            setNewActivityGroup(''); 
            showToast(`Section "${details.label}" added.`, "success"); 
            
            if (!exists) {
                console.log("Calling onSelectAllTrades with:", data.actionTrackerDisciplines);
                onSelectAllTrades(projectId, data.actionTrackerDisciplines); 
            }
            console.log("=== handleAddActivityGroup END (success) ===");
        } catch (error) {
            console.error("Error in handleAddActivityGroup:", error);
            showToast("Failed to add discipline section.", "error");
            console.log("=== handleAddActivityGroup END (error) ===");
        }
    }, [newActivityGroup, projectData, allDisciplines, handleSaveData, showToast, onSelectAllTrades, projectId]);
    const handleDeleteActivityGroup = useCallback((groupKey) => { if (!window.confirm(`Delete "${groupKey}" section and all its activities? This cannot be undone.`)) return; const { [groupKey]: _, ...restActs } = projectData?.activities || {}; const { [groupKey]: __, ...restRates } = projectData?.rateTypes || {}; const newDisciplines = (projectData?.actionTrackerDisciplines || []).filter(d => d.key !== groupKey); handleSaveData({ activities: restActs, rateTypes: restRates, actionTrackerDisciplines: newDisciplines }); onTradeFilterToggle(projectId, groupKey); showToast(`Section "${groupKey}" deleted.`, 'success'); }, [projectData, handleSaveData, onTradeFilterToggle, projectId, showToast]);
    const handleRenameActivityGroup = useCallback((groupKey, newLabel) => { if (!newLabel.trim()) return; const disciplines = (projectData?.actionTrackerDisciplines || []).map(d => d.key === groupKey ? { ...d, label: newLabel.trim() } : d); handleSaveData({ actionTrackerDisciplines: disciplines }); showToast(`Renamed to "${newLabel.trim()}".`, 'success'); }, [projectData, handleSaveData, showToast]);
    const handleToggleProjectWide = useCallback((groupKey) => { const current = projectData?.projectWideActivities || []; const newWide = current.includes(groupKey) ? current.filter(k => k !== groupKey) : [...current, groupKey]; handleSaveData({ projectWideActivities: newWide }); }, [projectData, handleSaveData]);
    const handleRemoveDuplicateActivities = useCallback(() => { if (!projectData?.activities) { showToast("No activities.", "info"); return; } const flat = Object.values(projectData.activities).flat(); const map = new Map(); flat.forEach(a => { const k = normalizeDesc(a.description); if (map.has(k)) { const e = map.get(k); e.estimatedHours = (Number(e.estimatedHours)||0)+(Number(a.estimatedHours)||0); e.hoursUsed = (Number(e.hoursUsed)||0)+(Number(a.hoursUsed)||0); if(!e.chargeCode && a.chargeCode) e.chargeCode = a.chargeCode; } else map.set(k, {...a, description: k, estimatedHours: Number(a.estimatedHours)||0, hoursUsed: Number(a.hoursUsed)||0 }); }); const unique = Array.from(map.values()); const removed = flat.length - unique.length; if (removed > 0) { const regrouped = groupActivities(unique, projectData.actionTrackerDisciplines || allDisciplines); handleSaveData({ activities: regrouped }); showToast(`${removed} duplicates merged.`, "success"); } else showToast("No duplicates found.", "info"); }, [projectData, allDisciplines, handleSaveData, showToast]);


    // Calculation Memos (Dependency arrays adjusted based on ESLint feedback and necessity)
    const calculateGroupTotals = useCallback((activities, proj, rateType) => {
        return (activities || []).reduce((acc, activity) => {
            const estHours = Number(activity?.estimatedHours || 0);
            const usedHours = Number(activity?.hoursUsed || 0);
            const percentComplete = Number(activity?.percentComplete || 0);
            // proj dependency is needed here for rates
            const rateToUse = rateType === 'VDC Rate' ? (proj.vdcBlendedRate || proj.blendedRate || 0) : (proj.blendedRate || 0);
            const projectedHours = percentComplete > 0 ? (usedHours / (percentComplete / 100)) : (estHours > 0 ? estHours : 0);
            acc.estimated += estHours;
            acc.used += usedHours;
            acc.budget += estHours * rateToUse;
            acc.actualCost += usedHours * rateToUse;
            acc.earnedValue += (estHours * rateToUse) * (percentComplete / 100);
            acc.projected += projectedHours; // Sum projected hours
            return acc;
        }, { estimated: 0, used: 0, budget: 0, actualCost: 0, earnedValue: 0, projected: 0, percentComplete: 0 }); // Added default percentComplete
    }, []); // proj removed, passed as argument

    const activityTotals = useMemo(() => {
        // Calculation depends on projectData.activities, projectData.rateTypes, and project rates
        if (!projectData?.activities || !project) return { estimated: 0, used: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 };
        const allActivitiesFlat = Object.entries(projectData.activities).flatMap(([groupKey, acts]) => {
            const rateType = projectData.rateTypes?.[groupKey] || 'Detailing Rate';
            return (acts || []).map(act => ({ ...act, rateType })); // Safety check for acts
        });
        return allActivitiesFlat.reduce((acc, activity) => {
             const estHours = Number(activity?.estimatedHours || 0);
             const usedHours = Number(activity?.hoursUsed || 0);
             const percentComplete = Number(activity?.percentComplete || 0);
             const rate = activity.rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
             const projectedHours = percentComplete > 0 ? (usedHours / (percentComplete / 100)) : (estHours > 0 ? estHours : 0);

             acc.estimated += estHours;
             acc.used += usedHours;
             acc.totalActualCost += usedHours * rate;
             acc.totalEarnedValue += (estHours * rate) * (percentComplete / 100);
             acc.totalProjectedCost += projectedHours * rate;
             return acc;
        }, { estimated: 0, used: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 });
    }, [projectData?.activities, projectData?.rateTypes, project]); // Keep dependencies

    const groupTotals = useMemo(() => {
        // Depends on projectData.activities, projectData.rateTypes, project rates, and calculateGroupTotals
        if (!projectData?.activities || !project) return {};
        return Object.fromEntries(
            Object.entries(projectData.activities).map(([groupKey, acts]) => {
                const rateType = projectData.rateTypes?.[groupKey] || 'Detailing Rate';
                const totals = calculateGroupTotals(acts, project, rateType); // Pass project
                const totalBudgetForGroup = totals.budget;
                const weightedPercentComplete = (acts || []).reduce((acc, act) => { // Safety check
                    const estHours = Number(act.estimatedHours) || 0;
                    const percent = Number(act.percentComplete) || 0;
                    const rate = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate) : project.blendedRate;
                    const actBudget = estHours * rate;
                    return totalBudgetForGroup > 0 ? acc + (percent * (actBudget / totalBudgetForGroup)) : acc;
                }, 0);
                totals.percentComplete = weightedPercentComplete;
                return [groupKey, totals];
            })
        );
    }, [projectData?.activities, projectData?.rateTypes, project, calculateGroupTotals]); // Keep dependencies

    const currentBudget = useMemo(() => {
        // Only depends on project.initialBudget and projectData.budgetImpacts
        return (project?.initialBudget || 0) + (projectData?.budgetImpacts || []).reduce((sum, impact) => sum + impact.amount, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.initialBudget, projectData?.budgetImpacts]); // Keep dependencies as ESLint suggests reviewing them

    const sortedMainItems = useMemo(() => {
        // Only depends on projectData.mainItems
        return [...(projectData?.mainItems || [])].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectData?.mainItems]); // Keep dependency as ESLint suggests reviewing it

    // Map standard discipline keys to custom disciplines (bidirectional)
    const standardToCustomMapping = useMemo(() => {
        const mapping = {};
        const disciplines = allDisciplines || [];
        
        // Map standard keys to custom discipline keys
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
        
        // Add default labels for standard keys
        mapping['sheetmetal_label'] = 'Sheet Metal / HVAC';
        mapping['piping_label'] = 'Mechanical Piping';
        mapping['plumbing_label'] = 'Plumbing';
        mapping['management_label'] = 'Management';
        mapping['vdc_label'] = 'VDC';
        mapping['uncategorized_label'] = 'Uncategorized';
        
        console.log("Standard to Custom Mapping:", mapping);
        return mapping;
    }, [allDisciplines]);

    const tradeColorMapping = useMemo(() => {
        const mapping = {};
        // Map colors based on custom disciplines
        (allDisciplines || []).forEach(d => {
             if (d.label.toLowerCase().includes('pip')) mapping[d.key] = { bg: 'bg-green-500/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('duct') || d.label.toLowerCase().includes('sheet')) mapping[d.key] = { bg: 'bg-yellow-400/70', text: 'text-black' };
             else if (d.label.toLowerCase().includes('plumb')) mapping[d.key] = { bg: 'bg-blue-500/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('coord') || d.label.toLowerCase().includes('manage')) mapping[d.key] = { bg: 'bg-pink-500/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('vdc')) mapping[d.key] = { bg: 'bg-indigo-600/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('struct')) mapping[d.key] = { bg: 'bg-amber-700/70', text: 'text-white' };
             else if (d.label.toLowerCase().includes('gis')) mapping[d.key] = { bg: 'bg-teal-500/70', text: 'text-white' };
             else mapping[d.key] = { bg: 'bg-gray-500/70', text: 'text-white' }; // Default
        });
        // Also map colors for standard keys
        mapping['sheetmetal'] = { bg: 'bg-yellow-400/70', text: 'text-black' };
        mapping['piping'] = { bg: 'bg-green-500/70', text: 'text-white' };
        mapping['plumbing'] = { bg: 'bg-blue-500/70', text: 'text-white' };
        mapping['management'] = { bg: 'bg-pink-500/70', text: 'text-white' };
        mapping['vdc'] = { bg: 'bg-indigo-600/70', text: 'text-white' };
        mapping['uncategorized'] = { bg: 'bg-gray-600/70', text: 'text-white' };
        return mapping;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allDisciplines]); // Keep dependency as ESLint suggests reviewing it

    const availableDisciplinesToAdd = useMemo(() => {
        // CRITICAL FIX: Use projectData.actionTrackerDisciplines as the source of truth
        // This updates via Firestore listener when disciplines are added
        // Fall back to allDisciplines prop only if projectData hasn't loaded yet
        const disciplinesSource = projectData?.actionTrackerDisciplines || allDisciplines || [];
        
        console.log("=== availableDisciplinesToAdd Debug ===");
        console.log("projectData.actionTrackerDisciplines:", projectData?.actionTrackerDisciplines);
        console.log("allDisciplines prop:", allDisciplines);
        console.log("Using disciplinesSource:", disciplinesSource);
        console.log("Current projectData.activities keys:", Object.keys(projectData?.activities || {}));
        
        // If we have custom disciplines, filter out ones already added
        if (disciplinesSource.length > 0) {
            const available = disciplinesSource.filter(d => !projectData?.activities || !projectData.activities[d.key]);
            console.log("Available custom disciplines to add:", available);
            console.log("=== End Debug ===");
            return available;
        }
        
        // Otherwise, provide standard disciplines that haven't been added yet
        const standardDisciplines = [
            { key: 'sheetmetal', label: 'Sheet Metal / HVAC' },
            { key: 'piping', label: 'Mechanical Piping' },
            { key: 'plumbing', label: 'Plumbing' },
            { key: 'management', label: 'Management' },
            { key: 'vdc', label: 'VDC' }
        ];
        
        const available = standardDisciplines.filter(d => !projectData?.activities || !projectData.activities[d.key]);
        console.log("Available standard disciplines to add:", available);
        console.log("=== End Debug ===");
        return available;
    }, [projectData?.actionTrackerDisciplines, projectData?.activities, allDisciplines]);

    // Expanded active trades: includes both custom keys and standard keys that map to active customs
    const expandedActiveTrades = useMemo(() => {
        console.log("=== expandedActiveTrades Debug ===");
        console.log("activeTrades prop:", activeTrades);
        console.log("standardToCustomMapping:", standardToCustomMapping);
        
        const expanded = new Set(activeTrades || []);
        // For each standard key, check if its mapped custom discipline is active
        Object.entries(standardToCustomMapping).forEach(([standardKey, customKey]) => {
            if (activeTrades.includes(customKey)) {
                console.log(`Adding standard key ${standardKey} because custom key ${customKey} is active`);
                expanded.add(standardKey);
            }
        });
        
        const result = Array.from(expanded);
        console.log("Final expandedActiveTrades:", result);
        console.log("=== End expandedActiveTrades Debug ===");
        return result;
    }, [activeTrades, standardToCustomMapping]);

    const grandTotals = useMemo(() => {
        // Sum ALL activity groups that exist in projectData.activities, not just filtered ones
        console.log("Calculating grand totals for all groups");
        const allKeys = Object.keys(projectData?.activities || {});
        console.log("All activity keys for totals:", allKeys);
        
        return Object.entries(groupTotals).reduce((acc, [key, totals]) => {
            // Include all groups, not just expandedActiveTrades
            if (allKeys.includes(key)) {
                 acc.estimated += totals.estimated;
                 acc.used += totals.used;
                 acc.budget += totals.budget;
                 acc.earnedValue += totals.earnedValue;
                 acc.actualCost += totals.actualCost;
                 acc.projected += totals.projected; // Sum of projected HOURS
            }
            return acc;
        }, { estimated: 0, used: 0, budget: 0, earnedValue: 0, actualCost: 0, projected: 0 });
    }, [groupTotals, projectData?.activities]); // Updated dependencies

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
                            // Use allDisciplines if available, otherwise generate from actual activity groups
                            let disciplinesToShow = allDisciplines || [];
                            
                            if (disciplinesToShow.length === 0 && projectData?.activities) {
                                // Generate disciplines from actual activity keys
                                const activityKeys = Object.keys(projectData.activities);
                                console.log("Generating filter buttons from activity keys:", activityKeys);
                                
                                disciplinesToShow = activityKeys.map(key => ({
                                    key: key,
                                    label: standardToCustomMapping[`${key}_label`] || key
                                }));
                            }
                            
                            console.log("Disciplines to show in filters:", disciplinesToShow);
                            
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
                            // --- FIX: Robust check for available disciplines ---
                            
                            // 1. Start with allDisciplines prop
                            let disciplinesForButton = allDisciplines || [];
                            
                            // 2. If prop is empty, try to build from projectData.activities
                            if (disciplinesForButton.length === 0 && projectData?.activities) {
                                const activityKeys = Object.keys(projectData.activities);
                                disciplinesForButton = activityKeys.map(key => ({
                                    key: key,
                                    label: standardToCustomMapping[`${key}_label`] || key
                                }));
                            }
                            
                            // 3. If still no disciplines, don't render the button
                            if (disciplinesForButton.length === 0) {
                                return null;
                            }
                            
                            // 4. Now perform the check with the guaranteed list
                            const allKeys = disciplinesForButton.map(d => d.key);
                            const areAllSelected = activeTrades.length === allKeys.length && allKeys.every(key => activeTrades.includes(key));
                            // --- END FIX ---
                            
                            return (
                                <button
                                    onClick={() => onSelectAllTrades(projectId, disciplinesForButton)} // Pass the list used for the check
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
                                    {/* Financial Forecast Collapse Button & Content */}
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
                                {/* Budget Impact Log Collapse Button & Content */}
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
                                                // Use allDisciplines if available, otherwise generate from activities
                                                if ((allDisciplines || []).length > 0) {
                                                    return allDisciplines;
                                                }
                                                // Generate disciplines from activity keys
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
                                        {availableDisciplinesToAdd.length === 0 ? (
                                            <div className="text-sm text-gray-400 italic">
                                                All standard disciplines added. Add custom disciplines via Action Tracker Settings below.
                                            </div>
                                        ) : (
                                            <>
                                                <select 
                                                    value={newActivityGroup} 
                                                    onChange={(e) => {
                                                        console.log("Dropdown changed to:", e.target.value);
                                                        setNewActivityGroup(e.target.value);
                                                    }} 
                                                    className={`text-xs p-1 rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                                >
                                                    <option value="">Add Discipline Section...</option>
                                                    {(() => {
                                                        console.log("Rendering dropdown with availableDisciplinesToAdd:", availableDisciplinesToAdd);
                                                        return availableDisciplinesToAdd.map(d => {
                                                            console.log("  - Option:", d.key, d.label);
                                                            return <option key={d.key} value={d.key}>{d.label}</option>;
                                                        });
                                                    })()}
                                                </select>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        console.log("Add button clicked, newActivityGroup:", newActivityGroup);
                                                        handleAddActivityGroup();
                                                    }} 
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
                                        console.log("=== Activity Breakdown Debug ===");
                                        console.log("projectData.activities:", projectData.activities);
                                        console.log("expandedActiveTrades:", expandedActiveTrades); // This holds the keys that should be visible
                                        console.log("allDisciplines:", allDisciplines);
                                        
                                        const entries = Object.entries(projectData.activities || {});
                                        console.log("All activity group keys:", entries.map(([key]) => key));
                                        
                                        // --- FIX: Filter the entries based on expandedActiveTrades ---
                                        const filtered = entries.filter(([groupKey]) => expandedActiveTrades.includes(groupKey));
                                        console.log("Filtered activity groups to display:", filtered.map(([key]) => key));
                                        // --- END FIX ---
                                        
                                        console.log("=== End Debug ===");
                                        
                                        return filtered // Use the new 'filtered' variable here
                                            .sort(([groupA], [groupB]) => {
                                                // Get label for groupA
                                                const customLabelA = (allDisciplines || []).find(d => d.key === groupA)?.label;
                                                const labelA = customLabelA || standardToCustomMapping[`${groupA}_label`] || groupA;
                                                
                                                // Get label for groupB
                                                const customLabelB = (allDisciplines || []).find(d => d.key === groupB)?.label;
                                                const labelB = customLabelB || standardToCustomMapping[`${groupB}_label`] || groupB;
                                                
                                                return labelA.localeCompare(labelB);
                                            })
                                            .map(([groupKey, acts]) => {
                                                 // Get label - check custom disciplines first, then standard label mappings
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
                                        <div className="flex-grow grid grid-cols-10 text-xs font-bold">
                                             <span>Grand Totals</span>
                                             <span></span> {/* Charge Code */}
                                             <span className="text-center">{grandTotals.estimated.toFixed(2)}</span>
                                             <span className="text-center">{formatCurrency(grandTotals.budget)}</span>
                                             <span></span> {/* % of Proj */}
                                             <span className="text-center">--</span> {/* % Comp */}
                                             <span className="text-center">{grandTotals.used.toFixed(2)}</span>
                                             <span className="text-center">{formatCurrency(grandTotals.earnedValue)}</span>
                                             <span className="text-center">{formatCurrency(grandTotals.actualCost)}</span>
                                             <span className="text-center">{grandTotals.projected.toFixed(2)}</span>
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