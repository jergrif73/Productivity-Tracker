import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TutorialHighlight } from './App';
import EmployeeSkillMatrix from './EmployeeSkillMatrix'; 
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore'; // Import Firestore functions

// --- New Gemini AI Chat Component ---
const GeminiInsightChat = ({ isVisible, onClose, reportContext, geminiApiKey, currentTheme, jobFamilyData }) => { // Added jobFamilyData prop
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatHistoryRef = useRef([]);
    const chatContainerRef = useRef(null);

    // Effect to scroll to the bottom of the chat on new messages
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Effect to set the initial message when the component becomes visible
    useEffect(() => {
        if (isVisible && reportContext) {
            const initialMessage = {
                role: 'model',
                text: `I have analyzed the **${reportContext.type}** report. What specific questions do you have about the data?`
            };
            setMessages([initialMessage]);
            chatHistoryRef.current = []; // Reset history for a new report
            setUserInput('');
        }
    }, [isVisible, reportContext]);

    // Handles sending a message to the Gemini API
    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;

        const newUserMessage = { role: 'user', text: userInput };
        setMessages(prev => [...prev, newUserMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);

        let prompt;
        // If this is the first message, prepend the system context
        if (chatHistoryRef.current.length === 0) {
            const dataSample = reportContext.data.slice(0, 20).map(row => row.join(', ')).join('; ');
            const jobFamilyContext = JSON.stringify(jobFamilyData); // Stringify job family data

            prompt = `
                CONTEXT: You are an expert analyst for a workforce productivity application. The user has generated a report of type "${reportContext.type}". The columns are: ${reportContext.headers.join(', ')}. Here is a sample of the data (rows separated by ';'):
                ${dataSample}

                Additionally, here is the job family data, which defines various positions, their responsibilities, and skills:
                ${jobFamilyContext}
                
                Your role is to answer the user's questions based *only* on this data context. Be concise and helpful. If the user asks for information not present in the data, politely state that you cannot answer. Format your responses with Markdown.
                
                USER QUESTION: ${currentInput}
            `;
        } else {
            prompt = currentInput;
        }

        // Add user message to the history for the API call
        chatHistoryRef.current.push({ role: 'user', parts: [{ text: prompt }] });
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // The body now only contains the valid chat history
                body: JSON.stringify({ contents: chatHistoryRef.current })
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("API Error Body:", errorBody);
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result = await response.json();
            if (!result.candidates || result.candidates.length === 0) {
                 throw new Error("No response candidates from API.");
            }
            const modelResponse = result.candidates[0].content.parts[0].text;
            
            const newModelMessage = { role: 'model', text: modelResponse };
            setMessages(prev => [...prev, newModelMessage]);

            // Add model response to the history for the next API call
            chatHistoryRef.current.push({ role: 'model', parts: [{ text: modelResponse }] });

        } catch (err) {
            console.error("Gemini API error:", err);
            const errorMessage = "My apologies, I seem to be having trouble connecting. Please check the API key and configuration.";
            setMessages(prev => [...prev, {role: 'model', text: errorMessage}]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    // Renders message text with basic Markdown support
    const renderMessage = (text) => {
        let htmlText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 p-2 rounded-md my-2 text-sm"><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')
            .replace(/^\* (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
            .replace(/\n/g, '<br />');
        return <div dangerouslySetInnerHTML={{ __html: htmlText }} />;
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-2xl bg-gray-900 border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[80vh]"
                style={{boxShadow: '0 0 25px rgba(0, 255, 255, 0.3)'}}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 bg-gray-800/50 border-b border-cyan-500/30 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-cyan-300 tracking-wider">Gemini AI Insights</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div ref={chatContainerRef} className="p-6 flex-grow overflow-y-auto hide-scrollbar-on-hover space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                {renderMessage(msg.text)}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                            <div className="max-w-md p-3 rounded-lg bg-gray-700 text-gray-200 flex items-center space-x-2">
                                <motion.div className="w-2 h-2 bg-cyan-300 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                                <motion.div className="w-2 h-2 bg-cyan-300 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
                                <motion.div className="w-2 h-2 bg-cyan-300 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-800/50 border-t border-cyan-500/30 flex items-center gap-2 flex-shrink-0">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask about the report..."
                        className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSendMessage} 
                        disabled={isLoading || !userInput.trim()}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Send
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};


// --- Helper Components ---

const CollapsibleFilterSection = ({ title, children, isCollapsed, onToggle }) => {
    const animationVariants = {
        open: { opacity: 1, height: 'auto', marginTop: '1rem' },
        collapsed: { opacity: 0, height: 0, marginTop: '0rem' }
    };

    return (
        <div className="border-b border-gray-500/20 pb-2">
            <button onClick={onToggle} className="w-full flex justify-between items-center py-2">
                <h3 className="text-sm font-semibold">{title}</h3>
                <motion.svg
                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                    transition={{ duration: 0.2 }}
                    xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
            </button>
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={animationVariants}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


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

// Define predefined team profiles
const teamProfiles = {
    "Select a Profile...": [],
    "The Masterminds": ["Model Knowledge", "BIM Knowledge", "Coordination", "Structural"],
    "The Strong Foundation": ["Teamwork Ability", "Leadership Skills", "Piping", "Duct", "Plumbing"],
    "The Innovators": ["BIM Knowledge", "GIS/GPS"],
    "The Problem Solvers": ["Leadership Skills", "Mechanical Abilities", "Coordination", "Model Knowledge"]
};


const ReportingConsole = ({ projects, detailers, assignments, tasks, allProjectActivities, currentTheme, geminiApiKey, accessLevel, db, appId }) => {
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
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    
    // State for Gemini Interface
    const [isGeminiVisible, setIsGeminiVisible] = useState(false);
    const [reportContext, setReportContext] = useState(null);
    const [jobFamilyData, setJobFamilyData] = useState({}); // New state for job family data

    // Effect to fetch job family data from Firestore
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


    const [collapsedFilters, setCollapsedFilters] = useState({
        level: true,
        trade: true,
        profile: true,
        skills: true,
        employee: true,
        project: true,
        dateRange: true,
    });

    // Effect to listen for the hotkey combination
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

        // Cleanup function to remove the event listener
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [accessLevel, reportContext]); // Re-run effect if access level or report context changes

    const toggleFilterCollapse = (filterName) => {
        setCollapsedFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
    };

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
        setSortConfig({ key: null, direction: 'ascending' });

        const sDate = startDate ? new Date(startDate) : null;
        const eDate = endDate ? new Date(endDate) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);

        let data = [];
        let headers = [];
        let isTabularReport = false;

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
                isTabularReport = true;
                break;
            
            case 'employee-details':
                const abbreviateTitle = (title) => {
                    const abbreviations = {
                        "Detailer I": "DI",
                        "Detailer II": "DII",
                        "Detailer III": "DIII",
                        "Project Constructability Lead": "PCL",
                        "Project Constructability Lead, Sr.": "PCL Sr.",
                        "Trade Constructability Lead": "TCL",
                        "Constructability Manager": "CM",
                        "BIM Specialist": "BIM",
                        "Programmatic Detailer": "PD"
                    };
                    return abbreviations[title] || title || 'N/A';
                };

                const baseHeaders = [
                    "First Name", "Last Name", "Title", "Employee ID",
                    "Wage/hr", "% Above Scale", "Union Local"
                ];
                const generalSkillHeaders = [];
                const skillCategories = ["Model Knowledge", "BIM Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
                
                // FIX: Make general skill score headers unique
                skillCategories.forEach(skill => {
                    const shortName = skill.split(" ")[0];
                    generalSkillHeaders.push(shortName, `${shortName} Score`);
                });

                const disciplineSkillHeaders = [];
                // FIX: Make discipline skill score headers unique
                for (let i = 1; i <= 7; i++) {
                    disciplineSkillHeaders.push(`Disc. ${i}`, `Disc. ${i} Score`);
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
                    const unionNumber = (d.unionLocal || '').match(/\d+/g)?.join('') || 'N/A';
                    const abbreviatedTitle = abbreviateTitle(d.title);
                    const baseData = [
                        d.firstName,
                        d.lastName,
                        abbreviatedTitle,
                        d.employeeId || 'N/A',
                        d.wage || 0,
                        d.percentAboveScale || 0,
                        unionNumber,
                    ];

                    const generalSkillsData = [];
                    const generalSkills = d.skills ? Object.entries(d.skills) : [];
                    
                    const orderedGeneralSkills = skillCategories.map(cat => {
                        const found = generalSkills.find(gs => gs[0] === cat);
                        return found ? [cat, found[1]] : [cat, 0];
                    });

                    for (let i = 0; i < 5; i++) {
                        if (i < orderedGeneralSkills.length) {
                            generalSkillsData.push(orderedGeneralSkills[i][0].split(" ")[0]);
                            generalSkillsData.push(orderedGeneralSkills[i][1]);
                        } else {
                            generalSkillsData.push('', '');
                        }
                    }

                    const disciplineSkillsData = [];
                    const disciplineSkills = d.disciplineSkillsets || [];
                    for (let i = 0; i < 7; i++) {
                        if (i < disciplineSkills.length) {
                            disciplineSkillsData.push(disciplineSkills[i].name);
                            disciplineSkillsData.push(disciplineSkills[i].score);
                        } else {
                            disciplineSkillsData.push('', '');
                        }
                    }

                    return [...baseData, ...generalSkillsData, ...disciplineSkillsData];
                });
                isTabularReport = true;
                break;

            default:
                break;
        }
        setReportData(data);
        setReportHeaders(headers);

        if (isTabularReport) {
            setReportContext({ data, headers, type: reportType });
        } else {
            setReportContext(null);
        }
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

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedReportData = useMemo(() => {
        if (!reportData || !sortConfig.key) {
            return reportData;
        }

        const headerIndex = reportHeaders.indexOf(sortConfig.key);
        if (headerIndex === -1) {
            return reportData;
        }

        const sortedData = [...reportData].sort((a, b) => {
            const aValue = a[headerIndex];
            const bValue = b[headerIndex];

            const isNumeric = !isNaN(parseFloat(aValue)) && isFinite(aValue) && !isNaN(parseFloat(bValue)) && isFinite(bValue);

            if (isNumeric) {
                if (parseFloat(aValue) < parseFloat(bValue)) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (parseFloat(aValue) > parseFloat(bValue)) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            } else {
                return String(aValue).localeCompare(String(bValue), undefined, {
                    numeric: true,
                    sensitivity: 'base'
                }) * (sortConfig.direction === 'ascending' ? 1 : -1);
            }
        });
        return sortedData;
    }, [reportData, sortConfig, reportHeaders]);

    const renderFilters = () => {
        const levelFilterUI = (
            <CollapsibleFilterSection title="Filter by Level" isCollapsed={collapsedFilters.level} onToggle={() => toggleFilterCollapse('level')}>
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
            </CollapsibleFilterSection>
        );

        switch (reportType) {
            case 'employee-details':
            case 'skill-matrix':
                return (
                    <>
                        {levelFilterUI}
                        <CollapsibleFilterSection title="Filter by Trade" isCollapsed={collapsedFilters.trade} onToggle={() => toggleFilterCollapse('trade')}>
                            <select value={selectedTrade} onChange={e => setSelectedTrade(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Primary Trades</option>
                                {uniqueTrades.map(trade => <option key={trade} value={trade}>{trade}</option>)}
                            </select>
                        </CollapsibleFilterSection>
                    </>
                );
            case 'top-employee-skills-by-trade':
                return (
                    <>
                        <CollapsibleFilterSection title="Select Profile" isCollapsed={collapsedFilters.profile} onToggle={() => toggleFilterCollapse('profile')}>
                            <select value={selectedProfile} onChange={handleProfileChange} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">Select a Profile...</option>
                                {Object.keys(teamProfiles).map(profileName => (
                                    <option key={profileName} value={profileName}>{profileName}</option>
                                ))}
                            </select>
                        </CollapsibleFilterSection>
                        {levelFilterUI}
                        <CollapsibleFilterSection title="Filter by Trade" isCollapsed={collapsedFilters.trade} onToggle={() => toggleFilterCollapse('trade')}>
                            <select value={selectedTrade} onChange={e => setSelectedTrade(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Primary Trades</option>
                                {uniqueTrades.map(trade => <option key={trade} value={trade}>{trade}</option>)}
                            </select>
                        </CollapsibleFilterSection>
                        <CollapsibleFilterSection title="Select Skills" isCollapsed={collapsedFilters.skills} onToggle={() => toggleFilterCollapse('skills')}>
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
                        </CollapsibleFilterSection>
                    </>
                );
            case 'employee-workload-dist':
                return (
                    <CollapsibleFilterSection title="Select Employee" isCollapsed={collapsedFilters.employee} onToggle={() => toggleFilterCollapse('employee')}>
                        <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            <option value="">-- Select an Employee --</option>
                            {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                        </select>
                    </CollapsibleFilterSection>
                );
            case 'forecast-vs-actual':
                return (
                    <>
                        <CollapsibleFilterSection title="Select Project" isCollapsed={collapsedFilters.project} onToggle={() => toggleFilterCollapse('project')}>
                            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Projects</option>
                                {projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </CollapsibleFilterSection>
                        <CollapsibleFilterSection title="Select Date Range" isCollapsed={collapsedFilters.dateRange} onToggle={() => toggleFilterCollapse('dateRange')}>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                <label className="block text-sm font-medium">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                            </div>
                        </CollapsibleFilterSection>
                    </>
                );
            case 'project-hours':
            case 'detailer-workload':
            case 'task-status':
                return (
                    <CollapsibleFilterSection title="Select Date Range" isCollapsed={collapsedFilters.dateRange} onToggle={() => toggleFilterCollapse('dateRange')}>
                        <div className="space-y-2">
                           <label className="block text-sm font-medium">Start Date</label>
                           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                           <label className="block text-sm font-medium">End Date</label>
                           <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        </div>
                    </CollapsibleFilterSection>
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
                <GeminiInsightChat 
                    isVisible={isGeminiVisible}
                    onClose={() => setIsGeminiVisible(false)}
                    reportContext={reportContext}
                    geminiApiKey={geminiApiKey}
                    currentTheme={currentTheme}
                    jobFamilyData={jobFamilyData} /* Passed jobFamilyData */
                />
                <div className="flex-shrink-0 mb-4">
                    <h2 className={`text-2xl font-bold ${currentTheme.textColor}`}>Reporting & Dashboards</h2>
                </div>

                {/* This div is now the main scrollable content area */}
                <div className="flex-grow flex gap-4 min-h-0 h-[calc(100vh-200px)] overflow-y-auto hide-scrollbar-on-hover"> {/* Added fixed height and overflow */}
                    {/* Left Controls Column */}
                    <div className={`w-full md:w-1/4 lg:w-1/5 flex-shrink-0 p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} flex flex-col`}>
                        <div className="space-y-2 overflow-y-auto hide-scrollbar-on-hover pr-2 flex-grow">
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
                        </div>
                        <button onClick={handleGenerateReport} disabled={!reportType} className="w-full bg-blue-600 text-white p-2 mt-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex-shrink-0">Generate</button>
                    </div>
                    
                    {/* Right Display Area */}
                    <div className="flex-grow flex flex-col min-h-0 min-w-0">
                        <div className="flex-grow overflow-auto hide-scrollbar-on-hover space-y-4">
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
                                        <EmployeeSkillMatrix detailers={filteredDetailersForMatrix} currentTheme={currentTheme} db={db} appId={appId} accessLevel={accessLevel} />
                                    </div>
                                )}
                            </TutorialHighlight>

                            {reportData && (
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
                                    <div className="overflow-auto hide-scrollbar-on-hover max-h-[55vh]">
                                        <table className="min-w-full border-collapse">
                                            <thead className={`${currentTheme.altRowBg} sticky top-0`}>
                                                <tr>
                                                    {reportHeaders.map((header, index) => (
                                                        <th 
                                                            key={`${header}-${index}`} 
                                                            className={`p-2 font-semibold border ${currentTheme.borderColor} cursor-pointer`}
                                                            style={reportType === 'employee-details' 
                                                                ? { 
                                                                    writingMode: 'vertical-rl', 
                                                                    textOrientation: 'mixed', 
                                                                    whiteSpace: 'nowrap', 
                                                                    textAlign: 'right', // Aligns text to the "top" of the rotated cell
                                                                    paddingTop: '10px',
                                                                    paddingBottom: '10px'
                                                                  } 
                                                                : { textAlign: 'left' }
                                                            }
                                                            onClick={() => requestSort(header)}
                                                        >
                                                            {header}
                                                            {sortConfig.key === header && (
                                                                ` ${sortConfig.direction === 'ascending' ? '▲' : '▼'}`
                                                            )}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedReportData.map((row, rowIndex) => (
                                                    <tr key={`report-row-${rowIndex}-${row[0]}`} className={`border-b ${currentTheme.borderColor}`}>
                                                        {row.map((cell, cellIndex) => (
                                                            <td 
                                                                key={`cell-${rowIndex}-${cellIndex}`} 
                                                                className={`p-2 border ${currentTheme.borderColor}`}
                                                                style={reportType === 'employee-details' ? { textAlign: 'center' } : {}}
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
                </div>
            </div>
        </TutorialHighlight>
    );
};

export default ReportingConsole;
