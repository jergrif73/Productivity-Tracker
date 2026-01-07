import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialHighlight } from './App';

// --- Constants & Helpers ---

export const animationVariants = {
    open: { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
    collapsed: { opacity: 0, height: 0, transition: { duration: 0.3 } },
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeInOut" } }
};

export const formatCurrency = (value) => {
    const numberValue = Number(value) || 0;
    return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export const normalizeDesc = (str = '') => {
  return String(str)
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

export const standardActivitiesToAdd = [
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
    { description: "Project Coordination Management", chargeCode: "9630762" }
];

export const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];
    
    // Simple header normalization
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const getIndex = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
    
    const descIdx = getIndex(['activity', 'description', 'task']);
    const codeIdx = getIndex(['charge', 'code']);
    const hoursIdx = getIndex(['est', 'hours', 'budget']);
    
    if (descIdx === -1) throw new Error("CSV must have a column named 'Description' or 'Activity'");
    
    return lines.slice(1).map(line => {
        // Regex to split by comma but ignore commas inside quotes
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        
        let hours = 0;
        if (hoursIdx !== -1 && values[hoursIdx]) {
            // Robust parsing: Remove '$', ',', and spaces to handle formats like "$1,200.00"
            const cleanHours = values[hoursIdx].replace(/[$,\s]/g, '');
            hours = parseFloat(cleanHours) || 0;
        }

        return {
            description: values[descIdx] || '',
            chargeCode: codeIdx !== -1 ? values[codeIdx] : '',
            estimatedHours: hours
        };
    }).filter(row => row.description);
};

export const groupActivities = (activityArray, actionTrackerDisciplines) => {
    const defaultGroups = {};
    (actionTrackerDisciplines || []).forEach(disc => {
        defaultGroups[disc.key] = [];
    });

    const managementKeywords = ['Detailing Management', 'Project Content Development', 'Project Coordination Management'];
    const vdcKeywords = ['Project VDC Admin', 'Project Setup', 'Project Data Management', 'Project Closeout'];

    return activityArray.reduce((acc, act) => {
        const descRaw = act.description ?? '';
        const desc = normalizeDesc(descRaw);
        let groupKeyToUse = null;

        const disciplines = actionTrackerDisciplines || [];
        
        if (/^mh\s*/i.test(desc)) {
            const match = disciplines.find(d => d.label.toLowerCase().includes('duct') || d.label.toLowerCase().includes('sheet'));
            groupKeyToUse = match?.key || 'sheetmetal';
        } else if (/^mp\s*/i.test(desc)) {
            const match = disciplines.find(d => d.label.toLowerCase().includes('piping') || d.label.toLowerCase().includes('pipe'));
            groupKeyToUse = match?.key || 'piping';
        } else if (/^pl\s*/i.test(desc)) {
            const match = disciplines.find(d => d.label.toLowerCase().includes('plumb'));
            groupKeyToUse = match?.key || 'plumbing';
        } else if (managementKeywords.some(keyword => desc.includes(keyword.toLowerCase()))) {
            const match = disciplines.find(d => d.label.toLowerCase().includes('manage') || d.label.toLowerCase().includes('coord'));
            groupKeyToUse = match?.key || 'management';
        } else if (vdcKeywords.some(keyword => desc.includes(keyword.toLowerCase()))) {
            const match = disciplines.find(d => d.label.toLowerCase().includes('vdc'));
            groupKeyToUse = match?.key || 'vdc';
        } else {
            const disciplineMatch = disciplines.find(d => desc.toUpperCase().startsWith(d.label.substring(0, 2).toUpperCase()));
            groupKeyToUse = disciplineMatch?.key;
        }

        if (!groupKeyToUse) groupKeyToUse = 'uncategorized';
        if (!acc[groupKeyToUse]) acc[groupKeyToUse] = [];

        if (!acc[groupKeyToUse].some(existingAct => normalizeDesc(existingAct.description) === desc)) {
            acc[groupKeyToUse].push({ ...act, description: act.description });
        }

        return acc;
    }, { ...defaultGroups });
};

// --- Shared UI Components ---

export const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center justify-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && text && (
                <div className="absolute bottom-full mb-2 w-max max-w-xs px-3 py-2 bg-gray-900 text-white text-xs rounded-md z-20 shadow-lg border border-gray-700 pointer-events-none">
                    <p className="font-mono whitespace-pre-wrap text-left">{text}</p>
                </div>
            )}
        </div>
    );
};

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children, currentTheme }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center backdrop-blur-sm">
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-xl shadow-2xl w-full max-w-md border ${currentTheme.borderColor}`}>
                <h3 className="text-lg font-bold mb-4">{title}</h3>
                <div className={`mb-6 ${currentTheme.subtleText}`}>{children}</div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className={`px-4 py-2 rounded-md ${currentTheme.buttonBg} hover:opacity-80 transition-opacity`}>Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20">Confirm</button>
                </div>
            </div>
        </div>
    );
};

// --- NEW Interactive CSV Review Modal ---
export const CSVReviewModal = ({ isOpen, onClose, onConfirm, stagingData, currentTheme }) => {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        if (stagingData) {
            setRows(stagingData);
        }
    }, [stagingData]);

    const handleRowToggle = (index) => {
        setRows(prev => prev.map((r, i) => i === index ? { ...r, selection: { ...r.selection, row: !r.selection.row } } : r));
    };

    const handleCellToggle = (index, field) => {
        setRows(prev => prev.map((r, i) => i === index ? { ...r, selection: { ...r.selection, [field]: !r.selection[field] } } : r));
    };

    const handleSelectAll = (select) => {
        setRows(prev => prev.map(r => ({ ...r, selection: { ...r.selection, row: select } })));
    };

    if (!isOpen) return null;

    const DiffCell = ({ original, incoming, isSelected, onToggle }) => {
        // Use strict equality with string conversion to catch '120' vs 120 as match without lint errors
        const isDiff = String(original ?? '') !== String(incoming ?? '');
        const isNew = (original === undefined || original === null || original === '') && (incoming !== undefined && incoming !== '' && incoming !== 0);
        
        // If it's a match, show plain text
        if (!isDiff && !isNew) {
            return (
                <div className="flex items-center gap-2 opacity-60">
                    <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={onToggle}
                        className="cursor-pointer opacity-50"
                        title="Values match"
                    />
                    <span className="text-gray-400 font-mono">{original || incoming || '-'}</span>
                </div>
            );
        }
        
        return (
            <div className={`flex items-start gap-2 ${isSelected ? 'opacity-100' : 'opacity-50'} transition-opacity`}>
                <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={onToggle}
                    className="mt-1 cursor-pointer"
                />
                <div className="flex flex-col text-xs font-mono">
                    {original !== undefined && original !== null && original !== '' && (
                        <div className="flex items-center gap-2 text-red-400/80 mb-0.5">
                            <span className="uppercase text-[8px] font-bold tracking-wider bg-red-900/30 px-1 rounded">OLD</span>
                            <span className="line-through decoration-red-500/50">{original}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-green-400 font-bold">
                        <span className="uppercase text-[8px] font-bold tracking-wider bg-green-900/30 px-1 rounded">NEW</span>
                        <span>{incoming}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex justify-center items-center backdrop-blur-md">
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-xl shadow-2xl w-full max-w-6xl border ${currentTheme.borderColor} flex flex-col max-h-[90vh]`}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700/50">
                    <div>
                        <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Review CSV Import
                        </h3>
                        <p className="text-sm opacity-60 mt-1">Review changes below. Select rows and specific cells to apply updates.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleSelectAll(true)} className="text-xs px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors">Select All Rows</button>
                        <button onClick={() => handleSelectAll(false)} className="text-xs px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors">Deselect All</button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto mb-6 pr-2 bg-black/20 rounded p-1 border border-gray-700/50">
                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 bg-gray-800 z-10 shadow-sm">
                            <tr className="text-xs uppercase text-gray-400">
                                <th className="p-3 w-10 text-center border-b border-gray-700">#</th>
                                <th className="p-3 border-b border-gray-700 w-1/3">Activity</th>
                                <th className="p-3 border-b border-gray-700">Charge Code</th>
                                <th className="p-3 border-b border-gray-700">Est. Hours</th>
                                <th className="p-3 w-28 text-center border-b border-gray-700">Change Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => {
                                const isRowSelected = row.selection.row;
                                return (
                                    <tr key={i} className={`group hover:bg-white/5 transition-colors ${!isRowSelected ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                                        <td className="p-3 text-center border-b border-gray-800">
                                            <input 
                                                type="checkbox" 
                                                checked={isRowSelected} 
                                                onChange={() => handleRowToggle(i)}
                                                className="w-4 h-4 cursor-pointer accent-blue-500"
                                            />
                                        </td>
                                        <td className="p-3 font-medium border-b border-gray-800">
                                            <div className="truncate max-w-sm" title={row.csvData.description}>
                                                {row.csvData.description}
                                            </div>
                                            {row.existingData && (
                                                <div className="text-[10px] text-gray-500 mt-0.5">
                                                    ID: {row.existingData.id} • Group: {row.existingData.group}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 border-b border-gray-800">
                                            <DiffCell 
                                                original={row.existingData?.chargeCode} 
                                                incoming={row.csvData.chargeCode}
                                                isSelected={row.selection.code && isRowSelected}
                                                onToggle={() => handleCellToggle(i, 'code')}
                                            />
                                        </td>
                                        <td className="p-3 border-b border-gray-800">
                                            <DiffCell 
                                                original={row.existingData?.estimatedHours} 
                                                incoming={row.csvData.estimatedHours}
                                                isSelected={row.selection.hours && isRowSelected}
                                                onToggle={() => handleCellToggle(i, 'hours')}
                                            />
                                        </td>
                                        <td className="p-3 text-center border-b border-gray-800">
                                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide min-w-[80px]
                                                ${row.status === 'New' ? 'bg-blue-900/50 text-blue-200 border border-blue-700/50' : 
                                                  row.status === 'Update' ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-700/50' : 
                                                  'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center pt-4">
                    <div className="text-xs text-gray-400">
                        <strong className="text-white">{rows.filter(r => r.selection.row).length}</strong> rows selected for import
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className={`px-5 py-2.5 rounded-lg border border-gray-600 hover:bg-gray-700 text-gray-300 transition-all font-medium text-sm`}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onConfirm(rows)} 
                            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-900/30 transition-all font-bold text-sm flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Financial Summary Component ---

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

// --- Financial Forecast Chart (D3) ---

export const FinancialForecastChart = ({ project, weeklyHours, activityTotals, currentBudget, currentTheme }) => {
    const svgRef = useRef(null);

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
                weeklyTotalHours += weeklyHours[trade]?.[week] || 0;
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
        if (!chartData || !svgRef.current || !activityTotals) return;

        const { plannedSpend, startDate, endDate } = chartData;
        const { totalEarnedValue = 0, totalActualCost = 0, totalProjectedCost = 0 } = activityTotals;

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

// --- Budget Impact Log ---

export const BudgetImpactLog = ({ impacts, onAdd, onDelete, currentTheme, project, activities }) => {
    const tradeActivityOptions = useMemo(() => {
        const options = new Set();
        if (activities) {
            Object.values(activities).flat().forEach(activity => {
                options.add(normalizeDesc(activity.description)); 
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

// --- Action Tracker Components ---

export const ProjectBreakdown = ({ mainItems, onAdd, onUpdate, onDelete, onReorder, currentTheme }) => {
    // ... (ProjectBreakdown logic from previous file - abbreviated for brevity)
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
        e.dataTransfer.setData('text/plain', item.id);
    };

     const handleDragOver = (e) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropTargetId) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === dropTargetId) {
             setDraggingItem(null);
             return; 
        }

        const updatedItems = [...mainItems];
        const draggedItemIndex = updatedItems.findIndex(item => item.id === draggedId);
        const targetIndex = updatedItems.findIndex(item => item.id === dropTargetId);

        if (draggedItemIndex === -1 || targetIndex === -1) {
             setDraggingItem(null);
             return; 
        }

        const [reorderedItem] = updatedItems.splice(draggedItemIndex, 1);
        updatedItems.splice(targetIndex, 0, reorderedItem);

        onReorder(updatedItems);
        setDraggingItem(null);
    };

     const handleDragEnd = () => {
        setDraggingItem(null);
    };

    return (
        <>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4 hide-scrollbar-on-hover pr-2"> 
                {(mainItems || []).map((item, index) => (
                    <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-move transition-opacity ${draggingItem?.id === item.id ? 'opacity-40 bg-blue-400/30' : 'bg-gray-500/10'}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onDragEnd={handleDragEnd} 
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
                        <div className="flex gap-2 flex-shrink-0 ml-2"> 
                            <button onClick={() => setEditingItem({...item})} className="text-blue-500 text-sm">Edit</button>
                            <button onClick={() => onDelete(item.id)} className="text-red-500 text-sm">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 border-t pt-2 border-gray-500/20"> 
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

// Standard discipline options for MEP fabrication
const STANDARD_DISCIPLINE_OPTIONS = [
    // Core MEP Trades
    { key: 'duct', label: 'MH' },
    { key: 'piping', label: 'MP' },
    { key: 'processpiping', label: 'PP' },
    { key: 'plumbing', label: 'PL' },
    { key: 'fireprotection', label: 'FP' },
    { key: 'medgas', label: 'PJ' },
    // Structural & Electrical
    { key: 'structural', label: 'ST' },
    // VDC & Technology
    { key: 'vdc', label: 'VDC' },
    { key: 'coordination', label: 'Coord' },
    { key: 'gisgps', label: 'GIS/GPS' },
    // Management & Admin
    { key: 'management', label: 'MGMT' },
];

export const ActionTrackerDisciplineManager = ({ disciplines, onAdd, onDelete, currentTheme }) => {
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [customDiscipline, setCustomDiscipline] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Filter out disciplines that are already added
    const availableDisciplines = STANDARD_DISCIPLINE_OPTIONS.filter(
        opt => !disciplines.some(d => d.key === opt.key)
    );

    const handleAdd = () => {
        if (selectedDiscipline) {
            const disciplineToAdd = STANDARD_DISCIPLINE_OPTIONS.find(d => d.key === selectedDiscipline);
            if (disciplineToAdd) {
                onAdd({ key: disciplineToAdd.key, label: disciplineToAdd.label });
                setSelectedDiscipline('');
            }
        }
    };

    const handleAddCustom = () => {
        if (customDiscipline.trim()) {
            const newKey = customDiscipline.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (disciplines.some(d => d.key === newKey || d.label.toLowerCase() === customDiscipline.trim().toLowerCase())) {
                alert('A discipline with this name already exists.');
                return;
            }
            onAdd({ key: newKey, label: customDiscipline.trim() });
            setCustomDiscipline('');
            setShowCustomInput(false);
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
            
            {!showCustomInput ? (
                <div className="flex gap-2 border-t pt-2 border-gray-500/20">
                    <select
                        value={selectedDiscipline}
                        onChange={e => setSelectedDiscipline(e.target.value)}
                        className={`flex-grow p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    >
                        <option value="">Select Discipline...</option>
                        {availableDisciplines.map(d => (
                            <option key={d.key} value={d.key}>{d.label}</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleAdd} 
                        disabled={!selectedDiscipline}
                        className={`p-1 px-3 rounded ${currentTheme.buttonBg} hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Add
                    </button>
                    <button 
                        onClick={() => setShowCustomInput(true)}
                        className={`p-1 px-2 rounded text-sm border ${currentTheme.borderColor} hover:bg-gray-500/20`}
                        title="Add custom discipline"
                    >
                        +Custom
                    </button>
                </div>
            ) : (
                <div className="flex gap-2 border-t pt-2 border-gray-500/20">
                    <input
                        type="text"
                        value={customDiscipline}
                        onChange={e => setCustomDiscipline(e.target.value)}
                        placeholder="Custom discipline name..."
                        className={`flex-grow p-1 border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCustom(); if (e.key === 'Escape') setShowCustomInput(false); }}
                        autoFocus
                    />
                    <button 
                        onClick={handleAddCustom} 
                        disabled={!customDiscipline.trim()}
                        className={`p-1 px-3 rounded ${currentTheme.buttonBg} hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Add
                    </button>
                    <button 
                        onClick={() => { setShowCustomInput(false); setCustomDiscipline(''); }}
                        className={`p-1 px-2 rounded text-sm border ${currentTheme.borderColor} hover:bg-gray-500/20`}
                    >
                        Cancel
                    </button>
                </div>
            )}
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

    const projectWideDisciplines = (actionTrackerDisciplines || []).filter(disc =>
        projectWideActivities?.includes(disc.key) && activeTrades.includes(disc.key)
    );

    return (
        <div className="space-y-4">
            {projectWideDisciplines.length > 0 && (
                 <div className="p-3 rounded-md bg-black/20">
                    <h4 className="font-bold text-md mb-2">Project-Wide Activities</h4>
                    <div className="space-y-3 pt-2">
                        {projectWideDisciplines.map(discipline => {
                            const trade = discipline.key;
                            const style = tradeColorMapping[trade] || { bg: 'bg-gray-500/70', text: 'text-white' };
                            const tradeActivities = activities?.[trade] || []; 
                            const tradeSectionId = `project_wide_trade_${trade}`;

                            return (
                                <div key={trade}>
                                    <button onClick={() => onToggle(tradeSectionId)} className={`w-full p-2 rounded-t-md ${style.bg} ${style.text} flex justify-between items-center`}>
                                        <span className="font-bold text-sm">{discipline.label}</span>
                                        <motion.svg
                                            animate={{ rotate: collapsedSections[tradeSectionId] ? 0 : 180 }}
                                            transition={{ duration: 0.2 }}
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
                                                {tradeActivities.length === 0 ? (
                                                    <div className="text-center py-4 text-sm opacity-60">
                                                        No activities yet. Add activities in the <strong>Activity Values Breakdown</strong> section below.
                                                    </div>
                                                ) : (
                                                    tradeActivities.map(act => {
                                                        const activityCompletion = (actionTrackerData?.project_wide?.[trade]?.[act.id]) ?? '';
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

            {(mainItems || []).map(main => (
                <div key={main.id} className="p-3 rounded-md bg-black/20">
                    <button onClick={() => onToggle(`main_${main.id}`)} className="w-full flex justify-between items-center text-left mb-2">
                        <h4 className="font-bold text-md">{main.name}</h4>
                        <motion.svg
                            animate={{ rotate: collapsedSections[`main_${main.id}`] ? 0 : 180 }}
                            transition={{ duration: 0.2 }}
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

                                    const tradeActivities = activities?.[trade] || []; 

                                    const tradeTotalHours = tradeActivities.reduce((sum, act) => sum + Number(act.estimatedHours || 0), 0);
                                    const percentageOfProject = totalProjectHours > 0 ? (tradeTotalHours / totalProjectHours) * 100 : 0;

                                    const tradeData = actionTrackerData?.[main.id]?.[trade] || {};
                                    const tradePercentage = tradeData.tradePercentage ?? ''; 
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
                                                        transition={{ duration: 0.2 }}
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
                                                        {tradeActivities.length === 0 ? (
                                                            <div className="text-center py-4 text-sm opacity-60">
                                                                No activities yet. Add activities in the <strong>Activity Values Breakdown</strong> section below.
                                                            </div>
                                                        ) : (
                                                            tradeActivities.map(act => {
                                                                const activityCompletion = (tradeData.activities?.[act.id]) ?? '';
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
    
    // Local state for text inputs to prevent cursor jumping
    const [localDescription, setLocalDescription] = useState(activity.description || '');
    const [localChargeCode, setLocalChargeCode] = useState(activity.chargeCode || '');
    const [localEstimatedHours, setLocalEstimatedHours] = useState(estimatedHours);
    const [localCostToDate, setLocalCostToDate] = useState(costToDate);
    const [localPercentComplete, setLocalPercentComplete] = useState(percentComplete);
    
    // Sync local state when activity prop changes (e.g., from another source)
    useEffect(() => {
        setLocalDescription(activity.description || '');
    }, [activity.description]);
    
    useEffect(() => {
        setLocalChargeCode(activity.chargeCode || '');
    }, [activity.chargeCode]);
    
    useEffect(() => {
        setLocalEstimatedHours(activity.estimatedHours || 0);
    }, [activity.estimatedHours]);
    
    useEffect(() => {
        setLocalCostToDate(activity.costToDate || 0);
    }, [activity.costToDate]);
    
    useEffect(() => {
        setLocalPercentComplete(activity.percentComplete || 0);
    }, [activity.percentComplete]);

    const rateToUse = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);

    const rawBudget = (Number(localEstimatedHours) || 0) * rateToUse;
    const lineItemBudget = Math.ceil(rawBudget / 5) * 5;
    const earnedValue = lineItemBudget * (Number(localPercentComplete) / 100);
    
    const percentOfProject = totalProjectHours > 0 ? (Number(localEstimatedHours) / totalProjectHours) * 100 : 0;

    const calculateProjectedCost = (localCost, localPercent) => {
        const cost = Number(localCost) || 0;
        const percent = Number(localPercent) || 0;
        if (percent <= 0) {
             const estHrs = Number(localEstimatedHours) || 0;
             const rate = rateType === 'VDC Rate' ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
             const budget = Math.ceil((estHrs * rate) / 5) * 5;
             return budget > 0 ? budget : 0;
        }
        return (cost / percent) * 100;
    };
    const projectedCost = calculateProjectedCost(localCostToDate, localPercentComplete);

    // Save handlers - only save to Firestore on blur
    const handleDescriptionBlur = () => {
        if (localDescription !== activity.description) {
            onChange(groupKey, index, 'description', localDescription);
        }
    };
    
    const handleChargeCodeBlur = () => {
        if (localChargeCode !== (activity.chargeCode || '')) {
            onChange(groupKey, index, 'chargeCode', localChargeCode);
        }
    };
    
    const handleEstimatedHoursBlur = () => {
        if (localEstimatedHours !== activity.estimatedHours) {
            onChange(groupKey, index, 'estimatedHours', localEstimatedHours);
        }
    };
    
    const handleCostToDateBlur = () => {
        if (localCostToDate !== activity.costToDate) {
            onChange(groupKey, index, 'costToDate', localCostToDate);
        }
    };
    
    const handlePercentCompleteBlur = () => {
        if (localPercentComplete !== activity.percentComplete) {
            onChange(groupKey, index, 'percentComplete', localPercentComplete);
        }
    };

    return (
        <tr key={activity.id} className={currentTheme.cardBg}>
            <td className="p-1">
                <input 
                    type="text" 
                    value={localDescription} 
                    onChange={(e) => setLocalDescription(e.target.value)} 
                    onBlur={handleDescriptionBlur}
                    className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} 
                />
            </td>
            <td className="p-1">
                <input 
                    type="text" 
                    value={localChargeCode} 
                    onChange={(e) => setLocalChargeCode(e.target.value)} 
                    onBlur={handleChargeCodeBlur}
                    className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} 
                />
            </td>
            <td className="p-1 w-24">
                <input 
                    type="number" 
                    value={localEstimatedHours} 
                    onChange={(e) => setLocalEstimatedHours(e.target.value)} 
                    onBlur={handleEstimatedHoursBlur}
                    className={`w-full p-1 bg-transparent rounded ${currentTheme.inputText}`} 
                />
            </td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text={`Est. Hours * Rate (Raw: ${formatCurrency(rawBudget)})`}><p>{formatCurrency(lineItemBudget)}</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Est. Hrs / Total Est. Hrs) * 100"><p>{percentOfProject.toFixed(2)}%</p></Tooltip></td>
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}>
                {(accessLevel === 'taskmaster' || accessLevel === 'tcl') ? (
                    <div className="flex items-center justify-center">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={localPercentComplete}
                            onChange={(e) => setLocalPercentComplete(e.target.value)}
                            onBlur={handlePercentCompleteBlur}
                            className={`w-16 p-1 bg-transparent rounded text-center ${currentTheme.inputText}`}
                        />
                        <span>%</span>
                    </div>
                ) : (
                    <p>{Number(localPercentComplete || 0).toFixed(2)}%</p>
                )}
            </td>
            
            <td className={`p-1 w-24 text-center`}>
                {accessLevel === 'taskmaster' ? (
                    <input
                        type="number"
                        value={localCostToDate}
                        onChange={(e) => setLocalCostToDate(e.target.value)}
                        onBlur={handleCostToDateBlur}
                        className={`w-full p-1 bg-transparent rounded text-center ${currentTheme.inputText}`}
                    />
                ) : (
                    <p>{formatCurrency(localCostToDate)}</p>
                )}
            </td>
            
            <td className={`p-1 w-24 text-center ${currentTheme.altRowBg}`}><Tooltip text="(Budget * % Comp)"><p>{formatCurrency(earnedValue)}</p></Tooltip></td>

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
            <div className={`w-full p-2 text-left font-bold flex justify-between items-center ${colorClass}`}>
                <div className="flex-grow flex items-center">
                    <motion.svg onClick={onToggle}
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                        xmlns="http://www.w3.org/2000/svg" className="cursor-pointer h-5 w-5 transition-transform flex-shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>
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
                    <div className="flex-grow grid grid-cols-8 text-xs ml-4">
                        <span></span> 
                        <span className="text-center">{groupTotals.estimated.toFixed(2)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.budget)}</span>
                        <span></span> 
                        <span className="text-center">{groupTotals.percentComplete.toFixed(2)}%</span>
                        <span className="text-center">{formatCurrency(groupTotals.earnedValue)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.actualCost)}</span>
                        <span className="text-center">{formatCurrency(groupTotals.projected)}</span> 
                    </div>
                </div>
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
                     {accessLevel === 'taskmaster' && ( 
                         <button onClick={(e) => { e.stopPropagation(); onDeleteGroup(groupKey); }} className="text-white hover:text-red-300 font-bold text-lg">&times;</button>
                     )}
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
                                    <th className={`p-2 text-center font-semibold ${currentTheme.textColor}`}><Tooltip text="Calculated automatically from the Action Tracker section.">% Comp</Tooltip></th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Actual Cost ($)</th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Earned ($)</th>
                                    <th className={`p-2 text-left font-semibold ${currentTheme.textColor}`}>Proj. Cost ($)</th>
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
                                 {accessLevel === 'taskmaster' && ( 
                                     <tr>
                                        <td colSpan="10"><button onClick={() => onAdd(groupKey)} className="text-sm text-blue-600 hover:underline">+ Add Activity</button></td>
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