const itemForm = document.getElementById("itemForm");
const promotionForm = document.getElementById("promotionForm");

const itemGrid = document.getElementById("itemGrid");
const promotionList = document.getElementById("promotionList");
const catalogFilters = document.getElementById("catalogFilters");
const leadTable = document.getElementById("leadTable");
const leadList = document.getElementById("leadList");
const leadDeleteAll = document.getElementById("leadDeleteAll");
const eventTable = document.getElementById("eventTable");
const eventDeleteAll = document.getElementById("eventDeleteAll");
const orderTable = document.getElementById("orderTable");
const orderFilterText = document.getElementById("orderFilterText");
const orderFilterStatus = document.getElementById("orderFilterStatus");
const orderFilterMethod = document.getElementById("orderFilterMethod");
const orderFilterClear = document.getElementById("orderFilterClear");
const eventFilterName = document.getElementById("eventFilterName");
const eventFilterType = document.getElementById("eventFilterType");
const eventFilterDevice = document.getElementById("eventFilterDevice");
const eventFilterClear = document.getElementById("eventFilterClear");
const visitCount = document.getElementById("visitCount");
const deviceAndroid = document.getElementById("deviceAndroid");
const deviceIos = document.getElementById("deviceIos");
const devicePc = document.getElementById("devicePc");
const uniqueVisitors = document.getElementById("uniqueVisitors");
const sessionCount = document.getElementById("sessionCount");
const bounceRate = document.getElementById("bounceRate");
const avgTimeOnPage = document.getElementById("avgTimeOnPage");
const funnelPageView = document.getElementById("funnelPageView");
const funnelViewItem = document.getElementById("funnelViewItem");
const funnelCheckout = document.getElementById("funnelCheckout");
const funnelPurchase = document.getElementById("funnelPurchase");
const funnelChart = document.getElementById("funnelChart");
const cohortChart = document.getElementById("cohortChart");
let funnelChartInstance = null;
let cohortChartInstance = null;
const configForm = document.getElementById("configForm");
const pixQrPreview = document.getElementById("pixQrPreview");
const pageTitle = document.querySelector("title");
const brandTitle = document.querySelector(".brand span:last-child");
const portalBrandEl = document.querySelector("[data-portal-brand]");
const modal = document.getElementById("itemModal");
const modalTitle = document.getElementById("modalTitle");
const openItemModal = document.getElementById("openItemModal");
const promotionReset = document.getElementById("promotionReset");
const openPromotionModal = document.getElementById("openPromotionModal");
const promotionModal = document.getElementById("promotionModal");
const promotionModalTitle = document.getElementById("promotionModalTitle");
const modalInstance = new bootstrap.Modal(modal);
const promotionModalInstance = promotionModal ? new bootstrap.Modal(promotionModal) : null;
const orderModal = document.getElementById("orderModal");
const orderModalBody = document.getElementById("orderModalBody");
const orderModalInstance = orderModal ? new bootstrap.Modal(orderModal) : null;
const tokenKey = "adminToken";
const adminLogout = document.getElementById("adminLogout");
const mpLiveAlert = document.getElementById("mpLiveAlert");
const adminStatus = document.getElementById("adminStatus");
const itemStatus = document.getElementById("itemStatus");
const promotionStatus = document.getElementById("promotionStatus");
const dbExport = document.getElementById("dbExport");
const dbImportFile = document.getElementById("dbImportFile");
const dbImportBtn = document.getElementById("dbImportBtn");
const dbBackupStatus = document.getElementById("dbBackupStatus");

function logAxiosError(context, err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  console.error(`[admin] ${context}`, {
    status,
    data,
    message: err?.message
  });
}

window.addEventListener("error", (event) => {
  console.error("[admin] window error", event?.error || event?.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[admin] unhandled rejection", event?.reason);
});

const adminToken = localStorage.getItem(tokenKey);
if (!adminToken) {
  window.location.href = "/admin-login";
}
if (window.axios && adminToken) {
  axios.defaults.headers.common.Authorization = `Bearer ${adminToken}`;
  axios.defaults.headers.common["X-Admin-Token"] = adminToken;
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        localStorage.removeItem(tokenKey);
        window.location.href = "/admin-login";
      }
      return Promise.reject(error);
    }
  );
}

const catalogState = {
  product: [],
  service: []
};
let cachedOrders = [];
let catalogFilter = "all";

function formatPrice(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatStatus(value) {
  const map = {
    approved: "Aprovado",
    pending: "Pendente",
    in_process: "Em análise",
    rejected: "Recusado",
    cancelled: "Cancelado",
    paid: "Pago",
    failed: "Falhou"
  };
  return map[value] || value || "-";
}

function formatEventName(value) {
  const map = {
    page_view: "Visita na página",
    view_item: "Visualizou item",
    card_click: "Clique no card",
    saiba_mais_click: "Clique em Saiba mais",
    promo_detail_click: "Clique no banner promocional",
    promo_demo_click: "Clique em Demo (promo)",
    promo_video_click: "Clique em Vídeo (promo)",
    demo_click: "Clique em Demo",
    video_click: "Clique em Vídeo",
    pay_start_click: "Iniciar compra",
    initiate_checkout: "Iniciar checkout",
    pix_generated: "PIX gerado",
    card_payment_sent: "Pagamento cartão enviado",
    purchase: "Compra finalizada",
    lead_submit: "Lead enviado",
    time_on_page: "Tempo na página"
  };
  return map[value] || value || "-";
}

function formatItemType(value) {
  const map = {
    product: "Produto",
    service: "Serviço",
    promotion: "Promoção",
    site: "Site",
    bundle: "Carrinho",
    order: "Pedido"
  };
  return map[value] || value || "-";
}

function formatDevice(value) {
  const map = {
    android: "Android",
    ios: "iOS",
    pc: "PC"
  };
  return map[value] || value || "-";
}

function getEventCategory(eventName) {
  const map = {
    page_view: "Navegação",
    view_item: "Navegação",
    card_click: "Navegação",
    saiba_mais_click: "Navegação",
    lead_submit: "Navegação",
    time_on_page: "Navegação",
    promo_detail_click: "Promoções",
    promo_demo_click: "Promoções",
    promo_video_click: "Promoções",
    demo_click: "Promoções",
    video_click: "Promoções",
    pay_start_click: "Checkout",
    initiate_checkout: "Checkout",
    pix_generated: "Pagamento",
    card_payment_sent: "Pagamento",
    purchase: "Pagamento"
  };
  return map[eventName] || "Outros";
}


function toggleChartEmptyState(canvas, show) {
  const shell = canvas?.parentElement;
  if (!shell) return;
  let empty = shell.querySelector(".chart-empty");
  if (!empty) {
    empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.textContent = "Sem dados.";
    shell.appendChild(empty);
  }
  empty.style.display = show ? "flex" : "none";
}

function buildFunnelChart(items) {
  if (!funnelChart || !window.Chart) return;
  const ordered = [
    { key: "page_view", label: "Visitas" },
    { key: "view_item", label: "Ver item" },
    { key: "pay_start_click", label: "Iniciar compra" },
    { key: "purchase", label: "Compra" }
  ];
  const map = Array.isArray(items)
    ? items.reduce((acc, row) => {
        acc[row.eventName] = row;
        return acc;
      }, {})
    : {};
  const labels = ordered.map((row) => row.label);
  const values = ordered.map((row) => map[row.key]?.total || 0);
  const hasData = values.some((value) => value > 0);
  toggleChartEmptyState(funnelChart, !hasData);
  if (funnelChartInstance) funnelChartInstance.destroy();
  const ctx = funnelChart.getContext("2d");
  funnelChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Conversões",
          data: values,
          fill: true,
          tension: 0.35,
          borderColor: "rgba(255, 186, 73, 0.95)",
          backgroundColor: "rgba(255, 186, 73, 0.18)",
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "rgba(255, 186, 73, 0.95)"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(255, 186, 73, 0.4)",
          borderWidth: 1,
          padding: 12
        }
      },
      scales: {
        x: {
          ticks: { color: "#d1d5db" },
          grid: { color: "rgba(148, 163, 184, 0.15)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#9ca3af", stepSize: 1 },
          grid: { color: "rgba(148, 163, 184, 0.1)" }
        }
      }
    }
  });
}

function buildCohortChart(items) {
  if (!cohortChart || !window.Chart) return;
  const safeItems = Array.isArray(items) ? items : [];
  const labels = safeItems.map((row) => row.date);
  const newVisitors = safeItems.map((row) => row.newVisitors || 0);
  const returningVisitors = safeItems.map((row) => row.returningVisitors || 0);
  const hasData = [...newVisitors, ...returningVisitors].some((value) => value > 0);
  toggleChartEmptyState(cohortChart, !hasData);
  if (cohortChartInstance) cohortChartInstance.destroy();
  const ctx = cohortChart.getContext("2d");
  cohortChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Novos visitantes",
          data: newVisitors,
          fill: true,
          tension: 0.35,
          borderColor: "rgba(94, 234, 212, 0.9)",
          backgroundColor: "rgba(94, 234, 212, 0.2)",
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: "Recorrentes",
          data: returningVisitors,
          fill: true,
          tension: 0.35,
          borderColor: "rgba(255, 138, 76, 0.9)",
          backgroundColor: "rgba(255, 138, 76, 0.18)",
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#d1d5db" }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(94, 234, 212, 0.3)",
          borderWidth: 1,
          padding: 12
        }
      },
      scales: {
        x: {
          ticks: { color: "#d1d5db" },
          grid: { color: "rgba(148, 163, 184, 0.15)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#9ca3af", stepSize: 1 },
          grid: { color: "rgba(148, 163, 184, 0.1)" }
        }
      }
    }
  });
}

function statusBadge(value) {
  const label = formatStatus(value);
  const map = {
    approved: "success",
    paid: "success",
    pending: "warning",
    in_process: "warning",
    rejected: "danger",
    cancelled: "secondary",
    failed: "danger"
  };
  const tone = map[value] || "secondary";
  return `<span class="badge text-bg-${tone}">${label}</span>`;
}

function renderList(container, items, type) {
  container.innerHTML = items
    .map((item) => {
      const name =
        item.name ||
        item.title ||
        item.Product?.name ||
        item.Service?.name ||
        "Item";
      const price = item.regularPrice || item.promoPrice;
      return `
        <div class="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
          <div>
            <strong>#${item.id}</strong> ${name}
            <span class="text-secondary ms-2">${formatPrice(price)}</span>
          </div>
          <button class="btn btn-outline-danger btn-sm" data-id="${item.id}" data-type="${type}">Excluir</button>
        </div>
      `;
    })
    .join("");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
}

function parseItems(value) {
  if (!value) return [];
  try {
    const items = JSON.parse(value);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function renderPromotions(items) {
  if (!promotionList) return;
  promotionList.innerHTML = items
    .map((promo) => {
      const targetName = promo.itemName || "Item";
      const targetType = promo.itemType === "service" ? "Serviço" : "Produto";
      const statusBadge = promo.active
        ? '<span class="badge text-bg-success">Ativa</span>'
        : '<span class="badge text-bg-secondary">Inativa</span>';
      const banner = promo.bannerUrl
        ? `<img src="${promo.bannerUrl}" alt="${promo.title}" class="img-fluid rounded border border-secondary" />`
        : "";
      const links = [
        promo.linkDemo ? `<a href="${promo.linkDemo}" target="_blank">Demo</a>` : "",
        promo.linkVideo ? `<a href="${promo.linkVideo}" target="_blank">Vídeo</a>` : ""
      ]
        .filter(Boolean)
        .join(" | ");
      return `
        <div class="col-12 col-lg-6">
          <div class="card admin-card h-100" data-id="${promo.id}">
            <div class="card-body d-grid gap-2">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h3 class="h6 mb-1">${promo.title}</h3>
                  <div class="text-secondary small">${targetType}: ${targetName}</div>
                </div>
                ${statusBadge}
              </div>
              <div class="d-flex flex-wrap gap-2 text-secondary small">
                <span>Preco: ${formatPrice(promo.promoPrice)}</span>
                <span>Início: ${formatDate(promo.startDate)}</span>
                <span>Fim: ${formatDate(promo.endDate)}</span>
                <span>Direciona: ${promo.linkTarget || "item"}</span>
              </div>
              ${banner}
              ${links ? `<div class="text-secondary small">Links: ${links}</div>` : ""}
              <div class="d-flex gap-2">
                <button class="btn btn-outline-light btn-sm" data-action="edit-promo">Editar</button>
                <button class="btn btn-outline-danger btn-sm" data-action="delete-promo">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderItems(items) {
  itemGrid.innerHTML = items
    .map((item) => {
      const badge = item.type === "product" ? "Produto" : "Serviço";
      const fulfillmentMap = {
        digital: "Digital",
        marketplace: "Marketplace",
        physical: "Físico"
      };
      const fulfillment = fulfillmentMap[item.fulfillmentType] || "Digital";
      const eventCount = item.eventCount || 0;
      const statusBadge = item.active
        ? '<span class="badge text-bg-success align-self-start">Ativo</span>'
        : '<span class="badge text-bg-secondary align-self-start">Inativo</span>';
      return `
        <div class="col-12 col-md-6 col-lg-4">
          <article class="card admin-card h-100"
          data-id="${item.id}"
          data-type="${item.type}"
          data-name="${item.name}"
          data-description="${item.description}"
          data-image-url="${item.imageUrl}"
          data-regular-price="${item.regularPrice}"
          data-link-demo="${item.linkDemo || ""}"
          data-link-video="${item.linkVideo || ""}"
          data-fulfillment-type="${item.fulfillmentType || "digital"}"
          data-external-url="${item.externalUrl || ""}"
          data-active="${item.active}"
          data-details-list="${(item.detailsList || "").replace(/\"/g, "&quot;")}">
            <img src="${item.imageUrl}" class="card-img-top" alt="${item.name}" />
            <div class="card-body d-flex flex-column gap-2">
              <div class="d-flex gap-2 flex-wrap">
                <span class="badge text-bg-warning align-self-start">${badge}</span>
                <span class="badge text-bg-info align-self-start">${fulfillment}</span>
                ${statusBadge}
              </div>
              <h3 class="h6 mb-0">${item.name}</h3>
              <p class="text-secondary small mb-2">${item.description}</p>
              <div class="d-flex justify-content-between align-items-center mt-auto flex-wrap gap-2">
                <div>
                  <span class="text-secondary small">#${item.id}</span>
                  <span class="fw-semibold ms-2">${formatPrice(item.regularPrice)}</span>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-outline-light btn-sm" data-action="edit">Editar</button>
                  <button class="btn btn-outline-danger btn-sm" data-action="delete">Excluir</button>
                </div>
              </div>
              <div class="text-secondary small">Eventos: ${eventCount}</div>
            </div>
          </article>
        </div>
      `;
    })
    .join("");
}

function applyCatalogFilter(items) {
  if (catalogFilter === "all") return items;
  return items.filter((item) => item.type === catalogFilter);
}


async function loadAll() {
  try {
    const results = await Promise.allSettled([
      axios.get("/api/products", { params: { includeInactive: 1 } }),
      axios.get("/api/services", { params: { includeInactive: 1 } }),
      axios.get("/api/promotions"),
      axios.get("/api/events/summary")
    ]);

    const productsRes = results[0].status === "fulfilled" ? results[0].value : { data: [] };
    const servicesRes = results[1].status === "fulfilled" ? results[1].value : { data: [] };
    const promotionsRes = results[2].status === "fulfilled" ? results[2].value : { data: [] };
    const summaryRes = results[3].status === "fulfilled" ? results[3].value : { data: {} };

    const products = (productsRes.data || []).map((item) => ({
      ...item,
      type: "product"
    }));
    const services = (servicesRes.data || []).map((item) => ({
      ...item,
      type: "service"
    }));
    catalogState.product = products;
    catalogState.service = services;

    const summary = summaryRes.data || {};
    const withCounts = [...products, ...services].map((item) => ({
      ...item,
      eventCount: summary[`${item.type}:${item.id}`] || 0
    }));

    renderItems(applyCatalogFilter(withCounts));
    renderPromotions(promotionsRes.data || []);
    populateTargetOptions();
    loadReports();
    loadConfig();
  } catch (err) {
    itemGrid.innerHTML = "<div class=\"text-secondary\">Erro ao carregar dados do admin.</div>";
  }
}

function populateTargetOptions() {
  if (!promotionForm) return;
  const targetType = promotionForm.elements.targetType.value;
  const targetSelect = promotionForm.elements.targetId;
  targetSelect.innerHTML = '<option value="">Selecione o item</option>';
  const items = catalogState[targetType] || [];
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `#${item.id} ${item.name}`;
    targetSelect.appendChild(option);
  });
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function applyOrderFilters(orders) {
  let results = orders || [];
  const text = normalizeText(orderFilterText?.value);
  const status = orderFilterStatus?.value || "";
  const method = orderFilterMethod?.value || "";
  if (status) {
    results = results.filter((order) => String(order.status || "") === status);
  }
  if (method) {
    results = results.filter((order) => String(order.method || "") === method);
  }
  if (text) {
    results = results.filter((order) => {
      const hay = [
        order.id,
        order.itemName,
        order.customerEmail,
        order.customerPhone,
        order.method,
        order.status
      ]
        .map(normalizeText)
        .join(" ");
      return hay.includes(text);
    });
  }
  return results;
}

async function loadReports() {
  const [leadsRes, eventsRes, metricsRes, ordersRes] = await Promise.all([
    axios.get("/api/leads"),
    axios.get("/api/events/grouped"),
    axios.get("/api/events/metrics"),
    axios.get("/api/orders/admin")
  ]);

  const leads = leadsRes.data || [];
  if (leadTable) {
    leadTable.innerHTML = leads
      .map(
        (lead) => `
          <tr>
            <td>${lead.name}</td>
            <td>${lead.email}</td>
            <td>${lead.phone || "-"}</td>
            <td>
              <button class="btn btn-outline-danger btn-sm" data-action="delete-lead" data-id="${lead.id}">Excluir</button>
            </td>
          </tr>
        `
      )
      .join("");
  }
  if (leadList) {
    if (!leads.length) {
      leadList.innerHTML = '<div class="text-secondary small">Nenhum lead capturado.</div>';
    } else {
      leadList.innerHTML = leads
        .map(
          (lead) => `
            <div class="d-flex justify-content-between align-items-start border border-secondary rounded-3 p-3 mb-2">
              <div>
                <div class="fw-semibold">${lead.name || "Lead sem nome"}</div>
                <div class="text-secondary small">${lead.email || "-"}</div>
                <div class="text-secondary small">${lead.phone || "-"}</div>
              </div>
              <button class="btn btn-outline-danger btn-sm" data-action="delete-lead" data-id="${lead.id}">
                Excluir
              </button>
            </div>
          `
        )
        .join("");
    }
  }

  const events = eventsRes.data || [];
  const filterName = (eventFilterName?.value || "").trim().toLowerCase();
  const filterType = eventFilterType?.value || "";
  const filterDevice = eventFilterDevice?.value || "";
  const filteredEvents = events.filter((evt) => {
    const nameMatch = !filterName || String(evt.eventName || "").toLowerCase().includes(filterName);
    const typeMatch = !filterType || evt.itemType === filterType;
    const deviceMatch = !filterDevice || evt.device === filterDevice;
    return nameMatch && typeMatch && deviceMatch;
  });
  if (eventTable) {
    const grouped = filteredEvents.reduce((acc, evt) => {
      const category = getEventCategory(evt.eventName);
      if (!acc[category]) acc[category] = [];
      acc[category].push(evt);
      return acc;
    }, {});
    const order = ["Navegação", "Promoções", "Checkout", "Pagamento", "Outros"];
    eventTable.innerHTML = order
      .filter((category) => grouped[category]?.length)
      .map((category) => {
        const rows = grouped[category]
          .map(
            (evt) => `
              <tr>
                <td>
                  <span class="event-name" title="${evt.eventName}">
                    ${formatEventName(evt.eventName)}
                    <span class="event-tag">${evt.eventName}</span>
                  </span>
                </td>
                <td>${formatItemType(evt.itemType)}</td>
                <td>${evt.itemId}</td>
                <td>${formatDevice(evt.device)}</td>
                <td>${evt.total}</td>
                <td>
                  <button class="btn btn-outline-danger btn-sm"
                    data-action="delete-event"
                    data-event-name="${evt.eventName}"
                    data-item-type="${evt.itemType}"
                    data-item-id="${evt.itemId}">
                    Excluir
                  </button>
                </td>
              </tr>
            `
          )
          .join("");
        return `
          <tr class="event-group-row">
            <td colspan="6">${category}</td>
          </tr>
          ${rows}
        `;
      })
      .join("");
  }

  const metrics = metricsRes.data || {};
  if (visitCount) visitCount.textContent = metrics.visits || 0;
  const devices = metrics.deviceBreakdown || {};
  if (deviceAndroid) deviceAndroid.textContent = devices.android || 0;
  if (deviceIos) deviceIos.textContent = devices.ios || 0;
  if (devicePc) devicePc.textContent = devices.pc || 0;
  if (uniqueVisitors) uniqueVisitors.textContent = metrics.uniqueVisitorsToday || 0;
  if (sessionCount) sessionCount.textContent = metrics.sessionsToday || 0;
  if (bounceRate) {
    const rate = Number(metrics.bounceRateToday || 0) * 100;
    bounceRate.textContent = `${rate.toFixed(0)}%`;
  }
  if (avgTimeOnPage) avgTimeOnPage.textContent = formatDuration(metrics.avgTimeOnPageTodayMs || 0);
  if (Array.isArray(metrics.funnel)) {
    const map = metrics.funnel.reduce((acc, row) => {
      acc[row.eventName] = row;
      return acc;
    }, {});
    if (funnelPageView) funnelPageView.textContent = map.page_view?.total || 0;
    if (funnelViewItem) funnelViewItem.textContent = map.view_item?.total || 0;
    if (funnelCheckout) funnelCheckout.textContent = map.pay_start_click?.total || 0;
    if (funnelPurchase) funnelPurchase.textContent = map.purchase?.total || 0;
    buildFunnelChart(metrics.funnel);
  }
  if (Array.isArray(metrics.cohorts)) {
    buildCohortChart(metrics.cohorts);
  }

  if (orderTable) {
    const orders = ordersRes.data || [];
    cachedOrders = orders;
    const filtered = applyOrderFilters(orders);
    orderTable.innerHTML = filtered
      .map((order) => {
        const orderItems = parseItems(order.items);
        const itemName = orderItems.length
          ? `Pedido com ${orderItems.length} itens`
          : order.itemName
            ? `${order.itemName} (#${order.itemId})`
            : `#${order.itemId}`;
        const amount = Number(order.amount || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        });
        const date = order.createdAt
          ? new Date(order.createdAt).toLocaleString("pt-BR")
          : "-";
        const canMarkPaid = order.status !== "paid";
        const contact = [
          order.customerEmail ? `<div>${order.customerEmail}</div>` : "",
          order.customerPhone ? `<div>${order.customerPhone}</div>` : ""
        ]
          .filter(Boolean)
          .join("");
        const methodLabel = order.method === "pix" ? "PIX" : "Cartão";
        return `
          <tr>
            <td><a href="#" data-action="view-order" data-id="${order.id}">#${order.id}</a></td>
            <td>${itemName}</td>
            <td>${contact || "-"}</td>
            <td>${methodLabel}</td>
            <td>${statusBadge(order.status)}</td>
            <td>${amount}</td>
            <td>${order.paymentId || "-"}</td>
            <td>
              ${canMarkPaid ? `<button class="btn btn-outline-success btn-sm" data-action="mark-paid" data-id="${order.id}">Marcar pago</button>` : "-"}
              <button class="btn btn-outline-danger btn-sm ms-2" data-action="delete-order" data-id="${order.id}">Excluir</button>
            </td>
            <td>${date}</td>
          </tr>
        `;
      })
      .join("");
  }
}
function openModal(mode, item = null) {
  modalInstance.show();
  itemForm.reset();
  if (mode === "edit" && item) {
    modalTitle.textContent = "Editar item";
    itemForm.elements.id.value = item.id;
    itemForm.elements.type.value = item.type;
    itemForm.elements.name.value = item.name;
    itemForm.elements.description.value = item.description;
    itemForm.elements.currentImageUrl.value = item.imageUrl;
    itemForm.elements.regularPrice.value = item.regularPrice;
    itemForm.elements.linkDemo.value = item.linkDemo || "";
    itemForm.elements.linkVideo.value = item.linkVideo || "";
    if (itemForm.elements.fulfillmentType) {
      itemForm.elements.fulfillmentType.value = item.fulfillmentType || "digital";
    }
    if (itemForm.elements.externalUrl) {
      itemForm.elements.externalUrl.value = item.externalUrl || "";
    }
    itemForm.elements.active.checked = Boolean(item.active);
    itemForm.elements.detailsList.value = item.detailsList || "";
  } else {
    modalTitle.textContent = "Novo item";
    itemForm.elements.currentImageUrl.value = "";
    itemForm.elements.active.checked = true;
    itemForm.elements.detailsList.value = "";
    if (itemForm.elements.fulfillmentType) {
      itemForm.elements.fulfillmentType.value = "digital";
    }
    if (itemForm.elements.externalUrl) {
      itemForm.elements.externalUrl.value = "";
    }
  }
}

function openPromotionForm(mode) {
  if (!promotionForm || !promotionModalInstance || !promotionModalTitle) return;
  promotionForm.reset();
  promotionForm.elements.id.value = "";
  promotionForm.elements.bannerUrl.value = "";
  promotionForm.elements.active.checked = true;
  promotionModalTitle.textContent = mode === "edit" ? "Editar promoção" : "Nova promoção";
  promotionModalInstance.show();
  populateTargetOptions();
}

function closeModal() {
  modalInstance.hide();
}

async function handleDelete(type, id) {
  const urlMap = {
    product: "/api/products/",
    service: "/api/services/",
    promotion: "/api/promotions/"
  };
  await axios.delete(`${urlMap[type]}${id}`);
  await loadAll();
}

if (promotionForm) {
  promotionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(promotionStatus, "");
    const formData = new FormData(promotionForm);
    const values = Object.fromEntries(formData.entries());
    let bannerUrl = "";

    try {
      if (formData.get("banner") && formData.get("banner").size > 0) {
        const uploadForm = new FormData();
        uploadForm.append("image", formData.get("banner"));
        const uploadRes = await axios.post("/api/uploads", uploadForm);
        bannerUrl = uploadRes.data.url;
      }

        const payload = {
          title: values.title,
          promoPrice: values.promoPrice,
          bannerUrl: bannerUrl || values.bannerUrl || null,
          linkDemo: values.linkDemo || null,
          linkVideo: values.linkVideo || null,
          linkTarget: values.linkTarget || "item",
          active: values.active === "on",
          startDate: values.startDate || null,
          endDate: values.endDate || null,
          itemType: values.targetType || null,
          itemId: values.targetId ? Number(values.targetId) : null
        };
      if (values.id) {
        await axios.put(`/api/promotions/${values.id}`, payload);
      } else {
        await axios.post("/api/promotions", payload);
      }
      promotionForm.reset();
      promotionForm.elements.id.value = "";
      setStatus(promotionStatus, "Promocao salva com sucesso.", "success");
      setStatus(adminStatus, "Promocao salva com sucesso.", "success");
      await loadAll();
      window.setTimeout(() => {
        if (promotionModalInstance) promotionModalInstance.hide();
      }, 600);
    } catch (err) {
      logAxiosError("salvar promoção", err);
      setStatus(promotionStatus, "Não foi possível salvar a promoção.", "error");
      setStatus(adminStatus, "Não foi possível salvar a promoção.", "error");
    }
  });
}

if (itemForm) {
  itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(itemStatus, "");
    const formData = new FormData(itemForm);
    const values = Object.fromEntries(formData.entries());
    let imageUrl = values.currentImageUrl || "";

    try {
      if (formData.get("image") && formData.get("image").size > 0) {
        const uploadForm = new FormData();
        uploadForm.append("image", formData.get("image"));
        const uploadRes = await axios.post("/api/uploads", uploadForm);
        imageUrl = uploadRes.data.url;
      }

      if (!imageUrl) {
        const imageField = itemForm.querySelector("[name='image']");
        if (imageField) {
          imageField.setCustomValidity("Selecione uma imagem para continuar.");
          itemForm.reportValidity();
          imageField.setCustomValidity("");
        }
        return;
      }

        const payload = {
          name: values.name,
          description: values.description,
          imageUrl,
          regularPrice: values.regularPrice,
          linkDemo: values.linkDemo || "",
          linkVideo: values.linkVideo || "",
          type: values.type || "product",
          fulfillmentType: values.fulfillmentType || "digital",
          externalUrl: values.externalUrl || "",
          active: values.active === "on",
          detailsList: values.detailsList || ""
        };
        const isEdit = Boolean(values.id);
        const baseUrl = "/api/products";
        if (isEdit) {
          await axios.put(`${baseUrl}/${values.id}`, payload);
        } else {
          await axios.post(baseUrl, payload);
        }
      setStatus(itemStatus, "Item salvo com sucesso.", "success");
      setStatus(adminStatus, "Item salvo com sucesso.", "success");
      await loadAll();
      window.setTimeout(() => {
        closeModal();
      }, 600);
    } catch (err) {
      logAxiosError("salvar item", err);
      setStatus(itemStatus, "Não foi possível salvar o item.", "error");
      setStatus(adminStatus, "Não foi possível salvar o item.", "error");
    }
  });
}

openItemModal.addEventListener("click", () => openModal("create"));
if (openPromotionModal) {
  openPromotionModal.addEventListener("click", () => openPromotionForm("create"));
}
if (catalogFilters) {
  catalogFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    catalogFilter = button.getAttribute("data-filter") || "all";
    catalogFilters.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });
    renderItems(applyCatalogFilter([...catalogState.product, ...catalogState.service]));
  });
}

itemGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.getAttribute("data-action");
  const card = button.closest(".card");
  const id = card.getAttribute("data-id");
  const type = card.getAttribute("data-type");
  if (action === "delete") {
    handleDelete(type, id);
    return;
  }
  if (action === "edit") {
    const item = {
      id,
      type,
      name: card.getAttribute("data-name"),
      description: card.getAttribute("data-description"),
      imageUrl: card.getAttribute("data-image-url"),
      regularPrice: card.getAttribute("data-regular-price"),
      linkDemo: card.getAttribute("data-link-demo"),
      linkVideo: card.getAttribute("data-link-video"),
      fulfillmentType: card.getAttribute("data-fulfillment-type"),
      externalUrl: card.getAttribute("data-external-url"),
      active: card.getAttribute("data-active") === "true",
      detailsList: card.getAttribute("data-details-list")
    };
    openModal("edit", item);
  }
});

promotionList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".card");
  const id = card?.getAttribute("data-id");
  if (!id) return;
  const action = button.getAttribute("data-action");
  if (action === "delete-promo") {
    handleDelete("promotion", id);
    return;
  }
  if (action === "edit-promo") {
    axios.get(`/api/promotions/${id}`).then((resp) => {
      const promo = resp.data;
      if (promotionModalTitle) promotionModalTitle.textContent = "Editar promoção";
      promotionForm.elements.id.value = promo.id;
      promotionForm.elements.title.value = promo.title || "";
      promotionForm.elements.promoPrice.value = promo.promoPrice || "";
      promotionForm.elements.linkDemo.value = promo.linkDemo || "";
      promotionForm.elements.linkVideo.value = promo.linkVideo || "";
      promotionForm.elements.linkTarget.value = promo.linkTarget || "item";
      promotionForm.elements.active.checked = promo.active !== false;
      promotionForm.elements.startDate.value = promo.startDate
        ? String(promo.startDate).slice(0, 10)
        : "";
      promotionForm.elements.endDate.value = promo.endDate
        ? String(promo.endDate).slice(0, 10)
        : "";
        promotionForm.elements.targetType.value =
          promo.itemType || (promo.productId ? "product" : "service");
        populateTargetOptions();
        promotionForm.elements.targetId.value =
          promo.itemId || promo.productId || promo.serviceId || "";
      if (promotionForm.elements.bannerUrl) {
        promotionForm.elements.bannerUrl.value = promo.bannerUrl || "";
      }
      if (promotionModalInstance) promotionModalInstance.show();
    }).catch((err) => {
      logAxiosError("carregar promoção", err);
    });
  }
});

if (promotionReset) {
  promotionReset.addEventListener("click", () => {
    promotionForm.reset();
    promotionForm.elements.id.value = "";
    if (promotionModalTitle) promotionModalTitle.textContent = "Nova promoção";
  });
}

if (eventTable) {
  eventTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='delete-event']");
    if (!button) return;
    const payload = {
      eventName: button.getAttribute("data-event-name"),
      itemType: button.getAttribute("data-item-type"),
      itemId: Number(button.getAttribute("data-item-id"))
    };
    await axios.delete("/api/events", { data: payload });
    loadReports();
  });
}

function setStatus(el, message, tone) {
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("is-success", "is-error");
  if (tone === "success") el.classList.add("is-success");
  if (tone === "error") el.classList.add("is-error");
  if (message) {
    window.setTimeout(() => {
      if (el.textContent === message) {
        el.textContent = "";
        el.classList.remove("is-success", "is-error");
      }
    }, 4000);
  }
}

function downloadBlob(data, filename) {
  const blob = data instanceof Blob ? data : new Blob([data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function parseFilename(header) {
  if (!header) return "portal-produtos.sqlite";
  const match = header.match(/filename\\*?=(?:UTF-8''|")?([^\";]+)/i);
  return match ? decodeURIComponent(match[1]) : "portal-produtos.sqlite";
}

if (dbExport) {
  dbExport.addEventListener("click", async () => {
    try {
      setStatus(dbBackupStatus, "Gerando backup...", "success");
      const resp = await axios.get("/api/admin/backup/download", { responseType: "blob" });
      const filename = parseFilename(resp.headers?.["content-disposition"]);
      downloadBlob(resp.data, filename);
      setStatus(dbBackupStatus, "Backup exportado com sucesso.", "success");
    } catch (err) {
      logAxiosError("exportar backup", err);
      setStatus(dbBackupStatus, "Falha ao exportar backup.", "error");
    }
  });
}

if (dbImportBtn) {
  dbImportBtn.addEventListener("click", async () => {
    const file = dbImportFile?.files?.[0];
    if (!file) {
      setStatus(dbBackupStatus, "Selecione um arquivo .db/.sqlite.", "error");
      return;
    }
    const confirmRestore = window.confirm(
      "Tem certeza? O banco atual será substituído pelo arquivo selecionado."
    );
    if (!confirmRestore) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      setStatus(dbBackupStatus, "Importando backup...", "success");
      const resp = await axios.post("/api/admin/backup/restore", formData);
      const needsRestart = resp?.data?.restartRequired;
      setStatus(
        dbBackupStatus,
        needsRestart
          ? "Backup importado. Reinicie o servidor para aplicar."
          : "Backup importado com sucesso.",
        "success"
      );
    } catch (err) {
      logAxiosError("importar backup", err);
      setStatus(dbBackupStatus, "Falha ao importar backup.", "error");
    }
  });
}
if (leadTable) {
  leadTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='delete-lead']");
    if (!button) return;
    const id = button.getAttribute("data-id");
    if (!id) return;
    await axios.delete(`/api/leads/${id}`);
    loadReports();
  });
}
if (leadList) {
  leadList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='delete-lead']");
    if (!button) return;
    const id = button.getAttribute("data-id");
    if (!id) return;
    await axios.delete(`/api/leads/${id}`);
    loadReports();
  });
}

if (leadDeleteAll) {
  leadDeleteAll.addEventListener("click", async () => {
    await axios.delete("/api/leads");
    loadReports();
  });
}

if (eventDeleteAll) {
  eventDeleteAll.addEventListener("click", async () => {
    await axios.delete("/api/events/all");
    loadReports();
  });
}

if (eventFilterName || eventFilterType || eventFilterDevice) {
  [eventFilterName, eventFilterType, eventFilterDevice].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", loadReports);
    el.addEventListener("change", loadReports);
  });
}

if (eventFilterClear) {
  eventFilterClear.addEventListener("click", () => {
    if (eventFilterName) eventFilterName.value = "";
    if (eventFilterType) eventFilterType.value = "";
    if (eventFilterDevice) eventFilterDevice.value = "";
    loadReports();
  });
}

if (promotionForm) {
  promotionForm.elements.targetType.addEventListener("change", populateTargetOptions);
}

if (orderTable) {
  orderTable.addEventListener("click", async (event) => {
    const markButton = event.target.closest("button[data-action='mark-paid']");
    if (markButton) {
      const id = markButton.getAttribute("data-id");
      if (!id) return;
      await axios.put(`/api/orders/${id}/paid`);
      loadReports();
      return;
    }
    const deleteButton = event.target.closest("button[data-action='delete-order']");
    if (deleteButton) {
      const id = deleteButton.getAttribute("data-id");
      if (!id) return;
      await axios.delete(`/api/orders/${id}`);
      loadReports();
      return;
    }
    const link = event.target.closest("a[data-action='view-order']");
    if (!link) return;
    event.preventDefault();
    const id = link.getAttribute("data-id");
    if (!id || !orderModalBody || !orderModalInstance) return;
    const order = (cachedOrders || []).find((item) => String(item.id) === String(id));
    if (!order) return;
    const orderItems = parseItems(order.items);
    const itemsList = orderItems.length
      ? `
        <div class="order-items">
          ${orderItems
            .map((item) => {
              const qty = Number(item.quantity || 1);
              const subtotal = item.subtotal || Number(item.unitPrice || 0) * qty;
              const image = item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.name}" />`
                : `<div class="order-item-placeholder"></div>`;
              return `
                <div class="order-item-row">
                  ${image}
                  <div class="order-item-info">
                    <div class="order-item-title">${item.name}</div>
                    <div class="order-item-sub">${formatPrice(item.unitPrice)} x ${qty}</div>
                  </div>
                  <div class="order-item-total">${formatPrice(subtotal)}</div>
                </div>
              `;
            })
            .join("")}
        </div>
      `
      : `<div class="text-secondary">Item: ${order.itemName} (#${order.itemId})</div>`;
    let addressHtml = "";
    if (order.shippingAddress) {
      try {
        const addr = typeof order.shippingAddress === "string"
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress;
        if (addr && (addr.street || addr.city)) {
          addressHtml = `
            <div class="order-address">
              <div>${[addr.street, addr.number].filter(Boolean).join(", ")}</div>
              <div>${[addr.district, addr.city].filter(Boolean).join(" - ")}${addr.state ? `/${addr.state}` : ""}</div>
              <div>${addr.postalCode || ""} ${addr.complement ? `(${addr.complement})` : ""}</div>
            </div>
          `;
        }
      } catch {
        addressHtml = "";
      }
    }
    const statusLabel = statusBadge(order.status);
    const methodLabel = order.method === "pix" ? "PIX" : "Cartão";
    orderModalBody.innerHTML = `
      <div class="order-detail">
        <div class="order-detail-header">
          <div>
            <div class="order-detail-title">Pedido #${order.id}</div>
            <div class="order-detail-sub">Metodo: ${methodLabel}</div>
          </div>
          <div class="order-detail-meta">
            ${statusLabel}
            <div class="order-detail-total">${formatPrice(order.amount)}</div>
          </div>
        </div>
        <div class="order-detail-section">
          <h4>Itens</h4>
          ${itemsList}
        </div>
        <div class="order-detail-section">
          <h4>Cliente</h4>
          <div class="order-detail-grid">
            <div><strong>Email:</strong> ${order.customerEmail || "-"}</div>
            <div><strong>Telefone:</strong> ${order.customerPhone || "-"}</div>
            <div><strong>Pagamento:</strong> ${order.paymentId || "-"}</div>
          </div>
        </div>
        ${addressHtml ? `<div class="order-detail-section"><h4>Entrega</h4>${addressHtml}</div>` : ""}
        <div class="order-detail-section">
          <h4>Observacoes</h4>
          <div class="text-secondary">${order.notes || "-"}</div>
        </div>
      </div>
    `;
    orderModalInstance.show();
  });
}

if (orderFilterText || orderFilterStatus || orderFilterMethod) {
  [orderFilterText, orderFilterStatus, orderFilterMethod].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", loadReports);
    el.addEventListener("change", loadReports);
  });
}

if (orderFilterClear) {
  orderFilterClear.addEventListener("click", () => {
    if (orderFilterText) orderFilterText.value = "";
    if (orderFilterStatus) orderFilterStatus.value = "";
    if (orderFilterMethod) orderFilterMethod.value = "";
    loadReports();
  });
}

async function loadConfig() {
  if (!configForm) return;
  const { data } = await axios.get("/api/portal-config/admin");
  if (!data) return;
  if (portalBrandEl && data.brandLabel) {
    portalBrandEl.textContent = data.brandLabel;
  }
  configForm.elements.portalName.value = data.portalName || "";
  if (configForm.elements.brandLabel) configForm.elements.brandLabel.value = data.brandLabel || "";
  if (configForm.elements.heroTagline) configForm.elements.heroTagline.value = data.heroTagline || "";
  if (configForm.elements.heroTitle) configForm.elements.heroTitle.value = data.heroTitle || "";
  if (configForm.elements.heroSubtitle) configForm.elements.heroSubtitle.value = data.heroSubtitle || "";
  if (configForm.elements.promoBandTitle) configForm.elements.promoBandTitle.value = data.promoBandTitle || "";
  if (configForm.elements.promoBandSubtitle) configForm.elements.promoBandSubtitle.value = data.promoBandSubtitle || "";
  if (configForm.elements.promoBandCtaLabel) configForm.elements.promoBandCtaLabel.value = data.promoBandCtaLabel || "";
  if (configForm.elements.promoSectionTitle) configForm.elements.promoSectionTitle.value = data.promoSectionTitle || "";
  if (configForm.elements.adminEmail) configForm.elements.adminEmail.value = data.adminEmail || "admin@catalogo.com";
  if (configForm.elements.menuBgColor) configForm.elements.menuBgColor.value = data.menuBgColor || "#0b1119";
  if (configForm.elements.pageBgColor) configForm.elements.pageBgColor.value = data.pageBgColor || "#0b1119";
  if (configForm.elements.textColor) configForm.elements.textColor.value = data.textColor || "#f5f7fa";
  configForm.elements.showProducts.checked = Boolean(data.showProducts);
  configForm.elements.showServices.checked = Boolean(data.showServices);
  configForm.elements.showPromotions.checked = Boolean(data.showPromotions);
  configForm.elements.showDetails.checked = Boolean(data.showDetails);
  configForm.elements.showPayments.checked = Boolean(data.showPayments);
  configForm.elements.showContact.checked = Boolean(data.showContact);
  configForm.elements.showSuccess.checked = Boolean(data.showSuccess);
  configForm.elements.successTitle.value = data.successTitle || "";
  configForm.elements.successMessage.value = data.successMessage || "";
  configForm.elements.supportEmail.value = data.supportEmail || "";
  configForm.elements.supportWhatsApp.value = data.supportWhatsApp || "";
  if (configForm.elements.pixelId) configForm.elements.pixelId.value = data.pixelId || "";
  if (configForm.elements.pixelEnabled) configForm.elements.pixelEnabled.checked = Boolean(data.pixelEnabled);
  configForm.elements.mpEnabled.checked = data.mpEnabled !== false;
  configForm.elements.mpAccessToken.value = data.mpAccessToken || "";
  configForm.elements.mpPublicKey.value = data.mpPublicKey || "";
  configForm.elements.pixKey.value = data.pixKey || "";
  configForm.elements.mpCheckIntervalMinutes.value = data.mpCheckIntervalMinutes || 5;
  configForm.elements.pixQrUrl.value = data.pixQrUrl || "";
  if (mpLiveAlert) {
    const token = String(data.mpAccessToken || "");
    const hasTestPayer = Boolean(data.testPayerEmail);
    const testPayerEmail = data.testPayerEmail || "";
    const envMode = String(data.mpEnv || "").toUpperCase();
    const isTestToken = token && token.startsWith("TEST-");
    const isTestEmail =
      typeof testPayerEmail === "string" &&
      testPayerEmail.toLowerCase().endsWith("@testuser.com");
    const isLive = token && !isTestToken;
    const isTestEnv = envMode === "TEST" || envMode === "SANDBOX";
    const shouldWarn = isTestEnv && isLive && hasTestPayer && !isTestEmail;
    mpLiveAlert.classList.toggle("d-none", !shouldWarn);
  }
  if (pixQrPreview) {
    if (data.pixQrUrl) {
      pixQrPreview.src = data.pixQrUrl;
      pixQrPreview.style.display = "block";
    } else {
      pixQrPreview.style.display = "none";
    }
  }
  if (pageTitle) pageTitle.textContent = `${data.portalName || "Portal"} - Admin`;
  if (brandTitle) brandTitle.textContent = "Admin";
}

if (configForm) {
  configForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(adminStatus, "");
    const formData = new FormData(configForm);
    const values = Object.fromEntries(formData.entries());
    let pixQrUrl = values.pixQrUrl || "";

    try {
      if (formData.get("pixQr") && formData.get("pixQr").size > 0) {
        const uploadForm = new FormData();
        uploadForm.append("image", formData.get("pixQr"));
        const uploadRes = await axios.post("/api/uploads", uploadForm);
        pixQrUrl = uploadRes.data.url;
      }

      const payload = {
        brandLabel: values.brandLabel || "Portal",
        portalName: values.portalName,
        heroTagline: values.heroTagline || "",
        heroTitle: values.heroTitle || "",
        heroSubtitle: values.heroSubtitle || "",
        promoBandTitle: values.promoBandTitle || "",
        promoBandSubtitle: values.promoBandSubtitle || "",
        promoBandCtaLabel: values.promoBandCtaLabel || "",
        promoSectionTitle: values.promoSectionTitle || "",
        adminEmail: values.adminEmail || "admin@catalogo.com",
        adminPassword: values.adminPassword || "",
        menuBgColor: values.menuBgColor || "",
        pageBgColor: values.pageBgColor || "",
        textColor: values.textColor || "",
        showProducts: values.showProducts === "on",
        showServices: values.showServices === "on",
        showPromotions: values.showPromotions === "on",
        showDetails: values.showDetails === "on",
        showPayments: values.showPayments === "on",
        showContact: values.showContact === "on",
        showSuccess: values.showSuccess === "on",
        successTitle: values.successTitle,
        successMessage: values.successMessage,
        supportEmail: values.supportEmail,
        supportWhatsApp: values.supportWhatsApp,
        pixelId: values.pixelId || "",
        pixelEnabled: values.pixelEnabled === "on",
        mpEnabled: values.mpEnabled === "on",
        mpAccessToken: values.mpAccessToken || "",
        mpPublicKey: values.mpPublicKey || "",
        pixKey: values.pixKey || "",
        pixQrUrl: pixQrUrl || "",
        mpCheckIntervalMinutes: Number(values.mpCheckIntervalMinutes || 5)
      };
      await axios.put("/api/portal-config", payload);
      loadConfig();
      if (configForm.elements.adminPassword) {
        configForm.elements.adminPassword.value = "";
      }
      setStatus(adminStatus, "Configuracoes salvas com sucesso.", "success");
    } catch (err) {
      logAxiosError("salvar configurações", err);
      setStatus(adminStatus, "Não foi possível salvar as configurações.", "error");
    }
  });
}

if (adminToken) {
  loadAll();
}

if (adminLogout) {
  adminLogout.addEventListener("click", () => {
    localStorage.removeItem(tokenKey);
    window.location.href = "/admin-login";
  });
}
