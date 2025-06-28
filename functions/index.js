/**
 * Main file for Firebase Cloud Functions using the v2 syntax.
 * This version notifies watchers in addition to the primary recipient.
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

// --- SendGrid Configuration (v2 Method) ---
const sendgridApiKey = defineString('SENDGRID_API_KEY');

const FROM_EMAIL = "jergrif73@gmail.com";
const PRIMARY_RECIPIENT = "jgriffith@southlandind.com";

// --- Helper Function to Send Emails ---
const sendEmail = async (recipients, subject, html) => {
  const key = sendgridApiKey.value();
  if (!key) {
    console.log("Skipping email send: SENDGRID_API_KEY is not set in environment.");
    return;
  }
  
  // Ensure recipients list is not empty and contains unique emails
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
        // Store both name and email for later use
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
    const watchers = (task.watchers || []).map(id => detailers.get(id));
    
    const recipientList = [PRIMARY_RECIPIENT];
    if (assignee && assignee.email) recipientList.push(assignee.email);
    watchers.forEach(w => {
        if (w && w.email) recipientList.push(w.email);
    });

    const subject = `New Task Created: ${task.taskName}`;
    const html = `<h2>A new task has been created.</h2><p><strong>Task Name:</strong> ${task.taskName}</p><p><strong>Project:</strong> ${projects.get(task.projectId) || 'N/A'}</p><p><strong>Status:</strong> ${task.status}</p><p><strong>Due Date:</strong> ${task.dueDate || "N/A"}</p><hr><p><strong>Assignee:</strong> ${assignee ? assignee.name : 'N/A'}</p><p><strong>Watchers:</strong> ${watchers.map(w => w.name).join(", ") || "None"}</p>`;
    
    return sendEmail(recipientList, subject, html);
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

    // --- Start Change Detection ---

    // 1. Task moved to a new lane
    if (before.laneId !== after.laneId) {
        changes.push(`Task was moved from <strong>${lanes.get(before.laneId) || 'an old lane'}</strong> to <strong>${lanes.get(after.laneId) || 'a new lane'}</strong>.`);
    }

    // 2. New comment on the main task
    if ((after.comments?.length || 0) > (before.comments?.length || 0)) {
        latestComment = after.comments[after.comments.length - 1];
        changes.push(`New comment added to the main task by <strong>${latestComment.author}</strong>.`);
    }
    
    // 3. Sub-task changes
    const beforeSubTasks = new Map((before.subTasks || []).map(st => [st.id, st]));
    (after.subTasks || []).forEach(afterST => {
        const beforeST = beforeSubTasks.get(afterST.id);
        if (!beforeST) {
            changes.push(`A new sub-task was added: "${afterST.name}".`);
        } else if (JSON.stringify(beforeST) !== JSON.stringify(afterST)) {
            changes.push(`Sub-task was modified: "${afterST.name}".`);
            if ((afterST.comments?.length || 0) > (beforeST.comments?.length || 0)) {
                latestComment = afterST.comments[afterST.comments.length - 1];
                changes.push(`New comment on sub-task "${afterST.name}" by <strong>${latestComment.author}</strong>.`);
            }
        }
    });
    
    // 4. New watcher added (for dedicated notification)
    const beforeWatcherIds = new Set(before.watchers || []);
    const afterWatcherIds = new Set(after.watchers || []);
    let newWatchersAdded = false;

    afterWatcherIds.forEach(watcherId => {
        if (!beforeWatcherIds.has(watcherId)) {
            newWatchersAdded = true;
            const newWatcher = detailers.get(watcherId);
            if (newWatcher && newWatcher.email) {
                const subject = `You've been added as a watcher on task: ${after.taskName}`;
                const html = `
                    <h2>You are now a watcher on a task.</h2>
                    <p>You will receive future notifications about this task.</p>
                    <hr>
                    <p><strong>Task Name:</strong> ${after.taskName}</p>
                    <p><strong>Project:</strong> ${projects.get(after.projectId) || 'N/A'}</p>
                    <p><strong>Assignee:</strong> ${detailers.get(after.detailerId)?.name || 'N/A'}</p>
                `;
                // Send a dedicated email to the new watcher
                sendEmail([newWatcher.email], subject, html);
            }
        }
    });

    if (newWatchersAdded) {
        changes.push('Watchers have been updated.');
    }

    // --- End Change Detection ---

    if (changes.length === 0) return null; // No relevant changes, so no general email

    // Send a general update email to the main list
    const assignee = detailers.get(after.detailerId);
    const watchers = (after.watchers || []).map(id => detailers.get(id));

    const recipientList = [PRIMARY_RECIPIENT];
    if (assignee && assignee.email) recipientList.push(assignee.email);
    watchers.forEach(w => {
        if (w && w.email) recipientList.push(w.email);
    });

    const subject = `Task Updated: ${after.taskName}`;
    let html = `<h2>A task has been updated.</h2><p><strong>Task Name:</strong> ${after.taskName}</p><p><strong>Project:</strong> ${projects.get(after.projectId) || 'N/A'}</p><hr><h3>Change Details:</h3><ul>${changes.map(c => `<li>${c}</li>`).join('')}</ul>`;
    if (latestComment) {
      html += `<hr><h3>Comment:</h3><p>"<em>${latestComment.text}</em>"</p>`;
    }
    html += `<hr><p><strong>Current Assignee:</strong> ${assignee ? assignee.name : 'N/A'}</p><p><strong>Current Watchers:</strong> ${watchers.map(w => w.name).join(", ") || "None"}</p>`;
    
    return sendEmail(recipientList, subject, html);
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
    const itemsDueTomorrow = new Map();

    allTasksSnapshot.forEach((doc) => {
      const task = doc.data();
      
      const checkDueDate = (item, type, parentTaskName = null) => {
          if (item.dueDate === tomorrowStr) {
              const assignee = detailers.get(item.detailerId);
              const watchers = (task.watchers || []).map(id => detailers.get(id));
              const recipientList = [PRIMARY_RECIPIENT];
              if(assignee && assignee.email) recipientList.push(assignee.email);
              watchers.forEach(w => {
                  if(w && w.email) recipientList.push(w.email);
              });

              const uniqueRecipients = [...new Set(recipientList)];
              const description = type === 'Task'
                ? `<li><strong>Task:</strong> ${item.taskName} (Project: ${projects.get(item.projectId) || 'N/A'}, Assignee: ${assignee ? assignee.name : 'N/A'})</li>`
                : `<li><strong>Sub-Task:</strong> ${item.name} <em>(from main task: ${parentTaskName})</em> (Assignee: ${assignee ? assignee.name : 'N/A'})</li>`;

              uniqueRecipients.forEach(email => {
                  if (!itemsDueTomorrow.has(email)) {
                      itemsDueTomorrow.set(email, []);
                  }
                  itemsDueTomorrow.get(email).push(description);
              });
          }
      };

      checkDueDate(task, 'Task');
      (task.subTasks || []).forEach(subTask => checkDueDate(subTask, 'Sub-Task', task.taskName));
    });

    if (itemsDueTomorrow.size === 0) return null;

    const promises = [];
    for (const [email, items] of itemsDueTomorrow.entries()) {
        const subject = `Daily Task Reminder for ${tomorrowStr}`;
        const html = `<h2>The following items are due tomorrow:</h2><ul>${items.join('')}</ul>`;
        promises.push(sendEmail([email], subject, html));
    }
    
    return Promise.all(promises);
});
