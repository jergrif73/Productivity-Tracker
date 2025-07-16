export const tutorialContent = {
  projects: {
    title: "Project Console Tutorial",
    steps: [
      {
        key: "projects",
        title: "Navigating the Application",
        content: "You are currently in the Project Console. The default view on login is the **Workloader Console**, which provides a timeline of all assignments. Use the navigation buttons in the header to switch between different consoles like this one, the Team Console, and more.",
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
          content: "This S-Curve chart plots the Planned Spend (blue line) against the project's Budget (green line) and the Estimated Final Cost (red line). It helps visualize if the project is on track financially over time. This chart is powered by the **Weekly Hour Forecast** data entered in the **Admin Console**.",
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
        content: "As a TCL, this is your primary tool. **Update the '% Complete' for each trade within a 'Main'**. Your input here automatically calculates the overall '% Complete' for all related activities in the main breakdown, which in turn drives the project's Earned Value. Accurate updates here directly impact project financial reporting.",
        roles: ['tcl']
      },
      {
        key: "actionTracker-taskmaster",
        title: "Action Tracker (Taskmaster View)",
        content: "As a Taskmaster, you can view the progress reported by TCLs in the Action Tracker. You are also able to **edit the 'Percentage of Est. Hrs' to correctly balance the weight of each trade's contribution to a 'Main'**. This ensures the Earned Value calculations are aligned with project realities.",
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
        content: "Within the Action Tracker, **click on any trade's header (e.g., 'Piping') to expand or collapse its list of activities** and completion percentages. This helps you focus on specific trade progress.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "activityBreakdown",
        title: "Activity Values Breakdown (Taskmaster)",
        content: "This is the core of project tracking. Here, you **define all billable activities for the project**. Input 'Est. Hrs' and 'Hrs Used', and the system calculates the rest. The crucial '% Comp' field is calculated from the progress entered in the 'Action Tracker'. This section feeds directly into the **Reporting Console** for detailed financial analysis.",
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
        content: "Use these **trade buttons at the top of the project details to filter which trades' activities are displayed** in the 'Action Tracker' and 'Activity Values Breakdown' sections. This helps you focus on specific disciplines within a project. Clicking on a trade button will toggle its visibility in the detailed breakdown sections.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "projectDashboardLink",
        title: "Project Dashboard Link",
        content: "If configured, this link provides quick access to an external dashboard or relevant project documentation. This is useful for integrating with other project management tools and centralizing project information.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "projectWorkloaderButton",
        title: "Navigate to Project Workloader",
        content: "When viewing project details, Taskmasters will see a 'Project Workloader' button. Clicking this button will take you directly to the Workloader Console, automatically filtered and expanded to show only this project's assignments.",
        roles: ['taskmaster']
      },
      {
        key: "activityGrandTotals",
        title: "Activity Grand Totals",
        content: "At the bottom of the Activity Values Breakdown, the **'Totals' row summarizes all estimated hours, used hours, and financial metrics across all trades** for the entire project. This provides an overall financial snapshot and helps in high-level budget reviews.",
        roles: ['taskmaster']
      },
      {
        key: "activityRowEditing",
        title: "Editing Activity Values",
        content: "To update activity details, simply **click into the 'Est. Hrs', 'Hrs Used', or 'Charge Code' fields** within the Activity Values Breakdown table. Changes are saved automatically.",
        roles: ['taskmaster']
      },
      {
        key: "financialMetricFormulas",
        title: "Understanding Financial Metric Formulas",
        content: "Dive deeper into the financial calculations: **Earned Value = (Budget * % Complete)**, **Productivity = (Earned Value / Spent to Date)**, and **Variance = (Current Budget - Estimated Final Cost)**.",
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
            content: "Welcome to the Reporting Console. This tool allows you to **generate and export custom reports** based on the data from across the application. Reports provide actionable insights for decision-making.",
            roles: ['taskmaster']
        },
        {
            key: "reportType",
            title: "Select a Report Type",
            content: "**Choose the type of data you want to analyze**. Each option generates a unique report. Consider what specific question you're trying to answer to pick the best report type.",
            roles: ['taskmaster']
        },
        {
            key: "projectHoursReport",
            title: "Project Hours Summary",
            content: "This report **calculates the total number of hours allocated to each project** within a specified date range. It's useful for understanding where your team's time is being spent at a high level. Data for this report comes from **Team Console assignments**.",
            roles: ['taskmaster']
        },
        {
            key: "detailerWorkloadReport",
            title: "Detailer Workload Summary",
            content: "This report **shows the total hours assigned to each detailer** within the selected date range, along with a list of projects they are assigned to. It helps in assessing individual workloads and capacity. This report also pulls data from **Team Console assignments**.",
            roles: ['taskmaster']
        },
        {
            key: "taskStatusReport",
            title: "Task Status Report",
            content: "**Generates a list of all tasks from the Task Console**. You can filter by due date to see what's upcoming or overdue. It provides a snapshot of task progress across all projects, directly reflecting the status in the **Tasks Console**.",
            roles: ['taskmaster']
        },
        {
            key: "forecastVsActualReport",
            title: "Forecast vs. Actuals Summary",
            content: "This is a powerful financial report. It **compares the forecasted hours (demand) and assigned hours (supply) against the actual hours burned on a project**. The variance column quickly shows if a project is over or under the planned effort. This report aggregates data from **Admin Console weekly forecasts** and **Project Console activity breakdowns**.",
            roles: ['taskmaster']
        },
        {
            key: "skillMatrixReport",
            title: "Employee Skill Matrix (Chart)",
            content: "This report generates a **visual heatmap of employee skills**. Use the filters to narrow down the employee list by their title or primary trade. This chart is excellent for quickly identifying skill gaps or finding the right person for a specific task.",
            roles: ['taskmaster']
        },
        {
            key: "dateRangeSelection",
            title: "Date Range Selection for Reports",
            content: "For reports like 'Project Hours Summary' and 'Detailer Workload Summary', **specifying a start and end date allows you to analyze data for a specific period**, providing focused insights. Always ensure your date range is appropriate for the data you wish to analyze.",
            roles: ['taskmaster']
        },
        {
            key: "exportToCSV",
            title: "Export Report to CSV",
            content: "After generating a report, **click the 'Export to CSV' button to download the data in a spreadsheet format**. This is useful for further analysis, creating custom charts, or sharing outside the application.",
            roles: ['taskmaster']
        }
    ]
  },
  detailers: {
    title: "Team Console Tutorial",
    steps: [
      {
        key: "detailers",
        title: "Welcome to the Team Console!",
        content: "This is where you **manage your workforce**. The new two-column layout allows you to view your employee list on the left and see detailed assignments for a selected employee on the right.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "searchAndFilter",
        title: "Searching and Filtering Your Team",
        content: "**Use the search bar to quickly find an employee by name**. You can also **use the trade filter buttons to show or hide employee groups** based on their primary trade.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "selectEmployee",
        title: "Selecting an Employee",
        content: "**Click on any employee card in the list**. Their project assignments will appear in the panel on the right. The percentage on the card shows their current weekly workload.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "currentWeekAllocation",
        title: "Current Week Allocation",
        content: "The **percentage on each employee card represents their total allocated hours for the current week**, based on their active assignments. This helps you quickly gauge their current workload and availability.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "viewToggle",
        title: "Condensed vs. Detailed View",
        content: "**Switch between 'Condensed' and 'Detailed' views** to change the amount of information shown in the employee list. Detailed view provides more info at a glance, including title and email.",
        roles: ['taskmaster', 'tcl', 'viewer']
      },
      {
        key: "manageAssignments",
        title: "Managing Assignments",
        content: "In the right-hand panel, you can **add new project assignments or edit existing ones** for the selected employee. This is where you allocate your team's time to specific projects.",
        roles: ['taskmaster']
      },
      {
        key: "setSkills",
        title: "Setting Skills and Primary Trade",
        content: "**Click 'View Skills' to open the skills editor**. Here you can rate an employee's abilities and **set their primary trade by reordering the discipline skillsets**. The first discipline in the list determines their group in this console.",
        roles: ['taskmaster', 'tcl']
      },
      {
        key: "employeeWorkloaderButton",
        title: "Navigate to Employee Workloader",
        content: "When an employee's assignments are expanded, Taskmasters will see an 'Employee Workloader' button. **Clicking this button will take you directly to the Workloader Console, automatically filtered and expanded** to show only this employee's assignments.",
        roles: ['taskmaster']
      }
    ]
  },
   workloader: {
    title: "Workloader Console Tutorial",
    steps: [
        {
            key: "workloader",
            title: "Welcome to the Workloader",
            content: "The Workloader provides a **timeline view of all project assignments** and is the default view when you log in. It's the best way to visualize your team's workload over time. This console is directly populated by assignments created in the Team Console.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "themeToggle",
            title: "Changing the Theme",
            content: "You can change the application's visual theme using the **'Light', 'Grey', and 'Dark' buttons** located in the top control bar of the Workloader. Your preference will be applied across the entire application.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "dynamicTimeline",
            title: "Dynamic Timeline View",
            content: "The timeline is dynamic. **It automatically hides empty weeks and rows with no scheduled work**, keeping the view clean and focused. As you add or extend assignments, the timeline will expand to show them.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "groupAndSort",
            title: "Grouping & Sorting Your View",
            content: "**Use the 'Group by' toggle to switch between a project-centric and an employee-centric view**. The 'Sort by' options will change based on your selection, allowing you to organize the list alphabetically, by ID, or by name.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "searchTimeline",
            title: "Searching the Timeline",
            content: "**Use the search bar to filter the timeline**. It will search by project name/ID when grouped by project, or by employee name when grouped by employee.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "expandAndCollapse",
            title: "Expanding & Collapsing Groups",
            content: "**Click the 'Expand/Collapse All' button to show or hide all assignments at once**. You can also **click on individual project or employee headers to toggle their specific assignments**.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "editAssignments",
            title: "Editing Assignments (Taskmaster)",
            content: "As a Taskmaster, you can **click on any assignment cell to edit its trade**. You can also **click and drag the handle on the right edge of an assignment to extend its duration**.",
            roles: ['taskmaster']
        },
        {
          key: "dragFillAssignment",
          title: "Drag-Fill Assignments",
          content: "To quickly extend an assignment's duration, **click and drag the small handle on the right edge of an assignment bar**. This will automatically update the 'End Date' of the assignment.",
          roles: ['taskmaster']
        },
        {
          key: "goToEmployeeAssignments",
          title: "Go to Employee Assignments (Taskmaster)",
          content: "When viewing the Workloader grouped by 'Employee', Taskmasters will see a 'Projects Assignment' button next to each employee's name. **Clicking this button will take you directly to the Team Console, with that employee's assignments automatically opened for editing**.",
          roles: ['taskmaster']
        },
        {
          key: "goToProjectDetails",
          title: "Go to Project Details (Taskmaster)",
          content: "When viewing the Workloader grouped by 'Project', Taskmasters will see a 'Project Details' button next to each project's name. **Clicking this button will take you directly to the Project Console, automatically filtered and expanded** to show only this project's detailed information.",
          roles: ['taskmaster']
        }
    ]
  },
  tasks: {
    title: "Tasks Console Tutorial",
    steps: [
        {
            key: "tasks",
            title: "Task Console",
            content: "This is a Kanban board for managing individual tasks. You can **create tasks, assign them, and move them through different stages of completion**. Task data can be pulled into **Reporting Console** summaries.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "taskLanes",
            title: "Task Lanes",
            content: "Each column is a 'lane' representing a status. You can **drag and drop tasks from one lane to another**. You can also **add, rename, or delete lanes** to fit your workflow. Customizing lanes helps you tailor the board to your team's specific process.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "addTask",
            title: "Adding a Task",
            content: "**Click the '+ Add Task' button** in the 'New Requests' lane to open the task detail modal and create a new task. Ensure tasks are clearly defined for effective tracking.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "taskCard",
            title: "Task Card",
            content: "**Click on any task card to open a detailed view**. This is where you manage everything about the task, including sub-tasks, watchers, and communications.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "taskCardIndicators",
            title: "Task Card Indicators",
            content: "Task cards provide quick insights: the **checklist icon shows completed/total sub-tasks**, and the **initials represent the assignee and watchers**. Due dates are also prominently displayed.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "subTasks",
            title: "Sub-tasks",
            content: "**Break down a large task into smaller, manageable steps**. Each sub-task can be assigned to a specific person and given its own due date. **Checking off all sub-tasks will automatically mark the main task as 'Completed'**. This promotes granular progress tracking.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "watchers",
            title: "Watchers",
            content: "**Add other team members as 'Watchers' to a task**. This is a great way to keep stakeholders informed of a task's progress without assigning it to them directly. Watchers receive updates on task changes.",
            roles: ['taskmaster', 'tcl']
        },
        {
            key: "attachmentsAndComments",
            title: "Attachments & Comments",
            content: "**Add relevant links** (e.g., to design files, documents, or websites) in the attachments section. **Use the comments section to have discussions, provide updates, and keep a record** of the conversation about the task. This centralizes all task-related information and communication.",
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
        },
        {
          key: "softDeleteTask",
          title: "Soft Deleting Tasks",
          content: "When you 'Delete Task' from the detail modal, the task's status changes to 'Deleted'. This hides it from all active views, but its data is retained in the system for historical records and reporting.",
          roles: ['taskmaster']
        }
    ]
  },
  gantt: {
    title: "Gantt Console Tutorial",
    steps: [
        {
            key: "gantt",
            title: "Gantt Console Overview",
            content: "Welcome to the Gantt Console! This chart **visualizes project demand over time**, showing the total weekly hours forecasted for each project or overall. It's a powerful tool for long-term resource planning. The data displayed here originates from the **Weekly Hour Forecast** in the **Admin Console**.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "dateNavigation",
            title: "Navigate the Timeline",
            content: "**Use the '<' and '>' buttons to move the timeline backward or forward by one week**. The **'Today' button will quickly bring you back to the current week**. This allows you to review past forecasts or plan far into the future.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "viewToggle",
            title: "Projects vs. Totals View",
            content: "**Toggle between 'Projects' and 'Totals' view** using these buttons. 'Projects' shows individual lines for each project's forecasted hours, allowing for detailed project-specific demand analysis. 'Totals' aggregates all project hours into a single line for a high-level overview of overall demand.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "projectLines",
            title: "Understanding Project Lines (Projects View)",
            content: "In the 'Projects' view, **each colored line represents a specific project's forecasted weekly hours**. Hover over a line to see the project name and ID. The colors correspond to the project IDs shown at the bottom of the chart. This helps you identify which projects are driving demand at any given time.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "totalLine",
            title: "Understanding the Total Line (Totals View)",
            content: "In the 'Totals' view, the **single blue line displays the sum of all forecasted hours across all active projects** for each week. This helps you quickly identify periods of high demand or potential bottlenecks across your entire portfolio.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
            key: "fortyHourLine",
            title: "40-Hour Reference Line",
            content: "The **dashed red lines represent increments of 40 hours**. This helps you quickly gauge if the forecasted demand exceeds standard full-time capacity for an individual, indicating potential overloads or underutilization. It's a visual cue for resource allocation decisions.",
            roles: ['taskmaster', 'tcl', 'viewer']
        },
        {
          key: "projectColorLegendGantt",
          title: "Project Color Legend",
          content: "The **colored bars at the bottom of the Gantt chart in 'Projects' view correspond to the individual projects** displayed on the chart. This legend helps you quickly identify which line belongs to which project, improving readability of the chart.",
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
            content: "The Forecast Console provides a **visual representation of your team's projected demand (forecasted hours) versus their available supply (assigned hours)** over time. This helps you identify potential over- or under-utilization of resources, enabling proactive resource management. Demand data comes from the **Admin Console's Weekly Hour Forecast**, and supply data comes from **Team Console assignments**.",
            roles: ['taskmaster']
        },
        {
            key: "viewToggle",
            title: "Line vs. Stacked View",
            content: "Use this toggle to switch between a **'Line View'** and a **'Stacked View'**. The line view is great for comparing individual trade demands, while the stacked view shows the total combined workload and its composition.",
            roles: ['taskmaster']
        },
        {
            key: "dateNavigationForecast",
            title: "Navigate the Forecast Timeline",
            content: "**Use the '<' and '>' buttons to shift the forecast timeline backward or forward**. The **'Today' button will reset the view to the current week**. This allows you to analyze historical trends or plan for future periods.",
            roles: ['taskmaster']
        },
        {
            key: "statusFilter",
            title: "Filter by Project Status",
            content: "**Use the status filter buttons to include or exclude projects** based on their current status (e.g., Planning, Conducting, Controlling, Archive). This allows you to focus on relevant project stages.",
            roles: ['taskmaster']
        },
        {
            key: "forecastLines",
            title: "Understanding Forecast Lines (Demand)",
            content: "The **colored lines or bars represent the forecasted weekly hours (demand) for different trades** across all active projects. Each color corresponds to a specific trade, as indicated in the legend below the chart. These hours are crucial for understanding where future work is expected.",
            roles: ['taskmaster']
        },
        {
            key: "assignedLine",
            title: "Understanding Assigned Hours (Supply)",
            content: "In 'Line View', the **dashed white line represents the total assigned hours (supply)** for all detailers across all projects for each week. This data comes from the assignments made in the Team Console. It shows the actual capacity committed by your team.",
            roles: ['taskmaster']
        },
        {
            key: "fortyHourReference",
            title: "40-Hour Reference Lines",
            content: "In both views, the **dashed red lines and their corresponding labels on the vertical axis mark 40-hour increments**. This helps you quickly gauge workload against standard full-time capacity.",
            roles: ['taskmaster']
        },
        {
            key: "interpretingForecast",
            content: "When a colored forecast line (demand) is above the dashed white line (supply), it indicates a **potential understaffing or high demand** for that specific trade – you may need to hire or reallocate. Conversely, if the dashed white line is significantly above the colored lines, it might suggest **overstaffing or underutilization**, prompting you to seek more work or reassign resources. The 40-hour dashed red lines also help you quickly assess individual capacity against overall demand.",
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
            content: "The Manage (Admin) console is where you **set up the foundational data for the entire application**. This is the central hub for configuring employees, projects, and initial forecasts.",
            roles: ['taskmaster']
        },
        {
            key: "manageEmployees",
            title: "Manage Employees",
            content: "In this section, you can **add new employees or edit and delete existing ones**. Click 'Edit' to open the full skills and discipline editor for an employee. Employee details managed here are used across the **Team Console** and **Workloader Console**.",
            roles: ['taskmaster']
        },
        {
            key: "addEmployeeFields",
            title: "Adding New Employee Details",
            content: "**Use these input fields to enter new employee details** including name, title, email, wage, and union affiliation. Ensure all required fields are filled to successfully add a new employee to your team roster.",
            roles: ['taskmaster']
        },
        {
            key: "manageUnionLocals",
            title: "Managing Union Locals",
            content: "Inside the 'Add New Employee' form, **click the 'Manage' button next to the Union Local dropdown**. This will reveal an interface where you can add, edit, or delete union locals from the list used in the dropdown.",
            roles: ['taskmaster']
        },
        {
            key: "editEmployeeDetails",
            title: "Editing Existing Employee Details",
            content: "**Clicking 'Edit' next to an employee allows you to update their basic information, skill assessments, and discipline proficiencies**. Keep this information up-to-date for accurate resource matching and skill-based assignments.",
            roles: ['taskmaster']
        },
        {
            key: "manageProjects",
            title: "Manage Projects",
            content: "**Use this section to create new projects, setting their initial budget and blended rates**. You can also **edit existing project details**. Project information defined here forms the basis for the **Project Console** and **Reporting Console**.",
            roles: ['taskmaster']
        },
        {
            key: "addProjectFields",
            title: "Adding New Project Details",
            content: "**Use these input fields to define new projects**, including name, project ID, initial budget, and blended rates. Accurate financial inputs here are crucial for all subsequent project tracking and financial reporting.",
            roles: ['taskmaster']
        },
        {
            key: "editProjectDetails",
            title: "Editing Existing Project Details",
            content: "**Clicking 'Edit' next to a project allows you to modify its name, ID, financial parameters, and status**. Regularly update project status to reflect its current lifecycle stage, which impacts its visibility in other consoles.",
            roles: ['taskmaster']
        },
        {
            key: "weeklyForecast",
            title: "Weekly Hour Forecast",
            content: "Clicking on a project in the 'Manage Projects' list expands this weekly timeline. This is where you input the *demand*—the number of hours you forecast will be needed. You can **add multiple rows for the same trade** (e.g., 'Piping') but with **different descriptions** (e.g., 'Process', 'Mechanical') for more granular planning. This data powers the **Gantt Console** and the **Forecast Console**.",
            roles: ['taskmaster']
        },
        {
            key: "addForecastRow",
            title: "Adding a Forecast Row",
            content: "Click the **'+ Add Forecast Row'** button at the bottom of the timeline. Select a trade from the dropdown and optionally add a specific description. This allows you to create multiple, distinct forecast lines for the same trade.",
            roles: ['taskmaster']
        },
        {
          key: "weeklyForecastTips",
          title: "Weekly Hour Forecast Tips",
          content: "When entering weekly hour forecasts, you can **quickly fill multiple cells by typing a value and then using the small blue square handle at the bottom-right of the cell to drag and fill across weeks**. You can also **paste copied data from spreadsheets**.",
          roles: ['taskmaster']
        },
        {
          key: "projectStatusImpact",
          title: "Project Status Impact",
          content: "**Project statuses (Planning, Conducting, Controlling, Archive) determine visibility across the app**. 'Archive' projects are hidden from most active views but remain available for reporting.",
          roles: ['taskmaster']
        }
    ]
  },
};
