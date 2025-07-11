import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot, setDoc, collection, getDocs } from 'firebase/firestore';
import * as d3 from 'd3';

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
    { id: `act_${Date.now()}_1`, description: "SM Modeling", chargeCode: "96100-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_2`, description: "SM Coordination", chargeCode: "96800-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_3`, description: "SM Deliverables", chargeCode: "96810-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_4`, description: "SM Spooling", chargeCode: "96210-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_5`, description: "SM Misc", chargeCode: "96830-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_6`, description: "PF Modeling", chargeCode: "96110-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_7`, description: "PF Coordination", chargeCode: "96801-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_8`, description: "PF Deliverables", chargeCode: "96811-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_9`, description: "PF Spooling", chargeCode: "96211-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_10`, description: "PF Misc", chargeCode: "96831-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_11`, description: "PL Modeling", chargeCode: "96130-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_12`, description: "PL Coordination", chargeCode: "96803-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_13`, description: "PL Deliverables", chargeCode: "96813-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_14`, description: "PL Spooling", chargeCode: "96213-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_15`, description: "PL Misc", chargeCode: "96833-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_16`, description: "Detailing-In House-Cad Mgr", chargeCode: "96505-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
    { id: `act_${Date.now()}_17`, description: "Project Setup", chargeCode: "96301-96-ENG-62", estimatedHours: 0, hoursUsed: 0, percentComplete: 0, subsets: [] },
];

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
    )
}

const BudgetImpactLog = ({ impacts, onAdd, onDelete, currentTheme, project }) => {
    const tradeOptions = ["Piping", "Duct", "Plumbing", "Coordination", "BIM", "Structural", "GIS/GPS"];
    const [newImpact, setNewImpact] = useState({ date: new Date().toISOString().split('T')[0], description: '', trade: tradeOptions[0], hours: 0, rateType: 'Blend Rate' });

    const blendedRate = project.blendedRate || 0;
    const bimBlendedRate = project.bimBlendedRate || 0;
    const rateToUse = newImpact.rateType === 'BIM Blend Rate' ? bimBlendedRate : blendedRate;
    const calculatedAmount = (Number(newImpact.hours) || 0) * rateToUse;

    const handleAdd = () => {
        if (newImpact.description && newImpact.hours > 0 && newImpact.trade) {
            onAdd({ 
                ...newImpact, 
                id: `impact_${Date.now()}`,
                amount: calculatedAmount 
            });
            setNewImpact({ date: new Date().toISOString().split('T')[0], description: '', trade: tradeOptions[0], hours: 0, rateType: 'Blend Rate' });
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
                        <th className="p-2 text-left font-semibold w-[15%]">Trade</th>
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
                            <td className="p-2">{impact.trade}</td>
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
                            <select value={newImpact.trade} onChange={e => handleInputChange('trade', e.target.value)} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                {tradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </td>
                        <td className="p-1"><input type="number" placeholder="Hours" value={newImpact.hours} onChange={e => handleInputChange('hours', e.target.value)} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} /></td>
                        <td className="p-1">
                             <select value={newImpact.rateType} onChange={e => handleInputChange('rateType', e.target.value)} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="Blend Rate">Blend Rate</option>
                                <option value="BIM Blend Rate">BIM Blend Rate</option>
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
        const y = d3.scaleLinear().domain([0, yMax * 1.1]).range([height, 0]);

        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));
        g.append('g').call(d3.axisLeft(y).tickFormat(d3.format("$,.0f")));

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
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
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

const ActionTracker = ({ mainItems, activities, totalProjectHours, onUpdatePercentage, onUpdateActivityCompletion, actionTrackerData, currentTheme, tradeColorMapping, isTradePercentageEditable, isActivityCompletionEditable, collapsedSections, onToggle, activeTrades }) => {

    const handlePercentageChange = (mainId, trade, value) => {
        onUpdatePercentage(mainId, trade, 'tradePercentage', value);
    };

    const handleActivityCompleteChange = (mainId, trade, activityId, value) => {
        const numericValue = value === '' ? '' : Number(value);
        if (numericValue > 100) return;
        onUpdateActivityCompletion(mainId, trade, activityId, numericValue);
    };
    
    return (
        <div className="space-y-4">
            {(mainItems || []).map(main => (
                <div key={main.id} className="p-3 rounded-md bg-black/20">
                    <button onClick={() => onToggle(`main_${main.id}`)} className="w-full flex justify-between items-center text-left mb-2">
                        <h4 className="font-bold text-md">{main.name}</h4>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${collapsedSections[`main_${main.id}`] ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {!collapsedSections[`main_${main.id}`] && (
                        <div className="space-y-3">
                            {Object.entries(tradeColorMapping)
                                .filter(([trade]) => activeTrades.includes(trade))
                                .map(([trade, style]) => {
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
                                            <span className="font-bold text-sm">{trade.charAt(0).toUpperCase() + trade.slice(1)}</span>
                                            <div className="flex items-center gap-2">
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
                                                </div>
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${collapsedSections[tradeSectionId] ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </button>
                                        {!collapsedSections[tradeSectionId] && (
                                            <div className="p-2 rounded-b-md bg-gray-500/10">
                                                <div className="grid grid-cols-2 font-semibold text-xs mb-1">
                                                    <span>Activity Description</span>
                                                    <span className="text-right">% Complete</span>
                                                </div>
                                                {tradeActivities.map(act => {
                                                    const activityCompletion = (tradeData.activities || {})[act.id] ?? '';
                                                    return (
                                                        <div key={act.id} className="grid grid-cols-2 items-center text-sm py-1">
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
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


const ActivityRow = React.memo(({ activity, groupKey, index, onChange, onDelete, project, currentTheme, totalProjectHours, accessLevel }) => {
    const { percentComplete = 0, hoursUsed = 0, estimatedHours = 0 } = activity;

    const useBimRate = groupKey === 'bim' || activity.description === "Project Setup";
    const rateToUse = useBimRate ? (project.bimBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);

    const earnedValue = (Number(estimatedHours) * rateToUse) * (Number(percentComplete) / 100);
    const actualCost = Number(hoursUsed) * rateToUse;
    const percentOfProject = totalProjectHours > 0 ? (Number(estimatedHours) / totalProjectHours) * 100 : 0;
    
    const rawBudget = (Number(estimatedHours) || 0) * rateToUse;
    const lineItemBudget = Math.ceil(rawBudget / 5) * 5;

    const calculateProjectedHours = (act) => {
        const localHoursUsed = Number(act.hoursUsed) || 0;
        const localPercentComplete = Number(act.percentComplete) || 0;
        if (!localPercentComplete || localPercentComplete === 0) return Number(act.estimatedHours) || 0;
        return (localHoursUsed / localPercentComplete) * 100;
    };
    const projected = calculateProjectedHours(activity);
    
    return (
        <tr key={activity.id} className={currentTheme.cardBg}>
            <td className="p-1"><input type="text" value={activity.description} onChange={(e) => onChange(groupKey, index, 'description', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1"><input type="text" value={activity.chargeCode} onChange={(e) => onChange(groupKey, index, 'chargeCode', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1 w-24"><input type="text" value={activity.estimatedHours} onChange={(e) => onChange(groupKey, index, 'estimatedHours', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
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


const CollapsibleActivityTable = React.memo(({ title, data, groupKey, colorClass, onAdd, onDelete, onChange, isCollapsed, onToggle, project, currentTheme, totalProjectHours, accessLevel, groupTotals }) => {
    return (
        <div className={`border-b ${currentTheme.borderColor}`}>
            <button
                onClick={onToggle}
                className={`w-full p-2 text-left font-bold flex justify-between items-center ${colorClass}`}
            >
                <div className="flex-grow grid grid-cols-11 text-xs">
                    <span>{title}</span>
                    <span></span>
                    <span className="text-center">{groupTotals.estimated.toFixed(2)}</span>
                    <span className="text-center">{formatCurrency(groupTotals.budget)}</span>
                    <span></span>
                    <span className="text-center">{groupTotals.percentComplete.toFixed(2)}%</span>
                    <span className="text-center">{groupTotals.used.toFixed(2)}</span>
                    <span className="text-center">{formatCurrency(groupTotals.earnedValue)}</span>
                    <span className="text-center">{formatCurrency(groupTotals.actualCost)}</span>
                    <span className="text-center">{groupTotals.projected.toFixed(2)}</span>
                    <span></span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {!isCollapsed && (
                <div className="overflow-x-auto" onClick={e => e.stopPropagation()}>
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
                                />
                            ))}
                             <tr>
                                <td colSpan="11" className="p-1"><button onClick={() => onAdd(groupKey)} className="text-sm text-blue-600 hover:underline">+ Add Activity</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
});


const ProjectDetailView = ({ db, project, projectId, accessLevel, currentTheme, appId, showToast }) => {
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [collapsedSections, setCollapsedSections] = useState({ budgetLog: true, financialForecast: true });
    const [weeklyHours, setWeeklyHours] = useState({});
    
    const tradeButtonLabels = useMemo(() => ["Piping", "Duct", "Plumbing", "Coordination", "BIM", "Structural", "GIS/GPS"], []);
    
    const tradeKeyMapping = useMemo(() => ({
        Piping: 'piping',
        Duct: 'sheetmetal',
        Plumbing: 'plumbing',
        Coordination: 'coordination',
        BIM: 'bim',
        Structural: 'structural',
        'GIS/GPS': 'gis',
    }), []);

    const [activeTrades, setActiveTrades] = useState(tradeButtonLabels);
    const activeTradeKeys = useMemo(() => activeTrades.map(label => tradeKeyMapping[label]), [activeTrades, tradeKeyMapping]);

    const docRef = useMemo(() => doc(db, `artifacts/${appId}/public/data/projectActivities`, projectId), [projectId, db, appId]);
    
    const tradeColorMapping = useMemo(() => ({
        piping: { bg: 'bg-green-500/70', text: 'text-white' },
        sheetmetal: { bg: 'bg-yellow-400/70', text: 'text-black' },
        plumbing: { bg: 'bg-blue-500/70', text: 'text-white' },
        coordination: { bg: 'bg-pink-500/70', text: 'text-white' },
        bim: { bg: 'bg-indigo-600/70', text: 'text-white' },
        structural: { bg: 'bg-amber-700/70', text: 'text-white' },
        gis: { bg: 'bg-teal-500/70', text: 'text-white' },
    }), []);

    const handleTradeFilterToggle = (tradeToToggle) => {
        setActiveTrades(prev => {
            const newTrades = new Set(prev);
            if (newTrades.has(tradeToToggle)) {
                newTrades.delete(tradeToToggle);
            } else {
                newTrades.add(tradeToToggle);
            }
            return Array.from(newTrades);
        });
    };

    const handleSelectAllTrades = () => {
        if (activeTrades.length === tradeButtonLabels.length) {
            setActiveTrades([]);
        } else {
            setActiveTrades(tradeButtonLabels);
        }
    };

    const handleToggleAllActionTracker = useCallback(() => {
        const actionTrackerKeys = [];
        if (projectData && projectData.mainItems) {
            projectData.mainItems.forEach(main => {
                const mainId = `main_${main.id}`;
                actionTrackerKeys.push(mainId);
                Object.keys(tradeColorMapping).forEach(trade => {
                    const tradeId = `${mainId}_trade_${trade}`;
                    actionTrackerKeys.push(tradeId);
                });
            });
        }

        const isAnyCollapsed = actionTrackerKeys.some(key => collapsedSections[key] !== false);
        
        setCollapsedSections(prev => {
            const newCollapsedState = { ...prev };
            actionTrackerKeys.forEach(key => {
                newCollapsedState[key] = !isAnyCollapsed;
            });
            return newCollapsedState;
        });
    }, [projectData, tradeColorMapping, collapsedSections]);

    const isAnyActionTrackerSectionCollapsed = useMemo(() => {
        if (!projectData || !projectData.mainItems) return true;
        const actionTrackerKeys = [];
        projectData.mainItems.forEach(main => {
            const mainId = `main_${main.id}`;
            actionTrackerKeys.push(mainId);
            Object.keys(tradeColorMapping).forEach(trade => {
                const tradeId = `${mainId}_trade_${trade}`;
                actionTrackerKeys.push(tradeId);
            });
        });
        return actionTrackerKeys.some(key => collapsedSections[key] !== false);
    }, [collapsedSections, projectData, tradeColorMapping]);

    const handleToggleAllActivityBreakdown = useCallback(() => {
        if (!projectData || !projectData.activities) return;
        const breakdownKeys = Object.keys(projectData.activities).map(group => `group_${group}`);
        const isAnyCollapsed = breakdownKeys.some(key => collapsedSections[key] !== false);
        setCollapsedSections(prev => {
            const newState = {...prev};
            breakdownKeys.forEach(key => {
                newState[key] = !isAnyCollapsed;
            });
            return newState;
        });
    }, [projectData, collapsedSections]);

    const isAnyActivityBreakdownCollapsed = useMemo(() => {
        if (!projectData || !projectData.activities) return true;
        const breakdownKeys = Object.keys(projectData.activities).map(group => `group_${group}`);
        return breakdownKeys.some(key => collapsedSections[key] !== false);
    }, [projectData, collapsedSections]);


    useEffect(() => {
        const fetchWeeklyHours = async () => {
            const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${projectId}/weeklyHours`);
            const snapshot = await getDocs(weeklyHoursRef);
            const hoursData = {};
            snapshot.docs.forEach(doc => {
                if (doc.id !== '_config') {
                    hoursData[doc.id] = doc.data();
                }
            });
            setWeeklyHours(hoursData);
        };
        fetchWeeklyHours();
    }, [projectId, db, appId]);

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            const initialLoad = projectData === null;
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                const defaultGroups = { sheetmetal: [], piping: [], plumbing: [], bim: [], structural: [], coordination: [], gis: [] };
                const activities = data.activities ? { ...defaultGroups, ...data.activities } : defaultGroups;
                
                if (initialLoad) {
                    const initialCollapsedState = { mainsManagement: true, actionTracker: true, budgetLog: true, financialForecast: true };
                    Object.keys(activities).forEach(group => {
                        initialCollapsedState[`group_${group}`] = true;
                    });
                    (data.mainItems || []).forEach(main => {
                        initialCollapsedState[`main_${main.id}`] = true;
                        Object.keys(tradeColorMapping).forEach(trade => {
                            initialCollapsedState[`main_${main.id}_trade_${trade}`] = true;
                        });
                    });
                    setCollapsedSections(initialCollapsedState);
                }

                setProjectData({ ...data, activities, actionTrackerData: data.actionTrackerData || {} });
            } else {
                const initialData = { activities: groupActivities(initialActivityData), budgetImpacts: [], mainItems: [], actionTrackerData: {} };
                setDoc(docRef, initialData);
                setProjectData(initialData);
                 if (initialLoad) {
                    setCollapsedSections({ mainsManagement: true, actionTracker: true, budgetLog: true, financialForecast: true });
                }
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching project data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [docRef, projectData, tradeColorMapping]);
    
    const groupActivities = (activityArray) => {
        const defaultGroups = { sheetmetal: [], piping: [], plumbing: [], bim: [], structural: [], coordination: [], gis: [] };
        return activityArray.reduce((acc, act) => {
            const desc = act.description.toUpperCase();
            if (desc.startsWith('SM')) acc.sheetmetal.push(act);
            else if (desc.startsWith('PF')) acc.piping.push(act);
            else if (desc.startsWith('PL')) acc.plumbing.push(act);
            else if (desc.startsWith('ST')) acc.structural.push(act);
            else if (desc.startsWith('CO')) acc.coordination.push(act);
            else if (desc.startsWith('GIS')) acc.gis.push(act);
            else acc.bim.push(act);
            return acc;
        }, defaultGroups);
    };

    const handleSaveData = async (data) => {
        await setDoc(docRef, data, { merge: true });
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
        const localActionData = { ...projectData.actionTrackerData };
        if (!localActionData[mainId]) localActionData[mainId] = {};
        if (!localActionData[mainId][trade]) localActionData[mainId][trade] = {};
        if (!localActionData[mainId][trade].activities) localActionData[mainId][trade].activities = {};
        localActionData[mainId][trade].activities[activityId] = newPercentage;

        const updatedActivities = JSON.parse(JSON.stringify(projectData.activities));
        let activityUpdated = false;

        if (updatedActivities[trade]) {
            const tradeActivities = updatedActivities[trade];
            tradeActivities.forEach(act => {
                let activityTotalCompletion = 0;
                (projectData.mainItems || []).forEach(main => {
                    const mainTradeData = localActionData[main.id]?.[trade];
                    if (mainTradeData) {
                        const mainTradePercent = parseFloat(mainTradeData.tradePercentage) || 0;
                        const activityCompletion = parseFloat(mainTradeData.activities?.[act.id]) || 0;
                        activityTotalCompletion += (activityCompletion / 100) * (mainTradePercent / 100);
                    }
                });
                act.percentComplete = activityTotalCompletion * 100;
            });
            activityUpdated = true;
        }

        const dataToSave = { actionTrackerData: localActionData };
        if (activityUpdated) {
            dataToSave.activities = updatedActivities;
        }
        handleSaveData(dataToSave);
    };

    const calculateGroupTotals = useCallback((activities, project) => {
        return activities.reduce((acc, activity) => {
            const estHours = Number(activity?.estimatedHours || 0);
            const usedHours = Number(activity?.hoursUsed || 0);
            const percentComplete = Number(activity?.percentComplete || 0);

            const useBimRate = activity.description.toUpperCase().includes('BIM') || activity.description === "Project Setup";
            const rateToUse = useBimRate ? (project.bimBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
            
            const projectedHours = percentComplete > 0 ? (usedHours / (percentComplete / 100)) : (estHours > 0 ? estHours : 0);

            acc.estimated += estHours;
            acc.used += usedHours;
            acc.budget += estHours * rateToUse;
            acc.actualCost += usedHours * rateToUse;
            acc.earnedValue += (estHours * rateToUse) * (percentComplete / 100);
            acc.projected += projectedHours;
            
            return acc;
        }, { estimated: 0, used: 0, budget: 0, actualCost: 0, earnedValue: 0, projected: 0, percentComplete: 0 });
    }, []);

    const activityTotals = useMemo(() => {
        if (!projectData?.activities) return { estimated: 0, used: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 };
        const allActivities = Object.values(projectData.activities).flat();
        
        const totals = calculateGroupTotals(allActivities, project);

        return {
            estimated: totals.estimated,
            used: totals.used,
            totalActualCost: totals.actualCost,
            totalEarnedValue: totals.earnedValue,
            totalProjectedCost: totals.projected * (project.blendedRate || 0)
        };
    }, [projectData?.activities, project, calculateGroupTotals]);
    
    const groupTotals = useMemo(() => {
        if (!projectData?.activities) return {};
        
        const allTotals = {};
        for(const group in projectData.activities) {
            const activities = projectData.activities[group];
            const totals = calculateGroupTotals(activities, project);
            
            const totalBudget = totals.budget;
            const weightedPercentComplete = activities.reduce((acc, act) => {
                const estHours = Number(act.estimatedHours) || 0;
                const percent = Number(act.percentComplete) || 0;
                const rate = act.description.toUpperCase().includes('BIM') ? (project.bimBlendedRate || project.blendedRate) : project.blendedRate;
                const actBudget = estHours * rate;
                if (totalBudget > 0) {
                    return acc + (percent * (actBudget / totalBudget));
                }
                return acc;
            }, 0);

            totals.percentComplete = weightedPercentComplete;
            allTotals[group] = totals;
        }
        return allTotals;
    }, [projectData?.activities, project, calculateGroupTotals]);


    const currentBudget = useMemo(() => {
        const initial = project.initialBudget || 0;
        const impactsTotal = (projectData?.budgetImpacts || []).reduce((sum, impact) => sum + impact.amount, 0);
        return initial + impactsTotal;
    }, [project.initialBudget, projectData?.budgetImpacts]);

    const sortedMainItems = useMemo(() => {
        return [...(projectData?.mainItems || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [projectData?.mainItems]);

    if (loading || !projectData) return <div className="p-4 text-center">Loading Project Details...</div>;

    const grandTotals = Object.values(groupTotals).reduce((acc, totals) => {
        acc.estimated += totals.estimated;
        acc.used += totals.used;
        acc.budget += totals.budget;
        acc.earnedValue += totals.earnedValue;
        acc.actualCost += totals.actualCost;
        acc.projected += totals.projected;
        return acc;
    }, { estimated: 0, used: 0, budget: 0, earnedValue: 0, actualCost: 0, projected: 0 });

    return (
        <div className="space-y-6 mt-4 border-t pt-4">
            <div className={`p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm mb-4`}>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    {tradeButtonLabels.map(trade => (
                        <button 
                            key={trade}
                            onClick={() => handleTradeFilterToggle(trade)}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTrades.includes(trade) ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                        >
                            {trade}
                        </button>
                    ))}
                    <button 
                        onClick={handleSelectAllTrades}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTrades.length === tradeButtonLabels.length ? 'bg-green-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                    >
                        {activeTrades.length === tradeButtonLabels.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            </div>

            {accessLevel === 'taskmaster' && (
                <>
                    <FinancialSummary project={project} activityTotals={activityTotals} currentTheme={currentTheme} currentBudget={currentBudget} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                             <button onClick={() => handleToggleCollapse('financialForecast')} className="w-full text-left font-bold flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Financial Forecast</h3>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform flex-shrink-0 ${collapsedSections.financialForecast ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {!collapsedSections.financialForecast && (
                                <div className="pt-2 mt-2 border-t border-gray-500/20">
                                    <FinancialForecastChart project={project} weeklyHours={weeklyHours} activityTotals={activityTotals} currentBudget={currentBudget} currentTheme={currentTheme} />
                                </div>
                            )}
                        </div>
                         <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                            <button onClick={() => handleToggleCollapse('budgetLog')} className="w-full text-left font-bold flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Budget Impact Log</h3>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform flex-shrink-0 ${collapsedSections.budgetLog ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {!collapsedSections.budgetLog && (
                                <div className="pt-2 mt-2 border-t border-gray-500/20">
                                    <BudgetImpactLog impacts={projectData?.budgetImpacts || []} onAdd={handleAddImpact} onDelete={handleDeleteImpact} currentTheme={currentTheme} project={project} />
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <div className="flex flex-col md:flex-row gap-6">
                <div className={accessLevel === 'tcl' ? "w-full md:w-1/3" : "w-full md:w-1/3 flex flex-col gap-6"}>
                    {accessLevel === 'taskmaster' && (
                        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                            <button onClick={() => handleToggleCollapse('mainsManagement')} className="w-full text-left font-bold flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Mains Management</h3>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform flex-shrink-0 ${collapsedSections['mainsManagement'] ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {!collapsedSections['mainsManagement'] && (
                                <ProjectBreakdown 
                                    mainItems={sortedMainItems}
                                    onAdd={handleAddMain}
                                    onUpdate={handleUpdateMain}
                                    onDelete={handleDeleteMain}
                                    onReorder={handleReorderMains}
                                    currentTheme={currentTheme}
                                />
                            )}
                        </div>
                    )}
                    
                    {projectData?.mainItems && projectData.mainItems.length > 0 && (
                         <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                            <div className="w-full flex justify-between items-center mb-2">
                                <button onClick={() => handleToggleCollapse('actionTracker')} className="flex items-center text-left font-bold">
                                    <h3 className="text-lg font-semibold">Action Tracker</h3>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform flex-shrink-0 ${collapsedSections.actionTracker ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {!collapsedSections.actionTracker && (
                                     <button onClick={handleToggleAllActionTracker} className={`text-xs px-2 py-1 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>
                                        {isAnyActionTrackerSectionCollapsed ? 'Expand All' : 'Collapse All'}
                                    </button>
                                )}
                            </div>
                            {!collapsedSections.actionTracker && (
                                <div className="pt-2 mt-2 border-t border-gray-500/20">
                                    <ActionTracker 
                                        mainItems={sortedMainItems}
                                        activities={projectData.activities}
                                        totalProjectHours={activityTotals.estimated}
                                        onUpdatePercentage={handleUpdateActionTrackerPercentage}
                                        onUpdateActivityCompletion={handleUpdateActivityCompletion}
                                        actionTrackerData={projectData.actionTrackerData || {}}
                                        currentTheme={currentTheme}
                                        tradeColorMapping={tradeColorMapping}
                                        isTradePercentageEditable={accessLevel === 'taskmaster'}
                                        isActivityCompletionEditable={accessLevel === 'tcl'}
                                        collapsedSections={collapsedSections}
                                        onToggle={handleToggleCollapse}
                                        activeTrades={activeTradeKeys}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {accessLevel === 'taskmaster' && (
                    <div className="w-full md:w-2/3">
                        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Activity Values Breakdown</h3>
                                <button onClick={handleToggleAllActivityBreakdown} className={`text-xs px-2 py-1 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText}`}>
                                    {isAnyActivityBreakdownCollapsed ? 'Expand All' : 'Collapse All'}
                                </button>
                            </div>
                            <div className="space-y-1">
                                {Object.entries(projectData.activities)
                                    .filter(([group]) => activeTradeKeys.includes(group))
                                    .map(([group, acts]) => {
                                    const groupKey = `group_${group}`;
                                    const colorInfo = tradeColorMapping[group];
                                    const colorClass = colorInfo ? `${colorInfo.bg} ${colorInfo.text}` : 'bg-gray-500/70 text-white';

                                    return (
                                        <CollapsibleActivityTable
                                            key={groupKey}
                                            title={group.charAt(0).toUpperCase() + group.slice(1)}
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
                                            groupTotals={groupTotals[group] || {}}
                                        />
                                    );
                                })}
                            </div>
                            <div className={`w-full p-2 text-left font-bold flex justify-between items-center mt-2 ${currentTheme.altRowBg}`}>
                                <div className="flex-grow grid grid-cols-11 text-xs font-bold">
                                    <span>Totals</span>
                                    <span></span>
                                    <span className="text-center">{grandTotals.estimated.toFixed(2)}</span>
                                    <span className="text-center">{formatCurrency(grandTotals.budget)}</span>
                                    <span></span>
                                    <span></span>
                                    <span className="text-center">{grandTotals.used.toFixed(2)}</span>
                                    <span className="text-center">{formatCurrency(grandTotals.earnedValue)}</span>
                                    <span className="text-center">{formatCurrency(grandTotals.actualCost)}</span>
                                    <span className="text-center">{grandTotals.projected.toFixed(2)}</span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const ProjectConsole = ({ db, detailers, projects, assignments, accessLevel, currentTheme, appId, showToast }) => {
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [filters, setFilters] = useState({ query: '', detailerId: '', startDate: '', endDate: '' });

    const handleProjectClick = (projectId) => {
        setExpandedProjectId(prevId => (prevId === projectId ? null : projectId));
    };

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => !p.archived)
            .filter(p => {
                const { query, detailerId, startDate, endDate } = filters;
                const searchLower = query.toLowerCase();
                
                const nameMatch = p.name.toLowerCase().includes(searchLower);
                const idMatch = p.projectId.includes(searchLower);
                
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
            <div className="flex-grow overflow-y-auto space-y-4 pr-4">
                {filteredProjects.map((p, index) => {
                    const projectAssignments = assignments.filter(a => a.projectId === p.id);
                    const isExpanded = expandedProjectId === p.id;
                    const project = projects.find(proj => proj.id === p.id);
                    const bgColor = index % 2 === 0 ? currentTheme.cardBg : currentTheme.altRowBg;

                    return (
                        <div 
                            key={p.id} 
                            className={`${bgColor} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm transition-all duration-300 ease-in-out`}
                            onClick={() => handleProjectClick(p.id)}
                        >
                            <div className="flex justify-between items-start cursor-pointer">
                                <div>
                                    <h3 className="text-lg font-semibold">{p.name}</h3>
                                    <p className={`text-sm ${currentTheme.subtleText}`}>Project ID: {p.projectId}</p>
                                </div>
                                {!isExpanded && (
                                     <span className={`text-xs ${currentTheme.subtleText}`}>Click to expand</span>
                                )}
                            </div>
                           
                            {isExpanded && (
                                <div onClick={e => e.stopPropagation()}>
                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="text-md font-semibold mb-2 border-b pb-1">Assigned Detailers:</h4>
                                            {projectAssignments.length === 0 ? (
                                                <p className={`text-sm ${currentTheme.subtleText}`}>None</p>
                                            ) : (
                                                <ul className="list-disc list-inside text-sm space-y-1">
                                                    {projectAssignments.map(a => {
                                                        const detailer = detailers.find(d => d.id === a.detailerId);
                                                        return (
                                                            <li key={a.id}>
                                                                {detailer ? `${detailer.firstName} ${detailer.lastName}` : 'Unknown Detailer'} - <span className="font-semibold">{a.allocation}%</span> ({a.trade})
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                        <div>
                                            {p.dashboardUrl && (
                                                <>
                                                    <h4 className="text-md font-semibold mb-2 border-b pb-1">Dashboard</h4>
                                                    <a
                                                        href={p.dashboardUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                        </svg>
                                                        Project Dashboard
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <ProjectDetailView db={db} project={project} projectId={p.id} accessLevel={accessLevel} currentTheme={currentTheme} appId={appId} showToast={showToast} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectConsole;
