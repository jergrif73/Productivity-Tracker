export const tutorialContent = {
  projects: {
    title: "Project Console Tutorial",
    steps: [
      {
        key: "projects",
        title: "Project Console Navigation",
        content: "You are currently in the Project Console. This view allows you to see all active projects and dive into their financial and activity details."
      },
      {
        key: "projectFilters",
        title: "Filtering Projects",
        content: "Use these filters to narrow down the project list. You can search by name or ID, filter by an assigned detailer, or select a date range to find projects active during that time."
      },
      {
        key: "projectCard",
        title: "Project Card",
        content: "Each project is represented by a card. Click anywhere on the card to expand it and view its detailed breakdown."
      },
      {
        key: "financialSummary",
        title: "Financial Summary (Taskmaster)",
        content: "This dashboard provides a high-level overview of the project's financial health, based on the data from the Activity Breakdown below. Hover over any metric for a tooltip explaining how it's calculated."
      },
      {
          key: "financialForecast",
          title: "Financial Forecast (Taskmaster)",
          content: "This S-Curve chart plots the Planned Spend (blue line) against the project's Budget (green line) and the Estimated Final Cost (red line). It helps visualize if the project is on track financially over time. The orange and teal dots show the actual cost and earned value to date."
      },
      {
        key: "mainsManagement",
        title: "Mains Management (Taskmaster)",
        content: "Define the major phases or areas of your project here. These 'Mains' will appear in the Action Tracker, allowing TCLs to report progress against them."
      },
      {
        key: "actionTracker-tcl",
        title: "Action Tracker (TCL View)",
        content: "As a TCL, this is your primary tool. Update the '% Complete' for each trade within a 'Main'. Your input here automatically calculates the overall '% Complete' for all related activities in the main breakdown, which in turn drives the project's Earned Value."
      },
      {
        key: "actionTracker-taskmaster",
        title: "Action Tracker (Taskmaster View)",
        content: "As a Taskmaster, you can view the progress reported by TCLs in the Action Tracker. You are also able to edit the 'Percentage of Est. Hrs' to correctly balance the weight of each trade's contribution to a 'Main'."
      },
      {
        key: "activityBreakdown",
        title: "Activity Values Breakdown (Taskmaster)",
        content: "This is the core of project tracking. Here, you define all billable activities for the project. Input 'Est. Hrs' and 'Hrs Used', and the system calculates the rest. The crucial '% Comp' field is calculated from the progress entered in the 'Action Tracker'."
      },
    ],
  },
  reporting: {
    title: "Reporting Console Tutorial",
    steps: [
        {
            key: "reporting",
            title: "Reporting Console",
            content: "Welcome to the Reporting Console. This tool allows you to generate and export custom reports based on the data from across the application."
        },
        {
            key: "reportType",
            title: "Select a Report Type",
            content: "Choose the type of data you want to analyze. Each option generates a unique report."
        },
        {
            key: "projectHoursReport",
            title: "Project Hours Summary",
            content: "This report calculates the total number of hours allocated to each project within a specified date range. It's useful for understanding where your team's time is being spent at a high level."
        },
        {
            key: "detailerWorkloadReport",
            title: "Detailer Workload Summary",
            content: "This report shows the total hours assigned to each detailer within the selected date range, along with a list of projects they are assigned to. It helps in assessing individual workloads and capacity."
        },
        {
            key: "taskStatusReport",
            title: "Task Status Report",
            content: "Generates a list of all tasks from the Task Console. You can filter by due date to see what's upcoming or overdue. It provides a snapshot of task progress across all projects."
        },
        {
            key: "forecastVsActualReport",
            title: "Forecast vs. Actuals Summary",
            content: "This is a powerful financial report. It compares the forecasted hours (demand) and assigned hours (supply) against the actual hours burned on a project. The variance column quickly shows if a project is over or under the planned effort."
        },
        {
            key: "newReportSuggestions",
            title: "Suggestions for New Reports",
            content: "Consider adding reports like: \n- *Skill Matrix Report:* A grid showing all detailers and their skill ratings to easily find experts. \n- *Project Milestone Report:* Track completion dates of major tasks or phases across all projects. \n- *Budget vs. Actual by Trade:* A more granular version of the Forecast report, breaking down financial performance for each discipline (Piping, Duct, etc.) within a project."
        }
    ]
  },
  detailers: {
    title: "Team Console Tutorial",
    steps: [
      {
        key: "detailers",
        title: "Team Console Navigation",
        content: "Welcome to the Team Console. This is where you manage your workforce and their assignments to various projects."
      },
      {
        key: "employeeCard",
        title: "Employee Card",
        content: "Each employee has a card showing their name and current weekly allocation percentage. Click to expand and see their specific project assignments."
      },
      {
        key: "addAssignment",
        title: "Adding an Assignment",
        content: "Inside an expanded employee card, you can add a new project assignment. Specify the project, date range, trade, and what percentage of their time they should dedicate to it."
      },
      {
        key: "viewSkills",
        title: "Viewing Skills",
        content: "Click here to open a modal where you can view and rate an employee's skills and their proficiency in different disciplines."
      }
    ]
  },
   workloader: {
    title: "Workloader Console Tutorial",
    steps: [
        {
            key: "workloader",
            title: "Workloader Console",
            content: "The Workloader provides a timeline view of all project assignments across all employees. It's the best way to visualize your team's workload over time."
        },
        {
            key: "workloaderGrid",
            title: "Assignment Grid",
            content: "Each colored bar represents a single assignment. The color corresponds to the trade. You can see who is assigned, to what project, and for how long."
        },
        {
            key: "extendAssignment",
            title: "Extend an Assignment",
            content: "As a Taskmaster, you can hover over the end of an assignment bar, click the handle, and drag to extend its duration."
        },
        {
            key: "editAssignment",
            title: "Edit an Assignment",
            content: "Click on any cell within an assignment to open an editor. This allows you to change the trade for a specific week, which will automatically split the assignment into multiple segments."
        }
    ]
  },
  tasks: {
    title: "Tasks Console Tutorial",
    steps: [
        {
            key: "tasks",
            title: "Task Console",
            content: "This is a Kanban board for managing individual tasks. You can create tasks, assign them, and move them through different stages of completion."
        },
        {
            key: "taskLanes",
            title: "Task Lanes",
            content: "Each column is a 'lane' representing a status. You can drag and drop tasks from one lane to another. You can also add, rename, or delete lanes to fit your workflow."
        },
        {
            key: "addTask",
            title: "Adding a Task",
            content: "Click the '+ Add Task' button in the 'New Requests' lane to open the task detail modal and create a new task."
        },
        {
            key: "taskCard",
            title: "Task Card",
            content: "Click on any task card to open a detailed view. This is where you manage everything about the task."
        },
        {
            key: "subTasks",
            title: "Sub-tasks",
            content: "Break down a large task into smaller, manageable steps. Each sub-task can be assigned to a specific person and given its own due date. Checking off all sub-tasks will automatically mark the main task as 'Completed'."
        },
        {
            key: "watchers",
            title: "Watchers",
            content: "Add other team members as 'Watchers' to a task. This is a great way to keep stakeholders informed of a task's progress without assigning it to them directly."
        },
        {
            key: "attachmentsAndComments",
            title: "Attachments & Comments",
            content: "Add relevant links (e.g., to design files, documents, or websites) in the attachments section. Use the comments section to have discussions, provide updates, and keep a record of the conversation about the task."
        }
    ]
  },
  admin: {
    title: "Admin Console Tutorial",
    steps: [
        {
            key: "admin",
            title: "Manage Console",
            content: "The Manage (Admin) console is where you set up the foundational data for the entire application."
        },
        {
            key: "manageEmployees",
            title: "Manage Employees",
            content: "In this section, you can add new employees or edit and delete existing ones. Click 'Edit' to open the full skills and discipline editor for an employee."
        },
        {
            key: "manageProjects",
            title: "Manage Projects",
            content: "Use this section to create new projects, setting their initial budget and blended rates. You can also edit existing project details."
        },
        {
            key: "weeklyForecast",
            title: "Weekly Hour Forecast",
            content: "Clicking on a project in the 'Manage Projects' list expands this weekly timeline. This is where you input the *demand*—the number of hours you *forecast* each trade will need for this project each week. This data powers the Forecast Console."
        }
    ]
  },
};
