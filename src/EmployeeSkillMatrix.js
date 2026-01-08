// src/EmployeeSkillMatrix.js
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { collection, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import JobFamilyEditor from './JobFamilyEditor';
import { jobFamilyData as initialJobFamilyData } from './job-family-data';

// Discipline name mapping
const disciplineNameMap = {
    "Piping": "MP", "Mechanical Piping": "MP",
    "Duct": "MH", "Sheet Metal": "MH", "Sheet Metal / HVAC": "MH",
    "Plumbing": "PL",
    "Coordination": "Coord",
    "VDC": "VDC",
    "Structural": "ST",
    "GIS/GPS": "GIS/GPS",
    "Process Piping": "PP",
    "Fire Protection": "FP",
    "Medical Gas": "PJ",
    "Management": "MGMT"
};

// Default skill orders - defined outside component since they're constants
const generalSkillOrder = ["Model Knowledge", "VDC Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
const disciplineSkillOrder = ["MP", "MH", "PL", "Coord", "VDC", "ST", "GIS/GPS", "PP", "FP", "PJ", "MGMT"];
const defaultSkillOrder = [...generalSkillOrder, ...disciplineSkillOrder];

// Color function - matches legend exactly
const getScoreColor = (score) => {
    if (score >= 9) return '#008000'; // Green - Expert
    if (score === 8) return '#FFFF00'; // Yellow - Proficient  
    if (score === 7) return '#FFA500'; // Orange - Competent
    if (score >= 5) return '#FF0000'; // Red - Developing
    if (score >= 3) return '#800080'; // Purple - Basic
    if (score >= 1) return '#0000FF'; // Blue - Learning
    return 'transparent';
};

const getScoreBorder = (score) => {
    if (score >= 9) return '#006400';
    if (score === 8) return '#CCCC00';
    if (score === 7) return '#CC8400';
    if (score >= 5) return '#CC0000';
    if (score >= 3) return '#600060';
    if (score >= 1) return '#0000CC';
    return 'transparent';
};

// eslint-disable-next-line no-unused-vars
const EmployeeSkillMatrix = ({ detailers, currentTheme, db, appId, accessLevel, hideJobFamilyDisplay = false }) => {
    const svgRef = useRef(null);
    // eslint-disable-next-line no-unused-vars
    const [selectedJob, setSelectedJob] = useState('');
    const [jobFamilyData, setJobFamilyData] = useState({});
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showDragArea, setShowDragArea] = useState(false);
    
    // Sorting state
    const [employeeSort, setEmployeeSort] = useState('discipline'); 
    const [skillSort, setSkillSort] = useState('default');
    const [customEmployeeOrder, setCustomEmployeeOrder] = useState([]);
    const [customSkillOrder, setCustomSkillOrder] = useState([]);
    
    // Drag state
    const [draggedEmployee, setDraggedEmployee] = useState(null);
    const [draggedSkill, setDraggedSkill] = useState(null);
    const [dragOverEmployee, setDragOverEmployee] = useState(null);
    const [dragOverSkill, setDragOverSkill] = useState(null);

    useEffect(() => {
        if (!db || !appId) return;
        const jobFamilyRef = collection(db, `artifacts/${appId}/public/data/jobFamilyData`);

        const seedData = async () => {
            const querySnapshot = await getDocs(jobFamilyRef);
            if (querySnapshot.empty) {
                const batch = writeBatch(db);
                Object.values(initialJobFamilyData).forEach(job => {
                    const docRef = doc(jobFamilyRef);
                    batch.set(docRef, job);
                });
                await batch.commit();
            }
        };

        seedData();

        const unsubscribe = onSnapshot(jobFamilyRef, (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => {
                data[doc.data().title] = { id: doc.id, ...doc.data() };
            });
            setJobFamilyData(data);
        });
        return () => unsubscribe();
    }, [db, appId]);

    const jobToDisplay = !hideJobFamilyDisplay && jobFamilyData[selectedJob];

    // Build base data
    const { baseEmployees, employeeTradeMap, employeeDataMap, employeeTotalScores, skillTotalScores } = useMemo(() => {
        const employeeTradeMap = new Map();
        const employeeDataMap = new Map();
        const employeeTotalScores = new Map();
        const skillTotalScores = new Map();
        
        defaultSkillOrder.forEach(skill => skillTotalScores.set(skill, 0));
        
        detailers.forEach(detailer => {
            const fullName = `${detailer.firstName} ${detailer.lastName}`;
            const rawTrade = detailer.disciplineSkillsets?.[0]?.name || 'Uncategorized';
            const trade = disciplineNameMap[rawTrade] || rawTrade;
            
            employeeTradeMap.set(fullName, trade);
            
            let totalScore = 0;
            
            generalSkillOrder.forEach(skill => {
                const score = detailer.skills?.[skill] || 0;
                totalScore += score;
                skillTotalScores.set(skill, (skillTotalScores.get(skill) || 0) + score);
            });
            
            const disciplineMap = new Map();
            (detailer.disciplineSkillsets || []).forEach(ds => {
                const mappedName = disciplineNameMap[ds.name] || ds.name;
                disciplineMap.set(mappedName, ds.score);
            });
            
            disciplineSkillOrder.forEach(skill => {
                const score = disciplineMap.get(skill) || 0;
                totalScore += score;
                skillTotalScores.set(skill, (skillTotalScores.get(skill) || 0) + score);
            });
            
            employeeTotalScores.set(fullName, totalScore);
            
            employeeDataMap.set(fullName, {
                firstName: detailer.firstName,
                lastName: detailer.lastName,
                trade,
                skills: detailer.skills || {},
                disciplineSkillsets: detailer.disciplineSkillsets || [],
                totalScore
            });
        });
        
        const baseEmployees = detailers.map(d => `${d.firstName} ${d.lastName}`);
        
        return { baseEmployees, employeeTradeMap, employeeDataMap, employeeTotalScores, skillTotalScores };
    }, [detailers]);

    // Sort employees
    const sortedEmployeeNames = useMemo(() => {
        if (employeeSort === 'custom' && customEmployeeOrder.length > 0) {
            return customEmployeeOrder.filter(name => baseEmployees.includes(name));
        }
        
        const sorted = [...baseEmployees].sort((a, b) => {
            const dataA = employeeDataMap.get(a);
            const dataB = employeeDataMap.get(b);
            
            switch (employeeSort) {
                case 'lastName':
                    return dataA.lastName.localeCompare(dataB.lastName);
                case 'firstName':
                    return dataA.firstName.localeCompare(dataB.firstName);
                case 'scoreHighLow':
                    return dataB.totalScore - dataA.totalScore;
                case 'scoreLowHigh':
                    return dataA.totalScore - dataB.totalScore;
                case 'discipline':
                default:
                    if (dataA.trade !== dataB.trade) {
                        return dataA.trade.localeCompare(dataB.trade);
                    }
                    return dataA.lastName.localeCompare(dataB.lastName);
            }
        });
        
        return sorted;
    }, [baseEmployees, employeeSort, customEmployeeOrder, employeeDataMap]);

    // Sort skills
    const sortedSkillNames = useMemo(() => {
        if (skillSort === 'custom' && customSkillOrder.length > 0) {
            return customSkillOrder;
        }
        
        switch (skillSort) {
            case 'alphabetical':
                return [...defaultSkillOrder].sort((a, b) => a.localeCompare(b));
            case 'scoreHighLow':
                return [...defaultSkillOrder].sort((a, b) => 
                    (skillTotalScores.get(b) || 0) - (skillTotalScores.get(a) || 0)
                );
            case 'scoreLowHigh':
                return [...defaultSkillOrder].sort((a, b) => 
                    (skillTotalScores.get(a) || 0) - (skillTotalScores.get(b) || 0)
                );
            default:
                return defaultSkillOrder;
        }
    }, [skillSort, customSkillOrder, skillTotalScores]);

    // Build flat data
    const data = useMemo(() => {
        const flatData = [];
        
        sortedEmployeeNames.forEach((employeeName, empIdx) => {
            const empData = employeeDataMap.get(employeeName);
            if (!empData) return;
            
            const disciplineMap = new Map();
            empData.disciplineSkillsets.forEach(ds => {
                const mappedName = disciplineNameMap[ds.name] || ds.name;
                disciplineMap.set(mappedName, ds.score);
            });
            
            sortedSkillNames.forEach((skill, skillIdx) => {
                let score = 0;
                if (generalSkillOrder.includes(skill)) {
                    score = empData.skills[skill] || 0;
                } else {
                    score = disciplineMap.get(skill) || 0;
                }
                flatData.push({ 
                    employee: employeeName, 
                    skill, 
                    score,
                    col: empIdx,
                    row: skillIdx
                });
            });
        });
        
        return flatData;
    }, [sortedEmployeeNames, sortedSkillNames, employeeDataMap]);

    // Drag handlers
    const handleEmployeeDragStart = useCallback((e, name) => {
        setDraggedEmployee(name);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleEmployeeDragOver = useCallback((e, name) => {
        e.preventDefault();
        if (draggedEmployee && draggedEmployee !== name) {
            setDragOverEmployee(name);
        }
    }, [draggedEmployee]);

    const handleEmployeeDrop = useCallback((e, targetName) => {
        e.preventDefault();
        if (!draggedEmployee || draggedEmployee === targetName) return;
        
        const currentOrder = employeeSort === 'custom' && customEmployeeOrder.length > 0 
            ? [...customEmployeeOrder] 
            : [...sortedEmployeeNames];
        
        const draggedIndex = currentOrder.indexOf(draggedEmployee);
        const targetIndex = currentOrder.indexOf(targetName);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            currentOrder.splice(draggedIndex, 1);
            currentOrder.splice(targetIndex, 0, draggedEmployee);
            setCustomEmployeeOrder(currentOrder);
            setEmployeeSort('custom');
        }
        
        setDraggedEmployee(null);
        setDragOverEmployee(null);
    }, [draggedEmployee, employeeSort, customEmployeeOrder, sortedEmployeeNames]);

    const handleSkillDragStart = useCallback((e, skill) => {
        setDraggedSkill(skill);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleSkillDragOver = useCallback((e, skill) => {
        e.preventDefault();
        if (draggedSkill && draggedSkill !== skill) {
            setDragOverSkill(skill);
        }
    }, [draggedSkill]);

    const handleSkillDrop = useCallback((e, targetSkill) => {
        e.preventDefault();
        if (!draggedSkill || draggedSkill === targetSkill) return;
        
        const currentOrder = skillSort === 'custom' && customSkillOrder.length > 0 
            ? [...customSkillOrder] 
            : [...sortedSkillNames];
        
        const draggedIndex = currentOrder.indexOf(draggedSkill);
        const targetIndex = currentOrder.indexOf(targetSkill);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            currentOrder.splice(draggedIndex, 1);
            currentOrder.splice(targetIndex, 0, draggedSkill);
            setCustomSkillOrder(currentOrder);
            setSkillSort('custom');
        }
        
        setDraggedSkill(null);
        setDragOverSkill(null);
    }, [draggedSkill, skillSort, customSkillOrder, sortedSkillNames]);

    // D3 Visualization
    useEffect(() => {
        if (!data.length || !svgRef.current || !currentTheme) return;

        const labelColor = currentTheme.mainBg === 'bg-gray-900' ? '#9CA3AF' : '#374151';
        const gridColor = currentTheme.mainBg === 'bg-gray-900' ? '#4B5563' : '#9CA3AF';

        const cellSize = 28;
        const leftMargin = 120;
        const topMargin = 180; // Increased for rotated names

        const numCols = sortedEmployeeNames.length;
        const numRows = sortedSkillNames.length;
        
        const chartWidth = numCols * cellSize;
        const chartHeight = numRows * cellSize;
        
        const totalWidth = leftMargin + chartWidth + 10;
        const totalHeight = topMargin + chartHeight + 10;

        const svg = d3.select(svgRef.current)
            .attr("width", totalWidth)
            .attr("height", totalHeight);

        svg.selectAll("*").remove();

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "absolute opacity-0 transition-opacity duration-200 bg-gray-900 text-white text-xs rounded-md p-2 pointer-events-none shadow-lg z-50 border border-gray-600")
            .style("max-width", "200px");

        const radius = d3.scaleLinear()
            .domain([0, 10])
            .range([0, cellSize / 2 - 2]);

        // Draw horizontal grid lines
        for (let row = 0; row <= numRows; row++) {
            svg.append("line")
                .attr("x1", leftMargin)
                .attr("y1", topMargin + row * cellSize)
                .attr("x2", leftMargin + chartWidth)
                .attr("y2", topMargin + row * cellSize)
                .attr("stroke", gridColor)
                .attr("stroke-width", 1);
        }

        // Draw vertical grid lines
        for (let col = 0; col <= numCols; col++) {
            svg.append("line")
                .attr("x1", leftMargin + col * cellSize)
                .attr("y1", topMargin)
                .attr("x2", leftMargin + col * cellSize)
                .attr("y2", topMargin + chartHeight)
                .attr("stroke", gridColor)
                .attr("stroke-width", 1);
        }

        // X-axis labels (Employee names) - above the grid
        sortedEmployeeNames.forEach((name, i) => {
            const xCenter = leftMargin + i * cellSize + cellSize / 2;
            
            svg.append("text")
                .attr("x", xCenter)
                .attr("y", topMargin - 8)
                .attr("transform", `rotate(-55, ${xCenter}, ${topMargin - 8})`)
                .attr("text-anchor", "end")
                .attr("font-size", "9px")
                .attr("fill", labelColor)
                .text(name);
        });

        // Y-axis labels (Skill names) - left of the grid
        sortedSkillNames.forEach((skill, i) => {
            const yCenter = topMargin + i * cellSize + cellSize / 2;
            
            svg.append("text")
                .attr("x", leftMargin - 6)
                .attr("y", yCenter)
                .attr("text-anchor", "end")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "9px")
                .attr("fill", labelColor)
                .text(skill);
        });

        // Score circles - centered in each cell
        data.forEach((d, idx) => {
            const cx = leftMargin + d.col * cellSize + cellSize / 2;
            const cy = topMargin + d.row * cellSize + cellSize / 2;
            
            if (d.score > 0) {
                svg.append("circle")
                    .attr("cx", cx)
                    .attr("cy", cy)
                    .attr("r", 0)
                    .attr("fill", getScoreColor(d.score))
                    .attr("stroke", getScoreBorder(d.score))
                    .attr("stroke-width", 1)
                    .style("cursor", "pointer")
                    .on("mouseover", function(event) {
                        const trade = employeeTradeMap.get(d.employee) || 'N/A';
                        const totalScore = employeeTotalScores.get(d.employee) || 0;
                        tooltip.html(`<strong>${d.employee}</strong><br/>Trade: ${trade}<br/>Skill: ${d.skill}<br/>Score: ${d.score}/10<br/>Total: ${totalScore}`)
                            .style("opacity", 1)
                            .style("left", (event.pageX + 12) + "px")
                            .style("top", (event.pageY - 10) + "px");
                        d3.select(this).attr("stroke-width", 2);
                    })
                    .on("mousemove", function(event) {
                        tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 10) + "px");
                    })
                    .on("mouseout", function() {
                        d3.select(this).attr("stroke-width", 1);
                        tooltip.style("opacity", 0);
                    })
                    .transition()
                    .duration(200)
                    .delay(idx * 0.2)
                    .attr("r", radius(d.score));
            }
        });

        return () => { tooltip.remove() };

    }, [data, sortedSkillNames, sortedEmployeeNames, employeeTradeMap, employeeTotalScores, currentTheme]);

    const handleResetSort = () => {
        setEmployeeSort('discipline');
        setSkillSort('default');
        setCustomEmployeeOrder([]);
        setCustomSkillOrder([]);
    };

    return (
        <div id="skill-matrix-printable-area">
            {/* Compact Controls Row */}
            <div className={`flex items-center gap-4 p-2 mb-2 rounded ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                <div className="flex items-center gap-2">
                    <span className={`text-xs ${currentTheme.subtleText}`}>Employees:</span>
                    <select
                        value={employeeSort}
                        onChange={(e) => setEmployeeSort(e.target.value)}
                        className={`p-1 text-xs border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    >
                        <option value="discipline">By Discipline</option>
                        <option value="lastName">Last Name A-Z</option>
                        <option value="firstName">First Name A-Z</option>
                        <option value="scoreHighLow">Score ↓</option>
                        <option value="scoreLowHigh">Score ↑</option>
                        {customEmployeeOrder.length > 0 && <option value="custom">Custom</option>}
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className={`text-xs ${currentTheme.subtleText}`}>Skills:</span>
                    <select
                        value={skillSort}
                        onChange={(e) => setSkillSort(e.target.value)}
                        className={`p-1 text-xs border rounded ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    >
                        <option value="default">Default</option>
                        <option value="alphabetical">A-Z</option>
                        <option value="scoreHighLow">Score ↓</option>
                        <option value="scoreLowHigh">Score ↑</option>
                        {customSkillOrder.length > 0 && <option value="custom">Custom</option>}
                    </select>
                </div>
                
                <button
                    onClick={handleResetSort}
                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                >
                    Reset
                </button>

                <button
                    onClick={() => setShowDragArea(!showDragArea)}
                    className={`px-2 py-1 text-xs rounded ${showDragArea ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'}`}
                >
                    {showDragArea ? 'Hide' : 'Show'} Custom Order
                </button>
            </div>

            {/* Collapsible Drag Area - Grid Layout */}
            {showDragArea && (
                <div className={`p-3 mb-2 rounded ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                    {/* Employees - 8 columns */}
                    <div className="mb-4">
                        <div className={`text-xs font-medium mb-2 ${currentTheme.textColor}`}>
                            Drag employees to reorder columns:
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                            {sortedEmployeeNames.map((name) => {
                                const parts = name.split(' ');
                                const short = `${parts[0][0]}.${parts[parts.length - 1]}`;
                                return (
                                    <div
                                        key={name}
                                        draggable
                                        onDragStart={(e) => handleEmployeeDragStart(e, name)}
                                        onDragOver={(e) => handleEmployeeDragOver(e, name)}
                                        onDrop={(e) => handleEmployeeDrop(e, name)}
                                        onDragEnd={() => { setDraggedEmployee(null); setDragOverEmployee(null); }}
                                        title={name}
                                        className={`px-2 py-1.5 text-xs rounded cursor-grab select-none text-center truncate ${
                                            draggedEmployee === name 
                                                ? 'opacity-50 bg-blue-600 text-white' 
                                                : dragOverEmployee === name 
                                                    ? 'bg-blue-500 text-white ring-2 ring-blue-300' 
                                                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                        }`}
                                    >
                                        {short}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Skills - 8 columns */}
                    <div>
                        <div className={`text-xs font-medium mb-2 ${currentTheme.textColor}`}>
                            Drag skills to reorder rows:
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                            {sortedSkillNames.map((skill) => (
                                <div
                                    key={skill}
                                    draggable
                                    onDragStart={(e) => handleSkillDragStart(e, skill)}
                                    onDragOver={(e) => handleSkillDragOver(e, skill)}
                                    onDrop={(e) => handleSkillDrop(e, skill)}
                                    onDragEnd={() => { setDraggedSkill(null); setDragOverSkill(null); }}
                                    className={`px-2 py-1.5 text-xs rounded cursor-grab select-none text-center truncate ${
                                        draggedSkill === skill 
                                            ? 'opacity-50 bg-green-600 text-white' 
                                            : dragOverSkill === skill 
                                                ? 'bg-green-500 text-white ring-2 ring-green-300' 
                                                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                    }`}
                                >
                                    {skill}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Job Family Editor Modal */}
            {isEditorOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
                    <div className={`bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar-on-hover`}>
                        <JobFamilyEditor db={db} appId={appId} currentTheme={currentTheme} onClose={() => setIsEditorOpen(false)} />
                    </div>
                </div>
            )}

            {/* Job Display */}
            {jobToDisplay && !hideJobFamilyDisplay && (
                <div className={`p-4 mb-4 border-t ${currentTheme.borderColor}`}>
                    <h3 className={`text-xl font-bold mb-3 ${currentTheme.textColor}`}>{jobToDisplay.title}</h3>
                </div>
            )}

            {/* Matrix and Legend */}
            <div className="flex">
                <div style={{ maxHeight: '65vh', overflow: 'auto' }} className="hide-scrollbar-on-hover flex-grow">
                    <svg ref={svgRef}></svg>
                </div>
                
                {/* Legend */}
                <div className={`flex-shrink-0 p-3 ml-3 border-l ${currentTheme.borderColor}`} style={{ minWidth: '150px' }}>
                    <h4 className={`text-xs font-bold mb-2 ${currentTheme.textColor}`}>Skill Levels</h4>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#008000', border: '1px solid #006400' }}></div>
                            <span className={`text-xs ${currentTheme.textColor}`}>9-10: Expert</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#FFFF00', border: '1px solid #CCCC00' }}></div>
                            <span className={`text-xs ${currentTheme.textColor}`}>8: Proficient</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#FFA500', border: '1px solid #CC8400' }}></div>
                            <span className={`text-xs ${currentTheme.textColor}`}>7: Competent</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#FF0000', border: '1px solid #CC0000' }}></div>
                            <span className={`text-xs ${currentTheme.textColor}`}>5-6: Developing</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#800080', border: '1px solid #600060' }}></div>
                            <span className={`text-xs ${currentTheme.textColor}`}>3-4: Basic</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#0000FF', border: '1px solid #0000CC' }}></div>
                            <span className={`text-xs ${currentTheme.textColor}`}>1-2: Learning</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 bg-transparent" style={{ border: '1px solid #4B5563' }}></div>
                            <span className={`text-xs ${currentTheme.subtleText}`}>0: None</span>
                        </div>
                    </div>
                    <p className={`text-xs mt-3 pt-2 border-t ${currentTheme.borderColor} ${currentTheme.subtleText}`}>
                        Size = skill level
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSkillMatrix;