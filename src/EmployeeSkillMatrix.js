// src/EmployeeSkillMatrix.js
import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { collection, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import JobFamilyEditor from './JobFamilyEditor'; // Standard default import
import { jobFamilyData as initialJobFamilyData } from './job-family-data';

// Helper to replace BIM with VDC in skill names
const mapBimToVdc = (skillName) => {
    if (!skillName) return skillName;
    if (skillName === 'BIM') return 'VDC';
    if (skillName === 'BIM Knowledge') return 'VDC Knowledge';
    return skillName;
};

const EmployeeSkillMatrix = ({ detailers, currentTheme, db, appId, accessLevel, hideJobFamilyDisplay = false }) => { // Added hideJobFamilyDisplay prop
    const svgRef = useRef(null);
    // eslint-disable-next-line no-unused-vars
    const [selectedJob, setSelectedJob] = useState(''); // This state will no longer directly drive display if hideJobFamilyDisplay is true
    const [jobFamilyData, setJobFamilyData] = useState({});
    const [isEditorOpen, setIsEditorOpen] = useState(false); // This state is now only for the internal JobFamilyEditor modal if it's still used here.

    useEffect(() => {
        if (!db || !appId) return;
        const jobFamilyRef = collection(db, `artifacts/${appId}/public/data/jobFamilyData`);

        const seedData = async () => {
            const querySnapshot = await getDocs(jobFamilyRef);
            if (querySnapshot.empty) {
                console.log("Job family data is empty. Seeding initial data...");
                const batch = writeBatch(db);
                Object.values(initialJobFamilyData).forEach(job => {
                    const docRef = doc(jobFamilyRef);
                    batch.set(docRef, job);
                });
                await batch.commit();
                console.log("Initial job family data seeded successfully.");
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

    // jobToDisplay will only be set if hideJobFamilyDisplay is false (i.e., when this component is the primary displayer)
    const jobToDisplay = !hideJobFamilyDisplay && jobFamilyData[selectedJob];

    const { data, skillNames, employeeNames, employeeTradeMap } = useMemo(() => {
        const generalSkillOrder = ["Model Knowledge", "VDC Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
        const disciplineSkillOrder = ["MP", "MH", "PL", "Coord", "VDC", "ST", "GIS/GPS", "PP", "FP", "PJ", "MGMT"];
        // Map old names to new abbreviations for backward compatibility
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
        const skillNames = [...generalSkillOrder, ...disciplineSkillOrder];

        const sortedDetailers = [...detailers].sort((a, b) => {
            const rawTradeA = a.disciplineSkillsets?.[0]?.name || 'Z';
            const rawTradeB = b.disciplineSkillsets?.[0]?.name || 'Z';
            const tradeA = disciplineNameMap[rawTradeA] || rawTradeA;
            const tradeB = disciplineNameMap[rawTradeB] || rawTradeB;
            if (tradeA !== tradeB) {
                return tradeA.localeCompare(tradeB);
            }
            return a.lastName.localeCompare(b.lastName);
        });

        const employeeNames = sortedDetailers.map(d => `${d.firstName} ${d.lastName}`);

        const employeeTradeMap = new Map();
        sortedDetailers.forEach(detailer => {
             const rawTrade = detailer.disciplineSkillsets?.[0]?.name || 'Uncategorized';
             const trade = disciplineNameMap[rawTrade] || rawTrade;
             employeeTradeMap.set(`${detailer.firstName} ${detailer.lastName}`, trade);
        });

        const flatData = [];
        sortedDetailers.forEach(detailer => {
            const employeeName = `${detailer.firstName} ${detailer.lastName}`;

            generalSkillOrder.forEach(skill => {
                const score = detailer.skills?.[skill] || 0;
                flatData.push({ employee: employeeName, skill, score });
            });

            // Create map with both old and new names mapped to scores
            const disciplineMap = new Map();
            (detailer.disciplineSkillsets || []).forEach(ds => {
                const mappedName = disciplineNameMap[ds.name] || ds.name;
                disciplineMap.set(mappedName, ds.score);
            });
            disciplineSkillOrder.forEach(skill => {
                const score = disciplineMap.get(skill) || 0;
                flatData.push({ employee: employeeName, skill, score });
            });
        });

        return { data: flatData, skillNames, employeeNames, employeeTradeMap };
    }, [detailers]);

    useEffect(() => {
        if (!data.length || !svgRef.current || !currentTheme) return;

        const labelColor = currentTheme.mainBg === 'bg-gray-900' ? '#d1d5db' : '#111827';

        const margin = { top: 122, right: 50, bottom: 50, left: 160 };
        const cellWidth = 36;
        const cellHeight = 36;

        const width = employeeNames.length * cellWidth + margin.left + margin.right;
        const height = skillNames.length * cellHeight + margin.top + margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);

        svg.selectAll("*").remove();

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const tooltip = d3.select("body").append("div")
            .attr("class", "absolute opacity-0 transition-opacity duration-300 bg-gray-900 text-white text-xs rounded-md p-2 pointer-events-none shadow-lg z-50 border border-gray-700");

        const x = d3.scaleBand()
            .domain(employeeNames)
            .range([0, employeeNames.length * cellWidth])
            .padding(0.1);

        const y = d3.scaleBand()
            .domain(skillNames)
            .range([0, skillNames.length * cellHeight])
            .padding(0.1);

        const radius = d3.scaleSqrt()
            .domain([0, 10])
            .range([0, Math.min(cellWidth, cellHeight) / 2 - 4]);

        const color = d3.scaleLinear()
            .domain([0, 4, 6, 8, 10])
            .range(["#0000FF", "#800080", "#FF0000", "#FFFF00", "#008000"]) // Blue, Purple, Red, Yellow, Green
            .interpolate(d3.interpolateRgb);

        chart.selectAll(".cell")
            .data(data)
            .enter().append("rect")
            .attr("class", "cell")
            .attr("x", d => x(d.employee))
            .attr("y", d => y(d.skill))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", "transparent")
            .style("stroke", "white")
            .style("stroke-width", 0.25)
            .style("stroke-opacity", 0.8);

        const xAxis = chart.append("g")
            .attr("class", "x-axis")
            .selectAll("g")
            .data(employeeNames)
            .enter().append("g")
            .attr("transform", d => `translate(${x(d) + x.bandwidth() / 2}, 0)`);

        xAxis.append("text")
            .text(d => d)
            .attr("transform", "rotate(-65)")
            .attr("dy", "0.32em")
            .attr("y", -10)
            .attr("x", 0)
            .attr("text-anchor", "start")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", labelColor);

        const yAxis = chart.append("g")
            .attr("class", "y-axis")
            .selectAll("g")
            .data(skillNames)
            .enter().append("g")
            .attr("transform", d => `translate(0, ${y(d) + y.bandwidth() / 2})`);

        yAxis.append("text")
            .text(d => mapBimToVdc(d))
            .attr("x", -15)
            .attr("text-anchor", "end")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", labelColor);

        chart.selectAll(".bubble")
            .data(data)
            .enter().append("circle")
            .attr("class", "bubble")
            .attr("cx", d => x(d.employee) + x.bandwidth() / 2)
            .attr("cy", d => y(d.skill) + y.bandwidth() / 2)
            .attr("r", 0)
            .style("fill", d => d.score > 0 ? color(d.score) : "transparent")
            .style("stroke", d => d.score > 0 ? d3.color(color(d.score)).darker(0.7) : currentTheme.borderColor)
            .style("stroke-width", 1)
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<strong>${d.employee}</strong><br/>${mapBimToVdc(d.skill)}: <strong>${d.score}</strong>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                d3.select(this).style("stroke-width", 2.5).style("stroke", "black");
            })
            .on("mouseout", function(event, d) {
                tooltip.transition().duration(500).style("opacity", 0);
                d3.select(this).style("stroke-width", 1).style("stroke", d.score > 0 ? d3.color(color(d.score)).darker(0.7) : currentTheme.borderColor);
            })
            .transition()
            .duration(500)
            .delay((d, i) => i * 2)
            .attr("r", d => radius(d.score));

        return () => { tooltip.remove() };

    }, [data, skillNames, employeeNames, employeeTradeMap, currentTheme]);

    return (
        <div id="skill-matrix-printable-area">
            {/* The Job Family Review section is now conditionally rendered based on hideJobFamilyDisplay */}
            {/* This section is removed as per user request to move "Manage Positions" button */}
            {/* {!hideJobFamilyDisplay && (
                <div className="mb-4 p-4 flex items-end gap-4">
                    <div>
                        <label htmlFor="job-family-select" className={`block mb-2 text-sm font-medium ${currentTheme.textColor}`}>Review Job Family Expectations:</label>
                        <select
                            id="job-family-select"
                            value={selectedJob}
                            onChange={(e) => setSelectedJob(e.target.value)}
                            className={`w-full max-w-xs p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                        >
                            <option value="">Select a Position...</option>
                            {Object.keys(jobFamilyData).sort().map(jobTitle => (
                                <option key={jobTitle} value={jobTitle}>{jobTitle}</option>
                            ))}
                        </select>
                    </div>
                    {accessLevel === 'taskmaster' && (
                        <TutorialHighlight tutorialKey="manageJobPositions">
                            <button onClick={() => setIsEditorOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                                Manage Positions
                            </button>
                        </TutorialHighlight>
                    )}
                </div>
            )} */}

            {/* The JobFamilyEditor modal is now opened directly from ReportingConsole.js */}
            {isEditorOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
                    <div className={`bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar-on-hover`}>
                         <JobFamilyEditor db={db} appId={appId} currentTheme={currentTheme} onClose={() => setIsEditorOpen(false)} />
                    </div>
                 </div>
            )}

            {/* The direct display of jobToDisplay is also conditionally rendered and now effectively always hidden here */}
            {jobToDisplay && !hideJobFamilyDisplay && (
                <div className={`p-4 mb-4 border-t ${currentTheme.borderColor}`}>
                    <h3 className={`text-xl font-bold mb-3 ${currentTheme.textColor}`}>{jobToDisplay.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div>
                            <h4 className="font-semibold mb-2 text-base">Primary Responsibilities</h4>
                            <ul className="space-y-1"> {/* Removed list-disc, list-inside, pl-0 */}
                                {(jobToDisplay.primaryResponsibilities || []).map((item, index) => (
                                    <li key={index} className="flex items-start"> {/* Use flex for consistent alignment */}
                                        <span className="w-4 flex-shrink-0">•</span> {/* Manual bullet */}
                                        <span className="flex-grow">{item}</span> {/* Text content */}
                                    </li>
                                ))}
                            </ul>
                            <h4 className="font-semibold mt-4 mb-2 text-base">Independence and Decision-Making</h4>
                            <ul className="space-y-1"> {/* Removed list-disc, list-inside, pl-4 */}
                                {(jobToDisplay.independenceAndDecisionMaking || []).map((item, index) => (
                                    <li key={index} className="flex items-start"> {/* Use flex for consistent alignment */}
                                        <span className="w-4 flex-shrink-0">•</span> {/* Manual bullet */}
                                        <span className="flex-grow">{item}</span> {/* Text content */}
                                    </li>
                                ))}
                            </ul>
                            <h4 className="font-semibold mt-4 mb-2 text-base">Leadership</h4>
                            <ul className="space-y-1"> {/* Removed list-disc, list-inside, pl-4 */}
                                {(jobToDisplay.leadership || []).map((item, index) => (
                                    <li key={index} className="flex items-start"> {/* Use flex for consistent alignment */}
                                        <span className="w-4 flex-shrink-0">•</span> {/* Manual bullet */}
                                        <span className="flex-grow">{item}</span> {/* Text content */}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-base">Knowledge and Skills</h4>
                            <ul className="space-y-1"> {/* Removed list-disc, list-inside, pl-4 */}
                                {(jobToDisplay.knowledgeAndSkills || []).map((item, index) => (
                                    <li key={index} className="flex items-start"> {/* Use flex for consistent alignment */}
                                        <span className="w-4 flex-shrink-0">•</span> {/* Manual bullet */}
                                        <span className="flex-grow">{item}</span> {/* Text content */}
                                    </li>
                                ))}
                            </ul>
                            <h4 className="font-semibold mt-4 mb-2 text-base">Education</h4>
                            <ul className="space-y-1"> {/* Removed list-disc, list-inside, pl-4 */}
                                {(jobToDisplay.education || []).map((item, index) => (
                                    <li key={index} className="flex items-start"> {/* Use flex for consistent alignment */}
                                        <span className="w-4 flex-shrink-0">•</span> {/* Manual bullet */}
                                        <span className="flex-grow">{item}</span> {/* Text content */}
                                    </li>
                                ))}
                            </ul>
                            <h4 className="font-semibold mt-4 mb-2 text-base">Years of Experience Preferred</h4>
                            <ul className="space-y-1"> {/* Removed list-disc, list-inside, pl-4 */}
                                {(jobToDisplay.yearsOfExperiencePreferred || []).map((item, index) => (
                                    <li key={index} className="flex items-start"> {/* Use flex for consistent alignment */}
                                        <span className="w-4 flex-shrink-0">•</span> {/* Manual bullet */}
                                        <span className="flex-grow">{item}</span> {/* Text content */}
                                    </li>
                                ))}
                            </ul>
                            <h4 className="font-semibold mt-4 mb-2 text-base">Preferred Experience</h4>
                            <ul className="space-y-1"> {/* Removed list-disc, list-inside, pl-4 */}
                                {jobToDisplay.experience && (
                                    <li className="flex items-start"> {/* Use flex for consistent alignment */}
                                        <span className="w-4 flex-shrink-0">•</span> {/* Manual bullet */}
                                        <span className="flex-grow">{jobToDisplay.experience}</span> {/* Text content */}
                                    </li>
                                )}
                                {!jobToDisplay.experience && (
                                    <li className="flex items-start"> {/* Use flex for consistent alignment */}
                                        <span className="w-4 flex-shrink-0">•</span> {/* Manual bullet */}
                                        <span className="flex-grow">N/A</span> {/* Text content */}
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ maxHeight: '80vh', overflow: 'auto' }} className="hide-scrollbar-on-hover p-4">
                <svg ref={svgRef}></svg>
            </div>
        </div>
    );
};

export default EmployeeSkillMatrix;