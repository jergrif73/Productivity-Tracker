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
            content: "The Workloader provides a timeline view of all project assignments. It's the best way to visualize your team's workload over time. This console is directly populated by assignments created in the Team Console.",
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
            title: "Editing Assignments (Taskmaster & TCL)",
            content: "As a Taskmaster or TCL, you can click on any assignment cell to open a popup where you can edit its trade or allocation for all future weeks.",
            roles: ['taskmaster', 'tcl']
        },
        {
          key: "dragFillAssignment",
          title: "Drag-Fill Assignments",
          content: "To quickly extend an assignment's duration, click and drag the small handle on the right edge of an assignment bar. This will automatically update the 'End Date' of the assignment.",
          roles: ['taskmaster', 'tcl']
        },
        {
          key: "goToEmployeeAssignments",
          title: "Navigate to Employee Assignments",
          content: "When viewing the Workloader grouped by 'Employee', Taskmasters and TCLs will see a 'Projects Assignment' button. Clicking this will take you directly to the Team Console, with that employee's assignments automatically opened for editing.",
          roles: ['taskmaster', 'tcl']
        },
        {
          key: "goToProjectDetails",
          title: "Navigate to Project Details",
          content: "When viewing the Workloader grouped by 'Project', Taskmasters and TCLs will see a 'Project Details' button. Clicking this will take you directly to the Project Console, automatically filtered and expanded to show that project's detailed information.",
          roles: ['taskmaster', 'tcl']
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
        content: "This is where you manage your workforce's project assignments. The two-column layout allows you to view your employee list on the left and see detailed assignments for a selected employee on the right.",
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
        title: "Managing Assignments (Taskmaster & TCL)",
        content: "In the right-hand panel, you can add new project assignments or edit existing ones for the selected employee. This is where you allocate your team's time to specific projects.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "addProjectOnTheFly",
        title: "Add Project On The Fly",
        content: "When creating or editing an assignment, you can click the '+' button next to the project dropdown to create a new project without leaving the console. This is useful for quickly adding newly awarded projects.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "setSkills",
        title: "Setting Skills and Primary Trade",
        content: "Click 'View Skills' to open the skills editor. Here you can rate an employee's abilities and set their primary trade by reordering the discipline skillsets. The first discipline in the list determines their group in this console.",
        roles: ['taskmaster']
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
        title: "Budget Impact Log (Taskmaster & TCL)",
        content: "Use this section to log events that impact the project's budget, such as change orders. Each entry adjusts the 'Current Budget' in the Financial Summary.",
        roles: ['taskmaster', 'tcl']
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
        key: "projectWideActivities",
        title: "Project-Wide Activities (Taskmaster)",
        content: "In the 'Activity Values Breakdown', you can check the 'Project-Wide' box for an entire trade section. This moves it to a separate area in the Action Tracker where TCLs can report a single progress percentage for that trade, independent of the 'Mains'.",
        roles: ['taskmaster']
      },
      {
        key: "alphabeticalSorting",
        title: "Alphabetical Sorting",
        content: "The trade sections within the 'Activity Values Breakdown' are now automatically sorted alphabetically, making it easier to locate a specific discipline.",
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
        title: "Project Links",
        content: "Use these links for quick access to an external dashboard or the Project Workloader, centralizing project information.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
    ],
  },
  // =================================================================
  // == Task Console
  // =================================================================
  tasks: {
    title: "Task Console Tutorial",
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
            key: "subTasks",
            title: "Sub-tasks & Automatic Completion",
            content: "Break down a large task into smaller steps. Each sub-task can be assigned and have a due date. Checking off all sub-tasks will automatically mark the main task as 'Completed'.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "hardDeleteTask",
            title: "Permanently Deleting a Task",
            content: "From the task detail modal, you can permanently delete a task. This action is irreversible and should be used with caution. You can only delete tasks that have no sub-tasks.",
            roles: ['taskmaster']
        },
        {
            key: "hardDeleteAllDeletedTasks",
            title: "Purging Archived Tasks",
            content: "In the 'Archive' lane, you'll find a button to permanently remove all tasks that have their status set to 'Deleted'. This action is irreversible.",
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
            content: "This chart visualizes project workload over time, showing the total weekly hours based on *assigned* work. It's a powerful tool for seeing your team's actual committed workload. The data comes from assignments made in the Team Console.",
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
            key: "fortyHourReference",
            title: "40-Hour Reference Lines",
            content: "The dashed red lines and their corresponding labels on the vertical axis mark 40-hour increments. This helps you quickly gauge the total workload against standard full-time employee capacities (e.g., 80 hours = 2 FTEs).",
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
            content: "This console allows you to generate and export custom reports. All controls are located in the left-hand sidebar, and the generated report or chart will appear in the main area on the right.",
            roles: ['taskmaster']
        },
        {
            key: "manageJobPositions",
            title: "Manage Job Family Positions",
            content: "Click this button in the header to open a dedicated editor where you can add, modify, or delete job family roles and their associated responsibilities, skills, and experience.",
            roles: ['taskmaster']
        },
        {
            key: "reportType",
            title: "Select a Report or Dashboard",
            content: "Choose the type of data you want to analyze from the 'Report Type' dropdown. Options are grouped into 'Dashboards & Charts' for visual analysis and 'Tabular Reports' for data export.",
            roles: ['taskmaster']
        },
        {
            key: "dynamicFilters",
            title: "Dynamic Report Filters",
            content: "The filters on the left sidebar are dynamic. As you select a 'Report Type,' the available filters below will change to show only the options relevant to that specific report.",
            roles: ['taskmaster']
        },
        {
            key: "reviewJobFamilyExpectations",
            title: "Review Job Family Expectations (Popup)",
            content: "When viewing certain reports, use this dropdown to select any job position. Its details will appear in a movable, floating window for easy reference while you analyze the report data.",
            roles: ['taskmaster']
        },
        {
            key: "exportToCSV",
            title: "Export Report to CSV",
            content: "After generating any tabular report, click the 'Export to CSV' button to download the data in a spreadsheet format for further analysis or sharing.",
            roles: ['taskmaster']
        },
        {
            key: "geminiAiChat",
            title: "AI-Powered Insights (Taskmaster)",
            content: "After generating a tabular report, press Ctrl+Shift+Alt+G to open an AI chat window. You can ask specific questions about the report data to get instant analysis and insights.",
            roles: ['taskmaster']
        }
    ]
  },
  // =================================================================
  // == Admin Console
  // =================================================================
  admin: {
    title: "Manage Console",
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
            key: "manageUnionLocals",
            title: "Managing Union Locals",
            content: "Inside the 'Add New Employee' form, click the 'Manage' button next to the Union Local dropdown to add, edit, or delete union locals from the list.",
            roles: ['taskmaster']
        },
        {
            key: "manageProjects",
            title: "Manage Projects",
            content: "Use this section to create new projects, setting their initial budget and blended rates. You can also edit existing project details. Project information defined here forms the basis for all other consoles.",
            roles: ['taskmaster']
        },
        {
            key: "weeklyForecast",
            title: "Weekly Hour Forecast",
            content: "Clicking on a project in the 'Manage Projects' list expands this weekly timeline. This is where you input the *demand*—the number of hours you forecast will be needed. This data powers the Forecast Console.",
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
  // =================================================================
  // == Database Console
  // =================================================================
  database: {
    title: "Database Console Tutorial",
    steps: [
        {
            key: "database",
            title: "Welcome to the Database Console",
            content: "This is a powerful tool for Taskmasters to directly view and manipulate the raw data in the database. Use this console with caution, as changes made here directly affect the entire application.",
            roles: ['taskmaster']
        },
        {
            key: "navigateCollections",
            title: "Navigate Collections",
            content: "Click the buttons at the top to switch between different data collections, like 'detailers', 'projects', and 'assignments'. The number on each button shows how many items are in that collection.",
            roles: ['taskmaster']
        },
        {
            key: "searchAndSortData",
            title: "Search and Sort Data",
            content: "Use the search bar to filter the currently viewed collection. You can also click on any column header to sort the data by that column.",
            roles: ['taskmaster']
        },
        {
            key: "editData",
            title: "Editing Data",
            content: "Click the 'Edit' button on any row to open an editor. Some collections have specialized editors (like for Detailers and Projects), while others use a generic form.",
            roles: ['taskmaster']
        },
        {
            key: "addDeleteData",
            title: "Adding & Deleting Data",
            content: "You can add new items to most collections using the 'Add New' button. The 'Delete' button on each row will permanently remove that item from the database.",
            roles: ['taskmaster']
        },
    ]
  },
  // =================================================================
  // == My Dashboard Console
  // =================================================================
  dashboard: {
    title: "My Dashboard Tutorial",
    steps: [
        {
            key: "dashboard",
            title: "Welcome to My Dashboard",
            content: "This is your personalized overview, providing a quick glance at your workload, projects, and tasks. Taskmasters, TCLs, and Viewers can select any employee to view their dashboard.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "employeeSelection",
            title: "Employee Selection",
            content: "If you have the appropriate access level (Taskmaster, TCL, Viewer), you can select any employee from this dropdown to view their specific dashboard.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "reviewJobFamilyExpectations",
            title: "Review Job Family Expectations (Popup)",
            content: "Use this dropdown to select any job position. Its detailed responsibilities and skills will appear in a movable, floating window for easy reference. It opens on the bottom-right of your screen.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "jobFamilyDisplay",
            title: "Job Family Details (Embedded)",
            content: "This section automatically displays the details for the *selected employee's* assigned job title. For a general review of any position, use the 'Review Job Family Expectations' dropdown in the header.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "weekAtAGlance",
            title: "Week At a Glance",
            content: "This section shows your current and next week's project allocation percentages, helping you quickly understand your workload.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "topSkills",
            title: "Top Skills (Taskmaster Only)",
            content: "As a Taskmaster, this section displays the top skills for the selected employee, based on their skill assessments.",
            roles: ['taskmaster']
        },
        {
            key: "activeProjects",
            title: "Active Projects",
            content: "View a summary of your active project assignments. Click on a project card to navigate to the Workloader Console, filtered for this employee.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "myTasksDashboard",
            title: "My Tasks",
            content: "See your upcoming tasks due this week and other open tasks. Click on any task card to go to the Tasks Console.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "goToTimeSheets",
            title: "Go to Time Sheets",
            content: "Click this button to open the SharePoint folder for Field Time Sheets in a new browser tab.",
            roles: ['taskmaster', 'tcl', 'viewer']
        }
    ]
  },
};
