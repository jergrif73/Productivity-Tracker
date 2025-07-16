import React, { useState, useMemo } from 'react';
import { TutorialHighlight } from './App';
import EmployeeSkillMatrix from './EmployeeSkillMatrix'; // Import the new component

const ReportingConsole = ({ projects, detailers, assignments, tasks, allProjectActivities, currentTheme }) => {
    const [reportType, setReportType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [selectedTrade, setSelectedTrade] = useState('');
    const [reportData, setReportData] = useState(null);
    const [reportHeaders, setReportHeaders] = useState([]);

    const uniqueTitles = useMemo(() => [...new Set(detailers.map(d => d.title).filter(Boolean))].sort(), [detailers]);
    const uniqueTrades = useMemo(() => {
        const trades = new Set();
        detailers.forEach(d => {
            if (Array.isArray(d.disciplineSkillsets) && d.disciplineSkillsets.length > 0) {
                trades.add(d.disciplineSkillsets[0].name); // Assuming primary trade is the first one
            }
        });
        return [...trades].sort();
    }, [detailers]);

    const getDaysInRange = (assStart, assEnd, reportStart, reportEnd) => {
        const effectiveStart = Math.max(assStart.getTime(), reportStart.getTime());
        const effectiveEnd = Math.min(assEnd.getTime(), reportEnd.getTime());
        
        if (effectiveStart > effectiveEnd) {
            return 0;
        }

        const diffTime = Math.abs(effectiveEnd - effectiveStart);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const projectActivitiesMap = useMemo(() => {
        const map = new Map();
        allProjectActivities.forEach(activityDoc => {
            map.set(activityDoc.id, activityDoc.activities);
        });
        return map;
    }, [allProjectActivities]);

    const filteredDetailersForMatrix = useMemo(() => {
        let filtered = [...detailers];
        if (selectedLevel) {
            filtered = filtered.filter(d => d.title === selectedLevel);
        }
        if (selectedTrade) {
            filtered = filtered.filter(d => {
                const primaryTrade = d.disciplineSkillsets && d.disciplineSkillsets.length > 0 ? d.disciplineSkillsets[0].name : null;
                return primaryTrade === selectedTrade;
            });
        }
        return filtered;
    }, [detailers, selectedLevel, selectedTrade]);

    const handleGenerateReport = () => {
        // Clear previous table data when generating a new report
        setReportData(null);
        setReportHeaders([]);

        // If the report is the skill matrix, we don't generate table data.
        // The matrix component will handle its own rendering based on filters.
        if (reportType === 'skill-matrix') {
            return;
        }

        let data = [];
        let headers = [];

        const sDate = startDate ? new Date(startDate) : null;
        const eDate = endDate ? new Date(endDate) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);

        switch (reportType) {
            case 'project-hours':
                headers = ["Project Name", "Project ID", "Total Allocated Hours"];
                const hoursByProject = assignments.reduce((acc, ass) => {
                    if (!sDate || !eDate) return acc;

                    const assStartDate = new Date(ass.startDate);
                    const assEndDate = new Date(ass.endDate);

                    const daysInRage = getDaysInRange(assStartDate, assEndDate, sDate, eDate);

                    if (daysInRage > 0) {
                        const project = projects.find(p => p.id === ass.projectId);
                        if (project) {
                            if (!acc[project.id]) {
                                acc[project.id] = { name: project.name, id: project.projectId, hours: 0 };
                            }
                            const dailyHours = (Number(ass.allocation) / 100) * 8;
                            acc[project.id].hours += daysInRage * dailyHours;
                        }
                    }
                    return acc;
                }, {});
                data = Object.values(hoursByProject).map(p => [p.name, p.id, p.hours.toFixed(2)]);
                break;
            
            case 'detailer-workload':
                 headers = ["Detailer", "Total Hours", "Projects"];
                 const hoursByDetailer = assignments.reduce((acc, ass) => {
                    if (!sDate || !eDate) return acc;
                    const assStartDate = new Date(ass.startDate);
                    const assEndDate = new Date(ass.endDate);
                    
                    const daysInRage = getDaysInRange(assStartDate, assEndDate, sDate, eDate);

                    if(daysInRage > 0) {
                        const detailer = detailers.find(d => d.id === ass.detailerId);
                        if(detailer) {
                            if(!acc[detailer.id]) {
                                acc[detailer.id] = { name: `${detailer.firstName} ${detailer.lastName}`, hours: 0, projects: new Set() };
                            }
                            const project = projects.find(p => p.id === ass.projectId);
                            const dailyHours = (Number(ass.allocation) / 100) * 8;
                            acc[detailer.id].hours += daysInRage * dailyHours;
                            if(project) acc[detailer.id].projects.add(project.name);
                        }
                    }
                    return acc;
                 }, {});
                 data = Object.values(hoursByDetailer).map(d => [d.name, d.hours.toFixed(2), Array.from(d.projects).join(', ')]);
                 break;

            case 'task-status':
                headers = ["Task Name", "Project", "Assignee", "Status", "Due Date"];
                data = tasks
                    .filter(t => {
                        if (!t.dueDate) return true;
                        const taskDueDate = new Date(t.dueDate);
                        return (!sDate || taskDueDate >= sDate) && (!eDate || taskDueDate <= eDate);
                    })
                    .map(task => {
                        const project = projects.find(p => p.id === task.projectId);
                        const assignee = detailers.find(d => d.id === task.detailerId);
                        return [
                            task.taskName,
                            project ? project.name : 'N/A',
                            assignee ? `${assignee.firstName} ${assignee.lastName}` : 'N/A',
                            task.status,
                            task.dueDate || 'N/A'
                        ];
                    });
                break;
            
            case 'forecast-vs-actual':
                headers = ["Project Name", "Project ID", "Forecasted Hours", "Assigned Hours", "Actual Burn (Hrs)", "Variance (Forecast - Actual)"];
                let projectsToReport = projects.filter(p => !p.archived);

                if (selectedProjectId) {
                    projectsToReport = projects.filter(p => p.id === selectedProjectId);
                } else if (sDate && eDate) {
                    const activeProjectIds = new Set();
                    assignments.forEach(ass => {
                        const assStartDate = new Date(ass.startDate);
                        const assEndDate = new Date(ass.endDate);
                        if(assStartDate <= eDate && assEndDate >= sDate) {
                            activeProjectIds.add(ass.projectId);
                        }
                    });
                    projectsToReport = projectsToReport.filter(p => activeProjectIds.has(p.id));
                }
                
                data = projectsToReport.map(p => {
                        const projectActivities = projectActivitiesMap.get(p.id);

                        const actualBurn = projectActivities 
                            ? Object.values(projectActivities).flat().reduce((sum, act) => sum + (Number(act.hoursUsed) || 0), 0)
                            : 0;

                        const assignedHours = assignments
                            .filter(a => a.projectId === p.id)
                            .reduce((sum, ass) => {
                                const assignmentStart = new Date(ass.startDate);
                                const assignmentEnd = new Date(ass.endDate);
                                const diffTime = Math.abs(assignmentEnd - assignmentStart);
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                const workDays = Math.ceil(diffDays * (5/7));
                                return sum + (workDays * 8 * (Number(ass.allocation) / 100));
                            }, 0);

                        const forecastedHours = projectActivities
                            ? Object.values(projectActivities).flat().reduce((sum, act) => sum + (Number(act.estimatedHours) || 0), 0)
                            : 0;

                        const variance = forecastedHours - actualBurn;

                        return [
                            p.name,
                            p.projectId,
                            forecastedHours.toFixed(2),
                            assignedHours.toFixed(2),
                            actualBurn.toFixed(2),
                            variance.toFixed(2)
                        ];
                    });
                break;
            
            case 'employee-details':
                const baseHeaders = [
                    "First Name", "Last Name", "Title", "Employee ID", "Email",
                    "Wage/hr", "% Above Scale", "Union Local"
                ];
                const generalSkillHeaders = [];
                for (let i = 1; i <= 5; i++) {
                    generalSkillHeaders.push(`General Skill ${i}`, `Skill ${i} Score`);
                }
                const disciplineSkillHeaders = [];
                for (let i = 1; i <= 7; i++) {
                    disciplineSkillHeaders.push(`Discipline ${i}`, `Discipline ${i} Score`);
                }
                headers = [...baseHeaders, ...generalSkillHeaders, ...disciplineSkillHeaders];

                let filteredDetailers = [...detailers];

                if (selectedLevel) {
                    filteredDetailers = filteredDetailers.filter(d => d.title === selectedLevel);
                }

                if (selectedTrade) {
                    filteredDetailers = filteredDetailers.filter(d => {
                        const primaryTrade = d.disciplineSkillsets && d.disciplineSkillsets.length > 0 ? d.disciplineSkillsets[0].name : null;
                        return primaryTrade === selectedTrade;
                    });
                }

                data = filteredDetailers.map(d => {
                    const baseData = [
                        d.firstName,
                        d.lastName,
                        d.title || 'N/A',
                        d.employeeId || 'N/A',
                        d.email || 'N/A',
                        d.wage || 0,
                        d.percentAboveScale || 0,
                        d.unionLocal || 'N/A',
                    ];

                    const generalSkillsData = [];
                    const generalSkills = d.skills ? Object.entries(d.skills) : [];
                    for (let i = 0; i < 5; i++) {
                        if (i < generalSkills.length) {
                            generalSkillsData.push(generalSkills[i][0]); // Skill name
                            generalSkillsData.push(generalSkills[i][1]); // Skill score
                        } else {
                            generalSkillsData.push('', ''); // Pad with empty values
                        }
                    }

                    const disciplineSkillsData = [];
                    const disciplineSkills = d.disciplineSkillsets || [];
                    for (let i = 0; i < 7; i++) {
                        if (i < disciplineSkills.length) {
                            disciplineSkillsData.push(disciplineSkills[i].name); // Discipline name
                            disciplineSkillsData.push(disciplineSkills[i].score); // Discipline score
                        } else {
                            disciplineSkillsData.push('', ''); // Pad with empty values
                        }
                    }

                    return [...baseData, ...generalSkillsData, ...disciplineSkillsData];
                });
                break;


            default:
                break;
        }
        setReportData(data);
        setReportHeaders(headers);
    };

    const handleClearReport = () => {
        setReportData(null);
        setReportHeaders([]);
        setSelectedLevel('');
        setSelectedTrade('');
        setSelectedProjectId('');
        setStartDate('');
        setEndDate('');
    };

    const exportToCSV = () => {
        if (!reportData || !reportHeaders) return;

        let csvContent = "data:text/csv;charset=utf-8," 
            + reportHeaders.map(h => `"${h}"`).join(",") + "\n" 
            + reportData.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${reportType}_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderFilters = () => {
        switch (reportType) {
            case 'employee-details':
            case 'skill-matrix':
                return (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Filter by Level</label>
                            <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Levels</option>
                                {uniqueTitles.map(title => <option key={title} value={title}>{title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Filter by Trade</label>
                            <select value={selectedTrade} onChange={e => setSelectedTrade(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Primary Trades</option>
                                {uniqueTrades.map(trade => <option key={trade} value={trade}>{trade}</option>)}
                            </select>
                        </div>
                    </>
                );
            case 'forecast-vs-actual':
                return (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Project</label>
                            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Projects</option>
                                {projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        </div>
                    </>
                );
            case 'project-hours':
            case 'detailer-workload':
            case 'task-status':
                return (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        </div>
                    </>
                );
            default:
                return null;
        }
    }

    return (
        <div className="p-4 h-full flex flex-col gap-4">
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #skill-matrix-printable-area, #skill-matrix-printable-area * {
                            visibility: visible;
                        }
                        #skill-matrix-printable-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                    }
                `}
            </style>
            <div className="flex-shrink-0">
                <TutorialHighlight tutorialKey="reporting">
                    <h2 className={`text-2xl font-bold ${currentTheme.textColor}`}>Reporting Console</h2>
                </TutorialHighlight>
            </div>

            <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} space-y-4 flex-shrink-0`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <TutorialHighlight tutorialKey="reportType">
                        <div>
                            <label className="block text-sm font-medium mb-1">Report Type</label>
                            <select value={reportType} onChange={e => setReportType(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">Select a report...</option>
                                <option value="project-hours">Project Hours Summary</option>
                                <option value="detailer-workload">Detailer Workload Summary</option>
                                <option value="task-status">Task Status Report</option>
                                <option value="forecast-vs-actual">Forecast vs. Actuals Summary</option>
                                <option value="employee-details">Employee Skills & Details (Table)</option>
                                <option value="skill-matrix">Employee Skill Matrix (Chart)</option>
                            </select>
                        </div>
                    </TutorialHighlight>
                    
                    {renderFilters()}

                    <button onClick={handleGenerateReport} disabled={!reportType} className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">Generate</button>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto hide-scrollbar-on-hover">
                {reportType === 'skill-matrix' && (
                    <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Employee Skill Matrix</h3>
                             <div className="flex gap-2">
                                <button onClick={() => window.print()} className="bg-teal-600 text-white p-2 rounded-md hover:bg-teal-700">Print Matrix</button>
                                <button onClick={handleClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear</button>
                             </div>
                        </div>
                        <EmployeeSkillMatrix detailers={filteredDetailersForMatrix} currentTheme={currentTheme} />
                    </div>
                )}

                {reportData && (
                     <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Report Results</h3>
                            <TutorialHighlight tutorialKey="exportToCSV">
                                <div className="flex gap-2">
                                     <button onClick={handleClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear Report</button>
                                     <button onClick={exportToCSV} className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700">Export to CSV</button>
                                </div>
                            </TutorialHighlight>
                        </div>
                        <div className="overflow-auto hide-scrollbar-on-hover max-h-[60vh]">
                            <table className="min-w-full">
                                <thead className={`${currentTheme.altRowBg} sticky top-0`}>
                                    <tr >
                                        {reportHeaders.map(header => <th key={header} className="p-2 text-left font-semibold">{header}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((row, rowIndex) => (
                                        <tr key={rowIndex} className={`border-b ${currentTheme.borderColor}`}>
                                            {row.map((cell, cellIndex) => <td key={cellIndex} className="p-2">{cell}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                )}
            </div>
        </div>
    );
};

export default ReportingConsole;
