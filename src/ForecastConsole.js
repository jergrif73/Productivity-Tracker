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
    Planning: "Estimating",
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

/**
 * Distributes hours for a single estimate over a series of weeks using a trapezoidal (bell curve) model.
 * @param {object} estimate - The trade estimate object.
 * @param {Date[]} weekDates - An array of Date objects representing the start of each week in the forecast.
 * @param {number} rampUpPercent - The percentage of the duration for ramp-up.
 * @param {number} rampDownPercent - The percentage of the duration for ramp-down.
 * @returns {number[]} An array of hours corresponding to each week in weekDates.
 */
const distributeHoursWithBellCurve = (estimate, weekDates, rampUpPercent, rampDownPercent) => {
    const { estimatedHours, startDate, endDate } = estimate;
    const weeklyDistribution = new Array(weekDates.length).fill(0);

    if (!estimatedHours || !startDate || !endDate) return weeklyDistribution;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return weeklyDistribution;

    const totalDurationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
    if (totalDurationDays <= 0) return weeklyDistribution;

    // For very short projects, use a linear distribution to avoid weird results.
    if (totalDurationDays < 28) {
        const dailyHours = estimatedHours / totalDurationDays;
        weekDates.forEach((weekStart, i) => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            if (start <= weekEnd && end >= weekStart) {
                const overlapStart = Math.max(start, weekStart);
                const overlapEnd = Math.min(end, weekEnd);
                const overlapDays = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24) + 1;
                if (overlapDays > 0) {
                    weeklyDistribution[i] = overlapDays * dailyHours;
                }
            }
        });
        return weeklyDistribution;
    }

    const plateauPercent = 100 - rampUpPercent - rampDownPercent;

    const rampUpDays = totalDurationDays * (rampUpPercent / 100);
    const plateauDays = totalDurationDays * (plateauPercent / 100);
    const rampDownDays = totalDurationDays * (rampDownPercent / 100);

    const rampUpEnd = new Date(start);
    rampUpEnd.setDate(start.getDate() + rampUpDays - 1);

    const plateauEnd = new Date(rampUpEnd);
    plateauEnd.setDate(rampUpEnd.getDate() + plateauDays);

    const weightedDurationDays = (rampUpDays * 0.5) + (plateauDays * 1.0) + (rampDownDays * 0.5);
    if (weightedDurationDays <= 0) return weeklyDistribution;
    
    const peakDailyHours = estimatedHours / weightedDurationDays;
    const rampDailyHours = peakDailyHours / 2;

    weekDates.forEach((weekStart, i) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        if (start <= weekEnd && end >= weekStart) {
            let hoursForWeek = 0;
            for (let day = new Date(weekStart); day <= weekEnd; day.setDate(day.getDate() + 1)) {
                if (day >= start && day <= end) {
                    if (day <= rampUpEnd) {
                        hoursForWeek += rampDailyHours;
                    } else if (day <= plateauEnd) {
                        hoursForWeek += peakDailyHours;
                    } else {
                        hoursForWeek += rampDailyHours;
                    }
                }
            }
            weeklyDistribution[i] = hoursForWeek;
        }
    });

    return weeklyDistribution;
};


const ForecastConsole = ({ db, projects, currentTheme, appId }) => {
    const svgRef = useRef(null);
    const [startDate, setStartDate] = useState(new Date());
    const [allEstimates, setAllEstimates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeStatuses, setActiveStatuses] = useState(["Planning", "Conducting", "Controlling"]);
    const [rampUpPercent, setRampUpPercent] = useState(25);
    const [rampDownPercent, setRampDownPercent] = useState(25);
    
    const weekCount = 40;
    const dimensions = { width: 1600, height: 500, margin: { top: 20, right: 30, bottom: 40, left: 60 } };
    const { width, height, margin } = dimensions;
    const boundedWidth = width - margin.left - margin.right;
    const boundedHeight = height - margin.top - margin.bottom;

    useEffect(() => {
        const fetchAllEstimates = async () => {
            if (!projects.length) return;
            setLoading(true);
            const promises = projects.map(project => {
                const estimatesRef = collection(db, `artifacts/${appId}/public/data/projects/${project.id}/tradeEstimates`);
                return getDocs(estimatesRef).then(snapshot => 
                    snapshot.docs.map(doc => ({ ...doc.data(), projectId: project.id, projectStatus: project.status || (project.archived ? "Archive" : "Controlling") }))
                );
            });

            const results = await Promise.all(promises);
            setAllEstimates(results.flat());
            setLoading(false);
        };

        fetchAllEstimates();
    }, [projects, db, appId]);

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

    const forecastData = useMemo(() => {
        if (!allEstimates.length) return [];

        const filteredEstimates = allEstimates.filter(est => activeStatuses.includes(est.projectStatus));
        
        const hoursByTrade = {};

        filteredEstimates.forEach(est => {
            if (!hoursByTrade[est.trade]) {
                hoursByTrade[est.trade] = new Array(weekDates.length).fill(0);
            }
            const weeklyHours = distributeHoursWithBellCurve(est, weekDates, rampUpPercent, rampDownPercent);
            weeklyHours.forEach((hours, i) => {
                hoursByTrade[est.trade][i] += hours;
            });
        });

        return Object.entries(hoursByTrade).map(([trade, hoursArray]) => ({
            trade,
            values: hoursArray.map((hours, i) => ({ date: weekDates[i], hours }))
        }));

    }, [allEstimates, weekDates, activeStatuses, rampUpPercent, rampDownPercent]);

    useEffect(() => {
        if (loading || !svgRef.current || !currentTheme) return;
        
        const dataToRender = forecastData;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        if(dataToRender.length === 0) {
            return;
        };

        const yMax = d3.max(dataToRender, d => d3.max(d.values, v => v.hours));

        const x = d3.scaleTime()
            .domain(d3.extent(weekDates))
            .range([0, boundedWidth]);

        const y = d3.scaleLinear()
            .domain([0, yMax > 0 ? yMax : 100])
            .range([boundedHeight, 0]);
        
        const color = d3.scaleOrdinal()
            .domain(Object.keys(d3ColorMapping))
            .range(Object.values(d3ColorMapping));

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
            .text("Total Weekly Estimated Hours");

        const trade = g.selectAll(".trade")
            .data(dataToRender)
            .enter().append("g")
            .attr("class", "trade");
        
        trade.append("path")
            .attr("class", "line")
            .attr("d", d => line(d.values))
            .style("stroke", d => color(d.trade) || '#ccc')
            .style("fill", "none")
            .style("stroke-width", "2.5px")
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<strong>${d.trade}</strong>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                d3.select(this).style('stroke-width', '5px');
            })
            .on("mouseout", function(d) {
                tooltip.transition().duration(500).style("opacity", 0);
                d3.select(this).style('stroke-width', '2.5px');
            });

        return () => { tooltip.remove() };

    }, [forecastData, boundedHeight, boundedWidth, margin.left, margin.top, weekDates, currentTheme, loading]);

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

    const handleRampUpChange = (e) => {
        const value = parseInt(e.target.value, 10);
        setRampUpPercent(value);
        if (value + rampDownPercent > 100) {
            setRampDownPercent(100 - value);
        }
    };

    const handleRampDownChange = (e) => {
        const value = parseInt(e.target.value, 10);
        setRampDownPercent(value);
        if (value + rampUpPercent > 100) {
            setRampUpPercent(100 - value);
        }
    };

    const plateauPercent = 100 - rampUpPercent - rampDownPercent;

    return (
        <div className="p-4 space-y-4">
            <div className={`flex flex-col sm:flex-row justify-between items-center p-2 ${currentTheme.cardBg} rounded-lg border ${currentTheme.borderColor} shadow-sm gap-4`}>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleDateNav(-7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'<'}</button>
                    <button onClick={() => setStartDate(new Date())} className={`p-2 px-4 border rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} ${currentTheme.borderColor} hover:bg-opacity-75`}>Today</button>
                    <button onClick={() => handleDateNav(7)} className={`p-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-opacity-75`}>{'>'}</button>
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
            <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} shadow-sm space-y-2`}>
                <h3 className="text-lg font-semibold text-center">Forecast Distribution</h3>
                <div className="flex justify-around items-center text-sm">
                    <div className="w-1/3 px-4">
                        <label htmlFor="rampUp" className="block text-center">Ramp Up: {rampUpPercent}%</label>
                        <input id="rampUp" type="range" min="0" max="100" value={rampUpPercent} onChange={handleRampUpChange} className="w-full" />
                    </div>
                    <div className="w-1/3 px-4 text-center font-bold">
                        Plateau: {plateauPercent}%
                    </div>
                    <div className="w-1/3 px-4">
                        <label htmlFor="rampDown" className="block text-center">Ramp Down: {rampDownPercent}%</label>
                        <input id="rampDown" type="range" min="0" max="100" value={rampDownPercent} onChange={handleRampDownChange} className="w-full" />
                    </div>
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
            </div>
        </div>
    );
};

export default ForecastConsole;
