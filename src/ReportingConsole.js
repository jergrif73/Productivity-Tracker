import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TutorialHighlight } from './App';
import { AnimatePresence } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';

// Import the new sub-components
import ReportFilters from './ReportFilters';
import ReportDisplay from './ReportDisplay';
import MovableJobFamilyDisplay from './MovableJobFamilyDisplay';
import GeminiInsightChat from './GeminiInsightChat';
import JobFamilyEditor from './JobFamilyEditor'; // Import JobFamilyEditor

const abbreviateTitle = (title) => {
    if (!title) return 'N/A';
    const abbreviations = {
        "Detailer I": "DI",
        "Detailer II": "DII",
        "Detailer III": "DIII",
        "VDC Specialist": "VDCS",
        "Project Constructability Lead": "PCL",
        "Project Constructability Lead, Sr.": "PCL, Sr.",
        "Trade Constructability Lead": "TCL",
        "Constructability Manager": "CM",
    };
    return abbreviations[title] || title.split(' ').map(w => w[0]).join('');
};

const ReportingConsole = ({ projects = [], detailers = [], assignments = [], tasks = [], allProjectActivities = [], currentTheme, geminiApiKey, accessLevel, db, appId }) => {
    // State for filters (managed here, passed to ReportFilters)
    const [reportType, setReportType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedLevels, setSelectedLevels] = useState([]);
    const [selectedTrade, setSelectedTrade] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState("Select a Profile...");
    const [reportOption, setReportOption] = useState('fullProject');
    const [collapsedFilters, setCollapsedFilters] = useState({
        level: true, trade: true, profile: true, skills: true, employee: true, project: true, dateRange: true, jobFamily: true, reportOptions: true
    });

    // State for report results (managed here, passed to ReportDisplay)
    const [reportData, setReportData] = useState(null);
    const [reportHeaders, setReportHeaders] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // State for modals/popups
    const [isGeminiVisible, setIsGeminiVisible] = useState(false);
    const [reportContext, setReportContext] = useState(null); // Context for Gemini AI
    const [isJobFamilyPopupVisible, setIsJobFamilyPopupVisible] = useState(false);
    const [jobFamilyToDisplayInPopup, setJobFamilyToDisplayInPopup] = useState(null);
    const [isJobFamilyEditorOpen, setIsJobFamilyEditorOpen] = useState(false); // New state for JobFamilyEditor modal

    // Data fetched from Firestore (shared across components)
    const [jobFamilyData, setJobFamilyData] = useState({});

    // This effect listens for the global 'close-overlays' event dispatched from App.js
    // and closes all modals/popups within this console.
    useEffect(() => {
        const handleClose = () => {
            setIsGeminiVisible(false);
            setIsJobFamilyPopupVisible(false);
            setIsJobFamilyEditorOpen(false);
        };
        window.addEventListener('close-overlays', handleClose);
        return () => window.removeEventListener('close-overlays', handleClose);
    }, []); // Empty dependency array ensures this runs only once.

    // Fetch job family data from Firestore
    useEffect(() => {
        if (!db || !appId) return;
        const jobFamilyRef = collection(db, `artifacts/${appId}/public/data/jobFamilyData`);
        const unsubscribe = onSnapshot(jobFamilyRef, (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => {
                data[doc.data().title] = { id: doc.id, ...doc.data() };
            });
            setJobFamilyData(data);
        });
        return () => unsubscribe();
    }, [db, appId]);

    // Derived data for filters
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

    // Helper for date range calculation
    const getDaysInRange = useCallback((assStart, assEnd, reportStart, reportEnd) => {
        const effectiveStart = Math.max(assStart.getTime(), reportStart.getTime());
        const effectiveEnd = Math.min(assEnd.getTime(), reportEnd.getTime());
        if (effectiveStart > effectiveEnd) return 0;
        const diffTime = Math.abs(effectiveEnd - effectiveStart);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }, []);

    // Helper for project activities map
    const projectActivitiesMap = useMemo(() => {
        const map = new Map();
        allProjectActivities.forEach(activityDoc => {
            map.set(activityDoc.id, activityDoc);
        });
        return map;
    }, [allProjectActivities]);
    
    // Helper function for reports
    const formatCurrency = (value) => {
        const numberValue = Number(value) || 0;
        return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };

    // Filtered detailers for skill matrix (passed to ReportDisplay)
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

    // Report Generation Logic
    const handleGenerateReport = useCallback(() => {
        setReportData(null);
        setReportHeaders([]);
        setChartData(null);
        setSortConfig({ key: null, direction: 'ascending' });
        setIsJobFamilyPopupVisible(false); // Close job family popup on new report generation

        const sDate = startDate ? new Date(startDate) : null;
        const eDate = endDate ? new Date(endDate) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);

        let data = [];
        let headers = [];
        let isTabularReport = false;

        switch (reportType) {
            case 'full-project-report':
                if (!selectedProjectId) {
                    alert("Please select a project.");
                    return;
                }
                isTabularReport = false; // This is a complex view, not a simple table
                
                const project = projects.find(p => p.id === selectedProjectId);
                const activitiesDoc = projectActivitiesMap.get(selectedProjectId);
    
                if (!project || !activitiesDoc) {
                    alert("Could not find all data for the selected project.");
                    return;
                }
    
                const currentBudget = (project.initialBudget || 0) + (activitiesDoc.budgetImpacts || []).reduce((sum, impact) => sum + impact.amount, 0);
                
                const allActivities = Object.values(activitiesDoc.activities || {}).flat();
    
                const calculateTotals = (activitiesList) => {
                  return activitiesList.reduce((acc, activity) => {
                    const estHours = Number(activity?.estimatedHours || 0);
                    const costToDate = Number(activity?.costToDate || 0);
                    const percentComplete = Number(activity?.percentComplete || 0);
            
                    const useVdcRate = activity.description.toUpperCase().includes('VDC') || activity.description === "Project Setup";
                    const rateToUse = useVdcRate ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
            
                    const budget = (estHours * rateToUse); // Using raw budget for calcs
                    const projectedCost = percentComplete > 0 ? (costToDate / (percentComplete / 100)) : (estHours > 0 ? budget : 0);
            
                    acc.estimated += estHours;
                    acc.budget += budget;
                    acc.actualCost += costToDate;
                    acc.earnedValue += budget * (percentComplete / 100);
                    acc.projectedCost += projectedCost;
                    
                    return acc;
                  }, { estimated: 0, budget: 0, actualCost: 0, earnedValue: 0, projectedCost: 0 });
                };
    
                const activityTotals = calculateTotals(allActivities);
                
                const actionTrackerSummary = [];
                if (activitiesDoc.mainItems && activitiesDoc.actionTrackerData) {
                    activitiesDoc.mainItems.forEach(main => {
                        const mainSummary = { mainName: main.name, disciplines: [] };
                        (activitiesDoc.actionTrackerDisciplines || []).forEach(disc => {
                            const tradeData = activitiesDoc.actionTrackerData[main.id]?.[disc.key];
                            if (tradeData) {
                                let totalCompletion = 0;
                                let activityCount = 0;
                                if(tradeData.activities){
                                    const completions = Object.values(tradeData.activities);
                                    activityCount = completions.length;
                                    if(activityCount > 0){
                                       totalCompletion = completions.reduce((sum, val) => sum + (Number(val) || 0), 0) / activityCount;
                                    }
                                }
                                mainSummary.disciplines.push({
                                    disciplineName: disc.label,
                                    tradePercentage: tradeData.tradePercentage || 0,
                                    avgPercentComplete: totalCompletion.toFixed(1)
                                });
                            }
                        });
                        actionTrackerSummary.push(mainSummary);
                    });
                }
    
                const fullReportPayload = {
                    project,
                    activitiesDoc,
                    financialSummary: {
                        currentBudget,
                        allocatedHours: activityTotals.estimated,
                        spentToDate: activityTotals.actualCost,
                        earnedValue: activityTotals.earnedValue,
                        projectedFinalCost: activityTotals.projectedCost,
                        costToComplete: activityTotals.projectedCost - activityTotals.actualCost,
                        variance: currentBudget - activityTotals.projectedCost,
                        productivity: activityTotals.actualCost > 0 ? activityTotals.earnedValue / activityTotals.actualCost : 0
                    },
                    actionTrackerSummary,
                    reportOption,
                    dateRange: { startDate: sDate, endDate: eDate }
                };
    
                setReportData(fullReportPayload);
                data = fullReportPayload; // Store for reportContext
                break;

            case 'project-health':
                const healthData = projects.filter(p => !p.archived).map(p => {
                    const activitiesDoc = projectActivitiesMap.get(p.id);
                    if (!activitiesDoc || !activitiesDoc.activities) return null;
                    const activities = activitiesDoc.activities;

                    let earnedValue = 0;
                    let actualCost = 0;
            
                    Object.entries(activities).forEach(([groupKey, activityList]) => {
                        const isVdcGroup = groupKey === 'vdc';
                        const rate = isVdcGroup ? (p.vdcBlendedRate || p.blendedRate) : p.blendedRate;
            
                        activityList.forEach(act => {
                            earnedValue += (Number(act.estimatedHours || 0) * rate * (Number(act.percentComplete || 0) / 100));
                            actualCost += (Number(act.costToDate || 0)); // Use costToDate directly
                        });
                    });

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
                    alert("Please select an employee."); // Consider replacing with a toast/modal
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
                // Data for skill matrix is handled by the EmployeeSkillMatrix component directly
                // No tabular data or chartData is set here for this report type
                break;
            
            case 'employee-details':
                const tradeAbbreviations = {
                    "Piping": "MP",
                    "Duct": "MH",
                    "Plumbing": "PL",
                    "VDC": "VDC",
                    "Structural": "Str",
                    "Coordination": "Coord",
                    "GIS/GPS": "GIS"
                };

                const sortedEmployees = [...filteredDetailersForMatrix].sort((a, b) => a.lastName.localeCompare(b.lastName));

                headers = sortedEmployees.map(emp => ({
                    id: emp.id,
                    name: `${emp.firstName} ${emp.lastName}`,
                }));

                const skillRows = ['Title', 'Primary Trade', ...allSkillsOptions];

                data = skillRows.map(skill => {
                    const rowData = { attribute: skill, values: [] };
                    sortedEmployees.forEach(emp => {
                        let value = 0; // Default for scores
                        if (skill === 'Title') {
                            value = abbreviateTitle(emp.title);
                        } else if (skill === 'Primary Trade') {
                            const primaryTrade = (Array.isArray(emp.disciplineSkillsets) && emp.disciplineSkillsets.length > 0)
                                ? emp.disciplineSkillsets[0].name
                                : 'N/A';
                            value = tradeAbbreviations[primaryTrade] || primaryTrade;
                        } else {
                            // Check general skills
                            if (emp.skills && emp.skills[skill] !== undefined) {
                                value = emp.skills[skill];
                            }
                            // Check discipline skills (overwrites if present)
                            if (Array.isArray(emp.disciplineSkillsets)) {
                                const discipline = emp.disciplineSkillsets.find(d => d.name === skill);
                                if (discipline) {
                                    value = discipline.score;
                                }
                            }
                        }
                        rowData.values.push({ employeeId: emp.id, value });
                    });
                    return rowData;
                });
                isTabularReport = true;
                break;

            case 'top-employee-skills-by-trade':
                if (selectedSkills.length === 0) {
                    alert("Please select at least one skill to compare."); // Consider replacing with a toast/modal
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
                isTabularReport = true;
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
                isTabularReport = true;
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
                 isTabularReport = true;
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
                isTabularReport = true;
                break;
            
            case 'forecast-vs-actual':
                headers = ["Project Name", "Project ID", "Forecasted Hours", "Assigned Hours", "Actual Cost ($)", "Variance (Forecast Hrs - Actual Cost)"];
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
                        const activitiesDoc = projectActivitiesMap.get(p.id);
                        const projectActivities = activitiesDoc ? activitiesDoc.activities : null;


                        const actualBurn = projectActivities 
                            ? Object.values(projectActivities).flat().reduce((sum, act) => sum + (Number(act.costToDate) || 0), 0)
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

                        const variance = forecastedHours - actualBurn; // This is Hours - Dollars, as requested.

                        return [
                            p.name,
                            p.projectId,
                            forecastedHours.toFixed(2),
                            assignedHours.toFixed(2),
                            formatCurrency(actualBurn), // Format as currency
                            variance.toFixed(2) // This is still Hrs - $
                        ];
                    });
                isTabularReport = true;
                break;

            default:
                break;
        }
        
        if (reportType !== 'full-project-report') {
            setReportData(data);
        }
        
        setReportHeaders(headers);

        // FIX: Set reportContext for full-project-report too so Ctrl+Alt+Shift+G works
        if (isTabularReport) {
            setReportContext({ data, headers, type: reportType });
        } else if (reportType === 'full-project-report' && data) {
            // Set context for full project report to enable Gemini AI keyboard shortcut
            console.log('Setting reportContext for full-project-report with data:', data);
            console.log('Financial Summary:', data.financialSummary);
            setReportContext({ data, headers: [], type: reportType });
        } else {
            setReportContext(null);
        }
    }, [startDate, endDate, reportType, projects, projectActivitiesMap, assignments, selectedEmployeeId, selectedSkills, detailers, selectedLevels, selectedTrade, getDaysInRange, tasks, allSkillsOptions, filteredDetailersForMatrix, selectedProjectId, reportOption]);

    const handleClearReport = useCallback(() => {
        setReportData(null);
        setChartData(null);
        setReportHeaders([]);
        setSortConfig({ key: null, direction: 'ascending' });
        // Reset all filter states
        setReportType('');
        setStartDate('');
        setEndDate('');
        setSelectedProjectId('');
        setSelectedLevels([]);
        setSelectedTrade('');
        setSelectedEmployeeId('');
        setSelectedSkills([]);
        setSelectedProfile("Select a Profile...");
        setReportOption('fullProject');
        // Close modals/popups
        setIsJobFamilyPopupVisible(false);
        setJobFamilyToDisplayInPopup(null);
    }, []);

    // Effect to listen for the hotkey combination for Gemini AI
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.altKey &&
                event.key.toLowerCase() === 'g' &&
                accessLevel === 'taskmaster' &&
                reportContext // Only open if there's a report context
            ) {
                event.preventDefault(); // Prevent any default browser action for this combo
                setIsGeminiVisible(prev => !prev); // Toggle visibility
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [accessLevel, reportContext]);

    // Callback for filter changes from ReportFilters
    const handleFilterChange = useCallback((filterName, value) => {
        switch (filterName) {
            case 'reportType': setReportType(value); break;
            case 'startDate': setStartDate(value); break;
            case 'endDate': setEndDate(value); break;
            case 'selectedProjectId': setSelectedProjectId(value); break;
            case 'selectedLevels': setSelectedLevels(value); break;
            case 'selectedTrade': setSelectedTrade(value); break;
            case 'selectedEmployeeId': setSelectedEmployeeId(value); break;
            case 'selectedSkills': setSelectedSkills(value); break;
            case 'selectedProfile': setSelectedProfile(value); break;
            case 'reportOption': setReportOption(value); break;
            default: break;
        }
    }, []);

    // Callback for toggling filter sections
    const toggleFilterCollapse = useCallback((filterName) => {
        setCollapsedFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
    }, []);

    // Callback for displaying job family popup
    const handleJobFamilySelectForPopup = useCallback((jobTitle) => {
        if (jobTitle) {
            setJobFamilyToDisplayInPopup(jobFamilyData[jobTitle]);
            setIsJobFamilyPopupVisible(true);
        } else {
            setIsJobFamilyPopupVisible(false);
            setJobFamilyToDisplayInPopup(null);
        }
    }, [jobFamilyData]);

    // Callback for sorting report data
    const requestSort = useCallback((key) => {
        setSortConfig(prev => {
            let direction = 'ascending';
            if (prev.key === key && prev.direction === 'ascending') {
                direction = 'descending';
            }
            return { key, direction };
        });
    }, []);

    return (
        <TutorialHighlight tutorialKey="reporting">
            <div className="p-4 h-full flex flex-col">
                <style>
                    {`
                        @media print {
                            body * { visibility: hidden; }
                            #full-project-report-printable, #full-project-report-printable * { visibility: visible; }
                            #full-project-report-printable { position: absolute; left: 0; top: 0; width: 100%; }
                            #skill-matrix-printable-area, #skill-matrix-printable-area * { visibility: visible; }
                            #skill-matrix-printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                        }
                    `}
                </style>
                {/* Gemini AI Chat Overlay */}
                <GeminiInsightChat
                    isVisible={isGeminiVisible}
                    onClose={() => setIsGeminiVisible(false)}
                    reportContext={reportContext}
                    geminiApiKey={geminiApiKey}
                    currentTheme={currentTheme}
                    jobFamilyData={jobFamilyData}
                />
                {/* Movable Job Family Display Popup */}
                <AnimatePresence>
                    {isJobFamilyPopupVisible && (
                        <MovableJobFamilyDisplay
                            jobToDisplay={jobFamilyToDisplayInPopup}
                            currentTheme={currentTheme}
                            onClose={() => {
                                setIsJobFamilyPopupVisible(false);
                                setJobFamilyToDisplayInPopup(null);
                            }}
                        />
                    )}
                </AnimatePresence>
                {/* JobFamilyEditor Modal */}
                <AnimatePresence>
                    {isJobFamilyEditorOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
                            <div className={`bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar-on-hover`}>
                                <JobFamilyEditor
                                    db={db}
                                    appId={appId}
                                    currentTheme={currentTheme}
                                    onClose={() => setIsJobFamilyEditorOpen(false)}
                                />
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                <div className="flex-shrink-0 mb-4 flex justify-between items-center">
                    <h2 className={`text-2xl font-bold ${currentTheme.textColor}`}>Reporting & Dashboards</h2>
                    {accessLevel === 'taskmaster' && (
                        <TutorialHighlight tutorialKey="manageJobPositions">
                            <button
                                onClick={() => setIsJobFamilyEditorOpen(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                                Manage Positions
                            </button>
                        </TutorialHighlight>
                    )}
                </div>

                <div className="flex-grow flex gap-4 min-h-0 h-[calc(100vh-200px)] overflow-y-auto hide-scrollbar-on-hover">
                    {/* Left Controls Column - now ReportFilters Component */}
                    <ReportFilters
                        reportType={reportType}
                        startDate={startDate}
                        endDate={endDate}
                        selectedProjectId={selectedProjectId}
                        selectedLevels={selectedLevels}
                        selectedTrade={selectedTrade}
                        selectedEmployeeId={selectedEmployeeId}
                        selectedSkills={selectedSkills}
                        selectedProfile={selectedProfile}
                        reportOption={reportOption}
                        collapsedFilters={collapsedFilters}
                        jobFamilyToDisplayInPopup={jobFamilyToDisplayInPopup}
                        jobFamilyData={jobFamilyData}
                        uniqueTitles={uniqueTitles}
                        uniqueTrades={uniqueTrades}
                        allSkillsOptions={allSkillsOptions}
                        detailers={detailers}
                        projects={projects}
                        currentTheme={currentTheme}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={handleGenerateReport}
                        onToggleFilterCollapse={toggleFilterCollapse}
                        onJobFamilySelectForPopup={handleJobFamilySelectForPopup}
                    />
                    
                    {/* Right Display Area - now ReportDisplay Component */}
                    <ReportDisplay
                        reportData={reportData}
                        reportHeaders={reportHeaders}
                        chartData={chartData}
                        reportType={reportType}
                        sortConfig={sortConfig}
                        currentTheme={currentTheme}
                        filteredDetailersForMatrix={filteredDetailersForMatrix}
                        accessLevel={accessLevel}
                        db={db}
                        appId={appId}
                        onClearReport={handleClearReport}
                        onRequestSort={requestSort}
                    />
                </div>
            </div>
        </TutorialHighlight>
    );
};

export default ReportingConsole;