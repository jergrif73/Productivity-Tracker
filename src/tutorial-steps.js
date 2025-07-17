export const tutorialContent = {
  // =================================================================
  // == Workloader Console
  // =================================================================
  workloader: {
    title: "Workloader Console Tutorial",
    steps: [
        {
            key: "workloader",
            title: "Welcome to the Workloader",
            content: "The Workloader provides a timeline view of all project assignments and is the default view when you log in. It's the best way to visualize your team's workload over time. This console is directly populated by assignments created in the Team Console.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "themeToggle",
            title: "Changing the Theme",
            content: "You can change the application's visual theme using the 'Light', 'Grey', and 'Dark' buttons located in the top control bar. Your preference will be applied across the entire application.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "dynamicTimeline",
            title: "Dynamic Timeline View",
            content: "The timeline is dynamic. It automatically hides empty weeks and rows with no scheduled work, keeping the view clean and focused. As you add or extend assignments, the timeline will expand to show them.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "groupAndSort",
            title: "Grouping & Sorting Your View",
            content: "Use the 'Group by' toggle to switch between a project-centric and an employee-centric view. The 'Sort by' options will change based on your selection, allowing you to organize the list alphabetically, by ID, or by name.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "searchTimeline",
            title: "Searching the Timeline",
            content: "Use the search bar to filter the timeline. It will search by project name/ID when grouped by project, or by employee name when grouped by employee.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "expandAndCollapse",
            title: "Expanding & Collapsing Groups",
            content: "Click the 'Expand/Collapse All' button to show or hide all assignments at once. You can also click on individual project or employee headers to toggle their specific assignments.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "editAssignments",
            title: "Editing Assignments (Taskmaster)",
            content: "As a Taskmaster, you can click on any assignment cell to edit its trade. This is useful for re-allocating a detailer to a different discipline for a specific week without creating a new assignment.",
            roles: ['taskmaster']
        },
        {
          key: "dragFillAssignment",
          title: "Drag-Fill Assignments",
          content: "To quickly extend an assignment's duration, click and drag the small handle on the right edge of an assignment bar. This will automatically update the 'End Date' of the assignment.",
          roles: ['taskmaster']
        },
        {
          key: "goToEmployeeAssignments",
          title: "Navigate to Employee Assignments",
          content: "When viewing the Workloader grouped by 'Employee', Taskmasters will see a 'Projects Assignment' button. Clicking this will take you directly to the Team Console, with that employee's assignments automatically opened for editing.",
          roles: ['taskmaster']
        },
        {
          key: "goToProjectDetails",
          title: "Navigate to Project Details",
          content: "When viewing the Workloader grouped by 'Project', Taskmasters will see a 'Project Details' button. Clicking this will take you directly to the Project Console, automatically filtered and expanded to show that project's detailed information.",
          roles: ['taskmaster']
        }
    ]
  },
  // =================================================================
  // == Team Console
  // =================================================================
  detailers: {
    title: "Team Console Tutorial",
    steps: [
      {
        key: "detailers",
        title: "Welcome to the Team Console!",
        content: "This is where you manage your workforce. The two-column layout allows you to view your employee list on the left and see detailed assignments for a selected employee on the right.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "searchAndFilter",
        title: "Searching and Filtering Your Team",
        content: "Use the search bar to quickly find an employee by name. You can also use the trade filter buttons to show or hide employee groups based on their primary trade.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "selectEmployee",
        title: "Selecting an Employee",
        content: "Click on any employee card in the list. Their project assignments will appear in the panel on the right. This is the main way to view and manage an individual's workload.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "currentWeekAllocation",
        title: "Current Week Allocation",
        content: "The percentage on each employee card represents their total allocated hours for the current week, based on their active assignments. This helps you quickly gauge their current workload and availability.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "viewToggle",
        title: "Condensed vs. Detailed View",
        content: "Switch between 'Condensed' and 'Detailed' views to change the amount of information shown in the employee list. Detailed view provides more info at a glance, including title and email.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "manageAssignments",
        title: "Managing Assignments (Taskmaster)",
        content: "In the right-hand panel, you can add new project assignments or edit existing ones for the selected employee. This is where you allocate your team's time to specific projects.",
        roles: ['taskmaster']
      },
      {
        key: "setSkills",
        title: "Setting Skills and Primary Trade",
        content: "Click 'View Skills' to open the skills editor. Here you can rate an employee's abilities and set their primary trade by reordering the discipline skillsets. The first discipline in the list determines their group in this console.",
        roles: ['taskmaster', 'tcl']
      },
    ]
  },
  // =================================================================
  // == Project Console
  // =================================================================
  projects: {
    title: "Project Console Tutorial",
    steps: [
      {
        key: "projects",
        title: "Navigating the Application",
        content: "You are currently in the Project Console. Use the navigation buttons in the header to switch between different consoles like the Workloader, Team Console, and more.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "projectFilters",
        title: "Filtering Projects",
        content: "Use these filters to narrow down the project list. You can search by name or ID, filter by an assigned detailer, or select a date range to find projects active during that time.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "projectCard",
        title: "Project Card",
        content: "Each project is represented by a card. Click anywhere on the card to expand it and view its detailed breakdown, which provides comprehensive financial and activity insights.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "financialSummary",
        title: "Financial Summary (Taskmaster)",
        content: "This dashboard provides a high-level overview of the project's financial health, based on the data from the Activity Breakdown below. Hover over any metric for a tooltip explaining its calculation.",
        roles: ['taskmaster']
      },
      {
          key: "financialForecast",
          title: "Financial Forecast (Taskmaster)",
          content: "This S-Curve chart plots the Planned Spend against the Budget and Estimated Final Cost. It helps visualize if the project is on track financially. This chart is powered by the Weekly Hour Forecast data entered in the Admin Console.",
          roles: ['taskmaster']
      },
      {
        key: "budgetImpactLog",
        title: "Budget Impact Log (Taskmaster)",
        content: "Use this section to log events that impact the project's budget, such as change orders. Each entry adjusts the 'Current Budget' in the Financial Summary.",
        roles: ['taskmaster']
      },
      {
        key: "mainsManagement",
        title: "Mains Management (Taskmaster)",
        content: "Define the major phases or areas of your project here. These 'Mains' appear in the Action Tracker, allowing TCLs to report progress against them.",
        roles: ['taskmaster']
      },
      {
        key: "actionTracker-tcl",
        title: "Action Tracker (TCL View)",
        content: "As a TCL, this is your primary tool. Update the '% Complete' for each trade within a 'Main'. Your input here automatically calculates the overall '% Complete' for all related activities, which drives the project's Earned Value.",
        roles: ['tcl']
      },
      {
        key: "actionTracker-taskmaster",
        title: "Action Tracker (Taskmaster View)",
        content: "As a Taskmaster, view progress reported by TCLs and edit the 'Percentage of Est. Hrs' to balance each trade's contribution to a 'Main', ensuring accurate Earned Value calculations.",
        roles: ['taskmaster']
      },
      {
        key: "activityBreakdown",
        title: "Activity Values Breakdown (Taskmaster)",
        content: "Define all billable activities here. Input 'Est. Hrs' and 'Hrs Used'. The crucial '% Comp' field is calculated from the 'Action Tracker'. This section feeds directly into the Reporting Console.",
        roles: ['taskmaster']
      },
      {
        key: "tradeFiltersProjectConsole",
        title: "Filter by Trade",
        content: "Use these trade buttons to filter which trades' activities are displayed in the 'Action Tracker' and 'Activity Values Breakdown' sections, helping you focus on specific disciplines.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "projectDashboardLink",
        title: "Project Dashboard Link",
        content: "If configured, this link provides quick access to an external dashboard or relevant project documentation, centralizing project information.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
    ],
  },
  // =================================================================
  // == Task Console
  // =================================================================
  tasks: {
    title: "Tasks Console Tutorial",
    steps: [
        {
            key: "tasks",
            title: "Task Console",
            content: "This is a Kanban board for managing individual tasks. You can create tasks, assign them, and move them through different stages of completion. Task data can be pulled into Reporting Console summaries.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "taskLanes",
            title: "Task Lanes",
            content: "Each column is a 'lane' representing a status. You can drag and drop tasks from one lane to another. You can also add, rename, or delete lanes to fit your workflow.",
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
            key: "taskCardIndicators",
            title: "Task Card Indicators",
            content: "Task cards provide quick insights: the checklist icon shows sub-task progress, and the initials represent the assignee and watchers. Due dates are also prominently displayed.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "subTasks",
            title: "Sub-tasks & Automatic Completion",
            content: "Break down a large task into smaller steps. Each sub-task can be assigned and have a due date. Checking off all sub-tasks will automatically mark the main task as 'Completed'.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "watchers",
            title: "Watchers",
            content: "Add other team members as 'Watchers' to a task to keep them informed of progress without assigning it to them directly.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "attachmentsAndComments",
            title: "Attachments & Comments",
            content: "Add relevant links and use the comments section to have discussions and provide updates, centralizing all task-related information.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
          key: "softDeleteTask",
          title: "Soft Deleting Tasks",
          content: "When you 'Delete Task' from the detail modal, the task's status changes to 'Deleted'. This hides it from active views but retains its data for historical records and reporting.",
          roles: ['taskmaster']
        }
    ]
  },
  // =================================================================
  // == Gantt Console
  // =================================================================
  gantt: {
    title: "Gantt Console Tutorial",
    steps: [
        {
            key: "gantt",
            title: "Gantt Console Overview",
            content: "This chart visualizes project demand over time, showing the total weekly hours based on *assigned* work. It's a powerful tool for seeing your team's actual committed workload. The data comes from assignments made in the Team Console.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "dateNavigation",
            title: "Navigate the Timeline",
            content: "Use the '<' and '>' buttons to move the timeline, and the 'Today' button to return to the current week.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "viewToggle",
            title: "Projects vs. Totals View",
            content: "Toggle between 'Projects' to see individual lines for each project's assigned hours, and 'Totals' to see a single line for the aggregated workload.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "projectLines",
            title: "Understanding Project Lines",
            content: "In 'Projects' view, each colored line represents a project's assigned weekly hours. Hover over a line to see the project name. The colors correspond to the legend at the bottom.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "fortyHourLine",
            title: "40-Hour Reference Line",
            content: "The dashed red lines represent increments of 40 hours, helping you quickly gauge if the assigned workload exceeds standard full-time capacity.",
            roles: ['taskmaster', 'tcl', 'viewer']
        }
    ]
  },
  // =================================================================
  // == Forecast Console
  // =================================================================
  'project-forecast': {
    title: "Forecast Console Tutorial",
    steps: [
        {
            key: "project-forecast",
            title: "Forecast Console Overview",
            content: "The Forecast Console provides a global, high-level view of your forecasted workload, aggregated by trade across all active projects. This helps you understand overall demand for specific skills. The data is pulled from the Weekly Hour Forecasts you set in the Admin Console.",
            roles: ['taskmaster']
        },
        {
            key: "statusFilter",
            title: "Filter by Project Status",
            content: "Use the status filter buttons to include or exclude projects based on their current stage (e.g., Planning, Conducting, Controlling). This allows you to focus your forecast on confirmed work versus potential projects.",
            roles: ['taskmaster']
        },
        {
            key: "viewToggle",
            title: "Line vs. Stacked View",
            content: "Use this toggle to switch between a 'Line View' and a 'Stacked View'. The line view is great for comparing the demand trends of individual trades, while the stacked view shows the total combined workload and its composition by trade.",
            roles: ['taskmaster']
        },
        {
            key: "dateNavigation",
            title: "Navigate the Forecast Timeline",
            content: "Use the '<< 4w' and '4w >>' buttons to shift the forecast timeline. The 'Today' button will reset the view to the current week. This allows you to analyze historical trends or plan for future periods.",
            roles: ['taskmaster']
        },
        {
            key: "chartArea",
            title: "Reading the Chart",
            content: "The chart displays the total forecasted hours per week. In 'Line View', each colored line represents a trade. In 'Stacked View', each segment of a bar represents a trade. Hover over any point or bar segment to see a tooltip with specific details.",
            roles: ['taskmaster']
        },
        {
            key: "fortyHourReference",
            title: "40-Hour Reference Lines",
            content: "The dashed red lines and their corresponding labels on the vertical axis mark 40-hour increments. This helps you quickly gauge the total workload against standard full-time employee capacities (e.g., 80 hours = 2 FTEs).",
            roles: ['taskmaster']
        },
        {
            key: "legend",
            title: "Trade Color Legend",
            content: "The legend at the bottom of the console identifies which color corresponds to which trade. This is essential for understanding the chart in both Line and Stacked views.",
            roles: ['taskmaster']
        }
    ]
  },
  // =================================================================
  // == Reporting Console
  // =================================================================
  reporting: {
    title: "Reporting Console Tutorial",
    steps: [
        {
            key: "reporting",
            title: "Reporting & Dashboards",
            content: "This console allows you to generate and export custom reports and view high-level dashboards based on the data from across the application.",
            roles: ['taskmaster']
        },
        {
            key: "reportType",
            title: "Select a Report or Dashboard",
            content: "Choose the type of data you want to analyze. Options are grouped into 'Dashboards & Charts' for visual analysis and 'Tabular Reports' for data export.",
            roles: ['taskmaster']
        },
        {
            key: "projectHealthDashboard",
            title: "Project Health Dashboard",
            content: "This chart provides a portfolio-level view of project performance. Each bubble is a project, plotted by its Cost Variance (CV) and Schedule Variance (SV). The size of the bubble represents its budget. Ideally, projects should be in the 'Under Budget, Ahead of Schedule' quadrant.",
            roles: ['taskmaster']
        },
        {
            key: "employeeWorkloadDistro",
            title: "Employee Workload Distribution",
            content: "Select an employee to see a pie chart of how their total assigned hours are distributed across different projects. This is useful for understanding an individual's focus.",
            roles: ['taskmaster']
        },
        {
            key: "skillMatrixReport",
            title: "Employee Skill Matrix",
            content: "This generates a visual heatmap of employee skills. Use the filters to narrow down the employee list by title or primary trade. This chart is excellent for quickly identifying skill gaps or finding the right person for a specific task.",
            roles: ['taskmaster']
        },
        {
            key: "forecastVsActualReport",
            title: "Forecast vs. Actuals Summary",
            content: "This powerful financial report compares the forecasted hours (demand) and assigned hours (supply) against the actual hours burned on a project. The variance column quickly shows if a project is over or under the planned effort.",
            roles: ['taskmaster']
        },
        {
            key: "exportToCSV",
            title: "Export Report to CSV",
            content: "After generating any tabular report, click the 'Export to CSV' button to download the data in a spreadsheet format for further analysis or sharing.",
            roles: ['taskmaster']
        }
    ]
  },
  // =================================================================
  // == Admin Console
  // =================================================================
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
            content: "In this section, you can add new employees or edit and delete existing ones. Click 'Edit' to open the full skills and discipline editor for an employee.",
            roles: ['taskmaster']
        },
        {
            key: "addEmployeeFields",
            title: "Adding New Employee Details",
            content: "Use these input fields to enter new employee details including name, title, email, wage, and union affiliation. Ensure all required fields are filled to add a new employee.",
            roles: ['taskmaster']
        },
        {
            key: "manageUnionLocals",
            title: "Managing Union Locals",
            content: "Inside the 'Add New Employee' form, click the 'Manage' button next to the Union Local dropdown to add, edit, or delete union locals from the list.",
            roles: ['taskmaster']
        },
        {
            key: "editEmployeeDetails",
            title: "Editing Existing Employee Details",
            content: "Clicking 'Edit' next to an employee allows you to update their basic information, skill assessments, and discipline proficiencies. Keep this information up-to-date for accurate resource matching.",
            roles: ['taskmaster']
        },
        {
            key: "manageProjects",
            title: "Manage Projects",
            content: "Use this section to create new projects, setting their initial budget and blended rates. You can also edit existing project details. Project information defined here forms the basis for all other consoles.",
            roles: ['taskmaster']
        },
        {
            key: "projectStatusImpact",
            title: "Project Status Impact",
            content: "Project statuses (Planning, Conducting, Controlling, Archive) determine visibility across the app. 'Archive' projects are hidden from most active views but remain available for reporting.",
            roles: ['taskmaster']
        },
        {
            key: "weeklyForecast",
            title: "Weekly Hour Forecast",
            content: "Clicking on a project in the 'Manage Projects' list expands this weekly timeline. This is where you input the *demand*—the number of hours you forecast will be needed. This data powers the Gantt and Forecast Consoles.",
            roles: ['taskmaster']
        },
        {
            key: "addForecastRow",
            title: "Adding a Forecast Row",
            content: "Click the '+ Add Forecast Row' button at the bottom of the timeline. You can add multiple rows for the same trade (e.g., 'Piping') but with different descriptions (e.g., 'Process', 'Mechanical') for more granular planning.",
            roles: ['taskmaster']
        },
        {
          key: "weeklyForecastTips",
          title: "Weekly Hour Forecast Tips",
          content: "You can quickly fill multiple cells by typing a value and then using the small blue square handle to drag and fill across weeks. You can also paste copied data from spreadsheets and reorder rows via drag-and-drop.",
          roles: ['taskmaster']
        }
    ]
  },
};
