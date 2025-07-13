export const tutorialContent = {
  projects: {
    title: "Project Console Tutorial",
    steps: [
      {
        key: "projects",
        title: "Project Console Navigation",
        content: "You are currently in the Project Console. This view allows you to see all active projects and dive into their financial and activity details. Project data is initially set up and managed in the **Admin Console**.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "projectFilters",
        title: "Filtering Projects",
        content: "Use these filters to narrow down the project list. You can search by name or ID, filter by an assigned detailer, or select a date range to find projects active during that time. Filtering helps you quickly find specific projects without scrolling through a long list.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "projectCard",
        title: "Project Card",
        content: "Each project is represented by a card. Click anywhere on the card to expand it and view its detailed breakdown. This expanded view provides comprehensive financial and activity insights.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "financialSummary",
        title: "Financial Summary (Taskmaster)",
        content: "This dashboard provides a high-level overview of the project's financial health, based on the data from the Activity Breakdown below. Hover over any metric for a tooltip explaining how it's calculated. This summary is crucial for quick financial health checks.",
        roles: ['taskmaster']
      },
      {
          key: "financialForecast",
          title: "Financial Forecast (Taskmaster)",
          content: "This S-Curve chart plots the Planned Spend (blue line) against the project's Budget (green line) and the Estimated Final Cost (red line). It helps visualize if the project is on track financially over time. The orange and teal dots show the actual cost and earned value to date. This chart is powered by the **Weekly Hour Forecast** data entered in the **Admin Console**.",
          roles: ['taskmaster']
      },
      {
        key: "toggleFinancialForecast",
        title: "Expand/Collapse Financial Forecast",
        content: "Click on the 'Financial Forecast' header to expand or collapse this section. This allows you to hide or show the detailed chart as needed.",
        roles: ['taskmaster']
      },
      {
        key: "budgetImpactLog",
        title: "Budget Impact Log (Taskmaster)",
        content: "Use this section to log any events that impact the project's budget, such as change orders or unforeseen expenses. Each entry will adjust the 'Current Budget' in the Financial Summary, providing a clear audit trail of budget modifications.",
        roles: ['taskmaster']
      },
      {
        key: "toggleBudgetImpactLog",
        title: "Expand/Collapse Budget Impact Log",
        content: "Click on the 'Budget Impact Log' header to expand or collapse this section, controlling the visibility of the budget adjustment table.",
        roles: ['taskmaster']
      },
      {
        key: "mainsManagement",
        title: "Mains Management (Taskmaster)",
        content: "Define the major phases or areas of your project here. These 'Mains' will appear in the Action Tracker, allowing TCLs to report progress against them. Setting up clear 'Mains' is vital for structured progress reporting.",
        roles: ['taskmaster']
      },
      {
        key: "toggleMainsManagement",
        title: "Expand/Collapse Mains Management",
        content: "Click on the 'Mains Management' header to expand or collapse this section, showing or hiding the tools for defining project main items.",
        roles: ['taskmaster']
      },
      {
        key: "actionTracker-tcl",
        title: "Action Tracker (TCL View)",
        content: "As a TCL, this is your primary tool. Update the '% Complete' for each trade within a 'Main'. Your input here automatically calculates the overall '% Complete' for all related activities in the main breakdown, which in turn drives the project's Earned Value. Accurate updates here directly impact project financial reporting.",
        roles: ['tcl']
      },
      {
        key: "actionTracker-taskmaster",
        title: "Action Tracker (Taskmaster View)",
        content: "As a Taskmaster, you can view the progress reported by TCLs in the Action Tracker. You are also able to edit the 'Percentage of Est. Hrs' to correctly balance the weight of each trade's contribution to a 'Main'. This ensures the Earned Value calculations are aligned with project realities.",
        roles: ['taskmaster']
      },
      {
        key: "toggleActionTrackerSection",
        title: "Expand/Collapse Action Tracker",
        content: "Click on the 'Action Tracker' header to expand or collapse the entire section, showing or hiding all main items and their associated trade progress.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "toggleActionTrackerTradeSections",
        title: "Expand/Collapse Trade Sections (Action Tracker)",
        content: "Within the Action Tracker, click on any trade's header (e.g., 'Piping') to expand or collapse its list of activities and completion percentages. This helps you focus on specific trade progress.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "activityBreakdown",
        title: "Activity Values Breakdown (Taskmaster)",
        content: "This is the core of project tracking. Here, you define all billable activities for the project. Input 'Est. Hrs' and 'Hrs Used', and the system calculates the rest. The crucial '% Comp' field is calculated from the progress entered in the 'Action Tracker'. This section feeds directly into the **Reporting Console** for detailed financial analysis.",
        roles: ['taskmaster']
      },
      {
        key: "toggleActivityBreakdownSection",
        title: "Expand/Collapse Activity Breakdown",
        content: "Click on the 'Activity Values Breakdown' header to expand or collapse this section, controlling the visibility of all detailed activity records.",
        roles: ['taskmaster']
      },
      {
        key: "tradeFiltersProjectConsole",
        title: "Filter by Trade",
        content: "Use these trade buttons at the top of the project details to filter which trades' activities are displayed in the 'Action Tracker' and 'Activity Values Breakdown' sections. This helps you focus on specific disciplines within a project. Clicking on a trade button will toggle its visibility in the detailed breakdown sections.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "projectDashboardLink",
        title: "Project Dashboard Link",
        content: "If configured, this link provides quick access to an external dashboard or relevant project documentation. This is useful for integrating with other project management tools and centralizing project information.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "activityGrandTotals",
        title: "Activity Grand Totals",
        content: "At the bottom of the Activity Values Breakdown, the 'Totals' row summarizes all estimated hours, used hours, and financial metrics across all trades for the entire project. This provides an overall financial snapshot and helps in high-level budget reviews.",
        roles: ['taskmaster']
      }
    ],
  },
  reporting: {
    title: "Reporting Console Tutorial",
    steps: [
        {
            key: "reporting",
            title: "Reporting Console",
            content: "Welcome to the Reporting Console. This tool allows you to generate and export custom reports based on the data from across the application. Reports provide actionable insights for decision-making.",
            roles: ['taskmaster']
        },
        {
            key: "reportType",
            title: "Select a Report Type",
            content: "Choose the type of data you want to analyze. Each option generates a unique report. Consider what specific question you're trying to answer to pick the best report type.",
            roles: ['taskmaster']
        },
        {
            key: "projectHoursReport",
            title: "Project Hours Summary",
            content: "This report calculates the total number of hours allocated to each project within a specified date range. It's useful for understanding where your team's time is being spent at a high level. Data for this report comes from **Team Console assignments**.",
            roles: ['taskmaster']
        },
        {
            key: "detailerWorkloadReport",
            title: "Detailer Workload Summary",
            content: "This report shows the total hours assigned to each detailer within the selected date range, along with a list of projects they are assigned to. It helps in assessing individual workloads and capacity. This report also pulls data from **Team Console assignments**.",
            roles: ['taskmaster']
        },
        {
            key: "taskStatusReport",
            title: "Task Status Report",
            content: "Generates a list of all tasks from the Task Console. You can filter by due date to see what's upcoming or overdue. It provides a snapshot of task progress across all projects, directly reflecting the status in the **Tasks Console**.",
            roles: ['taskmaster']
        },
        {
            key: "forecastVsActualReport",
            title: "Forecast vs. Actuals Summary",
            content: "This is a powerful financial report. It compares the forecasted hours (demand) and assigned hours (supply) against the actual hours burned on a project. The variance column quickly shows if a project is over or under the planned effort. This report aggregates data from **Admin Console weekly forecasts** and **Project Console activity breakdowns**.",
            roles: ['taskmaster']
        },
        {
            key: "dateRangeSelection",
            title: "Date Range Selection for Reports",
            content: "For reports like 'Project Hours Summary' and 'Detailer Workload Summary', specifying a start and end date allows you to analyze data for a specific period, providing focused insights. Always ensure your date range is appropriate for the data you wish to analyze.",
            roles: ['taskmaster']
        },
        {
            key: "exportToCSV",
            title: "Export Report to CSV",
            content: "After generating a report, click the 'Export to CSV' button to download the data in a spreadsheet format. This is useful for further analysis, creating custom charts, or sharing outside the application.",
            roles: ['taskmaster']
        },
        {
            key: "newReportSuggestions",
            title: "Suggestions for New Reports",
            content: "Consider adding reports like: \n- *Skill Matrix Report:* A grid showing all detailers and their skill ratings to easily find experts. \n- *Project Milestone Report:* Track completion dates of major tasks or phases across all projects. \n- *Budget vs. Actual by Trade:* A more granular version of the Forecast report, breaking down financial performance for each discipline (Piping, Duct, etc.) within a project.",
            roles: ['taskmaster']
        }
    ]
  },
  detailers: {
    title: "Team Console Tutorial",
    steps: [
      {
        key: "detailers",
        title: "Team Console Navigation",
        content: "Welcome to the Team Console. This is where you manage your workforce and their assignments to various projects. Employee data is created and edited in the **Admin Console**.",
        roles: ['taskmaster']
      },
      {
        key: "employeeCard",
        title: "Employee Card",
        content: "Each employee has a card showing their name and current weekly allocation percentage. Click to expand or collapse the card and see their specific project assignments. The weekly allocation percentage helps you quickly see if an employee is over or under-assigned for the current week.",
        roles: ['taskmaster']
      },
      {
        key: "addAssignment",
        title: "Adding an Assignment",
        content: "Inside an expanded employee card, you can add a new project assignment. Specify the project, date range, trade, and what percentage of their time they should dedicate to it. These assignments directly populate the **Workloader Console** and contribute to the **Forecast Console's** supply data.",
        roles: ['taskmaster']
      },
      {
        key: "viewSkills",
        title: "Viewing Skills",
        content: "Click here to open a modal where you can view and rate an employee's skills and their proficiency in different disciplines. This information is also editable in the **Admin Console** and is useful for resource planning.",
        roles: ['taskmaster']
      },
      {
        key: "loadMoreEmployees",
        title: "Load More Employees",
        content: "If you have a large team, click 'Load More' at the bottom of the list to display additional employee records. This helps manage performance and loading times, ensuring a smooth user experience.",
        roles: ['taskmaster']
      },
      {
        key: "viewToggleTeam",
        title: "Condensed vs. Detailed View",
        content: "Toggle between a condensed view, showing only essential employee info and weekly allocation, and a detailed view that reveals more employee data and a direct link to their skills. Choose the view that best suits your immediate needs for team overview.",
        roles: ['taskmaster']
      }
    ]
  },
   workloader: {
    title: "Workloader Console Tutorial",
    steps: [
        {
            key: "workloader",
            title: "Workloader Console",
            content: "The Workloader provides a timeline view of all project assignments across all employees. It's the best way to visualize your team's workload over time. This console is directly populated by **assignments created in the Team Console**.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "workloaderGrid",
            title: "Assignment Grid",
            content: "Each colored bar represents a single assignment. The color corresponds to the trade. You can see who is assigned, to what project, and for how long. Use this grid to quickly spot gaps or overlaps in assignments.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "extendAssignment",
            title: "Extend an Assignment",
            content: "As a Taskmaster, you can hover over the end of an assignment bar, click the handle, and drag to extend its duration. This provides a quick way to adjust project timelines directly from the visual schedule.",
            roles: ['taskmaster']
        },
        {
            key: "editAssignment",
            title: "Edit an Assignment",
            content: "Click on any cell within an assignment to open an editor. This allows you to change the trade for a specific week, which will automatically split the assignment into multiple segments. This is useful for reallocating specific portions of an assignment without creating a new one.",
            roles: ['taskmaster']
        },
        {
            key: "colorScheme",
            title: "Controlling the Color Scheme",
            content: "You can change the overall color scheme of the application (Light, Grey, Dark) using the buttons in the top right of the application header. This adjusts the visual theme of the Workloader and all other consoles to your preference.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "projectExpansion",
            title: "Project Expansion/Collapse",
            content: "Click on any project row (e.g., 'Project Name (Project ID)') to expand or collapse it, revealing or hiding the individual assignments for that project. This helps you focus on specific projects or get a broader overview of all assignments.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "tradeColorLegend",
            title: "Trade Color Legend",
            content: "The legend at the top of the Workloader explains what each color in the assignment bars represents, corresponding to different trades (e.g., Piping, Duct, BIM). This visual cue helps in quickly identifying trade allocations at a glance.",
            roles: ['taskmaster', 'tcl', 'viewer']
        }
    ]
  },
  tasks: {
    title: "Tasks Console Tutorial",
    steps: [
        {
            key: "tasks",
            title: "Task Console",
            content: "This is a Kanban board for managing individual tasks. You can create tasks, assign them, and move them through different stages of completion. Task data can be pulled into **Reporting Console** summaries.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "taskLanes",
            title: "Task Lanes",
            content: "Each column is a 'lane' representing a status. You can drag and drop tasks from one lane to another. You can also add, rename, or delete lanes to fit your workflow. Customizing lanes helps you tailor the board to your team's specific process.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "addTask",
            title: "Adding a Task",
            content: "Click the '+ Add Task' button in the 'New Requests' lane to open the task detail modal and create a new task. Ensure tasks are clearly defined for effective tracking.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "taskCard",
            title: "Task Card",
            content: "Click on any task card to open a detailed view. This is where you manage everything about the task, including sub-tasks, watchers, and communications.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "subTasks",
            title: "Sub-tasks",
            content: "Break down a large task into smaller, manageable steps. Each sub-task can be assigned to a specific person and given its own due date. Checking off all sub-tasks will automatically mark the main task as 'Completed'. This promotes granular progress tracking.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "watchers",
            title: "Watchers",
            content: "Add other team members as 'Watchers' to a task. This is a great way to keep stakeholders informed of a task's progress without assigning it to them directly. Watchers receive updates on task changes.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "attachmentsAndComments",
            title: "Attachments & Comments",
            content: "Add relevant links (e.g., to design files, documents, or websites) in the attachments section. Use the comments section to have discussions, provide updates, and keep a record of the conversation about the task. This centralizes all task-related information and communication.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
          key: "taskStatusCalculation",
          title: "Automatic Task Status from Sub-tasks",
          content: "When you check off all sub-tasks within a main task, the main task's status will automatically update to 'Completed'. This streamlines progress tracking and ensures accuracy, reflecting true completion based on detailed work. If some sub-tasks are complete but not all, the task will be 'In Progress'.",
          roles: ['taskmaster', 'tcl']
        },
        {
          key: "addTaskButton",
          title: "Creating a New Task",
          content: "Located in the 'New Requests' lane, the '+ Add Task' button opens a modal to create a new task. It's important to assign a project, a detailer, and a due date for effective management and visibility across the system.",
          roles: ['taskmaster', 'tcl']
        }
    ]
  },
  gantt: {
    title: "Gantt Console Tutorial",
    steps: [
        {
            key: "gantt",
            title: "Gantt Console Overview",
            content: "Welcome to the Gantt Console! This chart visualizes project demand over time, showing the total weekly hours forecasted for each project or overall. It's a powerful tool for long-term resource planning. The data displayed here originates from the **Weekly Hour Forecast** in the **Admin Console**.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "dateNavigation",
            title: "Navigate the Timeline",
            content: "Use the '<' and '>' buttons to move the timeline backward or forward by one week. The 'Today' button will quickly bring you back to the current week. This allows you to review past forecasts or plan far into the future.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "viewToggle",
            title: "Projects vs. Totals View",
            content: "Toggle between 'Projects' and 'Totals' view using these buttons. 'Projects' shows individual lines for each project's forecasted hours, allowing for detailed project-specific demand analysis. 'Totals' aggregates all project hours into a single line for a high-level overview of overall demand.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "projectLines",
            title: "Understanding Project Lines (Projects View)",
            content: "In the 'Projects' view, each colored line represents a specific project's forecasted weekly hours. Hover over a line to see the project name and ID. The colors correspond to the project IDs shown at the bottom of the chart. This helps you identify which projects are driving demand at any given time.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "totalLine",
            title: "Understanding the Total Line (Totals View)",
            content: "In the 'Totals' view, the single blue line displays the sum of all forecasted hours across all active projects for each week. This helps you quickly identify periods of high demand or potential bottlenecks across your entire portfolio.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "fortyHourLine",
            title: "40-Hour Reference Line",
            content: "The dashed red lines represent increments of 40 hours. This helps you quickly gauge if the forecasted demand exceeds standard full-time capacity for an individual, indicating potential overloads or underutilization. It's a visual cue for resource allocation decisions.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
          key: "projectColorLegendGantt",
          title: "Project Color Legend",
          content: "The colored bars at the bottom of the Gantt chart in 'Projects' view correspond to the individual projects displayed on the chart. This legend helps you quickly identify which line belongs to which project, improving readability of the chart.",
          roles: ['taskmaster', 'tcl', 'viewer']
        }
    ]
  },
  forecast: {
    title: "Forecast Console Tutorial",
    steps: [
        {
            key: "forecast",
            title: "Forecast Console Overview",
            content: "The Forecast Console provides a visual representation of your team's projected demand (forecasted hours) versus their available supply (assigned hours) over time. This helps you identify potential over- or under-utilization of resources, enabling proactive resource management. Demand data comes from the **Admin Console's Weekly Hour Forecast**, and supply data comes from **Team Console assignments**.",
            roles: ['taskmaster']
        },
        {
            key: "dateNavigationForecast",
            title: "Navigate the Forecast Timeline",
            content: "Use the '<' and '>' buttons to shift the forecast timeline backward or forward. The 'Today' button will reset the view to the current week. This allows you to analyze historical trends or plan for future periods.",
            roles: ['taskmaster']
        },
        {
            key: "statusFilter",
            title: "Filter by Project Status",
            content: "Use the status filter buttons to include or exclude projects based on their current status (e.g., Planning, Conducting, Controlling, Archive). This allows you to focus on relevant project stages, such as only viewing 'Conducting' projects to see current operational workload.",
            roles: ['taskmaster']
        },
        {
            key: "forecastLines",
            title: "Understanding Forecast Lines (Demand)",
            content: "The colored lines represent the forecasted weekly hours (demand) for different trades across all active projects. Each color corresponds to a specific trade, as indicated in the legend below the chart. These hours are crucial for understanding where future work is expected.",
            roles: ['taskmaster']
        },
        {
            key: "assignedLine",
            title: "Understanding Assigned Hours (Supply)",
            content: "The dashed white line represents the total assigned hours (supply) for all detailers across all projects for each week. This data comes from the assignments made in the Team Console. It shows the actual capacity committed by your team.",
            roles: ['taskmaster']
        },
        {
            key: "interpretingForecast",
            content: "When a colored forecast line (demand) is above the dashed white line (supply), it indicates a potential understaffing or high demand for that specific trade – you may need to hire or reallocate. Conversely, if the dashed white line is significantly above the colored lines, it might suggest overstaffing or underutilization, prompting you to seek more work or reassign resources. The 40-hour dashed red lines also help you quickly assess individual capacity against overall demand.",
            roles: ['taskmaster']
        }
    ]
  },
  admin: {
    title: "Admin Console Tutorial",
    steps: [
        {
            key: "admin",
            title: "Manage Console",
            content: "The Manage (Admin) console is where you set up the foundational data for the entire application. This is the central hub for configuring employees, projects, and initial forecasts.",
            roles: ['taskmaster']
        },
        {
            key: "manageEmployees",
            title: "Manage Employees",
            content: "In this section, you can add new employees or edit and delete existing ones. Click 'Edit' to open the full skills and discipline editor for an employee. Employee details managed here are used across the **Team Console** and **Workloader Console**.",
            roles: ['taskmaster']
        },
        {
            key: "addEmployeeFields",
            title: "Adding New Employee Details",
            content: "Use these input fields to enter new employee details such as first name, last name, email, title, and employee ID. Ensure all required fields are filled to successfully add a new employee to your team roster.",
            roles: ['taskmaster']
        },
        {
            key: "editEmployeeDetails",
            title: "Editing Existing Employee Details",
            content: "Clicking 'Edit' next to an employee allows you to update their basic information, skill assessments, and discipline proficiencies. Keep this information up-to-date for accurate resource matching and skill-based assignments.",
            roles: ['taskmaster']
        },
        {
            key: "manageProjects",
            title: "Manage Projects",
            content: "Use this section to create new projects, setting their initial budget and blended rates. You can also edit existing project details. Project information defined here forms the basis for the **Project Console** and **Reporting Console**.",
            roles: ['taskmaster']
        },
        {
            key: "addProjectFields",
            title: "Adding New Project Details",
            content: "Use these input fields to define new projects, including name, project ID, initial budget, and blended rates. Accurate financial inputs here are crucial for all subsequent project tracking and financial reporting.",
            roles: ['taskmaster']
        },
        {
            key: "editProjectDetails",
            title: "Editing Existing Project Details",
            content: "Clicking 'Edit' next to a project allows you to modify its name, ID, financial parameters, and status. Regularly update project status to reflect its current lifecycle stage, which impacts its visibility in other consoles.",
            roles: ['taskmaster']
        },
        {
            key: "weeklyForecast",
            title: "Weekly Hour Forecast",
            content: "Clicking on a project in the 'Manage Projects' list expands this weekly timeline. This is where you input the *demand*—the number of hours you *forecast* each trade will need for this project each week. This data powers the **Gantt Console** and the **Forecast Console**, providing crucial insights into future workload.",
            roles: ['taskmaster']
        }
    ]
  },
};
