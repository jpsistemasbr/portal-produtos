import axios from "axios";

export async function notifyWebhook(event, payload) {
  const url = process.env.EVENT_WEBHOOK_URL;
  if (!url) return;
  try {
    await axios.post(url, { event, payload, sentAt: new Date().toISOString() });
  } catch (err) {
    // silent to avoid breaking CRUD
  }
}
