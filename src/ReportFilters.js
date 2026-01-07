import React from 'react';
import { TutorialHighlight } from './App';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to replace BIM with VDC in skill names
const mapBimToVdc = (skillName) => {
    if (!skillName) return skillName;
    if (skillName === 'BIM') return 'VDC';
    if (skillName === 'BIM Knowledge') return 'VDC Knowledge';
    return skillName;
};

// Helper for collapsible sections
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


const ReportFilters = ({
    reportType,
    startDate,
    endDate,
    selectedProjectId,
    selectedLevels, onFilterChange, 
    selectedTrade,
    selectedEmployeeId,
    reportOption,
    collapsedFilters, onToggleFilterCollapse,
    jobFamilyToDisplayInPopup, onJobFamilySelectForPopup,
    jobFamilyData,
    uniqueTitles, uniqueTrades,
    detailers, projects, currentTheme,
    onGenerateReport
}) => {

    const handleLevelChange = (level) => {
        const newLevels = selectedLevels.includes(level)
            ? selectedLevels.filter(l => l !== level)
            : [...selectedLevels, level];
        onFilterChange('selectedLevels', newLevels);
    };

    const handleSelectAllLevels = (e) => {
        if (e.target.checked) {
            onFilterChange('selectedLevels', uniqueTitles);
        } else {
            onFilterChange('selectedLevels', []);
        }
    };

    const renderDynamicFilters = () => {
        const levelFilterUI = (
            <CollapsibleFilterSection title="Filter by Level" isCollapsed={collapsedFilters?.level} onToggle={() => onToggleFilterCollapse('level')}>
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
            case 'full-project-report':
                return (
                    <>
                        <CollapsibleFilterSection title="Select Project" isCollapsed={collapsedFilters?.project} onToggle={() => onToggleFilterCollapse('project')}>
                            <select value={selectedProjectId} onChange={e => onFilterChange('selectedProjectId', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">-- Select a Project --</option>
                                {projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </CollapsibleFilterSection>
                        <CollapsibleFilterSection title="Report Options" isCollapsed={collapsedFilters?.reportOptions} onToggle={() => onToggleFilterCollapse('reportOptions')}>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <input type="radio" id="fullProject" name="reportOption" value="fullProject" checked={reportOption === 'fullProject'} onChange={e => onFilterChange('reportOption', e.target.value)} className="mr-2" />
                                    <label htmlFor="fullProject">Full Project Report</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="radio" id="dateDuration" name="reportOption" value="dateDuration" checked={reportOption === 'dateDuration'} onChange={e => onFilterChange('reportOption', e.target.value)} className="mr-2" />
                                    <label htmlFor="dateDuration">Date Duration Report</label>
                                </div>
                            </div>
                        </CollapsibleFilterSection>
                        {reportOption === 'dateDuration' && (
                            <CollapsibleFilterSection title="Select Date Range" isCollapsed={collapsedFilters?.dateRange} onToggle={() => onToggleFilterCollapse('dateRange')}>
                                <div className="space-y-2">
                                   <label className="block text-sm font-medium">Start Date</label>
                                   <input type="date" value={startDate} onChange={e => onFilterChange('startDate', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                   <label className="block text-sm font-medium">End Date</label>
                                   <input type="date" value={endDate} onChange={e => onFilterChange('endDate', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                                </div>
                            </CollapsibleFilterSection>
                        )}
                    </>
                );
            case 'skill-matrix':
                return (
                    <>
                        <TutorialHighlight tutorialKey="reviewJobFamilyExpectations">
                            <CollapsibleFilterSection title="Review Job Family Expectations" isCollapsed={collapsedFilters?.jobFamily} onToggle={() => onToggleFilterCollapse('jobFamily')}>
                                <select
                                    value={jobFamilyToDisplayInPopup?.title || ""}
                                    onChange={e => onJobFamilySelectForPopup(e.target.value)}
                                    className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                >
                                    <option value="">Select a Position to View...</option>
                                    {Object.keys(jobFamilyData).sort().map(jobTitle => (
                                        <option key={jobTitle} value={jobTitle}>{jobTitle}</option>
                                    ))}
                                </select>
                            </CollapsibleFilterSection>
                        </TutorialHighlight>
                        {levelFilterUI}
                        <CollapsibleFilterSection title="Filter by Trade" isCollapsed={collapsedFilters?.trade} onToggle={() => onToggleFilterCollapse('trade')}>
                            <select value={selectedTrade} onChange={e => onFilterChange('selectedTrade', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                                <option value="">All Primary Trades</option>
                                {uniqueTrades.map(trade => <option key={trade} value={trade}>{trade}</option>)}
                            </select>
                        </CollapsibleFilterSection>
                    </>
                );
            case 'employee-workload-dist':
                return (
                    <CollapsibleFilterSection title="Select Employee" isCollapsed={collapsedFilters?.employee} onToggle={() => onToggleFilterCollapse('employee')}>
                        <select value={selectedEmployeeId} onChange={e => onFilterChange('selectedEmployeeId', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            <option value="">-- Select an Employee --</option>
                            {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                        </select>
                    </CollapsibleFilterSection>
                );
            case 'project-hours':
            case 'detailer-workload':
            case 'task-status':
                return (
                    <CollapsibleFilterSection title="Select Date Range" isCollapsed={collapsedFilters?.dateRange} onToggle={() => onToggleFilterCollapse('dateRange')}>
                        <div className="space-y-2">
                           <label className="block text-sm font-medium">Start Date</label>
                           <input type="date" value={startDate} onChange={e => onFilterChange('startDate', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                           <label className="block text-sm font-medium">End Date</label>
                           <input type="date" value={endDate} onChange={e => onFilterChange('endDate', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        </div>
                    </CollapsibleFilterSection>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`w-full md:w-1/4 lg:w-1/5 flex-shrink-0 p-4 rounded-lg ${currentTheme.cardBg} border ${currentTheme.borderColor} flex flex-col`}>
            <div className="space-y-2 overflow-y-auto hide-scrollbar-on-hover pr-2 flex-grow">
                <TutorialHighlight tutorialKey="reportType">
                    <div>
                        <label className="block text-sm font-medium mb-1">Report Type</label>
                        <select value={reportType} onChange={e => onFilterChange('reportType', e.target.value)} className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}>
                            <option value="">Select a report...</option>
                            <optgroup label="Dashboards & Charts">
                                <option value="project-health">Project Health Dashboard</option>
                                <option value="employee-workload-dist">Employee Workload Distribution</option>
                                <option value="skill-matrix">Employee Skill Matrix</option>
                            </optgroup>
                            <optgroup label="Tabular Reports">
                                <option value="project-hours">Project Hours Summary</option>
                                <option value="detailer-workload">Detailer Workload Summary</option>
                                <option value="task-status">Task Status Report</option>
                                <option value="full-project-report">Full Project Report</option>
                            </optgroup>
                        </select>
                    </div>
                </TutorialHighlight>
                
                <button onClick={onGenerateReport} disabled={!reportType} className="w-full bg-blue-600 text-white p-2 mt-4 mb-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex-shrink-0">Generate</button>

                {renderDynamicFilters()}
            </div>
        </div>
    );
};

export default ReportFilters;