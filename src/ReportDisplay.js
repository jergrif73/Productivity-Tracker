import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { TutorialHighlight } from './App';
import EmployeeSkillMatrix from './EmployeeSkillMatrix';
import FullProjectReport from './FullProjectReport'; // Import the new component
import * as d3 from 'd3';

// --- D3 Chart Components (Moved from ReportingConsole) ---

const ProjectHealthChart = ({ data, currentTheme }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 40, right: 150, bottom: 60, left: 60 };
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const costValues = data.map(d => d.costVariance);
        const scheduleValues = data.map(d => d.scheduleVariance);
        const budgetValues = data.map(d => d.budget);

        const x = d3.scaleLinear()
            .domain([d3.min(scheduleValues) * 1.1, d3.max(scheduleValues) * 1.1])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([d3.min(costValues) * 1.1, d3.max(costValues) * 1.1])
            .range([height, 0]);

        const z = d3.scaleSqrt()
            .domain([0, d3.max(budgetValues)])
            .range([4, 40]);

        const tooltip = d3.select("body").append("div")
            .attr("class", "absolute opacity-0 transition-opacity duration-300 bg-gray-900 text-white text-xs rounded-md p-2 pointer-events-none shadow-lg z-50 border border-gray-700");

        // Quadrant lines
        chart.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", currentTheme.borderColor).attr("stroke-dasharray", "4");
        chart.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", height).attr("stroke", currentTheme.borderColor).attr("stroke-dasharray", "4");
        
        // Quadrant labels
        chart.append("text").text("Ahead Schedule, Over Budget").attr("x", width).attr("y", 0).attr("text-anchor", "end").attr("fill", currentTheme.subtleText).style("font-size", "10px");
        chart.append("text").text("Ahead Schedule, Under Budget").attr("x", width).attr("y", height).attr("text-anchor", "end").attr("dy", "1em").attr("fill", "green").style("font-size", "10px");
        chart.append("text").text("Behind Schedule, Over Budget").attr("x", 0).attr("y", 0).attr("text-anchor", "start").attr("fill", "red").style("font-size", "10px");
        chart.append("text").text("Behind Schedule, Under Budget").attr("x", 0).attr("y", height).attr("text-anchor", "start").attr("dy", "1em").attr("fill", currentTheme.subtleText).style("font-size", "10px");


        chart.append("g").call(d3.axisBottom(x).ticks(5).tickFormat(d => d3.format("$,.0s")(d))).attr("transform", `translate(0, ${height})`).selectAll("text,path,line").attr("stroke", currentTheme.textColor);
        chart.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format("$,.0s")(d))).selectAll("text,path,line").attr("stroke", currentTheme.textColor);

        chart.append("text").attr("text-anchor", "middle").attr("x", width / 2).attr("y", height + 40).text("Schedule Variance (SV)").attr("fill", currentTheme.textColor);
        chart.append("text").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("y", -margin.left + 20).attr("x", -height / 2).text("Cost Variance (CV)").attr("fill", currentTheme.textColor);

        chart.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.scheduleVariance))
            .attr("cy", d => y(d.costVariance))
            .attr("r", d => z(d.budget))
            .style("fill", d => d.costVariance > 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)")
            .style("stroke", d => d.costVariance > 0 ? "rgb(22, 163, 74)" : "rgb(220, 38, 38)")
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<strong>${d.name}</strong><br/>Budget: ${d3.format("$,.0f")(d.budget)}<br/>CV: ${d3.format("$,.0f")(d.costVariance)}<br/>SV: ${d3.format("$,.0f")(d.scheduleVariance)}`)
                    .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
                d3.select(this).style("stroke-width", 2.5).style("stroke", "black");
            })
            .on("mouseout", function(event, d) {
                tooltip.transition().duration(500).style("opacity", 0);
                 d3.select(this).style("stroke-width", 1).style("stroke", d.costVariance > 0 ? "rgb(22, 163, 74)" : "rgb(220, 38, 38)");
            });

    }, [data, currentTheme]);

    return <svg ref={svgRef} width="600" height="400"></svg>;
};

const EmployeeWorkloadChart = ({ data, currentTheme }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || data.length === 0) return;
        
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = 1560; // Increased width by 30%
        const height = 910; // Increased height proportionally
        const margin = 80; // Increased margin for more label space
        const radius = Math.min(width, height) / 2 - margin;

        const chart = svg.append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        const color = d3.scaleOrdinal(d3.schemeTableau10);

        const pie = d3.pie().value(d => d.hours).sort(null);
        const data_ready = pie(data);

        const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);
        const outerArc = d3.arc().innerRadius(radius * 0.9).outerRadius(radius * 0.9);

        chart.selectAll('allSlices')
            .data(data_ready)
            .join('path')
            .attr('d', arc)
            .attr('fill', d => color(d.data.projectName))
            .attr('stroke', currentTheme.cardBg)
            .style('stroke-width', '2px')
            .style('opacity', 0.7);

        chart.selectAll('allPolylines')
            .data(data_ready)
            .join('polyline')
            .attr("stroke", "white")
            .style("fill", "none")
            .attr("stroke-width", 1)
            .attr('points', d => {
                const posA = arc.centroid(d);
                const posB = outerArc.centroid(d);
                const posC = outerArc.centroid(d);
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1);
                return [posA, posB, posC];
            });

        chart.selectAll('allLabels')
            .data(data_ready)
            .join('text')
            .text(d => {
                const hours = d.data.hours || 0;
                return `${d.data.projectName} (${hours.toFixed(1)} hrs)`;
            })
            .attr('transform', d => {
                const pos = outerArc.centroid(d);
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1);
                return `translate(${pos})`;
            })
            .style('text-anchor', d => {
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                return (midangle < Math.PI ? 'start' : 'end');
            })
            .style('fill', 'white')
            .style('font-size', '12px');

    }, [data, currentTheme]);

    return <svg ref={svgRef} width="1560" height="910"></svg>;
};

// Helper for CSV Export (moved from ReportingConsole)
const exportToCSV = (reportData, reportHeaders, reportType) => {
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


const ReportDisplay = ({
    reportData, reportHeaders, chartData, reportType, sortConfig, currentTheme,
    filteredDetailersForMatrix, accessLevel, db, appId,
    onClearReport, onRequestSort, assignments = [], detailers = []
}) => {

    // Memoized sorted report data (moved from ReportingConsole)
    const sortedReportData = useMemo(() => {
        if (!reportData || !sortConfig.key) {
            return reportData;
        }
        
        // Don't try to sort full-project-report - it has a different structure
        if (reportType === 'full-project-report') {
            return reportData;
        }
        
        // Ensure reportData is an array before sorting
        if (!Array.isArray(reportData)) {
            console.warn('reportData is not an array:', reportData);
            return reportData;
        }
        
        const headerIndex = reportHeaders.indexOf(sortConfig.key);
        if (headerIndex === -1) {
            return reportData;
        }
        const sorted = [...reportData].sort((a, b) => {
            const aValue = a[headerIndex];
            const bValue = b[headerIndex];
            const isNumeric = !isNaN(parseFloat(aValue)) && isFinite(aValue) && !isNaN(parseFloat(bValue)) && isFinite(bValue);
            if (isNumeric) {
                return (parseFloat(aValue) - parseFloat(bValue)) * (sortConfig.direction === 'ascending' ? 1 : -1);
            } else {
                return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' }) * (sortConfig.direction === 'ascending' ? 1 : -1);
            }
        });
        return sorted;
    }, [reportData, sortConfig, reportHeaders, reportType]);

    const renderChart = useCallback(() => {
        if (!chartData) return null;
        switch (reportType) {
            case 'project-health':
                return <ProjectHealthChart data={chartData} currentTheme={currentTheme} />;
            case 'employee-workload-dist':
                return <EmployeeWorkloadChart data={chartData} currentTheme={currentTheme} />;
            default:
                return null;
        }
    }, [chartData, reportType, currentTheme]);

    const handleExport = () => {
        exportToCSV(sortedReportData, reportHeaders, reportType);
    };

    // Print handler - opens report in new window for clean printing
    const handlePrintReport = () => {
        const reportContent = document.getElementById('full-project-report-print');
        if (!reportContent) return;

        // Generate filename: MM_DD_YY_ProjectID_Report
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const year = String(today.getFullYear()).slice(-2);
        const projectId = reportData?.project?.projectId || 'Unknown';
        const filename = `${month}_${day}_${year}_${projectId}_Report`;

        // Open a new window
        const printWindow = window.open('', '_blank', 'width=850,height=1100');
        if (!printWindow) {
            alert('Please allow popups to print the report');
            return;
        }

        // Write the HTML document
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    @page {
                        size: letter portrait;
                        margin: 0.25in;
                    }
                    @media print {
                        .no-print {
                            display: none !important;
                        }
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 8px;
                        background: white;
                        color: #1F2937;
                    }
                    .print-controls {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        z-index: 1000;
                        display: flex;
                        gap: 8px;
                    }
                    .print-controls button {
                        padding: 10px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    }
                    .print-btn {
                        background: #16a34a;
                        color: white;
                    }
                    .print-btn:hover {
                        background: #15803d;
                    }
                    .close-btn {
                        background: #6b7280;
                        color: white;
                    }
                    .close-btn:hover {
                        background: #4b5563;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        page-break-inside: auto;
                    }
                    tr {
                        page-break-inside: avoid;
                    }
                    thead {
                        display: table-header-group;
                    }
                    th, td {
                        padding: 4px 6px;
                        text-align: left;
                    }
                </style>
            </head>
            <body>
                <div class="print-controls no-print">
                    <button class="print-btn" onclick="window.print()">🖨️ Print</button>
                    <button class="close-btn" onclick="window.close()">✕ Close</button>
                </div>
                ${reportContent.innerHTML}
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
    };

    if (reportType === 'full-project-report' && reportData) {
        return (
            <div className="flex-grow flex flex-col min-h-0 min-w-0">
                <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} flex-grow flex flex-col`}>
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <h3 className="text-xl font-semibold">Report Results</h3>
                        <div className="flex gap-2">
                            <button onClick={onClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear Report</button>
                            <button onClick={handlePrintReport} className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700">Print</button>
                        </div>
                    </div>
                    <div id="full-project-report-printable" className="overflow-auto hide-scrollbar-on-hover flex-grow">
                        <FullProjectReport report={reportData} currentTheme={currentTheme} assignments={assignments} detailers={detailers} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow flex flex-col min-h-0 min-w-0">
            <div className="flex-grow overflow-auto hide-scrollbar-on-hover space-y-4">
                <TutorialHighlight tutorialKey="projectHealthDashboard">
                    {chartData && reportType === 'project-health' && (
                        <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Project Health Dashboard</h3>
                                <div className="flex gap-2">
                                    <button onClick={onClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear</button>
                                </div>
                            </div>
                            <div className="flex justify-center items-center">
                                {renderChart()}
                            </div>
                        </div>
                    )}
                </TutorialHighlight>
                
                <TutorialHighlight tutorialKey="employeeWorkloadDistro">
                    {chartData && reportType === 'employee-workload-dist' && (
                         <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Employee Workload Distribution</h3>
                                 <div className="flex gap-2">
                                    <button onClick={onClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear</button>
                                 </div>
                            </div>
                            <div className="flex justify-center items-center">
                                {renderChart()}
                            </div>
                        </div>
                    )}
                </TutorialHighlight>

                <TutorialHighlight tutorialKey="skillMatrixReport">
                    {reportType === 'skill-matrix' && (
                        <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Employee Skill Matrix</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => window.print()} className="bg-teal-600 text-white p-2 rounded-md hover:bg-teal-700">Print Matrix</button>
                                    <button onClick={onClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear</button>
                                </div>
                            </div>
                            {/* EmployeeSkillMatrix remains here as it's a specific report type */}
                            <EmployeeSkillMatrix 
                                detailers={filteredDetailersForMatrix} 
                                currentTheme={currentTheme} 
                                db={db} 
                                appId={appId} 
                                accessLevel={accessLevel} 
                                // Pass a prop to tell EmployeeSkillMatrix NOT to display job family data
                                // as it will be handled by the MovableJobFamilyDisplay popup
                                hideJobFamilyDisplay={true} 
                            />
                        </div>
                    )}
                </TutorialHighlight>

                {reportData && (
                    <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Report Results</h3>
                            <TutorialHighlight tutorialKey="exportToCSV">
                                <div className="flex gap-2">
                                        <button onClick={onClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear Report</button>
                                        <button onClick={handleExport} className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700">Export to CSV</button>
                                </div>
                            </TutorialHighlight>
                        </div>
                        <div className="overflow-auto hide-scrollbar-on-hover max-h-[55vh]">
                            <table className="border-collapse">
                                <thead className={`${currentTheme.altRowBg} sticky top-0`}>
                                    <tr>
                                        {reportHeaders.map((header, index) => {
                                            let thClass = `p-2 font-semibold border ${currentTheme.borderColor} cursor-pointer`;
                                            
                                            return (
                                                <th 
                                                    key={`${header}-${index}`} 
                                                    className={thClass}
                                                    style={{ textAlign: 'left' }}
                                                    onClick={() => onRequestSort(header)}
                                                >
                                                    {header}
                                                    {sortConfig.key === header && (
                                                        ` ${sortConfig.direction === 'ascending' ? '▲' : '▼'}`
                                                    )}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedReportData.map((row, rowIndex) => (
                                        <tr key={`report-row-${rowIndex}-${row[0]}`} className={`border-b ${currentTheme.borderColor}`}>
                                            {row.map((cell, cellIndex) => (
                                                <td 
                                                    key={`cell-${rowIndex}-${cellIndex}`} 
                                                    className={`p-2 border ${currentTheme.borderColor}`}
                                                    style={{ textAlign: 'left' }}
                                                >
                                                    {cell}
                                                </td>
                                            ))}
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

export default ReportDisplay;