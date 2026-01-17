import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const GanttConsole = ({ projects, assignments, currentTheme }) => {
    const svgRef = useRef(null);
    const [startDate, setStartDate] = useState(new Date());
    const [ganttView, setGanttView] = useState('projects');
    const weekCount = 52; 
    // Increased height to provide more space at the bottom for labels and scrollbar
    const dimensions = { width: 2200, height: 450, margin: { top: 20, right: 30, bottom: 40, left: 60 } }; 
    const { width, height, margin } = dimensions;
    const boundedWidth = width - margin.left - margin.right;
    const boundedHeight = height - margin.top - margin.bottom;
    const color = useMemo(() => d3.scaleOrdinal(d3.schemeCategory10), []);

    const getWeekDates = (from, count) => {
        const sunday = new Date(from);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        const weeks = [];
        for (let i = 0; i < count; i++) {
            const weekStart = new Date(sunday);
            weekStart.setDate(sunday.getDate() + (i * 7));
            weeks.push(weekStart);
        }
        return weeks;
    };

    const weekDates = useMemo(() => getWeekDates(startDate, weekCount), [startDate]);

    const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects]);
    const activeProjectIds = useMemo(() => new Set(activeProjects.map(p => p.id)), [activeProjects]);
    const activeAssignments = useMemo(() => assignments.filter(a => activeProjectIds.has(a.projectId)), [assignments, activeProjectIds]);


    const projectData = useMemo(() => {
        const dataByProject = activeAssignments.reduce((acc, assignment) => {
            const projId = assignment.projectId;
            if (!acc[projId]) {
                acc[projId] = [];
            }
            acc[projId].push(assignment);
            return acc;
        }, {});

        return Object.entries(dataByProject).map(([projectId, projectAssignments]) => {
            const project = activeProjects.find(p => p.id === projectId);
            const weeklyHours = weekDates.map(weekStart => {
                let totalHours = 0;
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                projectAssignments.forEach(ass => {
                    const assignStart = new Date(ass.startDate);
                    const assignEnd = new Date(ass.endDate);
                    if (assignStart <= weekEnd && assignEnd >= weekStart) { // Corrected: assignEnd instead of assEnd
                        totalHours += (Number(ass.allocation) / 100) * 40;
                    }
                });
                return { date: weekStart, hours: totalHours };
            });
            return {
                projectId,
                projectName: project ? project.name : 'Unknown Project',
                projectNumber: project ? project.projectId : 'N/A',
                values: weeklyHours
            };
        });
    }, [activeProjects, activeAssignments, weekDates]);

    const totalData = useMemo(() => {
        // Calculate the array of total weekly hours directly
        const calculatedTotalWeeklyHours = weekDates.map(weekStart => {
            let totalHours = 0;
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            activeAssignments.forEach(ass => {
                const assignStart = new Date(ass.startDate);
                const assignEnd = new Date(ass.endDate);
                if (assignStart <= weekEnd && assignEnd >= weekStart) { // Corrected: assignEnd instead of assEnd
                    totalHours += (Number(ass.allocation) / 100) * 40;
                }
            }
            );
            return { date: weekStart, hours: totalHours }; // Return object with date and hours
        });
        // Use the calculated array directly in the return object
        return [{ projectId: 'total', projectName: 'Total Hours', values: calculatedTotalWeeklyHours }];
    }, [activeAssignments, weekDates]);


    useEffect(() => {
        if (!svgRef.current || !currentTheme) return;
        const dataToRender = ganttView === 'projects' ? projectData : totalData;
        
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        if(dataToRender.length === 0) return;

        const yMax = ganttView === 'projects' 
            ? d3.max(dataToRender, d => d3.max(d.values, v => v.hours)) 
            : d3.max(dataToRender[0].values, v => v.hours);

        const x = d3.scaleTime()
            .domain(d3.extent(weekDates))
            .range([0, boundedWidth]);

        const y = d3.scaleLinear()
            .domain([0, yMax || 100])
            .range([boundedHeight, 0]);
        
        color.domain(projectData.map(p => p.projectId));

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.hours))
            .curve(d3.curveMonotoneX);

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        
        const tooltip = d3.select("body").append("div")
            .attr("class", "fixed bg-black text-white text-xs rounded-md p-2 pointer-events-none shadow-lg")
            .style("opacity", 0)
            .style("z-index", 9999);

        const xAxis = g.append("g")
            .attr("transform", `translate(0,${boundedHeight})`)
            .call(d3.axisBottom(x).ticks(d3.timeWeek.every(2)).tickFormat(d3.timeFormat("%m/%d")));
        
        xAxis.selectAll("text").style("fill", currentTheme.textColor);
        xAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

        const yAxis = g.append("g")
            .call(d3.axisLeft(y));
            
        yAxis.selectAll("text").style("fill", currentTheme.textColor);
        yAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

        g.append("text")
            .attr("fill", currentTheme.textColor)
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -(boundedHeight / 2))
            .attr("text-anchor", "middle")
            .text("Total Weekly Hours");

        const fortyHourTicks = [];
        for (let i = 40; i <= yMax; i += 40) {
            fortyHourTicks.push(i);
        }

        g.append("g")
            .attr("class", "grid")
            .selectAll("line")
            .data(fortyHourTicks)
            .join("line")
                .attr("x1", 0)
                .attr("x2", boundedWidth)
                .attr("y1", d => y(d))
                .attr("y2", d => y(d))
                .attr("stroke", "rgba(255, 82, 82, 0.5)")
                .attr("stroke-width", .5)
                .attr("stroke-dasharray", "4");
        
        const project = g.selectAll(".project")
            .data(dataToRender)
            .enter().append("g")
            .attr("class", "project");
        
        project.append("path")
            .attr("class", "line")
            .attr("d", d => line(d.values))
            .style("stroke", d => ganttView === 'projects' ? color(d.projectId) : '#2563eb')
            .style("fill", "none")
            .style("stroke-width", "2px")
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                const totalHours = d.values.reduce((sum, v) => sum + v.hours, 0);
                if (ganttView === 'totals') {
                    tooltip.html(`<strong>Total Hours</strong><br/>Sum: ${totalHours.toLocaleString()} hrs`)
                        .style("left", (event.clientX + 5) + "px")
                        .style("top", (event.clientY - 28) + "px");
                } else {
                    tooltip.html(`<strong>${d.projectName}</strong><br/>Project #: ${d.projectNumber}<br/>Total: ${totalHours.toLocaleString()} hrs`)
                        .style("left", (event.clientX + 5) + "px")
                        .style("top", (event.clientY - 28) + "px");
                }
                d3.select(this).style('stroke-width', '4px');
            })
            .on("mouseout", function(d) {
                tooltip.transition().duration(500).style("opacity", 0);
                d3.select(this).style('stroke-width', '2px');
            });

        // Add dots for each data point
        project.selectAll(".dot")
            .data(d => d.values.filter(v => v.hours > 0).map(v => ({ ...v, projectName: d.projectName, projectNumber: d.projectNumber, projectId: d.projectId })))
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.hours))
            .attr("r", 4)
            .style("fill", d => ganttView === 'projects' ? color(d.projectId) : '#2563eb')
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                const weekDate = d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                if (ganttView === 'totals') {
                    tooltip.html(`<strong>Total Hours</strong><br/>Week of ${weekDate}<br/>Hours: <strong>${d.hours.toLocaleString()}</strong>`)
                        .style("left", (event.clientX + 15) + "px")
                        .style("top", (event.clientY - 15) + "px");
                } else {
                    tooltip.html(`<strong>${d.projectName}</strong><br/>Project #: ${d.projectNumber}<br/>Week of ${weekDate}<br/>Hours: <strong>${d.hours.toLocaleString()}</strong>`)
                        .style("left", (event.clientX + 15) + "px")
                        .style("top", (event.clientY - 15) + "px");
                }
                d3.select(this).attr("r", 6);
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
                d3.select(this).attr("r", 4);
            });

        return () => { tooltip.remove() };

    }, [projectData, totalData, ganttView, boundedHeight, boundedWidth, margin.left, margin.top, weekDates, color, currentTheme]);

    const handleDateNav = (offset) => {
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };

    return (
        <div className="p-4 space-y-4 w-full h-full flex flex-col overflow-y-hidden"> {/* Added overflow-y-hidden */}
            {/* Custom CSS for scrollbar */}
            <style>
                {`
                .hide-scrollbar-on-hover::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .hide-scrollbar-on-hover::-webkit-scrollbar-thumb {
                    background-color: transparent;
                }
                .hide-scrollbar-on-hover:hover::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.5); /* gray-400 with opacity */
                    border-radius: 4px;
                }
                .hide-scrollbar-on-hover::-webkit-scrollbar-track {
                    background: transparent;
                }
                .hide-scrollbar-on-hover:hover::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1); /* subtle track on hover */
                }
                /* For Firefox */
                .hide-scrollbar-on-hover {
                    scrollbar-width: thin;
                    scrollbar-color: transparent transparent;
                }
                .hide-scrollbar-on-hover:hover {
                    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
                }
                `}
            </style>
            <div className={`flex flex-col sm:flex-row justify-between items-center p-2 ${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4 flex-shrink-0`}>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleDateNav(-7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<'}</button>
                    <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                    <button onClick={() => handleDateNav(7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'>'}</button>
                </div>
                 <div className={`flex items-center gap-2 ${currentTheme.altRowBg} p-1 rounded-lg`}>
                    <button onClick={() => setGanttView('projects')} className={`px-3 py-1 text-sm rounded-md ${ganttView === 'projects' ? `${currentTheme.cardBg} shadow` : ''}`}>Projects</button>
                    <button onClick={() => setGanttView('totals')} className={`px-3 py-1 text-sm rounded-md ${ganttView === 'totals' ? `${currentTheme.cardBg} shadow` : ''}`}>Totals</button>
                </div>
            </div>
            {/* Applied the fix here: wrap SVG and legend in a single div with fixed width,
                and apply overflow-x-auto to the outer container. */}
            <div className={`${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm flex-grow overflow-x-auto hide-scrollbar-on-hover`}>
                <div style={{ width: `${width}px` }}> {/* This inner div now controls the overall scrollable width */}
                    <div className="p-4">
                        <svg ref={svgRef} width={width} height={height} style={{ maxWidth: 'none' }}></svg> {/* Changed height to full height */}
                    </div>
                    {ganttView === 'projects' && projectData.length > 0 && (
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs pt-4 px-4 border-t pb-4">
                            {projectData.map(p => (
                                <div key={p.projectId} className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: color(p.projectId) }}></div>
                                    <span className={`${currentTheme.textColor} truncate`}>{p.projectNumber} - {p.projectName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GanttConsole;