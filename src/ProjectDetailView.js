import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
// Added collection and getDocs back
import { doc, onSnapshot, setDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialHighlight, NavigationContext } from './App';

// --- Helper Functions & Constants ---

const formatCurrency = (value) => {
    const numberValue = Number(value) || 0;
    return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center justify-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && (
                <div className="absolute bottom-full mb-2 w-max max-w-xs px-3 py-2 bg-gray-900 text-white text-xs rounded-md z-20 shadow-lg border border-gray-700">
                    <p className="font-mono whitespace-pre-wrap">{text}</p>
                </div>
            )}
        </div>
    );
};

const initialActivityData = [
    { id: "act_init_1", description: "MH Modeling", chargeCode: "96100-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_2", description: "MH Coordination", chargeCode: "96800-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_3", description: "MH Deliverables", chargeCode: "96810-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_4", description: "MH Spooling", chargeCode: "96210-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_5", description: "MH Misc", chargeCode: "96830-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_6", description: "MP Modeling", chargeCode: "96110-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_7", description: "MP Coordination", chargeCode: "96801-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_8", description: "MP Deliverables", chargeCode: "96811-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_9", description: "MP Spooling", chargeCode: "96211-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_10", description: "MP Misc", chargeCode: "96831-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_11", description: "PL Modeling", chargeCode: "96130-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_12", description: "PL Coordination", chargeCode: "96803-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_13", description: "PL Deliverables", chargeCode: "96813-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_14", description: "PL Spooling", chargeCode: "96213-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_15", description: "PL Misc", chargeCode: "96833-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_16", description: "Detailing-In House-Cad Mgr", chargeCode: "96505-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: "act_init_17", description: "Project Setup", chargeCode: "96301-96-ENG-62", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
];

const animationVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeInOut" } }
};

const groupActivities = (activityArray, actionTrackerDisciplines) => {
    const defaultGroups = {};
    (actionTrackerDisciplines || []).forEach(disc => {
        // Ensure keys exist even if empty
        if (!defaultGroups[disc.key]) {
            defaultGroups[disc.key] = [];
        }
    });
    // Ensure VDC exists
    if (!defaultGroups.vdc) {
        defaultGroups.vdc = [];
    }

    return activityArray.reduce((acc, act) => {
        const desc = act.description.toUpperCase();
        let found = false;
        // Find the discipline key based on the label/description prefix
        const discipline = (actionTrackerDisciplines || []).find(d => desc.startsWith(d.label.substring(0, 2).toUpperCase()));

        if (discipline) {
             if (!acc[discipline.key]) acc[discipline.key] = []; // Ensure key exists if dynamically added
            acc[discipline.key].push(act);
            found = true;
        }

        // Fallback for VDC/Misc or if not found by prefix
        if (!found) {
            if (!acc.vdc) acc.vdc = []; // Ensure vdc exists
            acc.vdc.push(act);
        }
        return acc;
    }, defaultGroups);
};


// --- Sub-Components for ProjectDetailView ---

// FinancialSummary, BudgetImpactLog, FinancialForecastChart, ProjectBreakdown, ActionTrackerDisciplineManager components remain the same
// ... (Paste those components here) ...
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
                <div>
                    <p className={`text-sm ${currentTheme.subtleText}`}>Current Budget</p>
                    <p className="text-lg font-bold">{formatCurrency(currentBudget)}</p>
                </div>
                 <div>
                    <p className={`text-sm ${currentTheme.subtleText}`}>Allocated Hrs</p>
                    <Tooltip text="Sum of all Est. Hrs in Activity Tracker"><p className="text-lg font-bold">{allocatedHours.toFixed(2)}</p></Tooltip>
                </div>
                <div>
                    <p className={`text-sm ${currentTheme.subtleText}`}>Spent to Date</p>
                    <Tooltip text="Sum of (Hrs Used * Rate) for each activity"><p className="text-lg font-bold">{formatCurrency(spentToDate)}</p></Tooltip>
                </div>
                <div>
                    <p className={`text-sm ${currentTheme.subtleText}`}>Earned Value</p>
                    <Tooltip text="Sum of (Budget * % Comp) for each activity"><p className="text-lg font-bold">{formatCurrency(earnedValue)}</p></Tooltip>
                </div>
                 <div>
                    <p className={`text-sm ${currentTheme.subtleText}`}>Cost to Complete</p>
                    <Tooltip text={"Projected Final Cost - Spent to Date"}><p className="text-lg font-bold">{formatCurrency(costToComplete)}</p></Tooltip>
                </div>
                 <div>
                    <p className={`text-sm ${currentTheme.subtleText}`}>Est. Final Cost</p>
                    <Tooltip text="Sum of (Projected Hrs * Rate)"><p className="text-lg font-bold">{formatCurrency(projectedFinalCost)}</p></Tooltip>
                </div>
                <div>
                    <p className={`text-sm ${currentTheme.subtleText}`}>Variance</p>
                    <Tooltip text="Current Budget - Est. Final Cost"><p className={`text-lg font-bold ${variance < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(variance)}</p></Tooltip>
                </div>
                 <div >
                    <p className={`text-sm ${currentTheme.subtleText}`}>Productivity</p>
                    <Tooltip text="Earned Value / Spent to Date"><p className={`text-lg font-bold ${productivity < 1 ? 'text-red-500' : 'text-green-500'}`}>{productivity.toFixed(2)}</p></Tooltip>
                </div>
            </div>
        </TutorialHighlight>
    )
};

const BudgetImpactLog = ({ impacts, onAdd, onDelete, currentTheme, project, activities }) => {

    const tradeActivityOptions = useMemo(() => {
        const options = new Set();
        if (activities) {
            Object.values(activities).flat().forEach(activity => {
                options.add(activity.description);
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
                weeklyTotalHours += weeklyHours[trade][week] || 0;
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
        if (!chartData || !svgRef.current) return;

        const { plannedSpend, startDate, endDate } = chartData;
        const { totalEarnedValue, totalActualCost, totalProjectedCost } = activityTotals;

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
        e.dataTransfer.setData('text/html', e.target);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (!draggingItem) return;

        const updatedItems = [...mainItems];
        const draggedItemIndex = updatedItems.findIndex(item => item.id === draggingItem.id);

        const [reorderedItem] = updatedItems.splice(draggedItemIndex, 1);
        updatedItems.splice(dropIndex, 0, reorderedItem);

        onReorder(updatedItems);
        setDraggingItem(null);
    };

    return (
        <>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4 hide-scrollbar-on-hover">
                {(mainItems || []).map((item, index) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-gray-500/10 rounded-md cursor-move"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
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
                            <span>{item.name}</span>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setEditingItem({...item})} className="text-blue-500 text-sm">Edit</button>
                            <button onClick={() => onDelete(item.id)} className="text-red-500 text-sm">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 border-t pt-2">
                <input
                    type="text"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="New Main Name..."
                    className={`flex-grow p-1 border rounded ${currentTheme.inputBg}`}
                />
                <button onClick={handleAdd} className={`p-1 px-3 rounded ${currentTheme.buttonBg}`}>Add</button>
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
            <div className="flex gap-2 border-t pt-2">
                <input
                    type="text"
                    value={newDisciplineName}
                    onChange={e => setNewDisciplineName(e.target.value)}
                    placeholder="New Discipline Name..."
                    className={`flex-grow p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
                <button onClick={handleAdd} className={`p-1 px-3 rounded ${currentTheme.buttonBg}`}>Add</button>
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
                            const tradeActivities = activities[trade] || [];
                             if (tradeActivities.length === 0) return null;
                            const tradeSectionId = `project_wide_trade_${trade}`;

                            return (
                                <div key={trade}>
                                    <button onClick={() => onToggle(tradeSectionId)} className={`w-full p-2 rounded-t-md ${style.bg} ${style.text} flex justify-between items-center`}>
                                        <span className="font-bold text-sm">{discipline.label}</span>
                                        <motion.svg
                                            animate={{ rotate: collapsedSections[tradeSectionId] ? 0 : 180 }}
                                            xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </motion.svg>
                                    </button>
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
                                                {tradeActivities.map(act => {
                                                    const activityCompletion = (actionTrackerData?.project_wide?.[trade] || {})[act.id] ?? '';
                                                    return (
                                                        <div key={act.id} className="grid grid-cols-[1fr,auto,auto] items-center text-sm py-1 gap-2">
                                                            <span>{act.description}</span>
                                                            <input
                                                                type="number"
                                                                value={activityCompletion}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => handleActivityCompleteChange(null, trade, act.id, e.target.value)}
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
                                                })}
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
                    <button onClick={() => onToggle(`main_${main.id}`)} className="w-full flex justify-between items-center text-left mb-2">
                        <h4 className="font-bold text-md">{main.name}</h4>
                        <motion.svg
                            animate={{ rotate: collapsedSections[`main_${main.id}`] ? 0 : 180 }}
                            xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                    </button>
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
                                {(actionTrackerDisciplines || [])
                                    .filter(disc => !projectWideActivities?.includes(disc.key) && activeTrades.includes(disc.key))
                                    .map(discipline => {
                                    const trade = discipline.key;
                                    const style = tradeColorMapping[trade] || { bg: 'bg-gray-500/70', text: 'text-white' };
                                    if(!style) return null;

                                    const tradeActivities = activities[trade] || [];
                                    if (tradeActivities.length === 0) return null;

                                    const tradeTotalHours = tradeActivities.reduce((sum, act) => sum + Number(act.estimatedHours || 0), 0);
                                    const percentageOfProject = totalProjectHours > 0 ? (tradeTotalHours / totalProjectHours) * 100 : 0;

                                    const tradeData = actionTrackerData?.[main.id]?.[trade] || {};
                                    const tradePercentage = tradeData.tradePercentage || '';
                                    const tradeSectionId = `main_${main.id}_trade_${trade}`;

                                    return (
                                        <div key={trade}>
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
                                                        xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </motion.svg>
                                                </div>
                                            </button>
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
                                                        {tradeActivities.map(act => {
                                                            const activityCompletion = (tradeData.activities || {})[act.id] ?? '';
                                                            return (
                                                                <div key={act.id} className="grid grid-cols-[1fr,auto,auto] items-center text-sm py-1 gap-2">
                                                                    <span>{act.description}</span>
                                                                    <input
                                                                        type="number"
                                                                        value={activityCompletion}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={(e) => handleActivityCompleteChange(main.id, trade, act.id, e.target.value)}
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
                                                        })}
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

    const rawBudget = (Number(estimatedHours) || 0) * rateToUse;
    const lineItemBudget = Math.ceil(rawBudget / 5) * 5;

    const calculateProjectedHours = (act) => {
        const localHoursUsed = Number(act.hoursUsed) || 0;
        const localPercentComplete = Number(act.percentComplete) || 0;
        // If % complete is 0, projected hours should be the estimated hours.
        if (localPercentComplete === 0) return Number(act.estimatedHours) || 0;
        // Avoid division by zero, although technically handled by the check above.
        if (localPercentComplete <= 0) return Number(act.estimatedHours) || 0;
        // Calculate projected hours based on current burn rate.
        return (localHoursUsed / localPercentComplete) * 100;
    };
    const projected = calculateProjectedHours(activity); // This is projected HOURS now

    return (
        <tr key={activity.id} className={currentTheme.cardBg}>
            <td className="p-1"><input type="text" value={activity.description} onChange={(e) => onChange(groupKey, index, 'description', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1"><input type="text" value={activity.chargeCode} onChange={(e) => onChange(groupKey, index, 'chargeCode', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1 w-24"><input type="text" value={estimatedHours} onChange={(e) => onChange(groupKey, index, 'estimatedHours', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="Est. Hours * Rate"><p>{formatCurrency(lineItemBudget)}</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Est. Hrs / Total Est. Hrs) * 100"><p>{percentOfProject.toFixed(2)}%</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}>
                <p>{Number(percentComplete || 0).toFixed(2)}</p>
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
            <td className="p-1 text-center w-12"><button onClick={() => onDelete(groupKey, index)} className="text-red-500 hover:text-red-700 font-bold">&times;</button></td>
        </tr>
    );
});


const CollapsibleActivityTable = React.memo(({ title, data, groupKey, colorClass, onAdd, onDelete, onChange, isCollapsed, onToggle, project, currentTheme, totalProjectHours, accessLevel, groupTotals, rateType, onRateTypeChange, onDeleteGroup, onRenameGroup, isProjectWide, onToggleProjectWide }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editableTitle, setEditableTitle] = useState(title);

    useEffect(() => {
        setEditableTitle(title);
    }, [title]);

    const handleTitleSave = () => {
        setIsEditingTitle(false);
        onRenameGroup(groupKey, editableTitle);
    };

    // Removed unused groupProjectedCost calculation
    // const groupProjectedCost = (data || []).reduce((sum, activity) => { ... }, 0);

    return (
        <div className={`border-b ${currentTheme.borderColor}`}>
            <div className={`w-full p-2 text-left font-bold flex justify-between items-center ${colorClass}`}>
                <div className="flex-grow flex items-center">
                    <motion.svg
                        onClick={onToggle}
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        xmlns="http://www.w3.org/2000/svg" className="cursor-pointer h-5 w-5 transition-transform flex-shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>

                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={editableTitle}
                            onChange={(e) => setEditableTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleTitleSave(); }}
                            className="bg-transparent text-white font-bold text-xs p-1 rounded-md outline-none ring-1 ring-blue-400"
                            autoFocus
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span className="font-bold text-xs cursor-text" onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}>
                            {title}
                        </span>
                    )}

                    <div className="flex-grow grid grid-cols-9 text-xs ml-4">
                        <span></span> {/* Spacer for Description */}
                        <span className="text-center">{groupTotals.estimated.toFixed(2)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.budget)}</span>
                        <span></span> {/* Spacer for % of Project */}
                        <span className="text-center">{groupTotals.percentComplete.toFixed(2)}%</span>
                        <span className="text-center">{groupTotals.used.toFixed(2)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.earnedValue)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.actualCost)}</span>
                        {/* Display Projected Hours calculation for the group */}
                        <span className="text-center">{groupTotals.projected.toFixed(2)}</span> {/* Correctly reflects sum of projected hours */}
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {accessLevel === 'taskmaster' && (
                        <TutorialHighlight tutorialKey="projectWideActivities">
                            <div className="flex items-center gap-1 text-white text-xs">
                                <input
                                    type="checkbox"
                                    checked={isProjectWide}
                                    onChange={() => onToggleProjectWide(groupKey)}
                                    onClick={(e) => e.stopPropagation()}
                                    id={`project-wide-${groupKey}`}
                                />
                                <label htmlFor={`project-wide-${groupKey}`} className="cursor-pointer">Project-Wide</label>
                            </div>
                        </TutorialHighlight>
                    )}
                    <select
                        value={rateType}
                        onChange={(e) => { e.stopPropagation(); onRateTypeChange(groupKey, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/20 text-white text-xs rounded p-1"
                    >
                        <option value="Detailing Rate">Detailing Rate</option>
                        <option value="VDC Rate">VDC Rate</option>
                    </select>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteGroup(groupKey); }} className="text-white hover:text-red-300 font-bold text-lg">&times;</button>
                </div>
            </div>
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
                                    <th className={`p-2 text-center font-semibold ${currentTheme.textColor}`}>
                                        <Tooltip text="Calculated automatically from the Action Tracker section.">% Comp</Tooltip>
                                    </th>
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
                                 <tr>
                                    <td colSpan="11" className="p-1"><button onClick={() => onAdd(groupKey)} className="text-sm text-blue-600 hover:underline">+ Add Activity</button></td>
                                </tr>
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
    db,
    project,
    projectId,
    accessLevel,
    currentTheme,
    appId,
    showToast,
    // --- UPDATED/NEW PROPS ---
    activeTrades, // No longer optional, expected to be an array
    allDisciplines, // Expecting the full list of disciplines for this project
    onTradeFilterToggle,
    onSelectAllTrades
}) => {
    // ... other state and context ...
    const { navigateToWorkloaderForProject } = useContext(NavigationContext);
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [collapsedSections, setCollapsedSections] = useState({
        budgetLog: true,
        financialForecast: true,
        mainsManagement: true,
        actionTrackerSettings: true,
        actionTracker: true
    });
    const [weeklyHours, setWeeklyHours] = useState({});
    const [newActivityGroup, setNewActivityGroup] = useState('');
    const docRef = useMemo(() => doc(db, `artifacts/${appId}/public/data/projectActivities`, projectId), [projectId, db, appId]);

    // --- Trade Color Mapping (remains the same) ---
    const tradeColorMapping = useMemo(() => {
        const mapping = {};
        // Use allDisciplines passed from parent for consistency
        if (allDisciplines) {
            allDisciplines.forEach(d => {
                if (d.label.toLowerCase().includes('pip')) mapping[d.key] = { bg: 'bg-green-500/70', text: 'text-white' };
                else if (d.label.toLowerCase().includes('duct') || d.label.toLowerCase().includes('sheet')) mapping[d.key] = { bg: 'bg-yellow-400/70', text: 'text-black' };
                else if (d.label.toLowerCase().includes('plumb')) mapping[d.key] = { bg: 'bg-blue-500/70', text: 'text-white' };
                else if (d.label.toLowerCase().includes('coord') || d.label.toLowerCase().includes('manage')) mapping[d.key] = { bg: 'bg-pink-500/70', text: 'text-white' };
                else if (d.label.toLowerCase().includes('vdc')) mapping[d.key] = { bg: 'bg-indigo-600/70', text: 'text-white' };
                else if (d.label.toLowerCase().includes('struct')) mapping[d.key] = { bg: 'bg-amber-700/70', text: 'text-white' };
                else if (d.label.toLowerCase().includes('gis')) mapping[d.key] = { bg: 'bg-teal-500/70', text: 'text-white' };
                else mapping[d.key] = { bg: 'bg-gray-500/70', text: 'text-white' };
            });
        }
        return mapping;
    }, [allDisciplines]);


    // --- Firestore listener useEffect (slightly modified) ---
     useEffect(() => {
        let unsubscribe = () => {};

        const setupListener = () => {
            unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProjectData(data);
                } else {
                     // If doc doesn't exist yet, clear projectData or handle appropriately
                    setProjectData(null);
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching project data:", error);
                setProjectData(null); // Ensure projectData is null on error
                setLoading(false);
            });
        };

        const checkAndCreateDocument = async () => {
            try {
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    // Create doc with initial data
                    const initialDisciplines = [
                        { key: 'piping', label: 'Piping' },
                        { key: 'sheetmetal', label: 'Duct' },
                        { key: 'plumbing', label: 'Plumbing' },
                        { key: 'coordination', label: 'Coordination' },
                        { key: 'vdc', label: 'VDC' },
                        { key: 'structural', label: 'Structural' },
                        { key: 'gis', label: 'GIS/GPS' }
                    ];
                    const initialData = {
                        activities: groupActivities(initialActivityData, initialDisciplines),
                        budgetImpacts: [],
                        mainItems: [],
                        actionTrackerData: {},
                        actionTrackerDisciplines: initialDisciplines,
                        rateTypes: {},
                        projectWideActivities: []
                    };
                    await setDoc(docRef, initialData);
                    setProjectData(initialData); // Set initial state locally too
                     // Call parent to initialize filters now that disciplines exist
                    onSelectAllTrades(projectId, initialDisciplines); // Select all initially
                } else {
                    const existingData = docSnap.data();
                    setProjectData(existingData);
                    // If projectData was loaded, ensure parent filters are initialized if needed
                    // (This might run if ProjectConsole loaded before this component fully initialized)
                    if (activeTrades === null && existingData?.actionTrackerDisciplines) {
                        onSelectAllTrades(projectId, existingData.actionTrackerDisciplines);
                    }
                }
                setupListener(); // Setup listener after ensuring doc exists/is created
            } catch (error) {
                console.error("Error checking or creating document:", error);
                setLoading(false);
            }
        };

        checkAndCreateDocument();

        return () => {
            unsubscribe();
        };
    }, [docRef, projectId, onSelectAllTrades, activeTrades]); // Added projectId, onSelectAllTrades, activeTrades dependencies

    // --- useEffect to fetch Weekly Hours --- Added dependencies
    useEffect(() => {
        const fetchWeeklyHours = async () => {
            if (!db || !appId || !projectId) return; // Guard against missing dependencies
            const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${projectId}/weeklyHours`);
            try {
                const snapshot = await getDocs(weeklyHoursRef);
                const hoursData = {};
                snapshot.docs.forEach(doc => {
                    if (doc.id !== '_config') {
                        hoursData[doc.id] = doc.data();
                    }
                });
                setWeeklyHours(hoursData); // Use the state setter
            } catch (error) {
                console.error("Error fetching weekly hours:", error);
                // Optionally set an error state or show a toast
            }
        };
        fetchWeeklyHours();
    }, [projectId, db, appId]); // Added dependencies


    // --- Other handlers (handleSaveData, handleAddImpact, etc. remain the same) ---
     const handleSaveData = async (data) => {
        await setDoc(docRef, data, { merge: true });
    };

    const handleAddActionTrackerDiscipline = (newDiscipline) => {
        const newDisciplines = [...(projectData.actionTrackerDisciplines || []), newDiscipline];
        handleSaveData({ actionTrackerDisciplines: newDisciplines });
        // Update parent state as well
        onSelectAllTrades(projectId, newDisciplines); // Assuming new discipline should be active by default
    };

    const handleDeleteActionTrackerDiscipline = (disciplineKey) => {
        const newDisciplines = (projectData.actionTrackerDisciplines || []).filter(d => d.key !== disciplineKey);
        handleSaveData({ actionTrackerDisciplines: newDisciplines });
         // Update parent state
        onTradeFilterToggle(projectId, disciplineKey); // Removed redundant allDisciplines arg
    };

    const handleRemoveDuplicateActivities = () => {
        if (!projectData || !projectData.activities) {
            showToast("No activities to process.", "info");
            return;
        }

        const allActivities = Object.values(projectData.activities).flat();
        const originalCount = allActivities.length;

        const activityMap = new Map();

        for (const activity of allActivities) {
            const key = activity.description.trim();
            if (activityMap.has(key)) {
                const existing = activityMap.get(key);
                existing.estimatedHours = (Number(existing.estimatedHours) || 0) + (Number(activity.estimatedHours) || 0);
                existing.hoursUsed = (Number(existing.hoursUsed) || 0) + (Number(activity.hoursUsed) || 0);

                if (!existing.chargeCode && activity.chargeCode) {
                    existing.chargeCode = activity.chargeCode;
                }
            } else {
                activityMap.set(key, {
                    ...activity,
                    estimatedHours: Number(activity.estimatedHours) || 0,
                    hoursUsed: Number(activity.hoursUsed) || 0,
                });
            }
        }

        const uniqueActivities = Array.from(activityMap.values());
        const newCount = uniqueActivities.length;
        const duplicatesRemovedCount = originalCount - newCount;

        if (duplicatesRemovedCount > 0) {
            const regroupedActivities = groupActivities(uniqueActivities, projectData.actionTrackerDisciplines);
            handleSaveData({ activities: regroupedActivities });
            showToast(`${duplicatesRemovedCount} duplicate activities found and merged.`, "success");
        } else {
            showToast("No duplicate activities found.", "info");
        }
    };


    const handleUpdateActivity = (group, index, field, value) => {
        const updatedActivities = JSON.parse(JSON.stringify(projectData.activities));
        updatedActivities[group][index][field] = value;
        handleSaveData({ activities: updatedActivities });
    };

    const handleAddActivity = (group) => {
        const newActivity = { id: `act_${Date.now()}`, description: "New Activity", chargeCode: "", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] };
        const updatedActivities = JSON.parse(JSON.stringify(projectData.activities));
        if (!updatedActivities[group]) {
            updatedActivities[group] = [];
        }
        updatedActivities[group].push(newActivity);
        handleSaveData({ activities: updatedActivities });
    };

    const handleDeleteActivity = (group, index) => {
        const updatedActivities = JSON.parse(JSON.stringify(projectData.activities));
        updatedActivities[group].splice(index, 1);
        handleSaveData({ activities: updatedActivities });
    };

    const handleDeleteActivityFromActionTracker = (activityId) => {
        const updatedActivities = JSON.parse(JSON.stringify(projectData.activities));
        let activityFoundAndRemoved = false;
        for (const groupKey in updatedActivities) {
            const initialLength = updatedActivities[groupKey].length;
            updatedActivities[groupKey] = updatedActivities[groupKey].filter(act => act.id !== activityId);
            if(updatedActivities[groupKey].length < initialLength) {
                activityFoundAndRemoved = true;
            }
        }

        if (activityFoundAndRemoved) {
            handleSaveData({ activities: updatedActivities });
            showToast('Activity removed from all groups.', 'success');
        }
    };

    const handleAddImpact = (impact) => {
        const newImpacts = [...(projectData.budgetImpacts || []), impact];
        handleSaveData({ budgetImpacts: newImpacts });
    };

    const handleDeleteImpact = (impactId) => {
        const newImpacts = (projectData.budgetImpacts || []).filter(i => i.id !== impactId);
        handleSaveData({ budgetImpacts: newImpacts });
    };

    const handleAddMain = (main) => {
        const newMains = [...(projectData.mainItems || []), main];
        handleSaveData({ mainItems: newMains });
    };

    const handleUpdateMain = (updatedMain) => {
        const newMains = (projectData.mainItems || []).map(m => m.id === updatedMain.id ? updatedMain : m);
        handleSaveData({ mainItems: newMains });
    };

    const handleDeleteMain = (mainId) => {
        const newMains = (projectData.mainItems || []).filter(m => m.id !== mainId);
        handleSaveData({ mainItems: newMains });
    };

    const handleReorderMains = (reorderedMains) => {
        const mainsWithOrder = reorderedMains.map((main, index) => ({ ...main, order: index }));
        handleSaveData({ mainItems: mainsWithOrder });
    };

    const handleToggleCollapse = (id) => {
        setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleUpdateActionTrackerPercentage = (mainId, trade, field, value) => {
        const updatedData = JSON.parse(JSON.stringify(projectData.actionTrackerData || {}));
        if (!updatedData[mainId]) updatedData[mainId] = {};
        if (!updatedData[mainId][trade]) updatedData[mainId][trade] = {};
        updatedData[mainId][trade][field] = value;
        handleSaveData({ actionTrackerData: updatedData });
    };

    const handleUpdateActivityCompletion = (mainId, trade, activityId, newPercentage) => {
        const isProjectWide = projectData.projectWideActivities?.includes(trade);
        const localActionData = JSON.parse(JSON.stringify(projectData.actionTrackerData || {}));
        const updatedActivities = JSON.parse(JSON.stringify(projectData.activities));
        let activityToUpdate;

        if (isProjectWide) {
            if (!localActionData.project_wide) localActionData.project_wide = {};
            if (!localActionData.project_wide[trade]) localActionData.project_wide[trade] = {};
            localActionData.project_wide[trade][activityId] = newPercentage;

            activityToUpdate = updatedActivities[trade]?.find(act => act.id === activityId);
            if (activityToUpdate) {
                activityToUpdate.percentComplete = newPercentage === '' ? 0 : Number(newPercentage);
            }

        } else { // Mains-specific logic
            if (!localActionData[mainId]) localActionData[mainId] = {};
            if (!localActionData[mainId][trade]) localActionData[mainId][trade] = {};
            if (!localActionData[mainId][trade].activities) localActionData[mainId][trade].activities = {};
            localActionData[mainId][trade].activities[activityId] = newPercentage;

            activityToUpdate = updatedActivities[trade]?.find(act => act.id === activityId);
            if (activityToUpdate) {
                let activityTotalCompletion = 0;
                (projectData.mainItems || []).forEach(main => {
                    const mainTradeData = localActionData[main.id]?.[trade];
                    if (mainTradeData) {
                        const mainTradePercent = parseFloat(mainTradeData.tradePercentage) || 0;
                        const actCompletion = parseFloat(mainTradeData.activities?.[activityId]) || 0;
                        activityTotalCompletion += (actCompletion / 100) * (mainTradePercent / 100);
                    }
                });
                activityToUpdate.percentComplete = activityTotalCompletion * 100;
            }
        }

        const dataToSave = { actionTrackerData: localActionData };
        if (activityToUpdate) {
            dataToSave.activities = updatedActivities;
        }
        handleSaveData(dataToSave);
    };

    const handleSetRateType = (groupKey, rateType) => {
        const newRateTypes = { ...(projectData.rateTypes || {}), [groupKey]: rateType };
        handleSaveData({ rateTypes: newRateTypes });
    };

    // --- UPDATED: handleAddActivityGroup ---
    const handleAddActivityGroup = () => {
        if (!newActivityGroup || !projectData || projectData.activities?.[newActivityGroup]) {
            console.warn("Invalid selection or group already exists:", newActivityGroup);
            return;
        }

        const disciplineToAddDetails = allDisciplines.find(d => d.key === newActivityGroup);
        if (!disciplineToAddDetails) {
            console.error("Could not find discipline details for key:", newActivityGroup);
             showToast(`Error finding details for ${newActivityGroup}.`, "error");
            return;
        }

        const currentDisciplines = projectData.actionTrackerDisciplines || [];
        // Check if the discipline already exists in the array
        const disciplineExists = currentDisciplines.some(d => d.key === newActivityGroup);

        const updatedDisciplines = disciplineExists
            ? currentDisciplines // No change if it exists
            : [...currentDisciplines, { key: disciplineToAddDetails.key, label: disciplineToAddDetails.label }]; // Add if it doesn't exist

        // Prepare data to save, always include activities, include disciplines if they changed
        const dataToSave = {
            activities: {
                ...(projectData.activities || {}), // Keep existing activities
                [newActivityGroup]: [] // Add the new empty array for the group
            }
        };
        if (!disciplineExists) {
            dataToSave.actionTrackerDisciplines = updatedDisciplines;
        }


        handleSaveData(dataToSave);
        setNewActivityGroup('');
        showToast(`Activity section "${disciplineToAddDetails?.label || newActivityGroup}" added.`, "success");

        // Optionally, update parent filter state immediately if needed,
        // though the listener *should* update it eventually.
        // If immediate update is required:
        // onTradeFilterToggle(projectId, newActivityGroup); // Toggle it on? Or just ensure it's included?
        // Maybe better to rely on Firestore listener update for simplicity.
    };
    // --- END UPDATE ---

    const handleDeleteActivityGroup = (groupKey) => {
        if (!window.confirm(`Are you sure you want to delete the "${groupKey}" activity section and all its tasks? This cannot be undone.`)) return;

        const { [groupKey]: _, ...restActivities } = projectData.activities;
        const { [groupKey]: __, ...restRateTypes } = projectData.rateTypes || {};

        const newDisciplines = (projectData.actionTrackerDisciplines || []).filter(d => d.key !== groupKey);

        handleSaveData({
            activities: restActivities,
            rateTypes: restRateTypes,
            actionTrackerDisciplines: newDisciplines
        });

        // Update parent filters
        onTradeFilterToggle(projectId, groupKey); // Removed redundant allDisciplines arg

        showToast(`Activity section "${groupKey}" deleted.`, 'success');
    };

    const handleRenameActivityGroup = (groupKey, newLabel) => {
        if (!newLabel.trim()) return;

        const newDisciplines = projectData.actionTrackerDisciplines.map(disc => {
            if (disc.key === groupKey) {
                return { ...disc, label: newLabel.trim() };
            }
            return disc;
        });

        handleSaveData({ actionTrackerDisciplines: newDisciplines });
        showToast(`Renamed section to "${newLabel.trim()}".`, 'success');
    };

    const handleToggleProjectWide = (groupKey) => {
        const currentProjectWide = projectData.projectWideActivities || [];
        const isCurrentlyProjectWide = currentProjectWide.includes(groupKey);
        const newProjectWideActivities = isCurrentlyProjectWide
            ? currentProjectWide.filter(key => key !== groupKey)
            : [...currentProjectWide, groupKey];

        handleSaveData({ projectWideActivities: newProjectWideActivities });
    };


    // --- Calculation memos (activityTotals, groupTotals, currentBudget, sortedMainItems) remain the same ---
    const calculateGroupTotals = useCallback((activities, project, groupKey, rateType) => {
        return activities.reduce((acc, activity) => {
            const estHours = Number(activity?.estimatedHours || 0);
            const usedHours = Number(activity?.hoursUsed || 0);
            const percentComplete = Number(activity?.percentComplete || 0);

            const rateToUse = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);

             // Correct calculation for projected hours
            const projectedHours = percentComplete > 0 ? (usedHours / (percentComplete / 100)) : (estHours > 0 ? estHours : 0);

            acc.estimated += estHours;
            acc.used += usedHours;
            acc.budget += estHours * rateToUse;
            acc.actualCost += usedHours * rateToUse;
            acc.earnedValue += (estHours * rateToUse) * (percentComplete / 100);
            acc.projected += projectedHours; // Sum projected hours directly

            return acc;
        }, { estimated: 0, used: 0, budget: 0, actualCost: 0, earnedValue: 0, projected: 0, percentComplete: 0 });
    }, []); // Removed project from dependencies as it's passed directly now

    const activityTotals = useMemo(() => {
        if (!projectData?.activities) return { estimated: 0, used: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 };

        const allActivities = Object.entries(projectData.activities).flatMap(([groupKey, acts]) => {
            const rateType = projectData.rateTypes?.[groupKey] || 'Detailing Rate';
            return acts.map(act => ({ ...act, rateType, groupKey }));
        });

        const totals = allActivities.reduce((acc, activity) => {
            const estHours = Number(activity?.estimatedHours || 0);
            const usedHours = Number(activity?.hoursUsed || 0);
            const percentComplete = Number(activity?.percentComplete || 0);

            const rateToUse = activity.rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
            const projectedHours = percentComplete > 0 ? (usedHours / (percentComplete / 100)) : (estHours > 0 ? estHours : 0);


            acc.estimated += estHours;
            acc.used += usedHours;
            acc.totalActualCost += usedHours * rateToUse;
            acc.totalEarnedValue += (estHours * rateToUse) * (percentComplete / 100);
            acc.totalProjectedCost += projectedHours * rateToUse; // Calculate total projected cost

            return acc;
        }, { estimated: 0, used: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 });

        return totals;

    }, [projectData?.activities, projectData?.rateTypes, project]);

    const groupTotals = useMemo(() => {
        if (!projectData?.activities) return {};

        const allTotals = {};
        for(const group in projectData.activities) {
            const activities = projectData.activities[group];
            const rateType = projectData.rateTypes?.[group] || 'Detailing Rate';
            const totals = calculateGroupTotals(activities, project, group, rateType);

            const totalBudgetForGroup = activities.reduce((sum, act) => {
                const estHours = Number(act.estimatedHours) || 0;
                const rateToUse = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate) : project.blendedRate;
                return sum + (estHours * rateToUse);
            }, 0);

            const weightedPercentComplete = activities.reduce((acc, act) => {
                const estHours = Number(act.estimatedHours) || 0;
                const percent = Number(act.percentComplete) || 0;
                const rateToUse = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate) : project.blendedRate;
                const actBudget = estHours * rateToUse;
                if (totalBudgetForGroup > 0) {
                    return acc + (percent * (actBudget / totalBudgetForGroup));
                }
                return acc;
            }, 0);

            totals.percentComplete = weightedPercentComplete;
            allTotals[group] = totals;
        }
        return allTotals;
    }, [projectData?.activities, projectData?.rateTypes, project, calculateGroupTotals]);


    const currentBudget = useMemo(() => {
        const initial = project.initialBudget || 0;
        const impactsTotal = (projectData?.budgetImpacts || []).reduce((sum, impact) => sum + impact.amount, 0);
        return initial + impactsTotal;
    }, [project.initialBudget, projectData?.budgetImpacts]);

    const sortedMainItems = useMemo(() => {
        return [...(projectData?.mainItems || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [projectData?.mainItems]);

    // --- Render logic ---
    if (loading) return <div className="p-4 text-center">Loading Project Details...</div>; // Keep loading state
    if (!projectData) return <div className="p-4 text-center text-red-500">Error loading project activity data. It might not exist yet.</div>; // Handle null projectData


    const grandTotals = Object.entries(groupTotals).reduce((acc, [key, totals]) => {
        // --- Use the activeTrades derived from props ---
        if (activeTrades.includes(key)) {
            acc.estimated += totals.estimated;
            acc.used += totals.used;
            acc.budget += totals.budget;
            acc.earnedValue += totals.earnedValue;
            acc.actualCost += totals.actualCost;
            acc.projected += totals.projected; // Sum of projected HOURS
        }
        return acc;
    }, { estimated: 0, used: 0, budget: 0, earnedValue: 0, actualCost: 0, projected: 0 });

     // Removed unused grandProjectedCost calculation
    // const grandProjectedCost = Object.entries(groupTotals).reduce((acc, [key, totals]) => { ... }, 0);


    const availableDisciplinesToAdd = (allDisciplines || []).filter(
        d => !projectData.activities || !projectData.activities[d.key]
    );

    return (
        <div className="space-y-6 mt-4 border-t pt-4">
            <TutorialHighlight tutorialKey="tradeFiltersProjectConsole">
                <div className={`p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4`}>
                    <h4 className="text-sm font-semibold mb-2 text-center">Activity & Action Tracker Filters</h4>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* Use allDisciplines from props */}
                        {(allDisciplines || []).map(d => (
                            <button
                                key={d.key}
                                // --- Use the passed-in handler ---
                                onClick={() => onTradeFilterToggle(projectId, d.key)} // Removed redundant allDisciplines arg
                                // --- Use the activeTrades derived from props ---
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTrades.includes(d.key) ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                            >
                                {d.label}
                            </button>
                        ))}
                        <button
                            // --- Use the passed-in handler ---
                            onClick={() => onSelectAllTrades(projectId)} // Removed redundant allDisciplines arg
                             // --- Determine button text based on derived activeTrades ---
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                allDisciplines.length > 0 && activeTrades.length === allDisciplines.length
                                    ? 'bg-green-600 text-white'
                                    : `${currentTheme.buttonBg} ${currentTheme.buttonText}`
                            }`}
                        >
                             {allDisciplines.length > 0 && activeTrades.length === allDisciplines.length
                                ? 'Deselect All'
                                : 'Select All'
                            }
                        </button>
                    </div>
                </div>
            </TutorialHighlight>

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
                                        <motion.svg
                                            animate={{ rotate: collapsedSections.financialForecast ? 0 : 180 }}
                                            xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </motion.svg>
                                    </button>
                                    <AnimatePresence>
                                    {!collapsedSections.financialForecast && (
                                        <motion.div
                                            key="financial-forecast-content"
                                            variants={animationVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-2 mt-2 border-t border-gray-500/20">
                                                <FinancialForecastChart project={project} weeklyHours={weeklyHours} activityTotals={activityTotals} currentBudget={currentBudget} currentTheme={currentTheme} />
                                            </div>
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
                                    <motion.svg
                                        animate={{ rotate: collapsedSections.budgetLog ? 0 : 180 }}
                                        xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </motion.svg>
                                </button>
                                <AnimatePresence>
                                {!collapsedSections.budgetLog && (
                                    <motion.div
                                        key="budget-log-content"
                                        variants={animationVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-2 mt-2 border-t border-gray-500/20">
                                            <BudgetImpactLog
                                                impacts={projectData?.budgetImpacts || []}
                                                onAdd={handleAddImpact}
                                                onDelete={handleDeleteImpact}
                                                currentTheme={currentTheme}
                                                project={project}
                                                activities={projectData.activities}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        </TutorialHighlight>
                    </div>
                </>
            )}

             {(project.dashboardUrl || accessLevel === 'taskmaster' || accessLevel === 'tcl') && (
                <TutorialHighlight tutorialKey="projectDashboardLink">
                    <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm text-center`}>
                        <h3 className="text-lg font-semibold mb-2">Project Links</h3>
                        <div className="flex justify-center items-center gap-4">
                            {project.dashboardUrl && (
                                <a
                                    href={project.dashboardUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Go to External Dashboard
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            )}
                            {(accessLevel === 'taskmaster' || accessLevel === 'tcl') && (
                                <button
                                    onClick={(e) => navigateToWorkloaderForProject(project.id)} // Use context function
                                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                                >
                                    Project Workloader
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </TutorialHighlight>
            )}

            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 flex flex-col gap-6">
                    {accessLevel === 'taskmaster' && (
                        <TutorialHighlight tutorialKey="mainsManagement">
                            <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                                <button onClick={() => handleToggleCollapse('mainsManagement')} className="w-full text-left font-bold flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold">Mains Management</h3>
                                    <motion.svg
                                        animate={{ rotate: collapsedSections['mainsManagement'] ? 0 : 180 }}
                                        xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </motion.svg>
                                </button>
                                <AnimatePresence>
                                {!collapsedSections['mainsManagement'] && (
                                    <motion.div
                                        key="mains-management-content"
                                        variants={animationVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="overflow-hidden"
                                    >
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

                    {projectData?.mainItems && projectData.mainItems.length > 0 && (
                        <TutorialHighlight tutorialKey={accessLevel === 'tcl' ? 'actionTracker-tcl' : 'actionTracker-taskmaster'}>
                         <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                            <div className="w-full flex justify-between items-center mb-2">
                                <button onClick={() => handleToggleCollapse('actionTracker')} className="flex items-center text-left font-bold">
                                    <h3 className="text-lg font-semibold">Action Tracker</h3>
                                    <motion.svg
                                        animate={{ rotate: collapsedSections.actionTracker ? 0 : 180 }}
                                        xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </motion.svg>
                                </button>
                                {!collapsedSections.actionTracker && (
                                     <div className="flex items-center gap-2">
                                        {accessLevel === 'taskmaster' && (
                                            <button onClick={() => handleToggleCollapse('actionTrackerSettings')} className={`text-xs px-2 py-1 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>
                                                Settings
                                            </button>
                                        )}
                                        {/* Removed Toggle All button as individual sections are sufficient */}
                                    </div>
                                )}
                            </div>
                            <AnimatePresence>
                            {!collapsedSections.actionTracker && (
                                <motion.div
                                    key="action-tracker-content"
                                    variants={animationVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="overflow-hidden"
                                >
                                    {accessLevel === 'taskmaster' && (
                                        <AnimatePresence>
                                        {!collapsedSections['actionTrackerSettings'] && (
                                            <motion.div
                                                key="action-tracker-settings-content"
                                                variants={animationVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                className="overflow-hidden mb-4"
                                            >
                                                <div className="pt-2 mt-2 border-t border-gray-500/20 space-y-4 p-3 bg-black/10 rounded-md">
                                                    <div>
                                                        <h4 className="font-semibold text-md mb-2">Disciplines</h4>
                                                        <ActionTrackerDisciplineManager
                                                            disciplines={allDisciplines} // Use prop
                                                            onAdd={handleAddActionTrackerDiscipline}
                                                            onDelete={handleDeleteActionTrackerDiscipline}
                                                            currentTheme={currentTheme}
                                                        />
                                                    </div>
                                                    <div className="pt-4 border-t border-gray-700/50">
                                                        <h4 className="font-semibold text-md mb-2">Data Cleanup</h4>
                                                        <button onClick={handleRemoveDuplicateActivities} className={`w-full text-sm px-2 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700`}>
                                                            Remove Duplicate Activities
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    )}

                                    <div className="pt-2 mt-2 border-t border-gray-500/20">
                                        <ActionTracker
                                            mainItems={sortedMainItems}
                                            activities={projectData.activities}
                                            totalProjectHours={activityTotals.estimated}
                                            onUpdatePercentage={handleUpdateActionTrackerPercentage}
                                            onUpdateActivityCompletion={handleUpdateActivityCompletion}
                                            onDeleteActivityFromActionTracker={handleDeleteActivityFromActionTracker}
                                            actionTrackerData={projectData.actionTrackerData || {}}
                                            currentTheme={currentTheme}
                                            actionTrackerDisciplines={allDisciplines} // Use prop
                                            tradeColorMapping={tradeColorMapping}
                                            isTradePercentageEditable={accessLevel === 'taskmaster'}
                                            isActivityCompletionEditable={accessLevel === 'tcl'}
                                            collapsedSections={collapsedSections}
                                            onToggle={handleToggleCollapse}
                                            activeTrades={activeTrades} // Use prop
                                            projectWideActivities={projectData.projectWideActivities}
                                        />
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                        </TutorialHighlight>
                    )}
                </div>

                {accessLevel === 'taskmaster' && (
                    <div className="w-full md:w-2/3">
                        <TutorialHighlight tutorialKey="activityBreakdown">
                        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Activity Values Breakdown</h3>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={newActivityGroup}
                                        onChange={(e) => setNewActivityGroup(e.target.value)}
                                        className={`text-xs p-1 rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    >
                                        <option value="">Add Discipline Section...</option>
                                        {availableDisciplinesToAdd.map(d => (
                                            <option key={d.key} value={d.key}>{d.label}</option>
                                        ))}
                                    </select>
                                    <button onClick={handleAddActivityGroup} className={`text-xs px-2 py-1 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>Add</button>
                                    {/* Removed Toggle All button */}
                                </div>
                            </div>

                            <div className="space-y-1">
                                {Object.entries(projectData.activities || {})
                                    .filter(([group]) => activeTrades.includes(group)) // Use prop for filtering
                                    .sort(([groupA], [groupB]) => {
                                        const groupLabelA = (allDisciplines || []).find(d => d.key === groupA)?.label || groupA;
                                        const groupLabelB = (allDisciplines || []).find(d => d.key === groupB)?.label || groupB;
                                        return groupLabelA.localeCompare(groupLabelB);
                                    })
                                    .map(([group, acts]) => {
                                    const groupKey = `group_${group}`;
                                    const colorInfo = tradeColorMapping[group];
                                    const colorClass = colorInfo ? `${colorInfo.bg} ${colorInfo.text}` : 'bg-gray-500/70 text-white';
                                    const rateType = projectData.rateTypes?.[group] || 'Detailing Rate';
                                    const groupLabel = (allDisciplines || []).find(d => d.key === group)?.label || group;

                                    return (
                                        <CollapsibleActivityTable
                                            key={groupKey}
                                            title={groupLabel}
                                            data={acts}
                                            groupKey={group}
                                            colorClass={colorClass}
                                            onAdd={handleAddActivity}
                                            onDelete={handleDeleteActivity}
                                            onChange={handleUpdateActivity}
                                            isCollapsed={!!collapsedSections[groupKey]}
                                            onToggle={() => handleToggleCollapse(groupKey)}
                                            project={project}
                                            currentTheme={currentTheme}
                                            totalProjectHours={activityTotals.estimated}
                                            accessLevel={accessLevel}
                                            groupTotals={groupTotals[group] || { estimated: 0, used: 0, budget: 0, actualCost: 0, earnedValue: 0, projected: 0, percentComplete: 0 }} // Added default empty totals
                                            rateType={rateType}
                                            onRateTypeChange={handleSetRateType}
                                            onDeleteGroup={handleDeleteActivityGroup}
                                            onRenameGroup={handleRenameActivityGroup}
                                            isProjectWide={(projectData.projectWideActivities || []).includes(group)}
                                            onToggleProjectWide={handleToggleProjectWide}
                                        />
                                    );
                                })}
                            </div>
                            {/* Grand Totals Section */}
                            <TutorialHighlight tutorialKey="activityGrandTotals">
                                <div className={`w-full p-2 text-left font-bold flex justify-between items-center mt-2 ${currentTheme.altRowBg}`}>
                                    <div className="flex-grow grid grid-cols-10 text-xs font-bold">
                                        <span>Visible Totals</span>
                                        <span></span> {/* Spacer for Charge Code */}
                                        <span className="text-center">{grandTotals.estimated.toFixed(2)}</span>
                                        <span className="text-center">{formatCurrency(grandTotals.budget)}</span>
                                        <span></span> {/* Spacer for % of Project */}
                                        <span className="text-center">--</span> {/* Spacer for % Comp */}
                                        <span className="text-center">{grandTotals.used.toFixed(2)}</span>
                                        <span className="text-center">{formatCurrency(grandTotals.earnedValue)}</span>
                                        <span className="text-center">{formatCurrency(grandTotals.actualCost)}</span>
                                        <span className="text-center">{grandTotals.projected.toFixed(2)}</span> {/* Display projected HOURS */}
                                    </div>
                                    {/* Optionally, display grandProjectedCost separately if needed */}
                                    {/* <div className="text-xs font-bold ml-4">Proj. Cost: {formatCurrency(grandProjectedCost)}</div> */}
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

