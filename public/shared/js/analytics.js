const PIXEL_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Lead",
  "Contact"
]);

let pixelReady = false;
let pixelQueue = [];

function loadPixelScript(pixelId) {
  if (!pixelId || document.getElementById("fb-pixel")) return;
  const script = document.createElement("script");
  script.async = true;
  script.id = "fb-pixel";
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq = window.fbq || function () {
    window.fbq.callMethod
      ? window.fbq.callMethod.apply(window.fbq, arguments)
      : window.fbq.queue.push(arguments);
  };
  window.fbq.queue = window.fbq.queue || [];
  window.fbq.loaded = true;
  window.fbq.version = "2.0";
  window.fbq("init", pixelId);
  pixelReady = true;
  flushPixelQueue();
}

function flushPixelQueue() {
  if (!pixelReady || !window.fbq) return;
  const queued = [...pixelQueue];
  pixelQueue = [];
  queued.forEach((entry) => {
    sendPixelEvent(entry.name, entry.payload);
  });
}

function sendPixelEvent(name, payload) {
  if (!window.fbq) return;
  if (PIXEL_EVENTS.has(name)) {
    window.fbq("track", name, payload || {});
  } else {
    window.fbq("trackCustom", name, payload || {});
  }
}

window.trackPixelEvent = function (name, payload) {
  if (!name) return;
  if (!pixelReady) {
    pixelQueue.push({ name, payload });
    return;
  }
  sendPixelEvent(name, payload);
};

async function initPixel() {
  try {
    const resp = await fetch("/api/portal-config");
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data?.pixelEnabled || !data?.pixelId) return;
    loadPixelScript(String(data.pixelId).trim());
    window.trackPixelEvent("PageView");
  } catch {
    // silent
  }
}

initPixel();
