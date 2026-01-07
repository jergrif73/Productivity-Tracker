import React, { useState, useRef, useEffect } from 'react';
import { TutorialHighlight } from './App';
import { motion, AnimatePresence } from 'framer-motion';

// Combined Search + Dropdown Component
const SearchableDropdown = ({ projects, selectedProjectId, onSelect, currentTheme }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.projectId && p.projectId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    // Update dropdown position when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(e.target);
            const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(e.target);
            
            if (isOutsideContainer && isOutsideDropdown) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = (projectId) => {
        onSelect(projectId);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Search Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={selectedProject ? selectedProject.name : "Search projects..."}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className={`w-full p-2 pr-8 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
                {/* Dropdown Toggle Button */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${currentTheme.subtleText}`}
                >
                    <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Dropdown List - positioned fixed to escape overflow */}
            {isOpen && (
                <div 
                    ref={dropdownRef}
                    className={`fixed border rounded-md ${currentTheme.cardBg} ${currentTheme.borderColor} max-h-48 overflow-y-auto shadow-lg`}
                    style={{ 
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        zIndex: 9999
                    }}
                >
                    {/* Clear selection option */}
                    {selectedProjectId && (
                        <div
                            onClick={() => handleSelect('')}
                            className={`p-2 cursor-pointer hover:bg-blue-500/20 ${currentTheme.subtleText} border-b ${currentTheme.borderColor} text-sm`}
                        >
                            ✕ Clear Selection
                        </div>
                    )}
                    
                    {filteredProjects.length === 0 ? (
                        <div className={`p-3 text-center ${currentTheme.subtleText}`}>
                            No projects found
                        </div>
                    ) : (
                        filteredProjects.map(p => (
                            <div
                                key={p.id}
                                onClick={() => handleSelect(p.id)}
                                className={`p-2 cursor-pointer hover:bg-blue-500/20 ${currentTheme.textColor} ${
                                    p.id === selectedProjectId ? 'bg-blue-500/30' : ''
                                }`}
                            >
                                <div className="font-medium truncate text-sm">{p.name}</div>
                                {p.projectId && (
                                    <div className={`text-xs ${currentTheme.subtleText}`}>
                                        ID: {p.projectId}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    
                    {/* Results count */}
                    <div className={`p-2 text-xs ${currentTheme.subtleText} border-t ${currentTheme.borderColor} text-center`}>
                        {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for collapsible sections
const CollapsibleFilterSection = ({ title, children, isCollapsed, onToggle }) => {
    const animationVariants = {
        open: { opacity: 1, height: 'auto', marginTop: '1rem' },
        collapsed: { opacity: 0, height: 0, marginTop: '0rem' }
    };

    return (
        <div className="border-b border-gray-500/20 pb-2" style={{ overflow: 'visible' }}>
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
                        style={{ overflow: 'visible' }}
                    >
                        <div className="space-y-4" style={{ overflow: 'visible' }}>
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
                            <SearchableDropdown
                                projects={projects.filter(p => !p.archived)}
                                selectedProjectId={selectedProjectId}
                                onSelect={(id) => onFilterChange('selectedProjectId', id)}
                                currentTheme={currentTheme}
                            />
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