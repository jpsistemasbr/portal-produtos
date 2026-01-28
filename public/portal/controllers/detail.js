const portalNameEl = document.querySelector("[data-portal-name]");
const portalBrandEl = document.querySelector("[data-portal-brand]");
const detailTitle = document.getElementById("detailTitle");
const detailSubtitle = document.getElementById("detailSubtitle");
const detailImage = document.getElementById("detailImage");
const detailDescription = document.getElementById("detailDescription");
const detailOldPrice = document.getElementById("detailOldPrice");
const detailNewPrice = document.getElementById("detailNewPrice");
const detailLinks = document.getElementById("detailLinks");
const detailHighlights = document.getElementById("detailHighlights");
const detailVideo = document.getElementById("detailVideo");
const detailVideoFrame = document.getElementById("detailVideoFrame");
const marketplaceNotice = document.getElementById("marketplaceNotice");
const marketplaceLinks = document.getElementById("marketplaceLinks");
const goPayment = document.getElementById("goPayment");
const goPaymentLinks = document.querySelectorAll(".go-payment");
const metaDescription = document.getElementById("metaDescription");
const canonicalUrl = document.getElementById("canonicalUrl");
const ogTitle = document.getElementById("ogTitle");
const ogDescription = document.getElementById("ogDescription");
const ogUrl = document.getElementById("ogUrl");
const ogSiteName = document.getElementById("ogSiteName");
const ogImage = document.getElementById("ogImage");
const twitterTitle = document.getElementById("twitterTitle");
const twitterDescription = document.getElementById("twitterDescription");
const twitterImage = document.getElementById("twitterImage");
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
  const { type, id } = getParams();
  const itemType = type || "site";
  const itemId = Number(id) || 0;
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

function formatPrice(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  let type = params.get("type");
  let id = params.get("id");
  if (!type || !id) {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "item" && parts.length >= 3) {
      type = parts[1] === "servico" ? "service" : "product";
      id = parts[2];
    }
  }
  return { type, id };
}

function getYoutubeId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

function getPlatformLabel(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "";
  }
}

function updateSeoTags({ title, description, imageUrl }) {
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
  if (ogImage && imageUrl) ogImage.setAttribute("content", imageUrl);
  if (twitterTitle) twitterTitle.setAttribute("content", safeTitle);
  if (twitterDescription) twitterDescription.setAttribute("content", safeDescription);
  if (twitterImage && imageUrl) twitterImage.setAttribute("content", imageUrl);
}

function updateProductSchema({ name, description, imageUrl, price, itemType }) {
  if (!seoSchema) return;
  const url = window.location.href;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: name || document.title,
    description: description || "",
    image: imageUrl ? [imageUrl] : undefined,
    brand: portalConfig?.portalName
      ? { "@type": "Brand", name: portalConfig.portalName }
      : undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "BRL",
      price: Number(price || 0),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition"
    }
  };
  seoSchema.textContent = JSON.stringify(schema);
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
      document.title = `${data.portalName} - Detalhes`;
    }
    if (portalBrandEl && data?.brandLabel) {
      portalBrandEl.textContent = data.brandLabel;
    }
    updateSeoTags({
      title: document.title,
      description: data?.heroSubtitle || metaDescription?.content
    });
    if (data?.showDetails === false) {
      window.location.href = "/";
    }
  } catch (err) {
    // silent
  }
}

async function loadItem() {
  const { type, id } = getParams();
  if (!type || !id) {
    detailTitle.textContent = "Item não encontrado";
    return;
  }
  const endpoint = type === "service" ? "/api/services/" : "/api/products/";
  const { data } = await axios.get(`${endpoint}${id}`);
  if (!data) {
    detailTitle.textContent = "Item não encontrado";
    return;
  }

  const hasPromo = data.promotion && data.promotion.promoPrice && data.promotion.active;
  const promoUntil = formatDate(data?.promotion?.endDate);
  detailTitle.textContent = data.name;
  detailSubtitle.textContent = hasPromo
    ? `Promoção ativa: ${data.promotion.title}${promoUntil ? ` • válida até ${promoUntil}` : ""}`
    : "Detalhes completos do item";
  detailImage.src = data.imageUrl;
  detailImage.alt = data.name;
  detailDescription.textContent = data.description;
  detailOldPrice.textContent = hasPromo ? formatPrice(data.regularPrice) : "";
  detailNewPrice.textContent = formatPrice(hasPromo ? data.promotion.promoPrice : data.regularPrice);
  const currentPrice = Number(hasPromo ? data.promotion.promoPrice : data.regularPrice);
  document.title = portalConfig?.portalName
    ? `${data.name} - ${portalConfig.portalName}`
    : data.name;
  const ogImageUrl = `${window.location.origin}/og/${type || "product"}/${id}.png?v=${data.updatedAt || Date.now()}`;
  updateSeoTags({
    title: document.title,
    description: data.description || metaDescription?.content,
    imageUrl: ogImageUrl
  });
  updateProductSchema({
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    price: currentPrice,
    itemType: type
  });
  trackPixel("ViewContent", {
    content_type: type,
    content_ids: [`${type}:${id}`],
    value: currentPrice,
    currency: "BRL"
  });
  sendEvent(type, Number(id), "view_item", { price: currentPrice });

  if (marketplaceNotice && marketplaceLinks) {
    if (data.fulfillmentType === "marketplace") {
      marketplaceNotice.style.display = "block";
      const host = getPlatformLabel(data.externalUrl);
      marketplaceLinks.innerHTML = data.externalUrl
        ? `<a class="btn ghost" href="${data.externalUrl}" target="_blank">Ver em ${host || "plataforma"}</a>`
        : "";
    } else {
      marketplaceNotice.style.display = "none";
      marketplaceLinks.innerHTML = "";
    }
  }

  const links = [];
  if (data.linkDemo) {
    links.push(`<a class="btn ghost" href="${data.linkDemo}" target="_blank">Demonstracao</a>`);
  }
  detailLinks.innerHTML = links.join("");

  if (detailVideo && detailVideoFrame) {
    const youtubeId = getYoutubeId(data.linkVideo);
    if (data.linkVideo) {
      detailVideoFrame.src = youtubeId
        ? `https://www.youtube.com/embed/${youtubeId}`
        : data.linkVideo;
      detailVideo.style.display = "block";
    } else {
      detailVideoFrame.src = "";
      detailVideo.style.display = "none";
    }
  }

  const details =
    (data.detailsList || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  const fallbackDetails = [
    "Acesso imediato após confirmação",
    "Conteúdo atualizado e validado",
    "Suporte humano para tirar dúvidas",
    "Checkout seguro com PIX e cartão"
  ];

  const list = details.length ? details : fallbackDetails;
  detailHighlights.innerHTML = list.map((item) => `<li>${item}</li>`).join("");

  if (goPayment) {
    goPayment.href =
      type === "service" ? `/pagar/servico/${id}` : `/pagar/produto/${id}`;
    goPayment.addEventListener("click", () => {
      trackPixel("InitiateCheckout", {
        content_type: type,
        content_ids: [`${type}:${id}`],
        value: currentPrice,
        currency: "BRL"
      });
      sendEvent(type, Number(id), "pay_start_click", { source: "detail" });
    });
  }
  goPaymentLinks.forEach((link) => {
    link.href = type === "service" ? `/pagar/servico/${id}` : `/pagar/produto/${id}`;
    link.addEventListener("click", () => {
      trackPixel("InitiateCheckout", {
        content_type: type,
        content_ids: [`${type}:${id}`],
        value: currentPrice,
        currency: "BRL"
      });
      sendEvent(type, Number(id), "pay_start_click", { source: "detail" });
    });
  });
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab-btn").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    btn.classList.add("active");
    document.querySelector(`.tab-panel[data-panel='${target}']`)?.classList.add("active");
  });
});

loadPortalConfig();
loadItem();
initTimeOnPage();
