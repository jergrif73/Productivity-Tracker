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

const disciplineOptions = ["Duct", "Piping", "Plumbing", "BIM", "Structural", "Coordination", "GIS/GPS"];
const initialActivityData = [
    { id: `act_${Date.now()}_1`, description: "SM Modeling", chargeCode: "96100-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_2`, description: "SM Coordination", chargeCode: "96800-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_3`, description: "SM Deliverables", chargeCode: "96810-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_4`, description: "SM Spooling", chargeCode: "96210-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_5`, description: "SM Misc", chargeCode: "96830-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_6`, description: "PF Modeling", chargeCode: "96110-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_7`, description: "PF Coordination", chargeCode: "96801-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_8`, description: "PF Deliverables", chargeCode: "96811-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_9`, description: "PF Spooling", chargeCode: "96211-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_10`, description: "PF Misc", chargeCode: "96831-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_11`, description: "PL Modeling", chargeCode: "96130-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_12`, description: "PL Coordination", chargeCode: "96803-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_13`, description: "PL Deliverables", chargeCode: "96813-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_14`, description: "PL Spooling", chargeCode: "96213-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_15`, description: "PL Misc", chargeCode: "96833-96-ENG-61", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_16`, description: "Detailing-In House-Cad Mgr", chargeCode: "96505-96-ENG-10", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
    { id: `act_${Date.now()}_17`, description: "Project Setup", chargeCode: "96301-96-ENG-62", estimatedHours: 0, hoursUsed: 0, percentComplete: 0 },
];

const ActivityRow = React.memo(({ activity, groupKey, index, onChange, onDelete, project, currentTheme, totalProjectHours, accessLevel }) => {
    const { percentComplete = 0, hoursUsed = 0 } = activity;

    const useBimRate = groupKey === 'bim' || activity.description === "Project Setup";
    const rateToUse = useBimRate ? (project.bimBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);

    const earnedValue = (activity.estimatedHours * rateToUse) * (percentComplete / 100);
    const actualCost = hoursUsed * rateToUse;
    const percentOfProject = totalProjectHours > 0 ? (Number(activity.estimatedHours) / totalProjectHours) * 100 : 0;
    
    const rawBudget = (Number(activity.estimatedHours) || 0) * rateToUse;
    const lineItemBudget = Math.ceil(rawBudget / 5) * 5;

    const calculateProjectedHours = (act) => {
        const localHoursUsed = Number(act.hoursUsed) || 0;
        const localPercentComplete = Number(act.percentComplete) || 0;
        if (!localPercentComplete || localPercentComplete === 0) return 0;
        return (localHoursUsed / localPercentComplete) * 100;
    };
    const projected = calculateProjectedHours(activity);
    
    return (
        <tr key={activity.id}>
            <td className="p-1"><input type="text" value={activity.description} onChange={(e) => onChange(groupKey, index, 'description', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1"><input type="text" value={activity.chargeCode} onChange={(e) => onChange(groupKey, index, 'chargeCode', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className="p-1 w-24"><input type="text" value={activity.estimatedHours} onChange={(e) => onChange(groupKey, index, 'estimatedHours', e.target.value)} className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} /></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="Est. Hours * Rate"><p>{formatCurrency(lineItemBudget)}</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Est. Hrs / Total Est. Hrs) * 100"><p>{percentOfProject.toFixed(2)}%</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}>{percentComplete.toFixed(2)}%</td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}>
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


const CollapsibleActivityTable = React.memo(({ title, data, groupKey, colorClass, onAdd, onDelete, onChange, isCollapsed, onToggle, project, currentTheme, totalProjectHours, accessLevel }) => {
    return (
        <div className={`border-b ${currentTheme.borderColor}`}>
            <button
                onClick={onToggle}
                className={`w-full p-2 text-left font-bold flex justify-between items-center ${colorClass}`}
                disabled={onToggle === null}
            >
                <span>{title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>% Comp</th>
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

const BreakdownRow = ({ item, type, onSave, onDelete, onAddSubset, availableActivities, project, indent = 0, currentTheme, isTCL, onTCLUpdate, disciplineOptions }) => {
    const [isEditing, setIsEditing] = useState(!item.name); 
    const [editData, setEditData] = useState(item);

    const handleSave = () => {
        onSave(editData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (!item.name) { 
            onDelete(item.id);
        }
        setIsEditing(false);
        setEditData(item);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const isNumeric = ['percentageOfParent'].includes(name);
        setEditData(prev => ({ ...prev, [name]: isNumeric ? Number(value) : value }));
    };
    
    if (isEditing && !isTCL) {
        return (
            <div className={`grid grid-cols-12 gap-2 items-center py-1 text-sm ${currentTheme.altRowBg} rounded-md`} style={{ paddingLeft: `${indent}rem` }}>
                <div className="col-span-3">
                    <input type="text" name="name" value={editData.name} onChange={handleChange} placeholder={type === 'main' ? 'Main Set Name' : 'Subset Name'} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                </div>
                <div className="col-span-2">
                    {type === 'sub' ? (
                        <select name="trade" value={editData.trade} onChange={handleChange} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : <span />}
                </div>
                <div className="col-span-3">
                     {type === 'main' ? (
                        <select name="activityId" value={editData.activityId} onChange={handleChange} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                           <option value="">Select Activity...</option>
                           {availableActivities.map(act => <option key={act.id} value={act.id}>{act.description}</option>)}
                        </select>
                    ) : <span>{item.activity?.description}</span>}
                </div>
                <div className="col-span-2">
                    <input type="number" name="percentageOfParent" value={editData.percentageOfParent} onChange={handleChange} className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                </div>
                <div className="col-span-2 flex gap-2">
                    <button onClick={handleSave} className="text-green-500">Save</button>
                    <button onClick={handleCancel} className="text-gray-500">Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-12 gap-2 items-center py-1 text-sm hover:bg-gray-500/10 rounded-md`} style={{ paddingLeft: `${indent}rem` }}>
            <div className="col-span-3 font-semibold">{item.name}</div>
            <div className="col-span-2">{item.trade}</div>
            <div className="col-span-3">{item.activity?.description}</div>
            <div className="col-span-2">{item.percentageOfParent}%</div>
            <div className="col-span-2 flex gap-2">
                <button onClick={() => setIsEditing(true)} className="text-blue-500">Edit</button>
                <button onClick={() => onDelete(item.id)} className="text-red-500">Delete</button>
                {type === 'main' && <button onClick={() => onAddSubset(item.id)} className="text-green-500 text-xs">+ Sub</button>}
            </div>
        </div>
    );
};

const CollapsibleSection = ({ title, children, isCollapsed, onToggle, colorClass }) => {
    return (
        <div className="border-b border-gray-600/30">
            <button
                onClick={onToggle}
                className={`w-full p-2 text-left font-bold flex justify-between items-center ${colorClass}`}
            >
                <span>{title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {!isCollapsed && (
                <div className="pl-2 py-1 space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
};

const BudgetImpactLog = ({ impacts, onAdd, onDelete, currentTheme }) => {
    const [newImpact, setNewImpact] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: 0 });

    const handleAdd = () => {
        if (newImpact.description && newImpact.amount !== 0) {
            onAdd({ ...newImpact, id: `impact_${Date.now()}` });
            setNewImpact({ date: new Date().toISOString().split('T')[0], description: '', amount: 0 });
        }
    };

    return (
        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
            <h3 className="text-lg font-semibold mb-2">Budget Impact Log</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {impacts.map(impact => (
                    <div key={impact.id} className={`grid grid-cols-12 gap-2 text-sm p-2 rounded ${currentTheme.altRowBg}`}>
                        <div className="col-span-3">{new Date(impact.date + 'T00:00:00').toLocaleDateString()}</div>
                        <div className="col-span-6">{impact.description}</div>
                        <div className={`col-span-2 text-right ${impact.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(impact.amount)}</div>
                        <div className="col-span-1 text-right">
                            <button onClick={() => onDelete(impact.id)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-12 gap-2 items-center border-t pt-2">
                <input type="date" value={newImpact.date} onChange={e => setNewImpact({...newImpact, date: e.target.value})} className={`col-span-3 p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                <input type="text" placeholder="Description" value={newImpact.description} onChange={e => setNewImpact({...newImpact, description: e.target.value})} className={`col-span-5 p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                <input type="number" placeholder="Amount" value={newImpact.amount} onChange={e => setNewImpact({...newImpact, amount: Number(e.target.value)})} className={`col-span-3 p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                <button onClick={handleAdd} className={`col-span-1 p-1 rounded ${currentTheme.buttonBg} hover:bg-opacity-80`}>Add</button>
            </div>
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

        // Planned Spend (S-Curve)
        g.append('path')
            .datum(plannedSpend)
            .attr('fill', 'none')
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 2)
            .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.value)));

        // Current Budget Line
        g.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(currentBudget)).attr('y2', y(currentBudget)).attr('stroke', '#22c55e').attr('stroke-width', 2).attr('stroke-dasharray', '5,5');
        g.append('text').attr('x', width + 5).attr('y', y(currentBudget)).text('Budget').attr('fill', '#22c55e').attr('alignment-baseline', 'middle');

        // Projected Cost Line
        g.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(totalProjectedCost)).attr('y2', y(totalProjectedCost)).attr('stroke', '#ef4444').attr('stroke-width', 2).attr('stroke-dasharray', '5,5');
        g.append('text').attr('x', width + 5).attr('y', y(totalProjectedCost)).text('Projected').attr('fill', '#ef4444').attr('alignment-baseline', 'middle');

        // Today Line
        const today = new Date();
        if (today >= startDate && today <= endDate) {
            g.append('line').attr('x1', x(today)).attr('x2', x(today)).attr('y1', 0).attr('y2', height).attr('stroke', currentTheme.textColor).attr('stroke-width', 1).attr('stroke-dasharray', '2,2');
            g.append('text').attr('x', x(today)).attr('y', -5).text('Today').attr('fill', currentTheme.textColor).attr('text-anchor', 'middle');
            
            // Earned Value & Actual Cost points
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


const ProjectDetailView = ({ db, project, projectId, accessLevel, currentTheme, appId, showToast }) => {
    const [breakdown, setBreakdown] = useState([]);
    const [loading, setLoading] = useState(true);
    const [baseActivities, setBaseActivities] = useState({});
    const [collapsedSections, setCollapsedSections] = useState({
        projectBreakdown: false,
        sheetmetal: true,
        piping: true,
        plumbing: true,
        bim: true,
        structural: true,
        coordination: true,
        gis: true,
    });
    const [breakdownCollapsed, setBreakdownCollapsed] = useState({});
    const [budgetImpacts, setBudgetImpacts] = useState([]);
    const [weeklyHours, setWeeklyHours] = useState({});

    const isTCL = accessLevel === 'tcl';
    const disciplineOptions = ["Duct", "Piping", "Plumbing", "BIM", "Structural", "Coordination", "GIS/GPS"];

    const docRef = useMemo(() => doc(db, `artifacts/${appId}/public/data/projectActivities`, projectId), [projectId, db, appId]);
    
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

    const tradeColorMapping = {
        Piping: { bg: 'bg-green-500/70', text: 'text-white' },
        Duct: { bg: 'bg-yellow-400/70', text: 'text-black' },
        Plumbing: { bg: 'bg-blue-500/70', text: 'text-white' },
        Coordination: { bg: 'bg-pink-500/70', text: 'text-white' },
        BIM: { bg: 'bg-indigo-600/70', text: 'text-white' },
        Structural: { bg: 'bg-amber-700/70', text: 'text-white' },
        "GIS/GPS": { bg: 'bg-teal-500/70', text: 'text-white' },
        Unassigned: { bg: 'bg-gray-500/70', text: 'text-white' },
    };

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
    
    const calculateActivityCompletion = useCallback((activities, breakdownData) => {
        const newActivities = JSON.parse(JSON.stringify(activities));
        const allActivitiesList = Object.values(newActivities).flat();

        allActivitiesList.forEach(activity => {
            let totalWeightedPercentComplete = 0;
            
            (breakdownData || []).forEach(mainSet => {
                if (mainSet.activityId === activity.id) {
                    (mainSet.subsets || []).forEach(subset => {
                        const mainSetWeight = (mainSet.percentageOfParent || 0) / 100;
                        const subsetWeight = (subset.percentageOfParent || 0) / 100;
                        const subsetPercentComplete = (subset.percentComplete || 0);
                        
                        totalWeightedPercentComplete += mainSetWeight * subsetWeight * (subsetPercentComplete / 100);
                    });
                }
            });
            activity.percentComplete = totalWeightedPercentComplete * 100;
        });

        return groupActivities(allActivitiesList);
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const breakdownData = data.breakdown || [];
                const activitiesData = data.activities || groupActivities(initialActivityData);
                
                const rolledUpActivities = calculateActivityCompletion(activitiesData, breakdownData);

                setBreakdown(breakdownData);
                setBaseActivities(rolledUpActivities);
                setBudgetImpacts(data.budgetImpacts || []);
            } else {
                const initialActivities = groupActivities(initialActivityData);
                const initialData = { breakdown: [], activities: initialActivities, budgetImpacts: [] };
                setDoc(docRef, initialData);
                setBreakdown([]);
                setBaseActivities(initialActivities);
                setBudgetImpacts([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching project data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [docRef, calculateActivityCompletion]);
    
    const availableActivities = useMemo(() => Object.values(baseActivities).flat(), [baseActivities]);

    const groupedBreakdown = useMemo(() => {
        const byTrade = {};
        if (!breakdown) return {};
    
        const addMainSetToTrade = (mainSet, trade) => {
            if (!byTrade[trade]) {
                byTrade[trade] = [];
            }
            if (!byTrade[trade].some(ms => ms.id === mainSet.id)) {
                byTrade[trade].push(mainSet);
            }
        };
    
        breakdown.forEach(mainSet => {
            if (!mainSet.subsets || mainSet.subsets.length === 0) {
                addMainSetToTrade(mainSet, 'Unassigned');
            } else {
                (mainSet.subsets || []).forEach(subset => {
                    addMainSetToTrade(mainSet, subset.trade || 'Unassigned');
                });
            }
        });
    
        return byTrade;
    }, [breakdown]);

    const handleSaveData = async (data) => {
        await setDoc(docRef, data, { merge: true });
    };
    
    const handleActivityChange = useCallback((group, index, field, value) => {
        const updatedActivities = { ...baseActivities };
        const numericValue = (field === 'estimatedHours' || field === 'hoursUsed') ? Number(value) : value;
        updatedActivities[group][index] = { ...updatedActivities[group][index], [field]: numericValue };
        
        setBaseActivities(updatedActivities);
        handleSaveData({ activities: updatedActivities });
    }, [baseActivities, handleSaveData]);
    
    const handleAddMainSet = () => {
        const newMainSet = {
            id: `main_${Date.now()}`,
            name: '',
            activityId: '',
            percentageOfParent: 0,
            subsets: []
        };
        const newBreakdown = [...breakdown, newMainSet];
        setBreakdown(newBreakdown);
        handleSaveData({ breakdown: newBreakdown });
    };

    const handleSaveItem = (itemData) => {
        const { activity, parentHours, ...dataToSave } = itemData;

        let newBreakdown;
        if (dataToSave.id.startsWith('main_')) {
            newBreakdown = breakdown.map(main => main.id === dataToSave.id ? dataToSave : main);
        } else {
            newBreakdown = breakdown.map(main => {
                const subsetIndex = (main.subsets || []).findIndex(sub => sub.id === dataToSave.id);
                if (subsetIndex > -1) {
                    const newSubsets = [...main.subsets];
                    newSubsets[subsetIndex] = dataToSave;
                    return { ...main, subsets: newSubsets };
                }
                return main;
            });
        }
        setBreakdown(newBreakdown);
        handleSaveData({ breakdown: newBreakdown });
    };

    const handleDeleteItem = (itemId) => {
        let newBreakdown;
        if (itemId.startsWith('main_')) {
            newBreakdown = breakdown.filter(main => main.id !== itemId);
        } else {
            newBreakdown = breakdown.map(main => {
                return { ...main, subsets: (main.subsets || []).filter(sub => sub.id !== itemId) };
            });
        }
        setBreakdown(newBreakdown);
        handleSaveData({ breakdown: newBreakdown });
    };

    const handleAddSubset = (mainSetId) => {
        const newSubset = {
            id: `sub_${Date.now()}`,
            name: '',
            trade: 'Duct',
            percentageOfParent: 0,
            percentComplete: 0,
        };
        const newBreakdown = breakdown.map(main => {
            if (main.id === mainSetId) {
                return { ...main, subsets: [...(main.subsets || []), newSubset] };
            }
            return main;
        });
        setBreakdown(newBreakdown);
        // No save here, will be saved when user edits the new row
    };

    const handleTCLUpdate = (subsetId, percent) => {
        const newBreakdown = breakdown.map(main => {
            const subsetIndex = (main.subsets || []).findIndex(sub => sub.id === subsetId);
            if (subsetIndex > -1) {
                const newSubsets = [...main.subsets];
                newSubsets[subsetIndex] = { ...newSubsets[subsetIndex], percentComplete: Number(percent) };
                return { ...main, subsets: newSubsets };
            }
            return main;
        });
        setBreakdown(newBreakdown);
        handleSaveData({ breakdown: newBreakdown });
    };
    
    const handleToggleCollapse = (e, section) => {
        e.stopPropagation();
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleToggleBreakdownCollapse = (id) => {
        setBreakdownCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
    };
    
    const handleAddImpact = (impact) => {
        const newImpacts = [...budgetImpacts, impact];
        setBudgetImpacts(newImpacts);
        handleSaveData({ budgetImpacts: newImpacts });
    };

    const handleDeleteImpact = (impactId) => {
        const newImpacts = budgetImpacts.filter(i => i.id !== impactId);
        setBudgetImpacts(newImpacts);
        handleSaveData({ budgetImpacts: newImpacts });
    };

    const activityTotals = useMemo(() => {
        if (!baseActivities) return { estimated: 0, used: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 };
        const allActivities = Object.values(baseActivities).flat();
        
        return allActivities.reduce((acc, activity) => {
            const estHours = Number(activity?.estimatedHours || 0);
            const usedHours = Number(activity?.hoursUsed || 0);
            const percentComplete = Number(activity?.percentComplete || 0) / 100;

            const useBimRate = Object.keys(baseActivities).find(key => baseActivities[key].includes(activity)) === 'bim' || activity.description === "Project Setup";
            const rateToUse = useBimRate ? (project.bimBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);

            const projectedHours = percentComplete > 0 ? (usedHours / percentComplete) : 0;

            acc.estimated += estHours;
            acc.used += usedHours;
            acc.totalActualCost += usedHours * rateToUse;
            acc.totalEarnedValue += (estHours * rateToUse) * percentComplete;
            acc.totalProjectedCost += projectedHours * rateToUse;

            return acc;
        }, { estimated: 0, used: 0, totalActualCost: 0, totalEarnedValue: 0, totalProjectedCost: 0 });
    }, [baseActivities, project.blendedRate, project.bimBlendedRate]);

    const currentBudget = useMemo(() => {
        const initial = project.initialBudget || 0;
        const impactsTotal = budgetImpacts.reduce((sum, impact) => sum + impact.amount, 0);
        return initial + impactsTotal;
    }, [project.initialBudget, budgetImpacts]);

    const flatSubsetsForTCL = useMemo(() => {
        if (!isTCL) return [];
        return breakdown.flatMap(mainSet => {
            const activity = availableActivities.find(a => a.id === mainSet.activityId);
            return (mainSet.subsets || []).map(subset => ({
                ...subset,
                mainSetName: mainSet.name,
                activityDescription: activity?.description || 'N/A'
            }));
        });
    }, [breakdown, availableActivities, isTCL]);

    if (loading) return <div className="p-4 text-center">Loading Project Details...</div>;
    
    const totalProjectHours = activityTotals.estimated;

    return (
        <div className="space-y-6 mt-4 border-t pt-4">
            <FinancialSummary project={project} activityTotals={activityTotals} currentTheme={currentTheme} currentBudget={currentBudget} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FinancialForecastChart project={project} weeklyHours={weeklyHours} activityTotals={activityTotals} currentBudget={currentBudget} currentTheme={currentTheme} />
                <BudgetImpactLog impacts={budgetImpacts} onAdd={handleAddImpact} onDelete={handleDeleteImpact} currentTheme={currentTheme} />
            </div>

            {isTCL ? (
                <div style={{ width: '33.33%' }}>
                    <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm`}>
                        <h3 className="text-lg font-semibold mb-2">Project Breakdown</h3>
                        <>
                            <div className="grid grid-cols-12 gap-2 font-bold text-xs border-b pb-2 mb-2">
                                <div className="col-span-3">Main</div>
                                <div className="col-span-3">Sub</div>
                                <div className="col-span-2">Trade</div>
                                <div className="col-span-2">Activity</div>
                                <div className="col-span-2">% Complete</div>
                            </div>
                            <div className="space-y-1">
                                {flatSubsetsForTCL.map(subset => (
                                    <div key={subset.id} className="grid grid-cols-12 gap-2 items-center py-1 text-sm">
                                        <div className="col-span-3 font-semibold">{subset.mainSetName}</div>
                                        <div className="col-span-3">{subset.name}</div>
                                        <div className="col-span-2">{subset.trade}</div>
                                        <div className="col-span-2">{subset.activityDescription}</div>
                                        <div className="col-span-2">
                                            <input 
                                                type="number"
                                                value={subset.percentComplete || 0}
                                                onChange={(e) => handleTCLUpdate(subset.id, e.target.value)}
                                                className={`w-full p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-6">
                    <div style={{ flexBasis: '33.33%', flexShrink: 0 }}>
                        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm h-full`}>
                            <h3 className="text-lg font-semibold mb-2">Project Breakdown</h3>
                            <div className="space-y-1">
                                {Object.entries(groupedBreakdown).map(([trade, mainSets]) => {
                                    const tradeKey = `trade_${trade}`;
                                    const colorInfo = tradeColorMapping[trade];
                                    const colorClass = `${colorInfo.bg} ${colorInfo.text}`;

                                    return (
                                        <CollapsibleSection
                                            key={tradeKey}
                                            title={trade}
                                            isCollapsed={breakdownCollapsed[tradeKey]}
                                            onToggle={() => handleToggleBreakdownCollapse(tradeKey)}
                                            colorClass={colorClass}
                                        >
                                            {mainSets.map(mainSet => {
                                                const mainSetKey = `main_${mainSet.id}`;
                                                const activity = availableActivities.find(a => a.id === mainSet.activityId);
                                                const mainSetWithActivity = {...mainSet, activity};
                                                
                                                return (
                                                    <CollapsibleSection
                                                        key={mainSetKey}
                                                        title={mainSet.name || 'Unnamed Main Set'}
                                                        isCollapsed={!!breakdownCollapsed[mainSetKey]}
                                                        onToggle={() => handleToggleBreakdownCollapse(mainSetKey)}
                                                        colorClass={`${currentTheme.altRowBg} hover:bg-opacity-80 border-l-4 ${currentTheme.borderColor}`}
                                                    >
                                                        <BreakdownRow 
                                                            item={mainSetWithActivity} 
                                                            type="main"
                                                            onSave={handleSaveItem}
                                                            onDelete={handleDeleteItem}
                                                            onAddSubset={handleAddSubset}
                                                            availableActivities={availableActivities}
                                                            project={project}
                                                            currentTheme={currentTheme}
                                                            isTCL={isTCL}
                                                            disciplineOptions={disciplineOptions}
                                                        />
                                                        {(mainSet.subsets || []).filter(s => s.trade === trade || trade === 'Unassigned').map(subset => (
                                                            <BreakdownRow 
                                                                key={subset.id}
                                                                item={{...subset, activity}}
                                                                type="sub"
                                                                indent={1}
                                                                onSave={handleSaveItem}
                                                                onDelete={handleDeleteItem}
                                                                project={project}
                                                                currentTheme={currentTheme}
                                                                isTCL={isTCL}
                                                                onPCLUpdate={handleTCLUpdate}
                                                                disciplineOptions={disciplineOptions}
                                                            />
                                                        ))}
                                                    </CollapsibleSection>
                                                );
                                            })}
                                        </CollapsibleSection>
                                    );
                                })}
                            </div>
                            <button onClick={handleAddMainSet} className="text-sm text-blue-500 hover:underline mt-4">+ Add Main Set</button>
                        </div>
                    </div>
                    <div className="flex-grow">
                        <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm h-full`} onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold">Activity Tracker</h3>
                            </div>
                            <CollapsibleActivityTable title="Sheetmetal" data={baseActivities.sheetmetal} groupKey="sheetmetal" colorClass="bg-yellow-400/70 text-black" onAdd={() => {}} onDelete={() => {}} onChange={handleActivityChange} isCollapsed={collapsedSections.sheetmetal} onToggle={(e) => handleToggleCollapse(e, 'sheetmetal')} project={project} currentTheme={currentTheme} totalProjectHours={totalProjectHours} accessLevel={accessLevel}/>
                            <CollapsibleActivityTable title="Piping" data={baseActivities.piping} groupKey="piping" colorClass="bg-green-500/70 text-white" onAdd={() => {}} onDelete={() => {}} onChange={handleActivityChange} isCollapsed={collapsedSections.piping} onToggle={(e) => handleToggleCollapse(e, 'piping')} project={project} currentTheme={currentTheme} totalProjectHours={totalProjectHours} accessLevel={accessLevel}/>
                            <CollapsibleActivityTable title="Plumbing" data={baseActivities.plumbing} groupKey="plumbing" colorClass="bg-blue-500/70 text-white" onAdd={() => {}} onDelete={() => {}} onChange={handleActivityChange} isCollapsed={collapsedSections.plumbing} onToggle={(e) => handleToggleCollapse(e, 'plumbing')} project={project} currentTheme={currentTheme} totalProjectHours={totalProjectHours} accessLevel={accessLevel}/>
                            <CollapsibleActivityTable title="BIM" data={baseActivities.bim} groupKey="bim" colorClass="bg-indigo-600/70 text-white" onAdd={() => {}} onDelete={() => {}} onChange={handleActivityChange} isCollapsed={collapsedSections.bim} onToggle={(e) => handleToggleCollapse(e, 'bim')} project={project} currentTheme={currentTheme} totalProjectHours={totalProjectHours} accessLevel={accessLevel}/>
                            <CollapsibleActivityTable title="Structural" data={baseActivities.structural} groupKey="structural" colorClass="bg-amber-700/70 text-white" onAdd={() => {}} onDelete={() => {}} onChange={handleActivityChange} isCollapsed={collapsedSections.structural} onToggle={(e) => handleToggleCollapse(e, 'structural')} project={project} currentTheme={currentTheme} totalProjectHours={totalProjectHours} accessLevel={accessLevel}/>
                            <CollapsibleActivityTable title="Coordination" data={baseActivities.coordination} groupKey="coordination" colorClass="bg-pink-500/70 text-white" onAdd={() => {}} onDelete={() => {}} onChange={handleActivityChange} isCollapsed={collapsedSections.coordination} onToggle={(e) => handleToggleCollapse(e, 'coordination')} project={project} currentTheme={currentTheme} totalProjectHours={totalProjectHours} accessLevel={accessLevel}/>
                            <CollapsibleActivityTable title="GIS/GPS" data={baseActivities.gis} groupKey="gis" colorClass="bg-teal-500/70 text-white" onAdd={() => {}} onDelete={() => {}} onChange={handleActivityChange} isCollapsed={collapsedSections.gis} onToggle={(e) => handleToggleCollapse(e, 'gis')} project={project} currentTheme={currentTheme} totalProjectHours={totalProjectHours} accessLevel={accessLevel}/>
                            <div className={`${currentTheme.altRowBg} font-bold p-2 flex justify-end gap-x-6`}>
                                <span className="text-right">Totals:</span>
                                <span>Est: {activityTotals.estimated.toFixed(2)}</span>
                                <span>Used: {activityTotals.used.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

    const isViewer = accessLevel === 'viewer';
    
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
                                    {!isViewer && <ProjectDetailView db={db} project={project} projectId={p.id} accessLevel={accessLevel} currentTheme={currentTheme} appId={appId} showToast={showToast} />}
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
