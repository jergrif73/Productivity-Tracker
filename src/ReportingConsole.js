import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TutorialHighlight } from './App';
import EmployeeSkillMatrix from './EmployeeSkillMatrix'; 
import * as d3 from 'd3';

// --- D3 Chart Components ---

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

        const width = 450;
        const height = 450;
        const margin = 40;
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
                const hours = d.data.hours || 0; // FIX: Default to 0 if hours is undefined/NaN
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

    return <svg ref={svgRef} width="450" height="450"></svg>;
};

// Define predefined team profiles
const teamProfiles = {
    "Select a Profile...": [],
    "The Masterminds": ["Model Knowledge", "BIM Knowledge", "Coordination", "Structural"],
    "The Strong Foundation": ["Teamwork Ability", "Leadership Skills", "Piping", "Duct", "Plumbing"],
    "The Innovators": ["BIM Knowledge", "GIS/GPS"],
    "The Problem Solvers": ["Leadership Skills", "Mechanical Abilities", "Coordination", "Model Knowledge"]
};


const ReportingConsole = ({ projects, detailers, assignments, tasks, allProjectActivities, currentTheme }) => {
    const [reportType, setReportType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedLevels, setSelectedLevels] = useState([]);
    const [selectedTrade, setSelectedTrade] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState("Select a Profile...");

    const [reportData, setReportData] = useState(null);
    const [reportHeaders, setReportHeaders] = useState([]);
    const [chartData, setChartData] = useState(null);

    const uniqueTitles = useMemo(() => [...new Set(detailers.map(d => d.title).filter(Boolean))].sort(), [detailers]);
    
    const uniqueTrades = useMemo(() => {
        const trades = new Set();
        detailers.forEach(d => {
            if (Array.isArray(d.disciplineSkillsets) && d.disciplineSkillsets.length > 0) {
                trades.add(d.disciplineSkillsets[0].name); 
            } else if (d.disciplineSkillsets && !Array.isArray(d.disciplineSkillsets) && Object.keys(d.disciplineSkillsets).length > 0) {
                trades.add(Object.keys(d.disciplineSkillsets)[0]);
            }
        });
        return [...trades].sort();
    }, [detailers]);

    const allSkillsOptions = useMemo(() => {
        const skills = new Set();
        detailers.forEach(d => {
            if (d.skills) {
                Object.keys(d.skills).forEach(skillName => skills.add(skillName));
            }
            if (Array.isArray(d.disciplineSkillsets)) {
                d.disciplineSkillsets.forEach(ds => skills.add(ds.name));
            }
        });
        return Array.from(skills).sort();
    }, [detailers]);

    const getDaysInRange = (assStart, assEnd, reportStart, reportEnd) => {
        const effectiveStart = Math.max(assStart.getTime(), reportStart.getTime());
        const effectiveEnd = Math.min(assEnd.getTime(), reportEnd.getTime());
        
        if (effectiveStart > effectiveEnd) return 0;

        const diffTime = Math.abs(effectiveEnd - effectiveStart);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
        if (selectedLevels.length > 0) {
            filtered = filtered.filter(d => selectedLevels.includes(d.title));
        }
        if (selectedTrade) {
            filtered = filtered.filter(d => {
                const primaryTrade = d.disciplineSkillsets && Array.isArray(d.disciplineSkillsets) && d.disciplineSkillsets.length > 0 ? d.disciplineSkillsets[0].name : null;
                return primaryTrade === selectedTrade;
            });
        }
        return filtered;
    }, [detailers, selectedLevels, selectedTrade]);

    const handleGenerateReport = () => {
        setReportData(null);
        setReportHeaders([]);
        setChartData(null);

        const sDate = startDate ? new Date(startDate) : null;
        const eDate = endDate ? new Date(endDate) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);

        let data = [];
        let headers = [];

        switch (reportType) {
            case 'project-health':
                const healthData = projects.filter(p => !p.archived).map(p => {
                    const activities = projectActivitiesMap.get(p.id);
                    if (!activities) return null;

                    const allActivities = Object.values(activities).flat();
                    const earnedValue = allActivities.reduce((sum, act) => {
                         const useBimRate = act.description === "Project Setup";
                         const rate = useBimRate ? (p.bimBlendedRate || p.blendedRate) : p.blendedRate;
                         return sum + (Number(act.estimatedHours || 0) * rate * (Number(act.percentComplete || 0) / 100));
                    }, 0);
                    
                    const actualCost = allActivities.reduce((sum, act) => {
                        const useBimRate = act.description === "Project Setup";
                        const rate = useBimRate ? (p.bimBlendedRate || p.blendedRate) : p.blendedRate;
                        return sum + (Number(act.hoursUsed || 0) * rate);
                    }, 0);

                    const projectAssignments = assignments.filter(a => a.projectId === p.id);
                    if(projectAssignments.length === 0) return null;

                    const minDate = new Date(Math.min(...projectAssignments.map(a => new Date(a.startDate).getTime())));
                    const maxDate = new Date(Math.max(...projectAssignments.map(a => new Date(a.endDate).getTime())));
                    const totalDuration = maxDate - minDate;
                    const elapsedDuration = new Date() - minDate;
                    const percentElapsed = totalDuration > 0 ? Math.min(1, elapsedDuration / totalDuration) : 0;
                    const plannedValue = p.initialBudget * percentElapsed;

                    return {
                        name: p.name,
                        budget: p.initialBudget,
                        costVariance: earnedValue - actualCost,
                        scheduleVariance: earnedValue - plannedValue
                    };
                }).filter(Boolean);
                setChartData(healthData);
                break;
            
            case 'employee-workload-dist':
                if (!selectedEmployeeId) {
                    alert("Please select an employee.");
                    return;
                }
                const employeeAssignments = assignments.filter(a => a.detailerId === selectedEmployeeId);
                const workloadData = employeeAssignments.reduce((acc, ass) => {
                    const project = projects.find(p => p.id === ass.projectId);
                    if(!project) return acc;

                    const assStartDate = new Date(ass.startDate);
                    const assEndDate = new Date(ass.endDate);

                    if (isNaN(assStartDate.getTime()) || isNaN(assEndDate.getTime())) {
                        return acc;
                    }

                    const diffTime = Math.abs(assEndDate - assStartDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    const workDays = Math.ceil(diffDays * (5/7));
                    const allocation = Number(ass.allocation) || 0;
                    const hours = workDays * 8 * (allocation / 100);

                    if (!acc[project.id]) {
                        acc[project.id] = { projectName: project.name, hours: 0 };
                    }
                    acc[project.id].hours += hours;
                    return acc;
                }, {});
                setChartData(Object.values(workloadData));
                break;

            case 'skill-matrix':
                return;

            case 'top-employee-skills-by-trade':
                if (selectedSkills.length === 0) {
                    alert("Please select at least one skill to compare.");
                    return;
                }

                const employeeSkillScores = detailers
                    .filter(d => {
                        const primaryTrade = d.disciplineSkillsets && Array.isArray(d.disciplineSkillsets) && d.disciplineSkillsets.length > 0 ? d.disciplineSkillsets[0].name : null;
                        return (selectedLevels.length === 0 || selectedLevels.includes(d.title)) && (!selectedTrade || primaryTrade === selectedTrade);
                    })
                    .map(d => {
                        let totalScoreForSelectedSkills = 0;
                        const individualSkillScores = {};

                        selectedSkills.forEach(skillName => {
                            let score = 0;
                            if (d.skills && d.skills[skillName] !== undefined) {
                                score = d.skills[skillName];
                            }
                            if (Array.isArray(d.disciplineSkillsets)) {
                                const disciplineSkill = d.disciplineSkillsets.find(ds => ds.name === skillName);
                                if (disciplineSkill) {
                                    score = disciplineSkill.score;
                                }
                            }
                            totalScoreForSelectedSkills += score;
                            individualSkillScores[skillName] = score;
                        });

                        const mainTrade = d.disciplineSkillsets && Array.isArray(d.disciplineSkillsets) && d.disciplineSkillsets.length > 0 ? d.disciplineSkillsets[0].name : 'Uncategorized';

                        return {
                            id: d.id,
                            name: `${d.firstName} ${d.lastName}`,
                            trade: mainTrade,
                            totalScore: totalScoreForSelectedSkills,
                            ...individualSkillScores
                        };
                    });
                
                const topEmployeesByTrade = employeeSkillScores.reduce((acc, emp) => {
                    if (!acc[emp.trade]) {
                        acc[emp.trade] = [];
                    }
                    acc[emp.trade].push(emp);
                    return acc;
                }, {});

                data = [];
                headers = ["Trade", "Employee Name", "Total Score (Selected Skills)"];
                selectedSkills.forEach(skill => headers.push(skill));

                Object.keys(topEmployeesByTrade).sort().forEach(trade => {
                    const sortedEmployees = topEmployeesByTrade[trade].sort((a, b) => b.totalScore - a.totalScore);
                    sortedEmployees.slice(0, 2).forEach(emp => {
                        const row = [trade, emp.name, emp.totalScore];
                        selectedSkills.forEach(skill => row.push(emp[skill]));
                        data.push(row);
                    });
                });
                break;

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
                    "First Name", "Last Name", "Title", "Employee ID",
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

                if (selectedLevels.length > 0) {
                    filteredDetailers = filteredDetailers.filter(d => selectedLevels.includes(d.title));
                }

                if (selectedTrade) {
                    filteredDetailers = filteredDetailers.filter(d => {
                        const primaryTrade = d.disciplineSkillsets && Array.isArray(d.disciplineSkillsets) && d.disciplineSkillsets.length > 0 ? d.disciplineSkillsets[0].name : null;
                        return primaryTrade === selectedTrade;
                    });
                }

                data = filteredDetailers.map(d => {
                    const baseData = [
                        d.firstName,
                        d.lastName,
                        d.title || 'N/A',
                        d.employeeId || 'N/A',
                        d.wage || 0,
                        d.percentAboveScale || 0,
                        d.unionLocal || 'N/A',
                    ];

                    const generalSkillsData = [];
                    const generalSkills = d.skills ? Object.entries(d.skills) : [];
                    for (let i = 0; i < 5; i++) {
                        if (i < generalSkills.length) {
                            generalSkillsData.push(generalSkills[i][0]);
                            generalSkillsData.push(generalSkills[i][1]);
                        } else {
                            generalSkillsData.push('', '');
                        }
                    }

                    const disciplineSkillsData = [];
                    const disciplineSkills = d.disciplineSkillsets || [];
                    for (let i = 1; i <= 7; i++) {
                        if (i < disciplineSkills.length) {
                            disciplineSkillsData.push(disciplineSkills[i].name);
                            disciplineSkillsData.push(disciplineSkills[i].score);
                        } else {
                            disciplineSkillsData.push('', '');
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
        setChartData(null);
        setReportHeaders([]);
        setSelectedLevels([]);
        setSelectedTrade('');
        setSelectedProjectId('');
        setSelectedEmployeeId('');
        setStartDate('');
        setEndDate('');
        setSelectedSkills([]);
        setSelectedProfile("Select a Profile...");
    };

    const handleSkillCheckboxChange = (skillName) => {
        setSelectedSkills(prev => {
            if (prev.includes(skillName)) {
                return prev.filter(s => s !== skillName);
            } else {
                return [...prev, skillName];
            }
        });
        setSelectedProfile("Custom Selection");
    };

    const handleProfileChange = (e) => {
        const profileName = e.target.value;
        setSelectedProfile(profileName);
        if (teamProfiles[profileName]) {
            setSelectedSkills(teamProfiles[profileName]);
        } else {
            setSelectedSkills([]);
        }
    };

    const handleLevelChange = (level) => {
        setSelectedLevels(prev => {
            const newLevels = new Set(prev);
            if (newLevels.has(level)) {
                newLevels.delete(level);
            } else {
                newLevels.add(level);
            }
            return Array.from(newLevels);
        });
    };

    const handleSelectAllLevels = (e) => {
        if (e.target.checked) {
            setSelectedLevels(uniqueTitles);
        } else {
            setSelectedLevels([]);
        }
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
        const levelFilterUI = (
            <div>
                <label className="block text-sm font-medium mb-1">Filter by Level</label>
                <div className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputBorder} max-h-48 overflow-y-auto`}>
                    <div className="flex items-center mb-1">
                        <input
                            type="checkbox"
                            id="select-all-levels"
                            checked={selectedLevels.length === uniqueTitles.length && uniqueTitles.length > 0}
                            onChange={handleSelectAllLevels}
                            className="mr-2"
                        />
                        <label htmlFor="select-all-levels" className={`font-semibold ${currentTheme.textColor}`}>Select All</label>
                    </div>
                    {uniqueTitles.map(title => (
                        <div key={title} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`level-${title}`}
                                value={title}
                                checked={selectedLevels.includes(title)}
                                onChange={() => handleLevelChange(title)}
                                className="mr-2"
                            />
                            <label htmlFor={`level-${title}`} className={`${currentTheme.textColor}`}>{title}</label>
                        </div>
                    ))}
                </div>
            </div>
        );

        switch (reportType) {
            case 'employee-details':
            case 'skill-matrix':
                return (
                    <>
                        {levelFilterUI}
                        <div>
                            <label className="block text-sm font-medium mb-1">Filter by Trade</label>
                            <select value={selectedTrade} onChange={e => setSelectedTrade(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Primary Trades</option>
                                {uniqueTrades.map(trade => <option key={trade} value={trade}>{trade}</option>)}
                            </select>
                        </div>
                    </>
                );
            case 'top-employee-skills-by-trade':
                return (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Profile</label>
                            <select value={selectedProfile} onChange={handleProfileChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                {Object.keys(teamProfiles).map(profileName => (
                                    <option key={profileName} value={profileName}>{profileName}</option>
                                ))}
                            </select>
                        </div>
                        {levelFilterUI}
                        <div>
                            <label className="block text-sm font-medium mb-1">Filter by Trade</label>
                            <select value={selectedTrade} onChange={e => setSelectedTrade(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Primary Trades</option>
                                {uniqueTrades.map(trade => <option key={trade} value={trade}>{trade}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Skills</label>
                            <div className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputBorder} max-h-48 overflow-y-auto`}>
                                {allSkillsOptions.map(skill => (
                                    <div key={skill} className="flex items-center mb-1">
                                        <input
                                            type="checkbox"
                                            id={`skill-${skill}`}
                                            value={skill}
                                            checked={selectedSkills.includes(skill)}
                                            onChange={() => handleSkillCheckboxChange(skill)}
                                            className="mr-2"
                                        />
                                        <label htmlFor={`skill-${skill}`} className={`${currentTheme.inputText}`}>{skill}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                );
            case 'employee-workload-dist':
                return (
                    <div>
                        <label className="block text-sm font-medium mb-1">Select Employee</label>
                        <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            <option value="">-- Select an Employee --</option>
                            {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                        </select>
                    </div>
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

    const renderChart = () => {
        if (!chartData) return null;
        switch (reportType) {
            case 'project-health':
                return <ProjectHealthChart data={chartData} currentTheme={currentTheme} />;
            case 'employee-workload-dist':
                return <EmployeeWorkloadChart data={chartData} currentTheme={currentTheme} />;
            default:
                return null;
        }
    };

    return (
        <TutorialHighlight tutorialKey="reporting">
            <div className="p-4 h-full flex flex-col">
                <style>
                    {`
                        @media print {
                            body * { visibility: hidden; }
                            #skill-matrix-printable-area, #skill-matrix-printable-area * { visibility: visible; }
                            #skill-matrix-printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                        }
                    `}
                </style>
                <div className="flex-shrink-0 mb-4">
                    <h2 className={`text-2xl font-bold ${currentTheme.textColor}`}>Reporting & Dashboards</h2>
                </div>

                <div className="flex-grow flex gap-4 overflow-hidden">
                    {/* Left Controls Column */}
                    <div className={`w-full md:w-1/4 lg:w-1/5 flex-shrink-0 p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} space-y-4 overflow-y-auto hide-scrollbar-on-hover`}>
                        <TutorialHighlight tutorialKey="reportType">
                            <div>
                                <label className="block text-sm font-medium mb-1">Report Type</label>
                                <select value={reportType} onChange={e => setReportType(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                    <option value="">Select a report...</option>
                                    <optgroup label="Dashboards & Charts">
                                        <option value="project-health">Project Health Dashboard</option>
                                        <option value="employee-workload-dist">Employee Workload Distribution</option>
                                        <option value="skill-matrix">Employee Skill Matrix</option>
                                        <option value="top-employee-skills-by-trade">Top Employee Skills by Trade</option>
                                    </optgroup>
                                    <optgroup label="Tabular Reports">
                                        <option value="project-hours">Project Hours Summary</option>
                                        <option value="detailer-workload">Detailer Workload Summary</option>
                                        <option value="task-status">Task Status Report</option>
                                        <option value="forecast-vs-actual">Forecast vs. Actuals Summary</option>
                                        <option value="employee-details">Employee Skills & Details</option>
                                    </optgroup>
                                </select>
                            </div>
                        </TutorialHighlight>
                        
                        {renderFilters()}

                        <button onClick={handleGenerateReport} disabled={!reportType} className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">Generate</button>
                    </div>
                    
                    {/* Right Display Area */}
                    <div className="flex-grow overflow-y-auto hide-scrollbar-on-hover">
                        <TutorialHighlight tutorialKey="projectHealthDashboard">
                            {chartData && reportType === 'project-health' && (
                                <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-semibold">Project Health Dashboard</h3>
                                        <div className="flex gap-2">
                                            <button onClick={handleClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear</button>
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
                                            <button onClick={handleClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear</button>
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
                                            <button onClick={handleClearReport} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600">Clear</button>
                                        </div>
                                    </div>
                                    <EmployeeSkillMatrix detailers={filteredDetailersForMatrix} currentTheme={currentTheme} />
                                </div>
                            )}
                        </TutorialHighlight>

                        <TutorialHighlight tutorialKey="forecastVsActualReport">
                            {reportData && reportType === 'forecast-vs-actual' && (
                                <div className={`p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-semibold">Report Results: Forecast vs. Actuals</h3>
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
                        </TutorialHighlight>

                        {reportData && reportType !== 'forecast-vs-actual' && (
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
            </div>
        </TutorialHighlight>
    );
};

export default ReportingConsole;
