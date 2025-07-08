import React, { useState } from 'react';

const ReportingConsole = ({ projects, detailers, assignments, tasks, currentTheme }) => {
    const [reportType, setReportType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState(null);
    const [reportHeaders, setReportHeaders] = useState([]);

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

    const handleGenerateReport = () => {
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

            default:
                break;
        }
        setReportData(data);
        setReportHeaders(headers);
    };

    const exportToCSV = () => {
        if (!reportData || !reportHeaders) return;

        let csvContent = "data:text/csv;charset=utf-8," 
            + reportHeaders.map(h => `"${h}"`).join(",") + "\n" 
            + reportData.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${reportType}_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className={`text-2xl font-bold ${currentTheme.textColor}`}>Reporting Console</h2>

            <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} space-y-4`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            <option value="">Select a report...</option>
                            <option value="project-hours">Project Hours Summary</option>
                            <option value="detailer-workload">Detailer Workload Summary</option>
                            <option value="task-status">Task Status Report</option>
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
                    <button onClick={handleGenerateReport} disabled={!reportType} className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">Generate Report</button>
                </div>
            </div>

            {reportData && (
                 <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Report Results</h3>
                        <button onClick={exportToCSV} className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700">Export to CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className={`${currentTheme.altRowBg}`}>
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
    );
};

export default ReportingConsole;