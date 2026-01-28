const portalNameEl = document.querySelector("[data-portal-name]");
const portalBrandEl = document.querySelector("[data-portal-brand]");
const successTitle = document.getElementById("successTitle");
const successMessage = document.getElementById("successMessage");
const successInfo = document.getElementById("successInfo");
const supportInfo = document.getElementById("supportInfo");
const metaDescription = document.getElementById("metaDescription");
const canonicalUrl = document.getElementById("canonicalUrl");
const ogTitle = document.getElementById("ogTitle");
const ogDescription = document.getElementById("ogDescription");
const ogUrl = document.getElementById("ogUrl");
const ogSiteName = document.getElementById("ogSiteName");
const twitterTitle = document.getElementById("twitterTitle");
const twitterDescription = document.getElementById("twitterDescription");
const seoSchema = document.getElementById("seoSchema");
let portalConfig = null;

function trackPixel(name, payload) {
  if (window.trackPixelEvent) {
    window.trackPixelEvent(name, payload);
  }
}

function getDeviceType() {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "pc";
}

function getClientId() {
  const key = "portalClientId";
  let value = localStorage.getItem(key);
  if (!value) {
    if (window.crypto && crypto.randomUUID) {
      value = crypto.randomUUID();
    } else {
      value = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    localStorage.setItem(key, value);
  }
  return value;
}

function getSessionId() {
  const key = "portalSessionId";
  const lastKey = "portalSessionLast";
  const now = Date.now();
  const timeoutMs = 30 * 60 * 1000;
  const last = Number(sessionStorage.getItem(lastKey) || 0);
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId || now - last > timeoutMs) {
    if (window.crypto && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      sessionId = `${now}-${Math.random().toString(16).slice(2)}`;
    }
  }
  sessionStorage.setItem(key, sessionId);
  sessionStorage.setItem(lastKey, String(now));
  return sessionId;
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const current = {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term")
  };
  const stored = JSON.parse(localStorage.getItem("portalUtm") || "{}");
  const hasCurrent = Object.values(current).some((value) => value);
  if (hasCurrent) {
    localStorage.setItem("portalUtm", JSON.stringify(current));
    return current;
  }
  return stored;
}

function sendEventBeacon(body) {
  const data = JSON.stringify(body);
  if (navigator.sendBeacon) {
    const blob = new Blob([data], { type: "application/json" });
    navigator.sendBeacon("/api/events", blob);
    return;
  }
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: data,
    keepalive: true
  }).catch(() => {});
}
function sendEvent(itemType, itemId, eventName, payload) {
  if (!itemType || itemId === undefined || itemId === null) return;
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemType,
      itemId,
      eventName,
      device: getDeviceType(),
      clientId: getClientId(),
      payload: {
        ...payload,
        sessionId: getSessionId(),
        pagePath: window.location.pathname,
        referrer: document.referrer || null,
        ...getUtmParams()
      }
    })
  }).catch(() => {});
}

function initTimeOnPage() {
  const orderId = getOrderId();
  const itemType = "order";
  const itemId = orderId ? Number(orderId) || 0 : 0;
  const startedAt = Date.now();
  let sent = false;
  const send = () => {
    if (sent) return;
    sent = true;
    const durationMs = Date.now() - startedAt;
    sendEventBeacon({
      itemType,
      itemId,
      eventName: "time_on_page",
      device: getDeviceType(),
      clientId: getClientId(),
      pagePath: window.location.pathname,
      payload: {
        sessionId: getSessionId(),
        referrer: document.referrer || null,
        durationMs,
        ...getUtmParams()
      }
    });
  };
  window.addEventListener("beforeunload", send);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send();
  });
}

function getOrderId() {
  const params = new URLSearchParams(window.location.search);
  let orderId = params.get("orderId");
  if (!orderId) {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "status-pagamento" && parts[1] === "pedido" && parts[2]) {
      orderId = parts[2];
    }
  }
  return orderId;
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["approved", "paid"].includes(value)) return "approved";
  if (["pending", "in_process"].includes(value)) return "pending";
  if (["failed", "rejected", "cancelled", "canceled"].includes(value)) return "failed";
  return value || "pending";
}

function parseItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function updateSeoTags({ title, description }) {
  const safeTitle = title || document.title;
  const safeDescription = description || metaDescription?.content || "";
  const url = window.location.href;
  if (metaDescription) metaDescription.content = safeDescription;
  if (canonicalUrl) canonicalUrl.setAttribute("href", url);
  if (ogTitle) ogTitle.setAttribute("content", safeTitle);
  if (ogDescription) ogDescription.setAttribute("content", safeDescription);
  if (ogUrl) ogUrl.setAttribute("content", url);
  if (ogSiteName && portalConfig?.portalName) {
    ogSiteName.setAttribute("content", portalConfig.portalName);
  }
  if (twitterTitle) twitterTitle.setAttribute("content", safeTitle);
  if (twitterDescription) twitterDescription.setAttribute("content", safeDescription);
  if (seoSchema) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: safeTitle,
      url
    };
    seoSchema.textContent = JSON.stringify(schema);
  }
}

async function loadPortalConfig() {
  try {
    const { data } = await axios.get("/api/portal-config");
    portalConfig = data || null;
    if (data?.pageBgColor) {
      document.documentElement.style.setProperty("--bg", data.pageBgColor);
    }
    if (data?.menuBgColor) {
      document.documentElement.style.setProperty("--menu-bg", data.menuBgColor);
    }
    if (data?.textColor) {
      document.documentElement.style.setProperty("--text", data.textColor);
    }
    if (data?.portalName && portalNameEl) {
      portalNameEl.textContent = data.portalName;
      document.title = `${data.portalName} - Status do pagamento`;
    }
    if (portalBrandEl && data?.brandLabel) {
      portalBrandEl.textContent = data.brandLabel;
    }
    updateSeoTags({
      title: document.title,
      description: data?.successMessage || metaDescription?.content
    });
    if (data?.showSuccess === false) {
      window.location.href = "/";
      return;
    }
    if (successTitle) successTitle.textContent = data?.successTitle || "Status do pagamento";
    if (successMessage) {
      successMessage.textContent = data?.successMessage || "Acompanhe abaixo o status da sua compra.";
    }
    const supportParts = [];
    if (data?.supportEmail) supportParts.push(`Email: ${data.supportEmail}`);
    if (data?.supportWhatsApp) supportParts.push(`WhatsApp: ${data.supportWhatsApp}`);
    if (supportInfo) {
      supportInfo.textContent = supportParts.length
        ? supportParts.join(" | ")
        : "Nossa equipe esta pronta para ajudar.";
    }
  } catch {
    // silent
  }
}

async function fetchOrder(orderId) {
  if (!orderId) return null;
  try {
    const resp = await axios.get(`/api/orders/public/${orderId}`);
    return resp.data || null;
  } catch {
    return null;
  }
}

async function loadItem() {
  const orderId = getOrderId();
  if (!successInfo) return;
  if (!orderId) {
    successInfo.textContent = "Pedido nao encontrado.";
    return;
  }

  let orderInfo = await fetchOrder(orderId);
  if (!orderInfo) {
    successInfo.textContent = "Pedido ainda nao encontrado. Aguarde alguns instantes.";
    let tries = 0;
    const poll = setInterval(async () => {
      tries += 1;
      orderInfo = await fetchOrder(orderId);
      if (orderInfo || tries >= 6) {
        clearInterval(poll);
        if (orderInfo) {
          loadItem();
          return;
        }
        window.location.href = "/";
      }
    }, 4000);
    return;
  }

  const normalized = normalizeStatus(orderInfo.status);
  let statusLabel = "Pagamento em analise.";
  if (normalized === "approved") statusLabel = "Pagamento aprovado.";
  if (normalized === "failed") statusLabel = "Pagamento nao aprovado.";

  if (successTitle) {
    successTitle.textContent = normalized === "approved" ? "Obrigado pela compra" : "Status do pagamento";
  }
  if (successMessage) {
    successMessage.textContent =
      normalized === "approved"
        ? "Seu pagamento foi aprovado e seu pedido esta confirmado."
        : "Acompanhe abaixo o status da sua compra.";
  }

  const methodLabel =
    orderInfo.method === "pix" ? "PIX" : orderInfo.method === "card" ? "Cartao" : "Nao informado";
  const typeLabel =
    orderInfo.itemType === "service"
      ? "Servico"
      : orderInfo.itemType === "product"
        ? "Produto"
        : "Pedido";
  const createdAtLabel = formatDateTime(orderInfo.createdAt);
  const items = parseItems(orderInfo.items);
  const itemTitle = items.length > 1 ? "Itens" : "Item";
  const itemsHtml = items.length
    ? items
        .map((item) => {
          const qty = Number(item.quantity || 1);
          const subtotal = item.subtotal || Number(item.unitPrice || 0) * qty;
          return `${item.name || "-"} x${qty} - ${formatPrice(subtotal)}`;
        })
        .join("<br>")
    : orderInfo.itemName || "-";

  if (normalized === "approved") {
    const contentIds = items.length
      ? items.map((item) => `${item.itemType}:${item.itemId}`)
      : [`${orderInfo.itemType}:${orderInfo.itemId}`];
    trackPixel("Purchase", {
      content_type: items.length ? "bundle" : orderInfo.itemType,
      content_ids: contentIds,
      value: Number(orderInfo.amount || 0),
      currency: "BRL"
    });
    if (items.length) {
      sendEvent("bundle", 0, "purchase", { value: Number(orderInfo.amount || 0) });
    } else {
      sendEvent(orderInfo.itemType, Number(orderInfo.itemId), "purchase", {
        value: Number(orderInfo.amount || 0)
      });
    }
  }

  let addressHtml = "";
  if (orderInfo.shippingAddress) {
    try {
      const addr = typeof orderInfo.shippingAddress === "string"
        ? JSON.parse(orderInfo.shippingAddress)
        : orderInfo.shippingAddress;
      if (addr && (addr.street || addr.city)) {
        addressHtml = `
          <p><strong>Endereco:</strong> <span>
            ${[addr.street, addr.number].filter(Boolean).join(", ")}<br>
            ${[addr.district, addr.city].filter(Boolean).join(" - ")}${addr.state ? `/${addr.state}` : ""}<br>
            ${addr.postalCode || ""} ${addr.complement ? `(${addr.complement})` : ""}
          </span></p>
        `;
      }
    } catch {
      addressHtml = "";
    }
  }

  successInfo.innerHTML = `
    <p><strong>Tipo:</strong> <span>${typeLabel}</span></p>
    <p><strong>Pedido:</strong> <span>#${orderInfo.id || "-"}</span></p>
    <p><strong>${itemTitle}:</strong> <span class="status-items">${itemsHtml}</span></p>
    <p><strong>Valor:</strong> <span>${formatPrice(orderInfo.amount)}</span></p>
    <p><strong>Metodo:</strong> <span>${methodLabel}</span></p>
    <p><strong>Data e hora:</strong> <span>${createdAtLabel}</span></p>
    <p><strong>Email:</strong> <span>${orderInfo.customerEmail || "-"}</span></p>
    <p><strong>Telefone:</strong> <span>${orderInfo.customerPhone || "-"}</span></p>
    ${addressHtml}
    <p class="status-row"><strong>Status:</strong> <span>${statusLabel}</span></p>
  `;
}

loadPortalConfig();
loadItem();
initTimeOnPage();
