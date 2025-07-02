/**
 * Main file for Firebase Cloud Functions using the v2 syntax.
 * This version uses refined HTML email templates with stacked line items
 * and sends a dedicated notification to new watchers.
 */

// v2 Function Imports
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineString } = require('firebase-functions/params');

// Firebase Admin and SendGrid
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const { getFirestore } = require("firebase-admin/firestore");

admin.initializeApp();
const db = getFirestore();

// --- SendGrid Configuration ---
const sendgridApiKey = defineString('SENDGRID_API_KEY');
const FROM_EMAIL = "jergrif73@gmail.com";
const PRIMARY_RECIPIENT = "jgriffith@southlandind.com";
const APP_URL = "https://nwproductivitytracker.netlify.app/";

// --- Email Template Helper ---
const createEmailHtml = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <title>${title}</title>
</head>
<body style="font-family: 'Open Sans', sans-serif; background-color: #f0f2f5; margin: 0; padding: 20px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Open Sans', sans-serif; background-color: #f0f2f5;">
        <tr>
            <td align="center">
                <table width="640" border="0" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #4a5568; color: #ffffff; padding: 24px; text-align: center;">
                            <h1 style="font-family: 'Montserrat', sans-serif; margin: 0; font-size: 24px; font-weight: 700;">Workforce Productivity Tracker</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px; font-size: 16px; line-height: 1.7; color: #4a5568;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px; background-color: #edf2f7; text-align: center; font-size: 12px; color: #718096;">
                            This is an automated notification. You do not need to reply.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;


// --- Helper Function to Send Emails ---
const sendEmail = async (recipients, subject, html) => {
  const key = sendgridApiKey.value();
  if (!key) {
    console.log("Skipping email send: SENDGRID_API_KEY is not set in environment.");
    return;
  }
  
  const uniqueRecipients = [...new Set(recipients.filter(Boolean))];
  if (uniqueRecipients.length === 0) {
      console.log("No recipients, skipping email.");
      return;
  }

  sgMail.setApiKey(key);
  const msg = {
    to: uniqueRecipients,
    from: FROM_EMAIL,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent successfully to:", uniqueRecipients.join(", "));
  } catch (error) {
    console.error("Error sending email:", error.toString());
    if (error.response) {
      console.error(JSON.stringify(error.response.body));
    }
  }
};

// --- Helper to get Contextual Data ---
const getContextData = async () => {
    const detailers = new Map();
    const projects = new Map();
    const lanes = new Map();
    const appId = "default-prod-tracker-app";
    
    const detailersSnapshot = await db.collection(`artifacts/${appId}/public/data/detailers`).get();
    detailersSnapshot.forEach(doc => {
        const data = doc.data();
        detailers.set(doc.id, { 
            name: `${data.firstName} ${data.lastName}`,
            email: data.email 
        });
    });

    const projectsSnapshot = await db.collection(`artifacts/${appId}/public/data/projects`).get();
    projectsSnapshot.forEach(doc => projects.set(doc.id, doc.data().name));
    
    const lanesSnapshot = await db.collection(`artifacts/${appId}/public/data/taskLanes`).get();
    lanesSnapshot.forEach(doc => lanes.set(doc.id, doc.data().name));
    
    return { detailers, projects, lanes };
};

// --- Runtime Options ---
const runtimeOpts = {
  cpu: 1,
  timeoutSeconds: 60,
  memory: "512MiB",
  concurrency: 1,
};

// --- Cloud Function: onTaskCreate ---
exports.onTaskCreate = onDocumentCreated({ document: "artifacts/{appId}/public/data/tasks/{taskId}", ...runtimeOpts }, async (event) => {
    const snap = event.data;
    if (!snap) return;
    const task = snap.data();
    const { detailers, projects } = await getContextData();

    const assignee = detailers.get(task.detailerId);
    const watchers = (task.watchers || []).map(id => detailers.get(id).name).join(", ") || "None";
    
    const subject = `New Task Created: ${task.taskName}`;
    const content = `
        <h2 style="font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 600; color: #1a202c; margin-top: 0; margin-bottom: 24px; display: flex; align-items: center;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="margin-right: 12px; width: 24px; height: 24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            New Task Assigned
        </h2>
        <p>A new task has been created and assigned. Here are the details:</p>
        <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong style="color: #2d3748; font-weight: 600;">Task Name:</strong><br>${task.taskName}</p>
            <p style="margin: 0 0 12px 0;"><strong style="color: #2d3748; font-weight: 600;">Project:</strong><br>${projects.get(task.projectId) || 'N/A'}</p>
            <p style="margin: 0 0 12px 0;"><strong style="color: #2d3748; font-weight: 600;">Status:</strong><br>${task.status}</p>
            <p style="margin: 0 0 12px 0;"><strong style="color: #2d3748; font-weight: 600;">Due Date:</strong><br>${task.dueDate || "N/A"}</p>
            <p style="margin: 0 0 12px 0;"><strong style="color: #2d3748; font-weight: 600;">Assignee:</strong><br>${assignee ? assignee.name : 'N/A'}</p>
            <p style="margin: 0;"><strong style="color: #2d3748; font-weight: 600;">Watchers:</strong><br>${watchers}</p>
        </div>
        <a href="${APP_URL}" style="display: inline-block; background-color: #3182ce; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; text-align: center;">View Task in Tracker</a>
    `;
    
    const html = createEmailHtml(subject, content);
    return sendEmail([PRIMARY_RECIPIENT], subject, html);
});

// --- Cloud Function: onTaskUpdate ---
exports.onTaskUpdate = onDocumentUpdated({ document: "artifacts/{appId}/public/data/tasks/{taskId}", ...runtimeOpts }, async (event) => {
    const change = event.data;
    if (!change) return;
    const before = change.before.data();
    const after = change.after.data();
    const { detailers, projects, lanes } = await getContextData();
    const changes = [];
    let latestComment = null;

    // --- Change Detection ---
    if (before.laneId !== after.laneId) changes.push(`Task was moved from <strong>${lanes.get(before.laneId) || 'an old lane'}</strong> to <strong>${lanes.get(after.laneId) || 'a new lane'}</strong>.`);
    if ((after.comments?.length || 0) > (before.comments?.length || 0)) {
        latestComment = after.comments[after.comments.length - 1];
        changes.push(`New comment added to the main task by <strong>${latestComment.author}</strong>.`);
    }
    const beforeSubTasks = new Map((before.subTasks || []).map(st => [st.id, st]));
    (after.subTasks || []).forEach(afterST => {
        const beforeST = beforeSubTasks.get(afterST.id);
        if (!beforeST) changes.push(`A new sub-task was added: "${afterST.name}".`);
        else if (JSON.stringify(beforeST) !== JSON.stringify(afterST)) {
            changes.push(`Sub-task was modified: "${afterST.name}".`);
            if ((afterST.comments?.length || 0) > (beforeST.comments?.length || 0)) {
                latestComment = afterST.comments[afterST.comments.length - 1];
                changes.push(`New comment on sub-task "${afterST.name}" by <strong>${latestComment.author}</strong>.`);
            }
        }
    });

    // --- Watcher Notification Logic ---
    const beforeWatcherIds = new Set(before.watchers || []);
    const afterWatcherIds = new Set(after.watchers || []);
    let newWatchersAdded = false;

    afterWatcherIds.forEach(watcherId => {
        if (!beforeWatcherIds.has(watcherId)) {
            newWatchersAdded = true;
            const newWatcher = detailers.get(watcherId);
            if (newWatcher && newWatcher.email) {
                const subject = `You've been added as a watcher on task: ${after.taskName}`;
                const content = `
                    <h2 style="font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 600; color: #1a202c; margin-top: 0; margin-bottom: 24px; display: flex; align-items: center;">
                        You are now watching a task
                    </h2>
                    <p>You will receive future notifications about this task.</p>
                    <div style="margin-bottom: 24px;">
                        <p style="margin: 0 0 12px 0;"><strong style="color: #2d3748; font-weight: 600;">Task Name:</strong><br>${after.taskName}</p>
                        <p style="margin: 0;"><strong style="color: #2d3748; font-weight: 600;">Project:</strong><br>${projects.get(after.projectId) || 'N/A'}</p>
                    </div>
                    <a href="${APP_URL}" style="display: inline-block; background-color: #3182ce; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; text-align: center;">View Task in Tracker</a>
                `;
                const watcherHtml = createEmailHtml(subject, content);
                sendEmail([newWatcher.email], subject, watcherHtml);
            }
        }
    });

    if (newWatchersAdded) {
        changes.push('Watchers have been updated.');
    }

    if (changes.length === 0) return null;

    // --- General Update Email to Primary Recipient ---
    const assignee = detailers.get(after.detailerId);
    const watchers = (after.watchers || []).map(id => detailers.get(id)?.name).join(", ") || "None";
    const subject = `Task Updated: ${after.taskName}`;
    
    const content = `
        <h2 style="font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 600; color: #1a202c; margin-top: 0; margin-bottom: 24px; display: flex; align-items: center;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="margin-right: 12px; width: 24px; height: 24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991 0l-3.182-3.182a8.25 8.25 0 00-11.667 0l-3.182 3.182" /></svg>
            Task Updated
        </h2>
        <p>The following task has been updated. Please review the changes below.</p>
        <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;"><strong style="color: #2d3748; font-weight: 600;">Task Name:</strong><br>${after.taskName}</p>
            <p style="margin: 0;"><strong style="color: #2d3748; font-weight: 600;">Project:</strong><br>${projects.get(after.projectId) || 'N/A'}</p>
        </div>
        <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 24px;">
            <h3 style="margin-top: 0; font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 600; color: #2d3748;">Change Details:</h3>
            <ul style="padding-left: 20px; margin-bottom: ${latestComment ? '1em' : '0'};">
                ${changes.map(c => `<li style="margin-bottom: 0.5em;">${c}</li>`).join('')}
            </ul>
            ${latestComment ? `<div style="border-left: 3px solid #4299e1; padding-left: 16px; margin-top: 16px; font-style: italic; color: #4a5568;"><p>"${latestComment.text}"</p></div>` : ''}
        </div>
        <div style="margin-top: 24px;">
            <p style="margin: 0 0 12px 0;"><strong>Current Assignee:</strong><br>${assignee ? assignee.name : 'N/A'}</p>
            <p style="margin: 0;"><strong>Current Watchers:</strong><br>${watchers}</p>
        </div>
        <a href="${APP_URL}" style="display: inline-block; background-color: #3182ce; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; text-align: center;">View Task in Tracker</a>
    `;

    const html = createEmailHtml(subject, content);
    return sendEmail([PRIMARY_RECIPIENT], subject, html);
});

// --- Cloud Function: dailyReminder ---
exports.dailyReminder = onSchedule({ schedule: "every 24 hours", ...runtimeOpts }, async (event) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const appId = "default-prod-tracker-app";
    const tasksRef = db.collection(`artifacts/${appId}/public/data/tasks`);
    const allTasksSnapshot = await tasksRef.get();
    if (allTasksSnapshot.empty) return null;
    
    const { detailers, projects } = await getContextData();
    const allReminders = [];

    allTasksSnapshot.forEach((doc) => {
      const task = doc.data();
      
      const checkDueDate = (item, type, parentTaskName = null) => {
          if (item.dueDate === tomorrowStr) {
              const assignee = detailers.get(item.detailerId);
              const description = type === 'Task'
                ? `<div style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0;"><strong style="color: #2d3748; font-weight: 600;">Task:</strong> ${item.taskName}<br><small style="color: #718096;">Project: ${projects.get(item.projectId) || 'N/A'}, Assignee: ${assignee ? assignee.name : 'N/A'}</small></div>`
                : `<div style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0;"><strong style="color: #2d3748; font-weight: 600;">Sub-Task:</strong> ${item.name} <em style="color: #718096;">(from main task: ${parentTaskName})</em><br><small style="color: #718096;">Assignee: ${assignee ? assignee.name : 'N/A'}</small></div>`;
              
              allReminders.push(description);
          }
      };

      checkDueDate(task, 'Task');
      (task.subTasks || []).forEach(subTask => checkDueDate(subTask, 'Sub-Task', task.taskName));
    });

    if (allReminders.length === 0) return null;

    const subject = `Daily Task Reminder for ${tomorrowStr}`;
    const content = `
        <h2 style="font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 600; color: #1a202c; margin-top: 0; margin-bottom: 24px; display: flex; align-items: center;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="margin-right: 12px; width: 24px; height: 24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Daily Reminder: Items Due Tomorrow
        </h2>
        <p>The following items are due on <strong>${tomorrowStr}</strong>:</p>
        <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 24px;">
            ${allReminders.join('')}
        </div>
        <a href="${APP_URL}" style="display: inline-block; background-color: #3182ce; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; text-align: center;">View Task in Tracker</a>
    `;
    
    const html = createEmailHtml(subject, content);
    return sendEmail([PRIMARY_RECIPIENT], subject, html);
});
