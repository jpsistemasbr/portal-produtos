const productsGrid = document.getElementById("productsGrid");
const servicesGrid = document.getElementById("servicesGrid");
const promoBannerGrid = document.getElementById("promoBannerGrid");
const leadForm = document.getElementById("leadForm");
const leadStatus = document.getElementById("leadStatus");
const portalNameEl = document.querySelector("[data-portal-name]");
const portalBrandEl = document.querySelector("[data-portal-brand]");
const heroTaglineEl = document.querySelector("[data-hero-tagline]");
const heroTitleEl = document.querySelector("[data-hero-title]");
const heroSubtitleEl = document.querySelector("[data-hero-subtitle]");
const promoBandTitleEl = document.querySelector("[data-promo-band-title]");
const promoBandSubtitleEl = document.querySelector("[data-promo-band-subtitle]");
const promoBandCtaEl = document.querySelector("[data-promo-band-cta]");
const promoSectionTitleEl = document.querySelector("[data-promo-section-title]");
const supportLinksEl = document.getElementById("supportLinks");
const footerPortalNameEl = document.getElementById("footerPortalName");
const footerYearEl = document.getElementById("footerYear");
const metaDescription = document.getElementById("metaDescription");
const canonicalUrl = document.getElementById("canonicalUrl");
const ogTitle = document.getElementById("ogTitle");
const ogDescription = document.getElementById("ogDescription");
const ogUrl = document.getElementById("ogUrl");
const ogSiteName = document.getElementById("ogSiteName");
const twitterTitle = document.getElementById("twitterTitle");
const twitterDescription = document.getElementById("twitterDescription");
const seoSchema = document.getElementById("seoSchema");
const basketToggle = document.getElementById("basketToggle");
const basketCount = document.getElementById("basketCount");
const basketDrawer = document.getElementById("basketDrawer");
const basketOverlay = document.getElementById("basketOverlay");
const basketList = document.getElementById("basketList");
const basketTotal = document.getElementById("basketTotal");
const basketCheckout = document.getElementById("basketCheckout");
const basketClear = document.getElementById("basketClear");
const basketEmpty = document.getElementById("basketEmpty");
const basketClose = document.getElementById("basketClose");
const basketKey = "basketItems";
let catalogCache = { products: [], services: [] };
let hasActivePromotions = false;

function trackPixel(name, payload) {
  if (window.trackPixelEvent) {
    window.trackPixelEvent(name, payload);
  }
}
let portalConfig = null;
const sectionMap = {
  products: document.querySelector("[data-section='products']"),
  services: document.querySelector("[data-section='services']"),
  promotions: document.querySelectorAll("[data-section='promotions']"),
  payments: document.querySelector("[data-section='payments']"),
  contact: document.querySelector("[data-section='contact']")
};
const navMap = {
  products: document.querySelector("[data-nav='products']"),
  services: document.querySelector("[data-nav='services']"),
  promotions: document.querySelector("[data-nav='promotions']"),
  contact: document.querySelector("[data-nav='contact']")
};

function updateSeoTags({ title, description }) {
  const safeTitle = title || document.title;
  const safeDescription = description || metaDescription?.content || "";
  const url = window.location.href;
  if (metaDescription) metaDescription.content = safeDescription;
  if (canonicalUrl) canonicalUrl.setAttribute("href", url);
  if (ogTitle) ogTitle.setAttribute("content", safeTitle);
  if (ogDescription) ogDescription.setAttribute("content", safeDescription);
  if (ogUrl) ogUrl.setAttribute("content", url);
  if (ogSiteName && safeTitle) ogSiteName.setAttribute("content", safeTitle);
  if (twitterTitle) twitterTitle.setAttribute("content", safeTitle);
  if (twitterDescription) twitterDescription.setAttribute("content", safeDescription);
  if (seoSchema) {
    const base = window.location.origin;
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: safeTitle,
          url: base
        },
        {
          "@type": "WebSite",
          name: safeTitle,
          url: base
        }
      ]
    };
    seoSchema.textContent = JSON.stringify(schema);
  }
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

function getDeviceType() {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "pc";
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

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function buildSupportLinks(email, whatsapp) {
  const links = [];
  if (email) {
    links.push(`
        <a class="support-link" href="mailto:${email}" data-action="support-email">
        <span class="support-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18v12H3z" stroke="currentColor" stroke-width="1.5" />
            <path d="m3 6 9 7 9-7" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </span>
        <span>${email}</span>
      </a>
    `);
  }
  if (whatsapp) {
    const digits = String(whatsapp).replace(/\D/g, "");
    const waLink = digits ? `https://wa.me/55${digits}` : "#";
    links.push(`
        <a class="support-link" href="${waLink}" target="_blank" rel="noopener noreferrer" data-action="support-whatsapp">
        <span class="support-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M6.5 18.5 5 22l3.7-1.4A9 9 0 1 0 6.5 18.5Z" stroke="currentColor" stroke-width="1.5" />
            <path d="M9.5 9.5c.5 1 1.7 2.6 3 3 1 .5 1.5.5 2 .2.4-.3 1-.8 1.3-1.1" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </span>
        <span>${whatsapp}</span>
      </a>
    `);
  }
  return links.join("");
}

function attachPhoneMask(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    input.value = formatPhone(input.value);
  });
  input.value = formatPhone(input.value);
}

async function requestJson(url) {
  if (window.axios) {
    const res = await axios.get(url);
    return res.data;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`request_failed:${res.status}`);
  }
  return res.json();
}

function buildCard(item, typeLabel) {
  const hasPromo = item.promotion && item.promotion.promoPrice && item.promotion.active;
  const label = typeLabel === "product" ? "Produto" : "Serviço";
  const pill = hasPromo ? item.promotion.title : label;
  const link =
    typeLabel === "product"
      ? `/item/produto/${item.id}`
      : `/item/servico/${item.id}`;
  const payLink =
    typeLabel === "product"
      ? `/pagar/produto/${item.id}`
      : `/pagar/servico/${item.id}`;
  const actions = `
    <div class="hero-actions">
      <a class="btn ghost" href="${link}" data-action="saiba">Saiba mais</a>
      <button class="btn ghost" type="button" data-action="add-basket">Adicionar à cesta</button>
      <a class="btn primary" href="${payLink}" data-action="comprar">Comprar</a>
    </div>
  `;

  return `
    <article class="card catalog-card" data-id="${item.id}" data-type="${typeLabel}">
      <div class="card-media">
        <img src="${item.imageUrl}" alt="${item.name}" />
        <span class="pill">${pill}</span>
      </div>
      <div class="card-body">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="price-row">
          ${hasPromo ? `<span class="price-old">${formatPrice(item.regularPrice)}</span>` : ""}
          <span class="price-new">${formatPrice(hasPromo ? item.promotion.promoPrice : item.regularPrice)}</span>
        </div>
        ${actions}
      </div>
    </article>
  `;
}

function buildPromoBanner(item, typeLabel) {
  if (!item.promotion || !item.promotion.bannerUrl || !item.promotion.active) return "";
  const promo = item.promotion;
  const detailLink =
    typeLabel === "product"
      ? `/item/produto/${item.id}`
      : `/item/servico/${item.id}`;
  const primaryLink =
    promo.linkTarget === "demo" && promo.linkDemo
      ? promo.linkDemo
      : detailLink;
  const demoLink = promo.linkDemo
    ? `<a class="btn ghost" href="${promo.linkDemo}" target="_blank" data-action="promo-demo">Demostração</a>`
    : "";
  const promoUntil = formatDate(promo.endDate);
  const promoUntilLine = promoUntil
    ? `<p class="promo-until">Válida até ${promoUntil}</p>`
    : "";

  return `
    <article class="promo-banner card" data-id="${promo.id}" data-type="promotion">
      <div class="card-media">
        <img src="${promo.bannerUrl}" alt="${promo.title}" />
        <span class="pill">${promo.title}</span>
      </div>
      <div class="card-body">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="price-row">
          <span class="price-old">${formatPrice(item.regularPrice)}</span>
          <span class="price-new">${formatPrice(promo.promoPrice)}</span>
        </div>
        ${promoUntilLine}
        <div class="hero-actions">
          <a class="btn primary" href="${primaryLink}" data-action="promo-detail">Saiba mais</a>
          ${demoLink}
        </div>
      </div>
    </article>
  `;
}

function initPromoCarousel() {
  const track = document.getElementById("promoBannerGrid");
  if (!track) return;
  const slides = Array.from(track.children);
  if (!slides.length) return;

  let index = 0;
  let timerId = null;
  let startX = 0;
  let currentOffset = 0;
  let isDragging = false;

  const getSlideWidth = () => track.clientWidth + 16;

  const updateTransform = (offset = 0) => {
    const width = getSlideWidth();
    const base = -index * width;
    track.style.transform = `translateX(${base + offset}px)`;
  };

  const next = () => {
    index = (index + 1) % slides.length;
    updateTransform();
  };

  const prev = () => {
    index = (index - 1 + slides.length) % slides.length;
    updateTransform();
  };

  const startAuto = () => {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(next, 10000);
  };

  const stopAuto = () => {
    if (timerId) clearInterval(timerId);
    timerId = null;
  };

  updateTransform();
  startAuto();

  track.addEventListener("pointerdown", (event) => {
    if (event.target.closest("a, button, input, textarea, select")) return;
    isDragging = true;
    startX = event.clientX;
    currentOffset = 0;
    track.style.transition = "none";
    track.setPointerCapture(event.pointerId);
    stopAuto();
  });

  track.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    currentOffset = event.clientX - startX;
    updateTransform(currentOffset);
  });

  track.addEventListener("pointerup", (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    track.style.transition = "";
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    } else {
      updateTransform();
    }
    isDragging = false;
    startAuto();
  });

  track.addEventListener("pointerleave", () => {
    if (!isDragging) return;
    track.style.transition = "";
    updateTransform();
    isDragging = false;
    startAuto();
  });

  window.addEventListener("resize", () => updateTransform());
}

function updatePromotionsVisibility() {
  const allowed = portalConfig?.showPromotions !== false;
  const shouldShow = allowed && hasActivePromotions;
  sectionMap.promotions?.forEach((el) => {
    el.style.display = shouldShow ? "" : "none";
  });
  if (navMap.promotions) navMap.promotions.style.display = shouldShow ? "" : "none";
}


function getBasketItems() {
  try {
    const stored = JSON.parse(localStorage.getItem(basketKey) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .map((entry) => ({
        itemType: entry.itemType,
        itemId: entry.itemId,
        quantity: Math.max(1, Number(entry.quantity || 1))
      }))
      .filter((entry) => entry.itemType && entry.itemId);
  } catch {
    return [];
  }
}

function setBasketItems(items) {
  localStorage.setItem(basketKey, JSON.stringify(items));
  renderBasketDrawer();
}

function findItemData(entry) {
  const list = entry.itemType === "service" ? catalogCache.services : catalogCache.products;
  return (list || []).find((item) => String(item.id) === String(entry.itemId));
}

function renderBasketDrawer() {
  const items = getBasketItems();
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  if (basketCount) basketCount.textContent = String(itemCount);
  if (!basketList || !basketTotal || !basketCheckout || !basketEmpty) return;
  basketList.innerHTML = "";
  let total = 0;
  if (!items.length) {
    basketEmpty.style.display = "block";
    basketCheckout.disabled = true;
    basketTotal.textContent = formatPrice(0);
    return;
  }
  basketEmpty.style.display = "none";
  items.forEach((entry) => {
    const data = findItemData(entry);
    if (!data) return;
    const hasPromo = data.promotion && data.promotion.promoPrice && data.promotion.active;
    const price = Number(hasPromo ? data.promotion.promoPrice : data.regularPrice);
    const qty = Number(entry.quantity || 1);
    const subtotal = price * qty;
    total += subtotal;
    const row = document.createElement("div");
    row.className = "basket-item";
    row.innerHTML = `
      <div class="basket-item-header">${data.name}</div>
      <img src="${data.imageUrl}" alt="${data.name}" />
      <div class="basket-info">
        <p>${formatPrice(price)} <span class="basket-multiply">x${qty}</span></p>
        <strong class="basket-subtotal">${formatPrice(subtotal)}</strong>
      </div>
      <div class="basket-actions">
        <button class="btn ghost" type="button" data-action="basket-dec" data-id="${data.id}" data-type="${entry.itemType}">-</button>
        <span class="basket-qty">${qty}</span>
        <button class="btn ghost" type="button" data-action="basket-inc" data-id="${data.id}" data-type="${entry.itemType}">+</button>
        <button class="btn ghost" type="button" data-action="remove-basket" data-id="${data.id}" data-type="${entry.itemType}">Remover</button>
      </div>
    `;
    basketList.appendChild(row);
  });
  basketTotal.textContent = formatPrice(total);
  basketCheckout.disabled = false;
}

function toggleBasket(open) {
  if (!basketDrawer || !basketOverlay) return;
  const shouldOpen = open ?? !basketDrawer.classList.contains("open");
  basketDrawer.classList.toggle("open", shouldOpen);
  basketOverlay.classList.toggle("open", shouldOpen);
}

async function loadCatalog() {
  try {
    const [products, services] = await Promise.all([
      requestJson("/api/products"),
      requestJson("/api/services")
    ]);

    catalogCache = { products: products || [], services: services || [] };

    if (productsGrid) {
      productsGrid.innerHTML = (products || []).map((item) => buildCard(item, "product")).join("");
    }
    if (servicesGrid) {
      servicesGrid.innerHTML = (services || []).map((item) => buildCard(item, "service")).join("");
    }

    const banners = [
      ...(products || []).map((item) => buildPromoBanner(item, "product")),
      ...(services || []).map((item) => buildPromoBanner(item, "service"))
    ].filter(Boolean);
    hasActivePromotions = banners.length > 0;
    if (promoBannerGrid) {
      promoBannerGrid.innerHTML = banners.length ? banners.join("") : "";
    }
    updatePromotionsVisibility();
    initPromoCarousel();
    renderBasketDrawer();
  } catch (err) {
    if (productsGrid) productsGrid.innerHTML = "<p>Erro ao carregar produtos.</p>";
    if (servicesGrid) servicesGrid.innerHTML = "<p>Erro ao carregar servi?os.</p>";
    if (promoBannerGrid) promoBannerGrid.innerHTML = "";
    hasActivePromotions = false;
    updatePromotionsVisibility();
  }
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
  const startedAt = Date.now();
  let sent = false;
  const send = () => {
    if (sent) return;
    sent = true;
    const durationMs = Date.now() - startedAt;
    sendEventBeacon({
      itemType: "site",
      itemId: 0,
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

async function loadPortalConfig() {
  try {
    const data = await requestJson("/api/portal-config");
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
      document.title = data.portalName;
    }
    if (portalBrandEl && data?.brandLabel) portalBrandEl.textContent = data.brandLabel;
    if (footerPortalNameEl && data?.portalName) footerPortalNameEl.textContent = data.portalName;
    if (footerYearEl) footerYearEl.textContent = String(new Date().getFullYear());
    if (heroTaglineEl && data?.heroTagline) heroTaglineEl.textContent = data.heroTagline;
    if (heroTitleEl && data?.heroTitle) heroTitleEl.textContent = data.heroTitle;
    if (heroSubtitleEl && data?.heroSubtitle) heroSubtitleEl.textContent = data.heroSubtitle;
    if (promoBandTitleEl && data?.promoBandTitle) promoBandTitleEl.textContent = data.promoBandTitle;
    if (promoBandSubtitleEl && data?.promoBandSubtitle) promoBandSubtitleEl.textContent = data.promoBandSubtitle;
    if (promoBandCtaEl && data?.promoBandCtaLabel) promoBandCtaEl.textContent = data.promoBandCtaLabel;
    if (promoSectionTitleEl && data?.promoSectionTitle) promoSectionTitleEl.textContent = data.promoSectionTitle;
    updateSeoTags({
      title: data?.portalName || document.title,
      description: data?.heroSubtitle || metaDescription?.content
    });
    if (supportLinksEl) {
      const supportHtml = buildSupportLinks(data?.supportEmail, data?.supportWhatsApp);
      supportLinksEl.innerHTML = supportHtml;
      supportLinksEl.style.display = supportHtml ? "flex" : "none";
    }
    if (sectionMap.products) sectionMap.products.style.display = data?.showProducts ? "" : "none";
    if (sectionMap.services) sectionMap.services.style.display = data?.showServices ? "" : "none";
    updatePromotionsVisibility();
    if (sectionMap.payments) sectionMap.payments.style.display = data?.showPayments ? "" : "none";
    if (sectionMap.contact) sectionMap.contact.style.display = data?.showContact ? "" : "none";
    if (navMap.products) navMap.products.style.display = data?.showProducts ? "" : "none";
    if (navMap.services) navMap.services.style.display = data?.showServices ? "" : "none";
    updatePromotionsVisibility();
if (navMap.contact) navMap.contact.style.display = data?.showContact ? "" : "none";
  } catch (err) {
    // silent
  }
}

initTimeOnPage();

document.addEventListener("click", (event) => {
  const card = event.target.closest(".card[data-id]");
  if (!card) return;
  const itemType = card.getAttribute("data-type");
  const itemId = Number(card.getAttribute("data-id"));
  const action = event.target.getAttribute("data-action");
  const detailUrl =
    itemType === "service"
      ? `/item/servico/${itemId}`
      : `/item/produto/${itemId}`;
  if (action === "saiba") {
    event.preventDefault();
    sendEvent(itemType, itemId, "saiba_mais_click", { source: "card" });
    window.location.href = detailUrl;
    return;
  }
  if (action === "comprar") {
    event.preventDefault();
    sendEvent(itemType, itemId, "pay_start_click", { source: "card" });
    trackPixel("InitiateCheckout", {
      content_type: itemType,
      content_ids: [`${itemType}:${itemId}`]
    });
    const payUrl =
      itemType === "service"
        ? `/pagar/servico/${itemId}`
        : `/pagar/produto/${itemId}`;
    window.location.href = payUrl;
    return;
  }
  if (action === "add-basket") {
    event.preventDefault();
    const items = getBasketItems();
    const existing = items.find(
      (item) => item.itemType === itemType && String(item.itemId) === String(itemId)
    );
    if (existing) {
      existing.quantity = Math.max(1, Number(existing.quantity || 1) + 1);
    } else {
      items.push({ itemType, itemId, quantity: 1 });
    }
    setBasketItems(items);
    trackPixel("AddToCart", {
      content_type: itemType,
      content_ids: [`${itemType}:${itemId}`]
    });
    return;
  }
  if (action === "promo-demo") {
    sendEvent(itemType, itemId, "promo_demo_click", { source: "banner" });
    trackPixel("ViewContent", {
      content_type: itemType,
      content_ids: [`${itemType}:${itemId}`],
      source: "promo_demo"
    });
    return;
  }
  if (action === "promo-detail") {
    sendEvent(itemType, itemId, "promo_detail_click", { source: "banner" });
    trackPixel("ViewContent", {
      content_type: itemType,
      content_ids: [`${itemType}:${itemId}`],
      source: "promo_detail"
    });
    return;
  }
  if (action === "promo-video") {
    sendEvent(itemType, itemId, "promo_video_click", { source: "banner" });
    trackPixel("ViewContent", {
      content_type: itemType,
      content_ids: [`${itemType}:${itemId}`],
      source: "promo_video"
    });
    return;
  }
  if (action === "demo") {
    sendEvent(itemType, itemId, "demo_click", { source: "card" });
    return;
  }
  if (action === "video") {
    sendEvent(itemType, itemId, "video_click", { source: "card" });
    return;
  }
  sendEvent(itemType, itemId, "card_click", { source: "card" });
  window.location.href = detailUrl;
});

document.addEventListener("click", (event) => {
  const action = event.target.getAttribute("data-action");
  if (action === "go-products") {
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
  }
});

if (leadForm) {
  const phoneInput = leadForm.querySelector("input[name='phone']");
  attachPhoneMask(phoneInput);
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(leadForm).entries());
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, source: "site" })
      });
        leadForm.reset();
        leadStatus.textContent = "Recebido! Em breve entramos em contato.";
        sendEvent("site", 0, "lead_submit", { source: "form" });
        trackPixel("Lead");
      } catch (err) {
      leadStatus.textContent = "Não foi possível enviar. Tente novamente.";
    }
  });
}

if (basketToggle) {
  basketToggle.addEventListener("click", () => toggleBasket(true));
}
if (basketOverlay) {
  basketOverlay.addEventListener("click", () => toggleBasket(false));
}
if (basketClose) {
  basketClose.addEventListener("click", () => toggleBasket(false));
}
if (basketClear) {
  basketClear.addEventListener("click", () => setBasketItems([]));
}
if (basketCheckout) {
  basketCheckout.addEventListener("click", () => {
    const items = getBasketItems();
    if (!items.length) return;
    trackPixel("InitiateCheckout", {
      content_type: "bundle",
      content_ids: items.map((entry) => `${entry.itemType}:${entry.itemId}`)
    });
    window.location.href = "/pagar/cesta";
  });
}
if (basketList) {
  basketList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    const type = button.getAttribute("data-type");
    if (!id || !type) return;
    const itemType = type;
    const itemId = id;
    const items = getBasketItems();
    const index = items.findIndex(
      (item) => String(item.itemId) === String(id) && item.itemType === type
    );
    if (index < 0) return;
    if (action === "remove-basket") {
      items.splice(index, 1);
      setBasketItems(items);
      trackPixel("AddToCart", {
        content_type: itemType,
        content_ids: [`${itemType}:${itemId}`],
        value: 0
      });
      return;
    }
    if (action === "basket-inc") {
      items[index].quantity = Math.max(1, Number(items[index].quantity || 1) + 1);
      setBasketItems(items);
      trackPixel("AddToCart", {
        content_type: itemType,
        content_ids: [`${itemType}:${itemId}`]
      });
      return;
    }
    if (action === "basket-dec") {
      const nextQty = Math.max(0, Number(items[index].quantity || 1) - 1);
      if (nextQty === 0) {
        items.splice(index, 1);
        trackPixel("AddToCart", {
          content_type: itemType,
          content_ids: [`${itemType}:${itemId}`],
          value: 0
        });
      } else {
        items[index].quantity = nextQty;
        trackPixel("AddToCart", {
          content_type: itemType,
          content_ids: [`${itemType}:${itemId}`]
        });
      }
      setBasketItems(items);
    }
  });
}

document.addEventListener("click", (event) => {
  const action = event.target.getAttribute("data-action");
  if (action === "support-email") {
    trackPixel("Contact", { channel: "email" });
  }
  if (action === "support-whatsapp") {
    trackPixel("Contact", { channel: "whatsapp" });
  }
});

loadCatalog();
loadPortalConfig();
