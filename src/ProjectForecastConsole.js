import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { collection, onSnapshot } from 'firebase/firestore';
import { TutorialHighlight } from './App'; // Import TutorialHighlight

/**
 * ProjectForecastConsole.js (Global View)
 * This version includes both a multi-line chart and a stacked bar chart view.
 * It also adds 40-hour reference lines and ticks for easier analysis.
 */

// --- Helper Components ---

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

// --- Constants ---

// Map old names to new abbreviations
const disciplineNameMap = {
    "Piping": "MP", "Mechanical Piping": "MP",
    "Duct": "MH", "Sheet Metal": "MH", "Sheet Metal / HVAC": "MH",
    "Plumbing": "PL",
    "Coordination": "Coord",
    "VDC": "VDC",
    "BIM": "VDC",  // Legacy BIM → VDC
    "Structural": "ST",
    "GIS/GPS": "GIS/GPS",
    "Process Piping": "PP",
    "Fire Protection": "FP",
    "Medical Gas": "PJ",
    "Management": "MGMT"
};

const d3ColorMapping = {
    MP: '#22c55e',
    PP: '#16a34a',
    MH: '#facc15',
    PL: '#3b82f6',
    Coord: '#ec4899',
    MGMT: '#f472b6',
    VDC: '#4f46e5',
    ST: '#f59e0b',
    "GIS/GPS": '#14b8a6',
    FP: '#ef4444',
    PJ: '#06b6d4',
    // Legacy names for backward compatibility
    Piping: '#22c55e',
    Duct: '#facc15',
    Plumbing: '#3b82f6',
    Coordination: '#ec4899',
    Structural: '#f59e0b',
    Management: '#f472b6',
    BIM: '#4f46e5',  // Legacy BIM uses VDC color
    Default: '#9ca3af',
};

const projectStatuses = ["Planning", "Conducting", "Controlling", "Archive"];
const statusAbbreviations = {
    Planning: "E",
    Conducting: "B",
    Controlling: "O",
    Archive: "A"
};
const statusDescriptions = {
    Planning: "Estimated",
    Conducting: "Booked but not Sold",
    Controlling: "Operational",
    Archive: "Archived"
};

// Defines the order for stacking in the stacked bar chart.
const tradeStackOrder = ["VDC", "PL", "MP", "PP", "MH", "ST", "GIS/GPS", "Coord", "MGMT", "FP", "PJ", "Plumbing", "Piping", "Duct", "Structural", "Coordination", "Management", "BIM"];


// --- Main Component ---

const ProjectForecastConsole = ({ db, appId, projects, currentTheme }) => {
    const svgRef = useRef(null);
    const [startDate, setStartDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [allProjectsForecasts, setAllProjectsForecasts] = useState({});
    const [activeStatuses, setActiveStatuses] = useState(["Planning", "Conducting", "Controlling"]);
    const [chartView, setChartView] = useState('line'); // 'line' or 'stacked'

    const weekCount = 78; // Changed from 52 to 78 to show 18 months
    const dimensions = { width: 1600, height: 500, margin: { top: 40, right: 30, bottom: 40, left: 60 } };
    const { width, height, margin } = dimensions;
    const boundedWidth = width - margin.left - margin.right;
    const boundedHeight = height - margin.top - margin.bottom;

    // Effect to set up real-time listeners for all projects' weekly hours
    useEffect(() => {
        if (!projects || projects.length === 0 || !db || !appId) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        const unsubscribers = projects.map(project => {
            const weeklyHoursRef = collection(db, `artifacts/${appId}/public/data/projects/${project.id}/weeklyHours`);
            return onSnapshot(weeklyHoursRef, (snapshot) => {
                let config = null;
                const hourDocs = [];
                snapshot.docs.forEach(doc => {
                    if (doc.id === '_config') {
                        config = doc.data();
                    } else {
                        hourDocs.push({ id: doc.id, ...doc.data() });
                    }
                });

                setAllProjectsForecasts(prev => ({
                    ...prev,
                    [project.id]: {
                        status: project.status || (project.archived ? "Archive" : "Controlling"),
                        config,
                        hourDocs
                    }
                }));
            });
        });

        setLoading(false);

        // Cleanup function to unsubscribe from all listeners when the component unmounts or projects change
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [projects, db, appId]);


    const getWeekDates = (from, count) => {
        const monday = new Date(from);
        monday.setHours(0, 0, 0, 0);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        monday.setDate(diff);

        const weeks = [];
        for (let i = 0; i < count; i++) {
            const weekStart = new Date(monday);
            weekStart.setDate(monday.getDate() + (i * 7));
            weeks.push(weekStart.toISOString().split('T')[0]);
        }
        return weeks;
    };

    const weekDates = useMemo(() => getWeekDates(startDate, weekCount), [startDate]);

    const { lineChartData, stackedChartData, activeTrades } = useMemo(() => {
        const hoursByTrade = {};
        const activeProjects = Object.values(allProjectsForecasts).filter(p => p.status && activeStatuses.includes(p.status));

        activeProjects.forEach(projectData => {
            if (projectData.config && projectData.config.rows && projectData.hourDocs) {
                const { config, hourDocs } = projectData;
                const rowIdToTradeMap = new Map(config.rows.map(row => [row.id, row.trade]));

                hourDocs.forEach(hourDoc => {
                    const trade = rowIdToTradeMap.get(hourDoc.id);
                    if (trade) {
                        if (!hoursByTrade[trade]) {
                            hoursByTrade[trade] = {};
                        }
                        for (const weekKey in hourDoc) {
                            if (weekKey.match(/^\d{4}-\d{2}-\d{2}$/) && hourDoc[weekKey]) {
                                hoursByTrade[trade][weekKey] = (hoursByTrade[trade][weekKey] || 0) + Number(hourDoc[weekKey]);
                            }
                        }
                    }
                });
            }
        });

        const lineData = Object.entries(hoursByTrade).map(([trade, weeklyHoursObject]) => ({
            trade,
            values: weekDates.map(weekString => ({
                date: new Date(weekString),
                hours: weeklyHoursObject[weekString] || 0
            }))
        }));

        const stackedData = weekDates.map(weekString => {
            const entry = { date: new Date(weekString) };
            tradeStackOrder.forEach(trade => {
                entry[trade] = hoursByTrade[trade]?.[weekString] || 0;
            });
            return entry;
        });

        // Get list of trades that actually have data
        const activeTrades = Object.keys(hoursByTrade);

        return { lineChartData: lineData, stackedChartData: stackedData, activeTrades };

    }, [allProjectsForecasts, activeStatuses, weekDates]);

    useEffect(() => {
        if (!svgRef.current || !currentTheme) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        if (loading) {
            g.append("text").attr("x", boundedWidth / 2).attr("y", boundedHeight / 2).attr("text-anchor", "middle").style("fill", currentTheme.textColor).text("Loading Forecast Data...");
            return;
        }
        
        if ((chartView === 'line' && lineChartData.length === 0) || (chartView === 'stacked' && stackedChartData.length === 0)) {
             g.append("text")
                .attr("x", boundedWidth / 2)
                .attr("y", boundedHeight / 2)
                .attr("text-anchor", "middle")
                .style("fill", currentTheme.subtleText)
                .style("font-size", "1.2rem")
                .text("No forecast data available for the selected project statuses.");
            return;
        }
        
        const tooltip = d3.select("body").append("div").attr("class", "absolute opacity-0 transition-opacity duration-300 bg-black text-white text-xs rounded-md p-2 pointer-events-none shadow-lg");

        const getFortyHourTicks = (yMax) => {
            const ticks = [];
            for (let i = 40; i <= yMax; i += 40) {
                ticks.push(i);
            }
            return ticks;
        };

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

        // Logic for Line Chart
        if (chartView === 'line') {
            const yMax = d3.max(lineChartData.flatMap(d => d.values), d => d.hours);
            const x = d3.scaleTime().domain(d3.extent(weekDates.map(w => new Date(w)))).range([0, boundedWidth]);
            const y = d3.scaleLinear().domain([0, yMax > 0 ? yMax : 100]).range([boundedHeight, 0]).nice();
            const line = d3.line().x(d => x(d.date)).y(d => y(d.hours)).curve(d3.curveMonotoneX);

            const xAxis = g.append("g").attr("transform", `translate(0,${boundedHeight})`).call(d3.axisBottom(x).ticks(d3.timeWeek.every(4)).tickFormat(d3.timeFormat("%b %Y")));
            xAxis.selectAll("text").style("fill", currentTheme.textColor);
            xAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

            const fortyHourTicks = getFortyHourTicks(y.domain()[1]);
            const yAxis = g.append("g").call(d3.axisLeft(y).tickValues(fortyHourTicks));
            yAxis.selectAll("text").style("fill", currentTheme.textColor);
            yAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

            g.append("text").attr("fill", currentTheme.textColor).attr("transform", "rotate(-90)").attr("y", -margin.left + 20).attr("x", -(boundedHeight / 2)).attr("text-anchor", "middle").text("Total Forecasted Weekly Hours");

            drawReferenceLines(y, fortyHourTicks);

            const trade = g.selectAll(".trade").data(lineChartData).enter().append("g").attr("class", "trade");
            
            // Helper to get color - tries original name, then abbreviated name
            const getTradeColor = (tradeName) => {
                if (d3ColorMapping[tradeName]) return d3ColorMapping[tradeName];
                const abbrev = disciplineNameMap[tradeName];
                if (abbrev && d3ColorMapping[abbrev]) return d3ColorMapping[abbrev];
                return d3ColorMapping.Default;
            };
            
            trade.append("path")
                .attr("class", "line")
                .attr("d", d => line(d.values))
                .style("stroke", d => getTradeColor(d.trade))
                .style("fill", "none")
                .style("stroke-width", "2.5px");
            
            trade.selectAll(".dot")
                .data(d => d.values.filter(v => v.hours > 0))
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.hours))
                .attr("r", 4)
                .style("fill", function() { return getTradeColor(d3.select(this.parentNode).datum().trade); })
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    const tradeName = d3.select(this.parentNode).datum().trade;
                    const displayName = disciplineNameMap[tradeName] || tradeName;
                    tooltip.html(`<strong>${displayName}</strong><br/>Week of ${d.date.toLocaleDateString()}<br/>Hours: <strong>${d.hours}</strong>`)
                        .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
                    d3.select(this).attr("r", 6);
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                    d3.select(this).attr("r", 4);
                });
        } 
        // Logic for Stacked Bar Chart
        else if (chartView === 'stacked') {
            const stack = d3.stack().keys(tradeStackOrder).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
            const series = stack(stackedChartData);
            const yMax = d3.max(series, d => d3.max(d, d => d[1]));

            const x = d3.scaleBand().domain(weekDates.map(d => new Date(d))).range([0, boundedWidth]).padding(0.2);
            const y = d3.scaleLinear().domain([0, yMax > 0 ? yMax : 100]).range([boundedHeight, 0]).nice();
            
            // Define gradients and filters in the SVG defs
            const defs = g.append("defs");
            Object.entries(d3ColorMapping).forEach(([trade, color]) => {
                const gradient = defs.append("linearGradient")
                    .attr("id", `gradient-${trade.replace(/[^a-zA-Z0-9]/g, '-')}`)
                    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
                gradient.append("stop").attr("offset", "0%").attr("stop-color", d3.color(color).brighter(0.6));
                gradient.append("stop").attr("offset", "100%").attr("stop-color", color);
            });
            const filter = defs.append("filter").attr("id", "brightness");
            filter.append("feComponentTransfer")
              .append("feFuncR").attr("type", "linear").attr("slope", "1.4");
            filter.append("feComponentTransfer")
              .append("feFuncG").attr("type", "linear").attr("slope", "1.4");
            filter.append("feComponentTransfer")
              .append("feFuncB").attr("type", "linear").attr("slope", "1.4");


            const xAxis = g.append("g").attr("transform", `translate(0,${boundedHeight})`).call(d3.axisBottom(x).tickValues(x.domain().filter((d,i) => !(i%4))).tickFormat(d3.timeFormat("%b %d")));
            xAxis.selectAll("text").style("fill", currentTheme.textColor);
            xAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);

            const fortyHourTicks = getFortyHourTicks(y.domain()[1]);
            const yAxis = g.append("g").call(d3.axisLeft(y).tickValues(fortyHourTicks));
            yAxis.selectAll("text").style("fill", currentTheme.textColor);
            yAxis.selectAll(".domain, .tick line").style("stroke", currentTheme.textColor);
            
            g.append("text").attr("fill", currentTheme.textColor).attr("transform", "rotate(-90)").attr("y", -margin.left + 20).attr("x", -(boundedHeight / 2)).attr("text-anchor", "middle").text("Total Weekly Hours");

            drawReferenceLines(y, fortyHourTicks);
            
            const totals = stackedChartData.map(d => d3.sum(tradeStackOrder, key => d[key]));

            g.selectAll(".serie")
                .data(series)
                .enter().append("g")
                .attr("class", "serie")
                .attr("fill", d => {
                    // Try original name first, then abbreviated name
                    const gradientId = `gradient-${d.key.replace(/[^a-zA-Z0-9]/g, '-')}`;
                    const abbrevName = disciplineNameMap[d.key];
                    const abbrevGradientId = abbrevName ? `gradient-${abbrevName.replace(/[^a-zA-Z0-9]/g, '-')}` : null;
                    // Check if original gradient exists, otherwise try abbreviated, otherwise use Default
                    if (d3ColorMapping[d.key]) return `url(#${gradientId})`;
                    if (abbrevName && d3ColorMapping[abbrevName]) return `url(#${abbrevGradientId})`;
                    return `url(#gradient-Default)`;
                })
                .selectAll("rect")
                .data(d => d)
                .enter().append("rect")
                .attr("x", d => x(d.data.date))
                .attr("y", d => y(d[1]))
                .attr("height", d => y(d[0]) - y(d[1]))
                .attr("width", x.bandwidth())
                .attr("rx", (d, i) => (d[1] === totals[i] && d[1] - d[0] > 0) ? 4 : 0)
                .attr("ry", (d, i) => (d[1] === totals[i] && d[1] - d[0] > 0) ? 4 : 0)
                .on("mouseover", function(event, d) {
                    const serie = d3.select(this.parentNode).datum();
                    const trade = serie.key;
                    const displayName = disciplineNameMap[trade] || trade;
                    const hours = d.data[trade];
                    if (hours > 0) {
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(`<strong>${displayName}</strong>: ${hours.toFixed(1)} hrs`)
                            .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
                        d3.select(this).attr('filter', 'url(#brightness)');
                    }
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                    d3.select(this).attr('filter', null);
                });

            g.append("g")
                .attr("class", "total-labels")
                .selectAll("text")
                .data(stackedChartData)
                .enter()
                .append("text")
                .text((d, i) => totals[i] > 0 ? totals[i].toFixed(0) : '')
                .attr("x", d => x(d.date) + x.bandwidth() / 2)
                .attr("y", (d, i) => y(totals[i]) - 5)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("font-weight", "bold")
                .style("fill", currentTheme.textColor);
        }
        
        return () => {
            tooltip.remove();
        };

    }, [lineChartData, stackedChartData, chartView, boundedHeight, boundedWidth, margin.left, margin.top, weekDates, currentTheme, loading]);

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
        <TutorialHighlight tutorialKey="project-forecast">
            {/* Added overflow-y-hidden to the main container */}
            <div className="p-4 space-y-4 h-full flex flex-col overflow-y-hidden">
                <div className={`flex flex-col sm:flex-row justify-between items-center p-2 ${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4 flex-shrink-0`}>
                    <TutorialHighlight tutorialKey="statusFilter">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Filter by Status:</span>
                            {projectStatuses.map(status => (
                                <Tooltip key={status} text={statusDescriptions[status]}>
                                    <button 
                                        onClick={() => handleStatusToggle(status)}
                                        className={`px-3 py-1 text-xs rounded-full transition-colors ${activeStatuses.includes(status) ? 'bg-blue-600 text-white' : `${currentTheme.buttonBg} ${currentTheme.buttonText}`}`}
                                    >
                                        {statusAbbreviations[status]}
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    </TutorialHighlight>
                    <TutorialHighlight tutorialKey="viewToggle">
                        <div className={`flex items-center gap-1 p-1 rounded-lg ${currentTheme.altRowBg}`}>
                            <button onClick={() => setChartView('line')} className={`px-3 py-1 text-sm rounded-md ${chartView === 'line' ? `${currentTheme.cardBg} shadow` : ''}`}>Line View</button>
                            <button onClick={() => setChartView('stacked')} className={`px-3 py-1 text-sm rounded-md ${chartView === 'stacked' ? `${currentTheme.cardBg} shadow` : ''}`}>Stacked View</button>
                        </div>
                    </TutorialHighlight>
                    <TutorialHighlight tutorialKey="dateNavigation">
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleDateNav(-28)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<< 4w'}</button>
                            <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                            <button onClick={() => handleDateNav(28)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'4w >>'}</button>
                        </div>
                    </TutorialHighlight>
                </div>
                <TutorialHighlight tutorialKey="chartArea">
                    {/* Applied the fix here: wrap SVG and legend in a single div with fixed width,
                        and apply overflow-x-auto to the outer container. */}
                    <div className={`${currentTheme.cardBg} p-4 rounded-lg border ${currentTheme.borderColor} shadow-sm flex-grow overflow-x-auto hide-scrollbar-on-hover`}>
                        <div style={{ width: `${width}px` }}> {/* This inner div now controls the overall scrollable width */}
                            <div className="p-4">
                                <svg ref={svgRef} width={width} height={height}></svg> {/* Changed height to full height */}
                            </div>
                            <TutorialHighlight tutorialKey="legend">
                                {/* Moved legend inside the scrollable container */}
                                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs pt-4 flex-shrink-0">
                                    {activeTrades.map(trade => {
                                        const displayName = disciplineNameMap[trade] || trade;
                                        return (
                                            <div key={trade} className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-sm" style={{backgroundColor: d3ColorMapping[trade] || d3ColorMapping[displayName] || d3ColorMapping.Default}}></div>
                                                <span className={currentTheme.textColor}>{displayName}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TutorialHighlight>
                        </div>
                    </div>
                </TutorialHighlight>
                {/* Removed the separate legend div as it's now inside the scrollable chart area */}
            </div>
        </TutorialHighlight>
    );
};

export default ProjectForecastConsole;