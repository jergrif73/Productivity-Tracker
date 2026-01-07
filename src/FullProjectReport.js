import React, { useMemo } from 'react';

// Helper function to convert legacy trade names to abbreviations
const getTradeDisplayName = (trade) => {
    const displayMap = {
        'BIM': 'VDC',
        'Piping': 'MP',
        'Duct': 'MH',
        'duct': 'MH',
        'piping': 'MP',
        'plumbing': 'PL',
        'Plumbing': 'PL',
        'Coordination': 'Coord',
        'Management': 'MGMT',
        'management': 'MGMT',
        'Structural': 'ST',
        'Fire Protection': 'FP',
        'Process Piping': 'PP',
        'Medical Gas': 'PJ',
        'vdc': 'VDC',
        'sheetmetal': 'MH',
    };
    return displayMap[trade] || trade?.toUpperCase() || trade;
};

// Status descriptions mapping
const statusDescriptions = {
    Planning: "Estimated",
    Conducting: "Booked but not Sold",
    Controlling: "Operational",
    Archive: "Archived"
};

const FullProjectReport = ({ report, currentTheme, assignments = [], detailers = [] }) => {
    // Extract data safely
    const project = report?.project;
    const activitiesDoc = report?.activitiesDoc;
    const financialSummary = useMemo(() => report?.financialSummary || {}, [report?.financialSummary]);
    const actionTrackerSummary = report?.actionTrackerSummary || [];
    const reportOption = report?.reportOption;
    const dateRange = report?.dateRange || {};

    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    
    // Get project assignments
    const projectAssignments = useMemo(() => {
        if (!project?.id) return [];
        return (assignments || []).filter(a => a.projectId === project.id);
    }, [assignments, project?.id]);

    // Get team members
    const teamMembers = useMemo(() => {
        const memberMap = new Map();
        projectAssignments.forEach(ass => {
            const detailer = (detailers || []).find(d => d.id === ass.detailerId);
            if (detailer) {
                if (!memberMap.has(detailer.id)) {
                    memberMap.set(detailer.id, {
                        ...detailer,
                        assignments: []
                    });
                }
                memberMap.get(detailer.id).assignments.push(ass);
            }
        });
        return Array.from(memberMap.values());
    }, [projectAssignments, detailers]);

    // Calculate WEIGHTED schedule progress (accounts for ramp-up and burn-off)
    const scheduleInfo = useMemo(() => {
        if (projectAssignments.length === 0) {
            return { 
                startDate: null, 
                endDate: null, 
                durationWeeks: 0, 
                percentElapsed: 0,
                plannedProgress: 0,
                totalPlannedHours: 0,
                hoursToDate: 0,
                peakWeek: null,
                weeklyData: []
            };
        }
        
        // Get date range
        const dates = projectAssignments.flatMap(a => [new Date(a.startDate), new Date(a.endDate)]);
        const startDate = new Date(Math.min(...dates));
        const endDate = new Date(Math.max(...dates));
        const today = new Date();
        
        // Calculate hours by week to understand the actual staffing curve
        const weeklyHours = new Map();
        let totalPlannedHours = 0;
        
        projectAssignments.forEach(ass => {
            const assStart = new Date(ass.startDate);
            const assEnd = new Date(ass.endDate);
            const allocation = Number(ass.allocation) || 0;
            const dailyHours = (allocation / 100) * 8;
            
            // Iterate through each day of the assignment
            let current = new Date(assStart);
            while (current <= assEnd) {
                // Skip weekends
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    // Get week start (Monday)
                    const weekStart = new Date(current);
                    weekStart.setDate(current.getDate() - ((current.getDay() + 6) % 7));
                    const weekKey = weekStart.toISOString().split('T')[0];
                    
                    const existing = weeklyHours.get(weekKey) || 0;
                    weeklyHours.set(weekKey, existing + dailyHours);
                    totalPlannedHours += dailyHours;
                }
                current.setDate(current.getDate() + 1);
            }
        });
        
        // Calculate hours that should have been completed by now (planned progress)
        let hoursToDate = 0;
        const weeklyData = [];
        let peakHours = 0;
        let peakWeek = null;
        
        const sortedWeeks = Array.from(weeklyHours.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        
        sortedWeeks.forEach(([weekKey, hours]) => {
            const weekDate = new Date(weekKey);
            if (weekDate <= today) {
                hoursToDate += hours;
            }
            if (hours > peakHours) {
                peakHours = hours;
                peakWeek = weekKey;
            }
            weeklyData.push({ week: weekKey, hours, cumulative: 0 });
        });
        
        // Add cumulative hours
        let cumulative = 0;
        weeklyData.forEach(w => {
            cumulative += w.hours;
            w.cumulative = cumulative;
        });
        
        // Calculate planned progress as percentage of total hours
        const plannedProgress = totalPlannedHours > 0 ? (hoursToDate / totalPlannedHours) * 100 : 0;
        
        const totalDuration = endDate - startDate;
        const elapsedDuration = today - startDate;
        const percentElapsed = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100)) : 0;
        const durationWeeks = Math.ceil(totalDuration / (1000 * 60 * 60 * 24 * 7));
        
        return { 
            startDate, 
            endDate, 
            durationWeeks, 
            percentElapsed,
            plannedProgress: Math.min(100, plannedProgress),
            totalPlannedHours,
            hoursToDate,
            peakWeek: peakWeek ? new Date(peakWeek) : null,
            weeklyData
        };
    }, [projectAssignments]);

    // Calculate overall completion percentage
    const overallCompletion = useMemo(() => {
        const activities = Object.values(activitiesDoc?.activities || {}).flat();
        if (activities.length === 0) return 0;
        
        let totalWeightedCompletion = 0;
        let totalWeight = 0;
        
        activities.forEach(act => {
            const hours = Number(act.estimatedHours) || 0;
            const completion = Number(act.percentComplete) || 0;
            totalWeightedCompletion += hours * completion;
            totalWeight += hours;
        });
        
        return totalWeight > 0 ? totalWeightedCompletion / totalWeight : 0;
    }, [activitiesDoc]);

    // Calculate discipline summaries
    const disciplineSummaries = useMemo(() => {
        const summaries = [];
        const activities = activitiesDoc?.activities || {};
        
        Object.entries(activities).forEach(([groupKey, acts]) => {
            const groupLabel = getTradeDisplayName(groupKey);
            let totalHours = 0;
            let totalCost = 0;
            let weightedCompletion = 0;
            let totalBudget = 0;
            
            acts.forEach(act => {
                const hours = Number(act.estimatedHours) || 0;
                const useVdcRate = act.description?.toUpperCase().includes('VDC') || act.description === "Project Setup";
                const rate = useVdcRate ? (project?.vdcBlendedRate || project?.blendedRate || 0) : (project?.blendedRate || 0);
                
                totalHours += hours;
                totalCost += Number(act.costToDate) || 0;
                totalBudget += hours * rate;
                weightedCompletion += hours * (Number(act.percentComplete) || 0);
            });
            
            const avgCompletion = totalHours > 0 ? weightedCompletion / totalHours : 0;
            
            summaries.push({
                key: groupKey,
                label: groupLabel,
                totalHours,
                totalCost,
                totalBudget,
                avgCompletion,
                activityCount: acts.length
            });
        });
        
        return summaries.sort((a, b) => b.totalHours - a.totalHours);
    }, [activitiesDoc, project]);

    // Determine project health status
    const projectHealth = useMemo(() => {
        const cpi = financialSummary.productivity || 0;
        const variancePercent = financialSummary.currentBudget > 0 
            ? (financialSummary.variance / financialSummary.currentBudget) * 100 
            : 0;
        
        // Schedule Performance Index (Actual Progress / Planned Progress)
        const spi = scheduleInfo.plannedProgress > 0 
            ? overallCompletion / scheduleInfo.plannedProgress 
            : 1;
        
        let status, statusColor, description;
        
        if (cpi >= 0.95 && spi >= 0.95) {
            status = 'On Track';
            statusColor = '#10B981';
            description = 'Project is performing well within budget and schedule';
        } else if (cpi >= 0.85 && spi >= 0.85) {
            status = 'Needs Attention';
            statusColor = '#F59E0B';
            description = 'Minor concerns detected - monitor closely';
        } else {
            status = 'At Risk';
            statusColor = '#EF4444';
            description = 'Project requires immediate attention';
        }
        
        return { status, statusColor, description, cpi, spi, variancePercent };
    }, [financialSummary, scheduleInfo.plannedProgress, overallCompletion]);

    // NOW we can have conditional returns
    if (!report || !project) {
        return (
            <div className="text-center p-8">
                <h3 className="text-xl text-red-500">Error Generating Report</h3>
                <p className={`${currentTheme.subtleText}`}>Project data could not be loaded.</p>
            </div>
        );
    }

    const formatCurrency = (value) => {
        const numberValue = Number(value) || 0;
        return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const reportDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Reusable progress bar component
    const ProgressBar = ({ value, max, color = '#3B82F6', height = '10px' }) => {
        const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
        return (
            <div style={{ width: '100%', backgroundColor: '#E5E7EB', borderRadius: '4px', height, border: '1px solid #D1D5DB' }}>
                <div style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: '3px' }}></div>
            </div>
        );
    };

    // Shared cell styles
    const cellStyle = { padding: '6px 8px', borderBottom: '1px solid #D1D5DB', fontSize: '11px' };
    const headerCellStyle = { ...cellStyle, backgroundColor: '#F3F4F6', fontWeight: '600', borderBottom: '2px solid #9CA3AF' };

    return (
        <div 
            id="full-project-report-print"
            style={{ 
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                color: '#1F2937',
                backgroundColor: '#FFFFFF',
                padding: '12px',
                lineHeight: '1.4'
            }}
        >
            {/* Print-specific styles */}
            <style>{`
                @media print {
                    @page { 
                        size: letter portrait;
                        margin: 0.25in;
                    }
                    
                    /* Color printing */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    
                    #full-project-report-print {
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    
                    /* Table handling */
                    table { 
                        page-break-inside: auto !important; 
                    }
                    tr { 
                        page-break-inside: avoid !important; 
                    }
                    thead {
                        display: table-header-group;
                    }
                    
                    /* Keep sections together when possible */
                    .section-header {
                        page-break-after: avoid !important;
                    }
                }
            `}</style>

            {/* HEADER */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1F2937', paddingBottom: '8px', marginBottom: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937' }}>Project Progress Report</div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '2px', color: '#374151' }}>{project.name}</div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                    Project ID: {project.projectId} &nbsp;|&nbsp; Report Generated: {reportDate}
                </div>
            </div>

            {reportOption === 'dateDuration' && (
                <div style={{ padding: '8px', backgroundColor: '#DBEAFE', borderRadius: '4px', textAlign: 'center', marginBottom: '12px', fontSize: '11px' }}>
                    <strong>Reporting Period:</strong> {dateRange.startDate?.toLocaleDateString()} - {dateRange.endDate?.toLocaleDateString()}
                </div>
            )}

            {/* EXECUTIVE SUMMARY */}
            <div style={{ 
                border: `3px solid ${projectHealth.statusColor}`,
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '12px',
                backgroundColor: '#FAFAFA'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Executive Summary
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: projectHealth.statusColor, lineHeight: '1.2' }}>
                            {projectHealth.status}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                            {projectHealth.description}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase' }}>Actual Progress</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>{overallCompletion.toFixed(1)}%</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase' }}>Planned Progress</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>{scheduleInfo.plannedProgress.toFixed(1)}%</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase' }}>CPI</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: projectHealth.cpi >= 1 ? '#10B981' : '#EF4444' }}>
                                {projectHealth.cpi.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase' }}>SPI</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: projectHealth.spi >= 1 ? '#10B981' : '#EF4444' }}>
                                {projectHealth.spi.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase' }}>Budget Variance</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: financialSummary.variance >= 0 ? '#10B981' : '#EF4444' }}>
                                {formatCurrency(financialSummary.variance)}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Dual progress bar - planned (gray) as background, actual overlaid */}
                <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                        <span>Progress Comparison (Gray = Planned, Color = Actual)</span>
                        <span>{overallCompletion.toFixed(1)}% actual / {scheduleInfo.plannedProgress.toFixed(1)}% planned</span>
                    </div>
                    <div style={{ position: 'relative', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px', border: '1px solid #D1D5DB' }}>
                        {/* Planned progress (gray background bar) */}
                        <div style={{ 
                            position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: '3px',
                            width: `${Math.min(100, scheduleInfo.plannedProgress)}%`, 
                            backgroundColor: '#9CA3AF' 
                        }}></div>
                        {/* Actual progress (colored overlay) */}
                        <div style={{ 
                            position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: '3px',
                            width: `${Math.min(100, overallCompletion)}%`, 
                            backgroundColor: overallCompletion >= scheduleInfo.plannedProgress ? '#10B981' : '#F59E0B' 
                        }}></div>
                    </div>
                </div>
            </div>

            {/* PROJECT INFO & SCHEDULE - Side by Side */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                {/* Project Information */}
                <div style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: '6px', padding: '10px', backgroundColor: '#FAFAFA' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', borderBottom: '2px solid #1F2937', paddingBottom: '4px', marginBottom: '8px' }}>
                        Project Information
                    </div>
                    <table style={{ width: '100%', fontSize: '11px' }}>
                        <tbody>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Status</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{statusDescriptions[project.status] || 'Operational'}</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Initial Budget</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(project.initialBudget || financialSummary.currentBudget || 0)}</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Current Budget</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(financialSummary.currentBudget)}</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Detailing Rate</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(project.blendedRate || 0)}/hr</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>VDC Rate</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(project.vdcBlendedRate || project.blendedRate || 0)}/hr</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Contingency</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{project.contingency || 0}%</td></tr>
                            {project.dashboardUrl && (
                                <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Dashboard</td><td style={{ textAlign: 'right' }}><a href={project.dashboardUrl} style={{ color: '#3B82F6' }}>View →</a></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Schedule Summary */}
                <div style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: '6px', padding: '10px', backgroundColor: '#FAFAFA' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', borderBottom: '2px solid #1F2937', paddingBottom: '4px', marginBottom: '8px' }}>
                        Schedule Summary
                    </div>
                    <table style={{ width: '100%', fontSize: '11px' }}>
                        <tbody>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Start Date</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{formatDate(scheduleInfo.startDate)}</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Duration</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{scheduleInfo.durationWeeks} weeks</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Team Size</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{teamMembers.length} members</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Total Planned Hours</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{scheduleInfo.totalPlannedHours.toFixed(0)} hrs</td></tr>
                            <tr><td style={{ padding: '3px 0', color: '#6B7280' }}>Hours to Date (Planned)</td><td style={{ textAlign: 'right', fontWeight: '500' }}>{scheduleInfo.hoursToDate.toFixed(0)} hrs</td></tr>
                        </tbody>
                    </table>
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px' }}>
                            <span>Schedule Progress (Weighted)</span>
                            <span>{scheduleInfo.plannedProgress.toFixed(1)}%</span>
                        </div>
                        <ProgressBar value={scheduleInfo.plannedProgress} max={100} color="#06B6D4" />
                    </div>
                </div>
            </div>

            {/* FINANCIAL SUMMARY */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', borderBottom: '2px solid #1F2937', paddingBottom: '4px', marginBottom: '8px' }}>
                    Financial Summary
                </div>
                
                {/* Primary metrics */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {[
                        { label: 'Current Budget', value: formatCurrency(financialSummary.currentBudget), color: '#1F2937' },
                        { label: 'Spent to Date', value: formatCurrency(financialSummary.spentToDate), color: '#1F2937' },
                        { label: 'Earned Value', value: formatCurrency(financialSummary.earnedValue), color: '#1F2937' },
                        { label: 'Est. Final Cost', value: formatCurrency(financialSummary.projectedFinalCost), color: financialSummary.projectedFinalCost > financialSummary.currentBudget ? '#EF4444' : '#10B981' },
                    ].map((item, i) => (
                        <div key={i} style={{ flex: 1, backgroundColor: '#F3F4F6', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '2px' }}>{item.label}</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: item.color }}>{item.value}</div>
                        </div>
                    ))}
                </div>
                
                {/* Secondary metrics */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {[
                        { label: 'Allocated Hours', value: `${(financialSummary.allocatedHours || 0).toFixed(0)} hrs` },
                        { label: 'Cost to Complete', value: formatCurrency(financialSummary.costToComplete) },
                        { label: 'Variance', value: formatCurrency(financialSummary.variance), color: financialSummary.variance >= 0 ? '#10B981' : '#EF4444' },
                        { label: 'CPI (Productivity)', value: (financialSummary.productivity || 0).toFixed(2), color: financialSummary.productivity >= 1 ? '#10B981' : '#EF4444' },
                    ].map((item, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', padding: '6px' }}>
                            <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase' }}>{item.label}</div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: item.color || '#1F2937' }}>{item.value}</div>
                        </div>
                    ))}
                </div>
                
                {/* Progress bars */}
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px' }}>
                            <span>Budget Consumed (Spent / Budget)</span>
                            <span>{((financialSummary.spentToDate / financialSummary.currentBudget) * 100 || 0).toFixed(1)}%</span>
                        </div>
                        <ProgressBar 
                            value={financialSummary.spentToDate || 0} 
                            max={financialSummary.currentBudget || 1} 
                            color={(financialSummary.spentToDate || 0) <= (financialSummary.currentBudget || 0) * 0.9 ? '#3B82F6' : '#F59E0B'}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px' }}>
                            <span>Earned Value Progress</span>
                            <span>{((financialSummary.earnedValue / financialSummary.currentBudget) * 100 || 0).toFixed(1)}%</span>
                        </div>
                        <ProgressBar 
                            value={financialSummary.earnedValue || 0} 
                            max={financialSummary.currentBudget || 1} 
                            color="#10B981"
                        />
                    </div>
                </div>
            </div>

            {/* DISCIPLINE SUMMARY TABLE */}
            {disciplineSummaries.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', borderBottom: '2px solid #1F2937', paddingBottom: '4px', marginBottom: '8px' }}>
                        Discipline Summary
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={headerCellStyle}>Discipline</th>
                                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Est. Hours</th>
                                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Budget</th>
                                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Actual Cost</th>
                                <th style={{ ...headerCellStyle, textAlign: 'center' }}>% Complete</th>
                                <th style={{ ...headerCellStyle, width: '100px' }}>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {disciplineSummaries.map((disc, i) => (
                                <tr key={disc.key} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                                    <td style={{ ...cellStyle, fontWeight: '600' }}>{disc.label}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>{disc.totalHours.toFixed(0)}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(disc.totalBudget)}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(disc.totalCost)}</td>
                                    <td style={{ ...cellStyle, textAlign: 'center', fontWeight: '600' }}>{disc.avgCompletion.toFixed(0)}%</td>
                                    <td style={cellStyle}>
                                        <ProgressBar 
                                            value={disc.avgCompletion} 
                                            max={100} 
                                            color={disc.avgCompletion >= 75 ? '#10B981' : disc.avgCompletion >= 50 ? '#3B82F6' : '#F59E0B'}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TEAM STAFFING TABLE */}
            {teamMembers.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', borderBottom: '2px solid #1F2937', paddingBottom: '4px', marginBottom: '8px' }}>
                        Team Staffing ({teamMembers.length} Members)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={headerCellStyle}>Name</th>
                                <th style={headerCellStyle}>Title</th>
                                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Trade</th>
                                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Allocation</th>
                                <th style={headerCellStyle}>Assignment Period</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.map((member, i) => {
                                const primaryTrade = Array.isArray(member.disciplineSkillsets) && member.disciplineSkillsets.length > 0
                                    ? member.disciplineSkillsets[0].name : 'N/A';
                                const latestAssignment = member.assignments.sort((a, b) => 
                                    new Date(b.endDate) - new Date(a.endDate)
                                )[0];
                                
                                return (
                                    <tr key={member.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                                        <td style={{ ...cellStyle, fontWeight: '500' }}>{member.firstName} {member.lastName}</td>
                                        <td style={cellStyle}>{member.title || 'N/A'}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>{getTradeDisplayName(latestAssignment?.trade || primaryTrade)}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', fontWeight: '600' }}>{latestAssignment?.allocation || 0}%</td>
                                        <td style={{ ...cellStyle, fontSize: '10px' }}>
                                            {formatDate(latestAssignment?.startDate)} - {formatDate(latestAssignment?.endDate)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ACTION TRACKER SUMMARY */}
            {actionTrackerSummary.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', borderBottom: '2px solid #1F2937', paddingBottom: '4px', marginBottom: '8px' }}>
                        Action Tracker Summary
                    </div>
                    {actionTrackerSummary.map(main => (
                        <div key={main.mainName} style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>{main.mainName}</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={headerCellStyle}>Discipline</th>
                                        <th style={{ ...headerCellStyle, textAlign: 'right' }}>% of Est. Hrs</th>
                                        <th style={{ ...headerCellStyle, textAlign: 'right' }}>Avg. % Complete</th>
                                        <th style={{ ...headerCellStyle, width: '100px' }}>Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {main.disciplines.map((disc, i) => (
                                        <tr key={disc.disciplineName} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                                            <td style={{ ...cellStyle, fontWeight: '500' }}>{disc.disciplineName}</td>
                                            <td style={{ ...cellStyle, textAlign: 'right' }}>{disc.tradePercentage}%</td>
                                            <td style={{ ...cellStyle, textAlign: 'right' }}>{disc.avgPercentComplete}%</td>
                                            <td style={cellStyle}>
                                                <ProgressBar 
                                                    value={Number(disc.avgPercentComplete)} 
                                                    max={100} 
                                                    color={Number(disc.avgPercentComplete) >= 75 ? '#10B981' : Number(disc.avgPercentComplete) >= 50 ? '#3B82F6' : '#F59E0B'}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {/* BUDGET IMPACT LOG */}
            {(activitiesDoc?.budgetImpacts || []).length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', borderBottom: '2px solid #1F2937', paddingBottom: '4px', marginBottom: '8px' }}>
                        Budget Impact Log
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={headerCellStyle}>Date</th>
                                <th style={headerCellStyle}>Description</th>
                                <th style={headerCellStyle}>Activity</th>
                                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Hours</th>
                                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(activitiesDoc.budgetImpacts || []).map((impact, i) => (
                                <tr key={impact.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                                    <td style={cellStyle}>{new Date(impact.date + 'T00:00:00').toLocaleDateString()}</td>
                                    <td style={cellStyle}>{impact.description}</td>
                                    <td style={cellStyle}>{impact.tradeOrActivity}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>{impact.hours}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: '500', color: impact.amount < 0 ? '#EF4444' : '#10B981' }}>
                                        {formatCurrency(impact.amount)}
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ backgroundColor: '#F3F4F6', fontWeight: 'bold' }}>
                                <td colSpan="3" style={{ ...cellStyle, textAlign: 'right', borderTop: '2px solid #9CA3AF' }}>Total Impact:</td>
                                <td style={{ ...cellStyle, textAlign: 'right', borderTop: '2px solid #9CA3AF' }}>
                                    {(activitiesDoc.budgetImpacts || []).reduce((sum, item) => sum + (Number(item.hours) || 0), 0)}
                                </td>
                                <td style={{ 
                                    ...cellStyle, 
                                    textAlign: 'right', 
                                    borderTop: '2px solid #9CA3AF',
                                    color: (activitiesDoc.budgetImpacts || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0) < 0 ? '#EF4444' : '#10B981'
                                }}>
                                    {formatCurrency((activitiesDoc.budgetImpacts || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ACTIVITY BREAKDOWN */}
            {activitiesDoc?.activities && Object.keys(activitiesDoc.activities).length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', borderBottom: '2px solid #1F2937', paddingBottom: '4px', marginBottom: '8px' }}>
                        Activity Breakdown
                    </div>
                    {Object.entries(activitiesDoc.activities || {}).map(([trade, acts]) => {
                        const tradeLabel = getTradeDisplayName(trade);
                        const tradeTotals = acts.reduce((acc, act) => {
                            const useVdcRate = act.description?.toUpperCase().includes('VDC') || act.description === "Project Setup";
                            const rate = useVdcRate ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
                            acc.hours += Number(act.estimatedHours) || 0;
                            acc.budget += (Number(act.estimatedHours) || 0) * rate;
                            acc.actual += Number(act.costToDate) || 0;
                            return acc;
                        }, { hours: 0, budget: 0, actual: 0 });
                        
                        return (
                            <div key={trade} style={{ marginBottom: '8px' }}>
                                <div style={{ 
                                    fontSize: '12px', fontWeight: '600', color: '#3B82F6', 
                                    backgroundColor: '#EFF6FF', padding: '6px 10px', borderRadius: '4px', marginBottom: '6px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span>{tradeLabel} ({acts.length} activities)</span>
                                    <span style={{ fontSize: '10px', color: '#6B7280' }}>
                                        {tradeTotals.hours.toFixed(0)} hrs | {formatCurrency(tradeTotals.budget)} budget | {formatCurrency(tradeTotals.actual)} actual
                                    </span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...headerCellStyle, fontSize: '10px' }}>Activity</th>
                                            <th style={{ ...headerCellStyle, fontSize: '10px', textAlign: 'center' }}>Code</th>
                                            <th style={{ ...headerCellStyle, fontSize: '10px', textAlign: 'right' }}>Est Hrs</th>
                                            <th style={{ ...headerCellStyle, fontSize: '10px', textAlign: 'right' }}>Budget</th>
                                            <th style={{ ...headerCellStyle, fontSize: '10px', textAlign: 'center' }}>% Comp</th>
                                            <th style={{ ...headerCellStyle, fontSize: '10px', textAlign: 'right' }}>Actual</th>
                                            <th style={{ ...headerCellStyle, fontSize: '10px', textAlign: 'right' }}>Earned</th>
                                            <th style={{ ...headerCellStyle, fontSize: '10px', textAlign: 'right' }}>Proj. Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {acts.map((act, i) => {
                                            const useVdcRate = act.description?.toUpperCase().includes('VDC') || act.description === "Project Setup";
                                            const rate = useVdcRate ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
                                            const budget = (Number(act.estimatedHours) || 0) * rate;
                                            const percentComplete = Number(act.percentComplete) || 0;
                                            const earnedValue = budget * (percentComplete / 100);
                                            const actualCost = Number(act.costToDate) || 0;
                                            const projectedCost = percentComplete > 0 ? (actualCost / (percentComplete / 100)) : budget;
                                            
                                            return (
                                                <tr key={act.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                                                    <td style={{ ...cellStyle, fontSize: '10px' }}>{act.description}</td>
                                                    <td style={{ ...cellStyle, fontSize: '10px', textAlign: 'center', fontFamily: 'monospace' }}>{act.chargeCode}</td>
                                                    <td style={{ ...cellStyle, fontSize: '10px', textAlign: 'right' }}>{act.estimatedHours}</td>
                                                    <td style={{ ...cellStyle, fontSize: '10px', textAlign: 'right' }}>{formatCurrency(budget)}</td>
                                                    <td style={{ ...cellStyle, fontSize: '10px', textAlign: 'center', fontWeight: '600' }}>{percentComplete.toFixed(0)}%</td>
                                                    <td style={{ ...cellStyle, fontSize: '10px', textAlign: 'right' }}>{formatCurrency(actualCost)}</td>
                                                    <td style={{ ...cellStyle, fontSize: '10px', textAlign: 'right' }}>{formatCurrency(earnedValue)}</td>
                                                    <td style={{ ...cellStyle, fontSize: '10px', textAlign: 'right', color: projectedCost > budget ? '#EF4444' : '#10B981' }}>
                                                        {formatCurrency(projectedCost)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FOOTER */}
            <div style={{ 
                textAlign: 'center', 
                fontSize: '10px', 
                color: '#9CA3AF', 
                borderTop: '1px solid #E5E7EB', 
                paddingTop: '8px',
                marginTop: '8px'
            }}>
                <div>VDC Detailing Productivity Tracker</div>
                <div>{project.name} ({project.projectId}) | Generated: {new Date().toLocaleString()}</div>
            </div>
        </div>
    );
}

export default FullProjectReport;