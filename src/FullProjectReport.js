import React from 'react';

const FullProjectReport = ({ report, currentTheme }) => {
    // Safeguard to prevent crashes if the report object or its nested properties are missing.
    if (!report || !report.project) {
        return (
            <div className="text-center p-8">
                <h3 className="text-xl text-red-500">Error Generating Report</h3>
                <p className={`${currentTheme.subtleText}`}>Project data could not be loaded. Please try generating the report again.</p>
            </div>
        );
    }

    const { 
        project, 
        activitiesDoc,
        financialSummary,
        actionTrackerSummary,
        reportOption,
        dateRange 
    } = report;

    const formatCurrency = (value) => {
        const numberValue = Number(value) || 0;
        return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };

    // NOTE: Date Duration filtering is a significant effort and is not fully implemented in this version.
    // The UI is present, but the data filtering logic would need to be added for each section.

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold text-center">Full Project Report</h2>
            <h3 className="text-xl font-semibold text-center -mt-4">{project.name} ({project.projectId})</h3>
            
            {reportOption === 'dateDuration' && (
                <div className="p-2 bg-blue-900/50 rounded-md text-center">
                    <p className="font-semibold">Displaying data for date range: {dateRange.startDate?.toLocaleDateString()} - {dateRange.endDate?.toLocaleDateString()}</p>
                    <p className="text-xs">(Note: Date filtering is a complex feature and not yet fully implemented for all report sections.)</p>
                </div>
            )}
            
            {/* Financial Summary Section */}
            <div>
                <h3 className="text-xl font-semibold mb-2 border-b pb-1">Financial Summary</h3>
                <div className={`p-4 rounded-lg ${currentTheme.altRowBg} grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-center text-sm`}>
                    <div><p className={`font-semibold ${currentTheme.subtleText}`}>Current Budget</p><p className="text-lg">{formatCurrency(financialSummary.currentBudget)}</p></div>
                    <div><p className={`font-semibold ${currentTheme.subtleText}`}>Allocated Hrs</p><p className="text-lg">{financialSummary.allocatedHours.toFixed(2)}</p></div>
                    <div><p className={`font-semibold ${currentTheme.subtleText}`}>Spent to Date</p><p className="text-lg">{formatCurrency(financialSummary.spentToDate)}</p></div>
                    <div><p className={`font-semibold ${currentTheme.subtleText}`}>Earned Value</p><p className="text-lg">{formatCurrency(financialSummary.earnedValue)}</p></div>
                    <div><p className={`font-semibold ${currentTheme.subtleText}`}>Cost to Complete</p><p className="text-lg">{formatCurrency(financialSummary.costToComplete)}</p></div>
                    <div><p className={`font-semibold ${currentTheme.subtleText}`}>Est. Final Cost</p><p className="text-lg">{formatCurrency(financialSummary.projectedFinalCost)}</p></div>
                    <div><p className={`font-semibold ${currentTheme.subtleText}`}>Variance</p><p className={`text-lg ${financialSummary.variance < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(financialSummary.variance)}</p></div>
                    <div><p className={`font-semibold ${currentTheme.subtleText}`}>Productivity</p><p className={`text-lg ${financialSummary.productivity < 1 ? 'text-red-500' : 'text-green-500'}`}>{financialSummary.productivity.toFixed(2)}</p></div>
                </div>
            </div>

            {/* Action Tracker Summary Section */}
            <div>
                 <h3 className="text-xl font-semibold mb-2 border-b pb-1">Action Tracker Summary</h3>
                 <div className="space-y-4">
                    {actionTrackerSummary.map(main => (
                        <div key={main.mainName} className={`p-3 rounded-lg ${currentTheme.altRowBg}`}>
                            <h4 className="font-bold mb-2">{main.mainName}</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className={currentTheme.cardBg}>
                                        <tr>
                                            <th className="p-2 text-left font-semibold">Discipline</th>
                                            <th className="p-2 text-right font-semibold">% of Est. Hrs</th>
                                            <th className="p-2 text-right font-semibold">Avg. % Complete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {main.disciplines.map(disc => (
                                            <tr key={disc.disciplineName} className="border-t border-gray-700">
                                                <td className="p-2">{disc.disciplineName}</td>
                                                <td className="p-2 text-right">{disc.tradePercentage}%</td>
                                                <td className="p-2 text-right">{disc.avgPercentComplete}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
            
            {/* Budget Impact Log */}
            <div>
                <h3 className="text-xl font-semibold mb-2 border-b pb-1">Budget Impact Log</h3>
                <div className={`p-3 rounded-lg ${currentTheme.altRowBg}`}>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr>
                                <th className="p-2 text-left font-semibold">Date</th>
                                <th className="p-2 text-left font-semibold">Description</th>
                                <th className="p-2 text-left font-semibold">Activity</th>
                                <th className="p-2 text-right font-semibold">Hours</th>
                                <th className="p-2 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(activitiesDoc.budgetImpacts || []).map(impact => (
                                <tr key={impact.id} className="border-t border-gray-700">
                                    <td className="p-2">{new Date(impact.date + 'T00:00:00').toLocaleDateString()}</td>
                                    <td className="p-2">{impact.description}</td>
                                    <td className="p-2">{impact.tradeOrActivity}</td>
                                    <td className="p-2 text-right">{impact.hours}</td>
                                    <td className={`p-2 text-right ${impact.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(impact.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Activity Values Breakdown */}
            <div>
                <h3 className="text-xl font-semibold mb-2 border-b pb-1">Activity Values Breakdown</h3>
                <div className={`p-3 rounded-lg ${currentTheme.altRowBg} text-xs`}>
                    <table className="min-w-full">
                        <thead>
                             <tr>
                                {['Activity', 'Charge Code', 'Est. Hrs', 'Budget', '% of Proj.', '% Comp.', 'Actual Cost ($)', 'Earned ($)', 'Proj. Cost ($)'].map(h => (
                                    <th key={h} className="p-1 text-left font-semibold">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(activitiesDoc.activities || {}).map(([trade, acts]) => (
                                <React.Fragment key={trade}>
                                    <tr><td colSpan="10" className="pt-3"><h5 className="font-bold capitalize text-blue-300">{trade}</h5></td></tr>
                                    {acts.map(act => {
                                        const useVdcRate = act.description.toUpperCase().includes('VDC') || act.description === "Project Setup";
                                        const rateToUse = useVdcRate ? (project.vdcBlendedRate || project.blendedRate || 0) : (project.blendedRate || 0);
                                        const budget = (Number(act.estimatedHours) || 0) * rateToUse;
                                        const percentOfProject = financialSummary.allocatedHours > 0 ? ((Number(act.estimatedHours) || 0) / financialSummary.allocatedHours) * 100 : 0;
                                        const earnedValue = budget * (Number(act.percentComplete) / 100);
                                        const actualCost = (Number(act.costToDate) || 0); // Use costToDate directly
                                        const projectedCost = (Number(act.percentComplete) || 0) > 0 ? (actualCost / (Number(act.percentComplete) / 100)) : (Number(act.estimatedHours) > 0 ? budget : 0);
                                        return (
                                            <tr key={act.id} className="border-t border-gray-700">
                                                <td className="p-1">{act.description}</td>
                                                <td className="p-1">{act.chargeCode}</td>
                                                <td className="p-1">{act.estimatedHours}</td>
                                                <td className="p-1">{formatCurrency(budget)}</td>
                                                <td className="p-1">{percentOfProject.toFixed(2)}%</td>
                                                <td className="p-1">{(Number(act.percentComplete) || 0).toFixed(2)}%</td>
                                                {/* <td className="p-1">{act.hoursUsed}</td> -- REMOVED -- */}
                                                <td className="p-1">{formatCurrency(actualCost)}</td>
                                                <td className="p-1">{formatCurrency(earnedValue)}</td>
                                                <td className="p-1">{formatCurrency(projectedCost)}</td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

export default FullProjectReport;