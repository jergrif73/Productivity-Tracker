import React, { useState, useMemo, useContext, useEffect } from 'react';
import { NavigationContext, TutorialHighlight } from './App';
import { collection, onSnapshot } from 'firebase/firestore'; // Import Firestore functions

// Re-import Tooltip if it's not globally available or passed down
const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center justify-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && text && (
                <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md z-10">
                    {text}
                </div>
            )}
        </div>
    );
};


const MyDashboard = ({ currentUser, detailers, projects, assignments, tasks, currentTheme, navigateToView, accessLevel, showToast, db, appId }) => { // Added db and appId
    const { navigateToWorkloaderForEmployee } = useContext(NavigationContext);

    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [jobFamilyData, setJobFamilyData] = useState({}); // State to hold job family data

    // Effect to set the initial selected employee if currentUser is a specific detailer
    useEffect(() => {
        if (currentUser && !['taskmaster_user', 'tcl_user', 'viewer_user'].includes(currentUser.id)) {
            // If the current user is a specific detailer, pre-select them
            setSelectedEmployeeId(currentUser.id);
        } else {
            // For generic roles or on logout, ensure it's null
            setSelectedEmployeeId(null);
        }
    }, [currentUser]);

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

    const selectedEmployee = useMemo(() => {
        return detailers.find(d => d.id === selectedEmployeeId);
    }, [selectedEmployeeId, detailers]);

    const { myAssignments, topDisciplineSkills, topGeneralSkills, jobToDisplay } = useMemo(() => {
        if (!selectedEmployee) return { myAssignments: [], topDisciplineSkills: [], topGeneralSkills: [], jobToDisplay: null };

        const assignmentsForEmployee = assignments.filter(a => a.detailerId === selectedEmployee.id);

        let disciplineSkills = [];
        let generalSkills = [];

        if (accessLevel === 'taskmaster') {
            // Process discipline skills
            if (selectedEmployee.disciplineSkillsets && Array.isArray(selectedEmployee.disciplineSkillsets)) {
                disciplineSkills = [...selectedEmployee.disciplineSkillsets]
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, 3); // Top 3 discipline skills
            }
            // Process general skills (Skill Assessment)
            if (selectedEmployee.skills) {
                Object.entries(selectedEmployee.skills).forEach(([skillName, score]) => {
                    generalSkills.push({ name: skillName, score: score });
                });
                generalSkills = generalSkills
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, 3); // Top 3 general skills
            }
        }

        // Find job family data based on the selected employee's title
        const jobFamilyDetails = selectedEmployee.title ? jobFamilyData[selectedEmployee.title] : null;

        return {
            myAssignments: assignmentsForEmployee,
            topDisciplineSkills: disciplineSkills,
            topGeneralSkills: generalSkills,
            jobToDisplay: jobFamilyDetails
        };
    }, [selectedEmployee, assignments, accessLevel, jobFamilyData]); // Added jobFamilyData to dependencies

    const { upcomingTasks, otherTasks, allOpenTasks } = useMemo(() => {
        if (!selectedEmployee) return { upcomingTasks: [], otherTasks: [], allOpenTasks: [] };

        // Filter tasks that are not 'Completed' or 'Deleted' to show in dashboard
        const myOpenTasks = tasks.filter(t => t.detailerId === selectedEmployee.id && t.status !== 'Completed' && t.status !== 'Deleted');

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const upcoming = myOpenTasks.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            return dueDate <= sevenDaysFromNow && dueDate >= new Date();
        }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

        const other = myOpenTasks.filter(t => !upcoming.some(ut => ut.id === t.id));

        return { upcomingTasks: upcoming, otherTasks: other, allOpenTasks: myOpenTasks };
    }, [selectedEmployee, tasks]);

    const { currentWeekAllocation, nextWeekAllocation } = useMemo(() => {
        if (!selectedEmployee) return { currentWeekAllocation: 0, nextWeekAllocation: 0 };

        let current = 0;
        let next = 0;

        const today = new Date();
        // Declare all date variables upfront to avoid 'no-use-before-define'
        const startOfCurrentWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        startOfCurrentWeek.setHours(0, 0, 0, 0);
        const endOfCurrentWeek = new Date(startOfCurrentWeek);
        endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);

        const startOfNextWeek = new Date(endOfCurrentWeek);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 1); // Corrected: use startOfNextWeek itself
        const endOfNextWeek = new Date(startOfNextWeek); // This was the line causing the warning
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

        myAssignments.forEach(ass => {
            const assignStart = new Date(ass.startDate);
            const assignEnd = new Date(ass.endDate);
            if (assignStart <= endOfCurrentWeek && assignEnd >= startOfCurrentWeek) {
                current += Number(ass.allocation) || 0;
            }
            if (assignStart <= endOfNextWeek && assignEnd >= startOfNextWeek) {
                next += Number(ass.allocation) || 0;
            }
        });

        return { currentWeekAllocation: current, nextWeekAllocation: next };
    }, [myAssignments, selectedEmployee]);

    const myActiveProjects = useMemo(() => {
        if (!selectedEmployee) return [];
        const projectMap = new Map();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

        // Filter assignments to include only those active from today onwards
        const relevantAssignments = myAssignments.filter(ass => {
            const assignEnd = new Date(ass.endDate);
            assignEnd.setHours(23, 59, 59, 999); // Normalize end date to end of day
            return assignEnd >= today;
        });

        relevantAssignments.forEach(ass => {
            const project = projects.find(p => p.id === ass.projectId && !p.archived);
            if (project && !projectMap.has(project.id)) {
                projectMap.set(project.id, {
                    ...project,
                    userRole: ass.trade,
                    assignmentDates: `${new Date(ass.startDate).toLocaleDateString()} - ${new Date(ass.endDate).toLocaleDateString()}`
                });
            }
        });
        return Array.from(projectMap.values());
    }, [myAssignments, projects, selectedEmployee]);

    const statusColors = {
        Planning: 'bg-yellow-400',
        Conducting: 'bg-blue-400',
        Controlling: 'bg-green-400',
        Archive: 'bg-gray-400'
    };

    const handleGoToTimeSheets = () => {
        const path = '\\\\si.net\\si\\TCM\\Projects\\Job_Files\\6000_Commercial\\Field Time Sheets';
        try {
            const tempInput = document.createElement('textarea');
            tempInput.value = path;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showToast('Time Sheets path copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy path: ', err);
            showToast('Failed to copy path. Please copy manually: ' + path, 'error');
        }
    };

    return (
        <TutorialHighlight tutorialKey="dashboard">
            <div className={`p-6 h-full flex flex-col ${currentTheme.consoleBg}`}> {/* Added flex-col here */}
                <div className="flex justify-between items-center mb-6 flex-shrink-0"> {/* Added flex-shrink-0 */}
                    <h1 className={`text-3xl font-bold ${currentTheme.textColor}`}>
                        {selectedEmployee ? `Dashboard for ${selectedEmployee.firstName} ${selectedEmployee.lastName}` : "My Dashboard"}
                    </h1>
                    <div className="flex items-center gap-4">
                        {(accessLevel === 'taskmaster' || accessLevel === 'tcl' || accessLevel === 'viewer') && (
                            <TutorialHighlight tutorialKey="employeeSelection">
                                <div className="w-72">
                                    <select
                                        value={selectedEmployeeId || ''}
                                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                    >
                                        <option value="" disabled>Select an employee...</option>
                                        {detailers.sort((a,b) => a.firstName.localeCompare(b.firstName)).map(d => (
                                            <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            </TutorialHighlight>
                        )}
                        <TutorialHighlight tutorialKey="goToTimeSheets">
                            <Tooltip text="Click to copy the network path for Field Time Sheets.">
                                <button
                                    onClick={handleGoToTimeSheets}
                                    className={`px-4 py-2 rounded-md ${currentTheme.buttonBg} ${currentTheme.buttonText} hover:bg-blue-600 hover:text-white transition-colors`}
                                >
                                    Go to Time Sheets
                                </button>
                            </Tooltip>
                        </TutorialHighlight>
                    </div>
                </div>

                {/* This div is now the main scrollable content area */}
                <div className="h-[calc(100vh-250px)] overflow-y-auto hide-scrollbar-on-hover"> {/* Added fixed height and removed flex-grow */}
                    {/* Conditionally render content based on selectedEmployee */}
                    {!selectedEmployee ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* Removed min-h */}
                            <div className="md:col-span-1 space-y-6">
                                <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor} h-48 flex items-center justify-center`}>
                                    <p className={currentTheme.subtleText}>Select an employee to view their workload.</p>
                                </div>
                                {accessLevel === 'taskmaster' && (
                                    <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor} h-48 flex items-center justify-center`}>
                                        <p className={currentTheme.subtleText}>Select an employee to view their skills.</p>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-1 space-y-6">
                                <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor} h-full flex items-center justify-center`}>
                                    <p className={currentTheme.subtleText}>Select an employee to view their active projects.</p>
                                </div>
                            </div>
                            <div className="md:col-span-1 space-y-6">
                                <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor} h-full flex items-center justify-center`}>
                                    <p className={currentTheme.subtleText}>Select an employee to view their tasks.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* Removed min-h */}
                            {/* Left Column: Workload & Skills */}
                            <div className="md:col-span-1 space-y-6">
                                <TutorialHighlight tutorialKey="weekAtAGlance">
                                    <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor}`}>
                                        <h2 className="text-xl font-semibold mb-4">Week At a Glance</h2>
                                        <div className="space-y-4">
                                            <div>
                                                <p className={`text-sm ${currentTheme.subtleText}`}>Current Week Allocation</p>
                                                <p className={`text-4xl font-bold ${currentWeekAllocation > 100 ? 'text-red-500' : 'text-green-500'}`}>{currentWeekAllocation}%</p>
                                            </div>
                                            <div>
                                                <p className={`text-sm ${currentTheme.subtleText}`}>Next Week Allocation</p>
                                                <p className={`text-4xl font-bold ${nextWeekAllocation > 100 ? 'text-red-500' : 'text-yellow-500'}`}>{nextWeekAllocation}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </TutorialHighlight>
                                {accessLevel === 'taskmaster' && (
                                    <TutorialHighlight tutorialKey="topSkills">
                                        <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor}`}>
                                            <h2 className="text-xl font-semibold mb-4">Top Skills</h2>

                                            {/* Display Top Discipline Skills */}
                                            {topDisciplineSkills.length > 0 && (
                                                <div className="mb-4">
                                                    <h3 className="font-semibold text-sm mb-2">Top Discipline Skills</h3>
                                                    <div className="space-y-3">
                                                        {topDisciplineSkills.map(skill => (
                                                            <div key={skill.name} className="flex justify-between items-center">
                                                                <span className="font-medium">{skill.name}</span>
                                                                <span className={`font-bold px-2 py-1 text-xs rounded-full ${currentTheme.altRowBg}`}>{skill.score}/10</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Display Top General Skills */}
                                            {topGeneralSkills.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-sm mb-2">Top General Skills</h3>
                                                    <div className="space-y-3">
                                                        {topGeneralSkills.map(skill => (
                                                            <div key={skill.name} className="flex justify-between items-center">
                                                                <span className="font-medium">{skill.name}</span>
                                                                <span className={`font-bold px-2 py-1 text-xs rounded-full ${currentTheme.altRowBg}`}>{skill.score}/10</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {topDisciplineSkills.length === 0 && topGeneralSkills.length === 0 && (
                                                <p className={currentTheme.subtleText}>No rated skills.</p>
                                            )}
                                        </div>
                                    </TutorialHighlight>
                                )}
                                {jobToDisplay && (
                                    <TutorialHighlight tutorialKey="jobFamilyDisplay"> {/* Added TutorialHighlight */}
                                        <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor}`}>
                                            <h2 className="text-xl font-semibold mb-4">Job Family: {jobToDisplay.title}</h2>
                                            <div className="space-y-4 text-sm">
                                                <div>
                                                    <h3 className="font-semibold mb-2 text-base">Primary Responsibilities</h3>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {jobToDisplay.primaryResponsibilities.map((item, index) => <li key={index}>{item}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold mb-2 text-base">Knowledge and Skills</h3>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {jobToDisplay.knowledgeAndSkills.map((item, index) => <li key={index}>{item}</li>)}
                                                    </ul>
                                                    <h3 className="font-semibold mt-4 mb-2 text-base">Preferred Experience</h3>
                                                    <p>{jobToDisplay.experience}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </TutorialHighlight>
                                )}
                            </div>

                            {/* Middle Column: Projects */}
                            <div className="md:col-span-1 space-y-6">
                                <TutorialHighlight tutorialKey="activeProjects">
                                    <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor} h-full`}>
                                        <h2 className="text-xl font-semibold mb-4">Active Projects</h2>
                                        <div className="space-y-4 overflow-y-auto hide-scrollbar-on-hover pr-2">
                                            {myActiveProjects.length > 0 ? myActiveProjects.map(p => (
                                                <div key={p.id} className={`p-4 rounded-md ${currentTheme.altRowBg} cursor-pointer hover:ring-2 hover:ring-blue-500`} onClick={() => navigateToWorkloaderForEmployee(selectedEmployee.id)}>
                                                    <div className="flex items-center gap-3">
                                                        {accessLevel === 'taskmaster' && (
                                                            <span className={`w-3 h-3 rounded-full ${statusColors[p.status] || 'bg-gray-500'}`} title={`Status: ${p.status}`}></span>
                                                        )}
                                                        <p className="font-bold">{p.name} <span className="text-xs font-normal">({p.projectId})</span></p>
                                                    </div>
                                                    <p className={`text-sm mt-1 ${accessLevel === 'taskmaster' ? 'ml-6' : ''} ${currentTheme.subtleText}`}>My Role: {p.userRole}</p>
                                                    <p className={`text-xs mt-1 ${accessLevel === 'taskmaster' ? 'ml-6' : ''} ${currentTheme.subtleText}`}>{p.assignmentDates}</p>
                                                </div>
                                            )) : <p className={currentTheme.subtleText}>No active project assignments.</p>}
                                        </div>
                                    </div>
                                </TutorialHighlight>
                            </div>

                            {/* Right Column: Tasks */}
                            <div className="md:col-span-1 space-y-6">
                                <TutorialHighlight tutorialKey="myTasksDashboard">
                                    <div className={`${currentTheme.cardBg} p-6 rounded-lg shadow-lg border ${currentTheme.borderColor} h-full`}>
                                        <h2 className="text-xl font-semibold mb-4">My Tasks</h2>
                                        <div className="space-y-4 overflow-y-auto hide-scrollbar-on-hover pr-2">
                                            {accessLevel === 'taskmaster' ? (
                                                <>
                                                    <div>
                                                        <h3 className="font-bold text-sm mb-2 text-yellow-400">Due This Week</h3>
                                                        <div className="space-y-3">
                                                            {upcomingTasks.length > 0 ? upcomingTasks.map(task => {
                                                                const project = projects.find(p => p.id === task.projectId);
                                                                return (
                                                                    <div key={task.id} className={`p-3 rounded-md ${currentTheme.altRowBg} cursor-pointer hover:ring-2 hover:ring-blue-500`} onClick={() => navigateToView('tasks')}>
                                                                        <p className="font-semibold">{task.taskName}</p>
                                                                        <div className="flex justify-between items-center text-xs mt-1">
                                                                            <span className={currentTheme.subtleText}>{project?.name || 'No Project'}</span>
                                                                            <span className={`font-bold text-yellow-400`}>{new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }) : <p className={`${currentTheme.subtleText} text-sm`}>No tasks due this week.</p>}
                                                        </div>
                                                    </div>
                                                    <div className="pt-4 border-t border-gray-500/20">
                                                        <h3 className="font-bold text-sm mb-2">Other Open Tasks</h3>
                                                        <div className="space-y-3">
                                                            {otherTasks.length > 0 ? otherTasks.map(task => {
                                                                const project = projects.find(p => p.id === task.projectId);
                                                                return (
                                                                    <div key={task.id} className={`p-3 rounded-md ${currentTheme.altRowBg} cursor-pointer hover:ring-2 hover:ring-blue-500`} onClick={() => navigateToView('tasks')}>
                                                                        <p className="font-semibold">{task.taskName}</p>
                                                                        <div className="flex justify-between items-center text-xs mt-1">
                                                                            <span className={currentTheme.subtleText}>{project?.name || 'No Project'}</span>
                                                                            <span className={`font-bold ${task.status === 'In Progress' ? 'text-yellow-400' : 'text-gray-400'}`}>{task.status}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }) : <p className={`${currentTheme.subtleText} text-sm`}>No other open tasks.</p>}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-3">
                                                    {allOpenTasks.length > 0 ? allOpenTasks.map(task => {
                                                        const project = projects.find(p => p.id === task.projectId);
                                                        return (
                                                            <div key={task.id} className={`p-3 rounded-md ${currentTheme.altRowBg} cursor-pointer hover:ring-2 hover:ring-blue-500`} onClick={() => navigateToView('tasks')}>
                                                                <p className="font-semibold">{task.taskName}</p>
                                                                <div className="flex justify-between items-center text-xs mt-1">
                                                                    <span className={currentTheme.subtleText}>{project?.name || 'No Project'}</span>
                                                                    <span className={`font-bold ${task.status === 'In Progress' ? 'text-yellow-400' : 'text-gray-400'}`}>{task.status}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }) : <p className={currentTheme.subtleText}>You have no open tasks.</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TutorialHighlight>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TutorialHighlight>
    );
};

export default MyDashboard;
