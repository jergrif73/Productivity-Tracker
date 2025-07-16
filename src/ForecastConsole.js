import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import * as d3 from 'd3';

const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && (
                <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md z-20 shadow-lg">
                    {text}
                </div>
            )}
        </div>
    );
};

const projectStatuses = ["Planning", "Conducting", "Controlling", "Archive"];
const statusDescriptions = {
    Planning: "Estimated",
    Conducting: "Booked but not Sold",
    Controlling: "Operational",
    Archive: "Completed"
};

const tradeColorMapping = {
    Piping: 'bg-green-500',
    Duct: 'bg-yellow-400',
    Plumbing: 'bg-blue-500',
    Coordination: 'bg-pink-500',
    BIM: 'bg-indigo-600',
    Structural: 'bg-amber-700',
    "GIS/GPS": 'bg-teal-500',
};

const d3ColorMapping = {
    Piping: '#22c55e',
    Duct: '#facc15',
    Plumbing: '#3b82f6',
    Coordination: '#ec4899',
    BIM: '#4f46e5',
    Structural: '#f59e0b',
    "GIS/GPS": '#14b8a6',
};

// Define the order for stacking. Items at the start of the array are at the bottom.
const tradeStackOrder = ["Plumbing", "Piping", "Duct", "Structural", "GIS/GPS", "BIM", "Coordination"];


const ForecastConsole = ({ db, projects, assignments, detailers, currentTheme, appId }) => {
    const svgRef = useRef(null);
    const [startDate, setStartDate] = useState(new Date());
    const [weeklyHoursData, setWeeklyHoursData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeStatuses, setActiveStatuses] = useState(["Planning", "Conducting", "Controlling"]);
    const [chartView, setChartView] = useState('line'); // 'line' or 'stacked'

    const weekCount = 40;
    const dimensions = { width: 1600, height: 500, margin: { top: 20, right: 30, bottom: 40, left: 60 } };
    const { width, height, margin } = dimensions;
    const boundedWidth = width - margin.left - margin.right;
    const boundedHeight = height - margin.top - margin.bottom;

    useEffect(() => {
        const fetchAllWeeklyHours = async () => {
            if (!projects.length) return;
            setLoading(true);
            const promises = projects.map(project => {
                const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`);
                return getDocs(weeklyHoursRef).then(snapshot => 
                    snapshot.docs.map(doc => ({ 
                        trade: doc.id, 
                        hours: doc.data(),
                        projectId: project.id, 
                        projectStatus: project.status || (project.archived ? "Archive" : "Controlling") 
                    }))
                );
            });

            const results = await Promise.all(promises);
            setWeeklyHoursData(results.flat());
            setLoading(false);
        };

        fetchAllWeeklyHours();
    }, [projects, db, appId]);

    const getWeekDates = (from, count) => {
        const sunday = new Date(from);
        sunday.setHours(0, 0, 0, 0);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        const weeks = [];
        for (let i = 0; i < count; i++) {
            const weekStart = new Date(sunday);
            weekStart.setDate(sunday.getDate() + (i * 7));
            weeks.push(weekStart.toISOString().split('T')[0]);
        }
        return weeks;
    };

    const weekDates = useMemo(() => getWeekDates(startDate, weekCount), [startDate]);

    const { forecastData, assignedData, stackedChartData, capacityData } = useMemo(() => {
        if (!weeklyHoursData.length && !assignments.length) return { forecastData: [], assignedData: [], stackedChartData: [], capacityData: [] };

        const filteredWeeklyHours = weeklyHoursData.filter(data => activeStatuses.includes(data.projectStatus));

        // --- Process data for both chart types ---
        const hoursByTradeAndWeek = {};
        tradeStackOrder.forEach(trade => hoursByTradeAndWeek[trade] = new Array(weekDates.length).fill(0));

        filteredWeeklyHours.forEach(data => {
            if(hoursByTradeAndWeek[data.trade]) {
                weekDates.forEach((week, i) => {
                    hoursByTradeAndWeek[data.trade][i] += data.hours[week] || 0;
                });
            }
        });
        
        // Data for Line Chart
        const forecastData = Object.entries(hoursByTradeAndWeek).map(([trade, hoursArray]) => ({
            trade,
            values: hoursArray.map((hours, i) => ({ date: new Date(weekDates[i]), hours }))
        }));

        // Data for Stacked Chart
        const stackedChartData = weekDates.map((week, i) => {
            const weekData = { date: new Date(week) };
            tradeStackOrder.forEach(trade => {
                weekData[trade] = hoursByTradeAndWeek[trade][i];
            });
            return weekData;
        });

        // Process assigned data (supply)
        const assignedWeeklyHours = new Array(weekDates.length).fill(0);
        assignments.forEach(ass => {
            const project = projects.find(p => p.id === ass.projectId);
            if (project && activeStatuses.includes(project.status || (project.archived ? "Archive" : "Controlling"))) {
                const assStart = new Date(ass.startDate);
                const assEnd = new Date(ass.endDate);
                
                weekDates.forEach((week, i) => {
                    const weekStart = new Date(week);
                    const weekEnd = new Date(week);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    
                    if (assStart <= weekEnd && assEnd >= weekStart) {
                        assignedWeeklyHours[i] += (Number(ass.allocation) / 100) * 40;
                    }
                });
            }
        });
        const assignedData = [{
            trade: 'Assigned',
            values: assignedWeeklyHours.map((hours, i) => ({ date: new Date(weekDates[i]), hours }))
        }];

        // Calculate workforce capacity
        const totalDetailers = detailers.length;
        const weeklyCapacity = totalDetailers * 40;
        const capacityData = [{
            trade: 'Capacity',
            values: weekDates.map(week => ({ date: new Date(week), hours: weeklyCapacity }))
        }];

        return { forecastData, assignedData, stackedChartData, capacityData };

    }, [weeklyHoursData, assignments, projects, weekDates, activeStatuses, detailers]);

    useEffect(() => {
        if (loading || !svgRef.current || !currentTheme) return;
        
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const tooltip = d3.select("body").append("div").attr("class", "absolute opacity-0 transition-opacity duration-300 bg-black text-white text-xs rounded-md p-2 pointer-events-none shadow-lg");

        // Function to get tick values for the Y-axis
        const getFortyHourTicks = (yMax) => {
            const ticks = [];
            for (let i = 40; i <= yMax; i += 40) {
                ticks.push(i);
            }
            return ticks;
        };

        // Function to draw the 40-hour reference lines
        const drawReferenceLines = (yScale, ticks) => {
            g.append("g")
                .attr("class", "grid")
                .selectAll("line")
                .data(ticks)
                .join("line")
                .attr("x1", 0)
                .attr("x2", boundedWidth)
                .attr("y1", d => yScale(d))
                .attr("y2", d => yScale(d))
                .attr("stroke", "rgba(255, 82, 82, 0.5)")
                .attr("stroke-width", 0.5)
                .attr("stroke-dasharray", "4");
        };

        if (chartView === 'line') {
            if(forecastData.length === 0 && assignedData.length === 0) return;
            const allValues = [...forecastData.flatMap(d => d.values), ...assignedData.flatMap(d => d.values)];
            const yMax = d3.max(allValues, d => d.hours);

            const x = d3.scaleTime().domain(d3.extent(weekDates.map(w => new Date(w)))).range([0, boundedWidth]);
            const y = d3.scaleLinear().domain([0, yMax > 0 ? yMax : 100]).range([boundedHeight, 0]);
            const color = d3.scaleOrdinal().domain(Object.keys(d3ColorMapping)).range(Object.values(d3ColorMapping));
            const line = d3.line().x(d => x(d.date)).y(d => y(d.hours)).curve(d3.curveMonotoneX);

            const xAxis = g.append("g").attr("transform", `translate(0,${boundedHeight})`).call(d3.axisBottom(x).ticks(d3.timeWeek.every(2)).tickFormat(d3.timeFormat("%m/%d")));
            xAxis.selectAll("text").style("fill", currentTheme.textColor);
            xAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

            const fortyHourTicks = getFortyHourTicks(yMax);
            const yAxis = g.append("g").call(d3.axisLeft(y).tickValues(fortyHourTicks).tickFormat(d3.format("d")));
            yAxis.selectAll("text").style("fill", currentTheme.textColor);
            yAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

            g.append("text").attr("fill", currentTheme.textColor).attr("transform", "rotate(-90)").attr("y", -margin.left + 20).attr("x", -(boundedHeight / 2)).attr("text-anchor", "middle").text("Weekly Hours");
            
            drawReferenceLines(y, fortyHourTicks);

            const trade = g.selectAll(".trade").data(forecastData).enter().append("g").attr("class", "trade");
            trade.append("path").attr("class", "line").attr("d", d => line(d.values)).style("stroke", d => color(d.trade) || '#ccc').style("fill", "none").style("stroke-width", "2.5px")
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`<strong>${d.trade} (Forecast)</strong>`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
                    d3.select(this).style('stroke-width', '5px');
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                    d3.select(this).style('stroke-width', '2.5px');
                });

            const assigned = g.selectAll(".assigned").data(assignedData).enter().append("g").attr("class", "assigned");
            assigned.append("path").attr("class", "line").attr("d", d => line(d.values)).style("stroke", "white").style("fill", "none").style("stroke-width", "2px").style("stroke-dasharray", "5,5")
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`<strong>${d.trade} Hours (Supply)</strong>`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
                    d3.select(this).style('stroke-width', '4px');
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                    d3.select(this).style('stroke-width', '2px');
                });

        } else if (chartView === 'stacked') {
            const stack = d3.stack().keys(tradeStackOrder).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
            const series = stack(stackedChartData);
            const yMax = d3.max([
                d3.max(series, d => d3.max(d, d => d[1])),
                d3.max(capacityData[0].values, d => d.hours)
            ]);

            const x = d3.scaleBand().domain(weekDates.map(d => new Date(d))).range([0, boundedWidth]).padding(0.1);
            const y = d3.scaleLinear().domain([0, yMax > 0 ? yMax : 100]).range([boundedHeight, 0]);
            const color = d3.scaleOrdinal().domain(tradeStackOrder).range(tradeStackOrder.map(t => d3ColorMapping[t] || '#ccc'));

            const xAxis = g.append("g").attr("transform", `translate(0,${boundedHeight})`).call(d3.axisBottom(x).tickValues(x.domain().filter((d,i) => !(i%2))).tickFormat(d3.timeFormat("%m/%d")));
            xAxis.selectAll("text").style("fill", currentTheme.textColor);
            xAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

            const fortyHourTicks = getFortyHourTicks(yMax);
            const yAxis = g.append("g").call(d3.axisLeft(y).tickValues(fortyHourTicks).tickFormat(d3.format("d")));
            yAxis.selectAll("text").style("fill", currentTheme.textColor);
            yAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);
            
            g.append("text").attr("fill", currentTheme.textColor).attr("transform", "rotate(-90)").attr("y", -margin.left + 20).attr("x", -(boundedHeight / 2)).attr("text-anchor", "middle").text("Total Weekly Hours");

            drawReferenceLines(y, fortyHourTicks);

            g.selectAll(".serie")
                .data(series)
                .enter().append("g")
                .attr("class", "serie")
                .attr("fill", d => color(d.key))
                .selectAll("rect")
                .data(d => d)
                .enter().append("rect")
                .attr("x", d => x(d.data.date))
                .attr("y", d => y(d[1]))
                .attr("height", d => y(d[0]) - y(d[1]))
                .attr("width", x.bandwidth())
                .on("mouseover", function(event, d) {
                    const serie = d3.select(this.parentNode).datum();
                    const trade = serie.key;
                    const hours = d.data[trade];
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`<strong>${trade}</strong>: ${hours.toFixed(1)} hrs`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    d3.select(this).style('stroke', 'black').style('stroke-width', 2);
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                    d3.select(this).style('stroke', 'none');
                });
            
            // Add the capacity line
            const capacityLine = d3.line()
                .x(d => x(d.date) + x.bandwidth() / 2) // Center the line on the bar
                .y(d => y(d.hours));

            g.append("path")
                .datum(capacityData[0].values)
                .attr("fill", "none")
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "3, 3")
                .attr("d", capacityLine)
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`<strong>Workforce Capacity</strong>: ${d[0].hours} hrs/week`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    d3.select(this).style('stroke-width', '4px');
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                    d3.select(this).style('stroke-width', '2px');
                });
        }

        return () => { tooltip.remove() };

    }, [forecastData, assignedData, stackedChartData, capacityData, chartView, boundedHeight, boundedWidth, margin.left, margin.top, weekDates, currentTheme, loading]);

    const handleDateNav = (offset) => {
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };
    
    const handleStatusToggle = (statusToToggle) => {
        setActiveStatuses(prev => {
            const newStatuses = new Set(prev);
            if (newStatuses.has(statusToToggle)) {
                newStatuses.delete(statusToToggle);
            } else {
                newStatuses.add(statusToToggle);
            }
            return Array.from(newStatuses);
        });
    };

    return (
        <div className="p-4 space-y-4">
            <div className={`flex flex-col sm:flex-row justify-between items-center p-2 ${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4`}>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleDateNav(-28)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<< 4w'}</button>
                    <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                    <button onClick={() => handleDateNav(28)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'4w >>'}</button>
                </div>
                <div className={`flex items-center gap-1 p-1 rounded-lg ${currentTheme.altRowBg}`}>
                    <button onClick={() => setChartView('line')} className={`px-3 py-1 text-sm rounded-md ${chartView === 'line' ? `${currentTheme.cardBg} shadow` : ''}`}>Line View</button>
                    <button onClick={() => setChartView('stacked')} className={`px-3 py-1 text-sm rounded-md ${chartView === 'stacked' ? `${currentTheme.cardBg} shadow` : ''}`}>Stacked View</button>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Filter by Status:</span>
                    {projectStatuses.map(status => (
                        <Tooltip key={status} text={statusDescriptions[status]}>
                            <button 
                                onClick={() => handleStatusToggle(status)}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${activeStatuses.includes(status) ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                            >
                                {status}
                            </button>
                        </Tooltip>
                    ))}
                </div>
            </div>
            <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm overflow-x-auto`}>
                {loading ? <div className="text-center p-10">Loading Forecast Data...</div> : <svg ref={svgRef} width={width} height={height}></svg>}
            </div>
             <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs pt-4">
                {Object.entries(tradeColorMapping).map(([trade, colorClass]) => (
                    <div key={trade} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-sm ${colorClass}`}></div>
                        <span className={currentTheme.textColor}>{trade}</span>
                    </div>
                ))}
                {chartView === 'line' && (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-dashed border-white"></div>
                        <span className={currentTheme.textColor}>Assigned Hours (Supply)</span>
                    </div>
                )}
                {chartView === 'stacked' && (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 border-t-2 border-dashed border-white"></div>
                        <span className={currentTheme.textColor}>Workforce Capacity</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForecastConsole;
