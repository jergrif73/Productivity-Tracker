import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const GanttConsole = ({ projects, assignments, currentTheme }) => {
    const svgRef = useRef(null);
    const [startDate, setStartDate] = useState(new Date());
    const [ganttView, setGanttView] = useState('projects');
    const weekCount = 52; 
    // Reduced height to make the chart more compact and minimize vertical scrolling
    const dimensions = { width: 2200, height: 450, margin: { top: 20, right: 30, bottom: 40, left: 60 } }; // Reduced height from 600 to 450
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
            if (!acc[assignment.projectId]) {
                acc[assignment.projectId] = [];
            }
            acc[assignment.projectId].push(assignment);
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
                    if (assignStart <= weekEnd && assignEnd >= weekStart) {
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
                if (assignStart <= weekEnd && assignEnd >= weekStart) {
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
            .attr("class", "absolute opacity-0 transition-opacity duration-300 bg-black text-white text-xs rounded-md p-2 pointer-events-none shadow-lg")

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
            .on("mouseover", function(event, d) {
                if (ganttView === 'totals') return;
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<strong>${d.projectName}</strong><br/>ID: ${d.projectNumber}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
                d3.select(this).style('stroke-width', '4px');
            })
            .on("mouseout", function(d) {
                if (ganttView === 'totals') return;
                tooltip.transition().duration(500).style("opacity", 0);
                d3.select(this).style('stroke-width', '2px');
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
        <div className="p-4 space-y-4 w-full h-full flex flex-col">
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
            <div className={`${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm flex-grow overflow-auto`}>
                <div className="p-4">
                    <svg ref={svgRef} width={width} height={height} style={{ maxWidth: 'none' }}></svg>
                </div>
                {ganttView === 'projects' && (
                     <div className="flex flex-wrap items-end gap-x-8 gap-y-2 text-sm pt-2 px-4 border-t pb-8" style={{minHeight: '8rem', width: `${width}px`}}>
                        {projectData.map(p => (
                            <div key={p.projectId} className="flex flex-col items-center">
                                <div className="w-1/4 h-4" style={{backgroundColor: color(p.projectId), minWidth: '20px'}}></div>
                                <span className={`transform -rotate-90 whitespace-nowrap mt-4 ${currentTheme.textColor}`}>{p.projectNumber}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GanttConsole;
