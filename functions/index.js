const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const {defineSecret} = require("firebase-functions/params");

// Define the SendGrid API key secret
const sendgridApiKey = defineSecret("SENDGRID_KEY");

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// IMPORTANT: Change this to your verified SendGrid sender email
const FROM_EMAIL = "jergrif73@gmail.com";

/**
 * A helper function to get the email addresses for assignees and watchers.
 * @param {object} taskData The data from the task document.
 * @return {Promise<string[]>} A promise that resolves to an array of emails.
 */
const getRecipientEmails = async (taskData) => {
  const recipientIds = new Set();

  if (taskData.detailerId) {
    recipientIds.add(taskData.detailerId);
  }

  if (taskData.watchers && taskData.watchers.length > 0) {
    taskData.watchers.forEach((id) => recipientIds.add(id));
  }

  if (recipientIds.size === 0) {
    return [];
  }

  const detailersRef = db.collection("artifacts/default-prod-tracker-app/public/data/detailers");
  const promises = Array.from(recipientIds).map((id) => detailersRef.doc(id).get());
  const docSnapshots = await Promise.all(promises);

  const emails = [];
  docSnapshots.forEach((doc) => {
    if (doc.exists) {
      const detailer = doc.data();
      if (detailer.email) {
        emails.push(detailer.email);
      }
    }
  });

  return emails;
};

/**
 * Cloud Function that triggers when a task is updated.
 */
exports.onTaskUpdate = onDocumentUpdated({
    document: "artifacts/default-prod-tracker-app/public/data/tasks/{taskId}",
    secrets: [sendgridApiKey],
}, async (event) => {
    sgMail.setApiKey(sendgridApiKey.value());
    const taskDataAfter = event.data.after.data();
    const taskDataBefore = event.data.before.data();
    const taskName = taskDataAfter.taskName || "Untitled Task";

    if (JSON.stringify(taskDataAfter) === JSON.stringify(taskDataBefore)) {
        logger.log("No actual data change detected. Skipping email.");
        return null;
    }

    const recipients = await getRecipientEmails(taskDataAfter);

    if (recipients.length === 0) {
        logger.log("No recipients found for this task.");
        return null;
    }

    const msg = {
        to: recipients,
        from: FROM_EMAIL,
        subject: `Task Updated: ${taskName}`,
        html: `
            <p>Hello,</p>
            <p>An update was made to the task: <strong>${taskName}</strong>.</p>
            <p>Please check the application for details.</p>
        `,
    };

    try {
        await sgMail.send(msg);
        logger.log("Update email sent successfully to:", recipients);
    } catch (error) {
        logger.error("Error sending email:", error);
        if (error.response) {
            logger.error(error.response.body);
        }
    }

    return null;
});

/**
 * A scheduled Cloud Function that runs daily to send due date reminders.
 */
exports.dailyReminder = onSchedule({
    schedule: "every 24 hours",
    secrets: [sendgridApiKey],
}, async (event) => {
    sgMail.setApiKey(sendgridApiKey.value());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const tasksRef = db.collection("artifacts/default-prod-tracker-app/public/data/tasks");
    const snapshot = await tasksRef.where("dueDate", "==", tomorrowStr).get();

    if (snapshot.empty) {
        logger.log("No tasks are due tomorrow.");
        return null;
    }

    const promises = snapshot.docs.map(async (doc) => {
        const task = doc.data();
        const recipients = await getRecipientEmails(task);

        if (recipients.length > 0) {
            const msg = {
                to: recipients,
                from: FROM_EMAIL,
                subject: `Reminder: Task "${task.taskName}" is due tomorrow`,
                html: `
                    <p>Hello,</p>
                    <p>This is a reminder that the task <strong>${task.name}</strong> is due tomorrow, ${tomorrowStr}.</p>
                `,
            };
            return sgMail.send(msg);
        }
        return Promise.resolve();
    });

    await Promise.all(promises);
    logger.log(`Sent ${promises.length} reminder emails.`);
    return null;
});
