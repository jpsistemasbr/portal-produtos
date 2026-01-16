const portalNameEl = document.querySelector("[data-portal-name]");
const portalBrandEl = document.querySelector("[data-portal-brand]");
const paymentTitle = document.getElementById("paymentTitle");
const paymentDescription = document.getElementById("paymentDescription");
const paymentImage = document.getElementById("paymentImage");
const paymentOldPrice = document.getElementById("paymentOldPrice");
const paymentNewPrice = document.getElementById("paymentNewPrice");
const payerEmail = document.getElementById("payerEmail");
const payerPhone = document.getElementById("payerPhone");
const payPix = document.getElementById("payPix");
const payCard = document.getElementById("payCard");
const paymentStatus = document.getElementById("paymentStatus");
const pixResult = document.getElementById("pixResult");
const pixImage = document.getElementById("pixImage");
const pixCode = document.getElementById("pixCode");
const pixCopy = document.getElementById("pixCopy");
const pixLink = document.getElementById("pixLink");
const paymentStatusLink = document.getElementById("paymentStatusLink");
const cardBrick = document.getElementById("cardBrick");
const cardBrickContainer = document.getElementById("card-payment-brick");
const basketSummary = document.getElementById("basketSummary");
const basketSummaryList = document.getElementById("basketSummaryList");
const basketSummaryTotal = document.getElementById("basketSummaryTotal");
const basketCountLabel = document.getElementById("basketCountLabel");
const marketplaceNotice = document.getElementById("marketplaceNotice");
const marketplaceLinks = document.getElementById("marketplaceLinks");
const shippingBlock = document.getElementById("shippingBlock");
const shippingName = document.getElementById("shippingName");
const shippingPostalCode = document.getElementById("shippingPostalCode");
const shippingStreet = document.getElementById("shippingStreet");
const shippingNumber = document.getElementById("shippingNumber");
const shippingComplement = document.getElementById("shippingComplement");
const shippingDistrict = document.getElementById("shippingDistrict");
const shippingCity = document.getElementById("shippingCity");
const shippingState = document.getElementById("shippingState");

const basketKey = "basketItems";

let selectedItem = null;
let selectedItems = [];
let portalConfig = null;
let cardBrickLoaded = false;
let statusPollTimer = null;

function trackPixel(name, payload) {
  if (window.trackPixelEvent) {
    window.trackPixelEvent(name, payload);
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
      device: "unknown",
      payload
    })
  }).catch(() => {});
}
let currentOrderId = "";
let paymentTotal = 0;
let requiresAddress = false;
let marketplaceItems = [];

function formatPrice(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function formatCep(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function attachPhoneMask(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    input.value = formatPhone(input.value);
  });
  input.value = formatPhone(input.value);
}

function attachCepMask(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    input.value = formatCep(input.value);
    const digits = input.value.replace(/\D/g, "");
    if (digits.length === 8) {
      lookupCep(digits);
    }
  });
  input.addEventListener("blur", () => {
    const digits = input.value.replace(/\D/g, "");
    if (digits.length === 8) {
      lookupCep(digits);
    }
  });
  input.value = formatCep(input.value);
}

function getStateName(uf) {
  const map = {
    AC: "Acre",
    AL: "Alagoas",
    AP: "Amapa",
    AM: "Amazonas",
    BA: "Bahia",
    CE: "Ceara",
    DF: "Distrito Federal",
    ES: "Espirito Santo",
    GO: "Goias",
    MA: "Maranhao",
    MT: "Mato Grosso",
    MS: "Mato Grosso do Sul",
    MG: "Minas Gerais",
    PA: "Para",
    PB: "Paraiba",
    PR: "Parana",
    PE: "Pernambuco",
    PI: "Piaui",
    RJ: "Rio de Janeiro",
    RN: "Rio Grande do Norte",
    RS: "Rio Grande do Sul",
    RO: "Rondonia",
    RR: "Roraima",
    SC: "Santa Catarina",
    SP: "Sao Paulo",
    SE: "Sergipe",
    TO: "Tocantins"
  };
  return map[uf] || uf || "";
}

async function lookupCep(cep) {
  if (!cep) return;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.erro) return;
    if (shippingStreet) shippingStreet.value = data.logradouro || shippingStreet.value;
    if (shippingDistrict) shippingDistrict.value = data.bairro || shippingDistrict.value;
    if (shippingCity) shippingCity.value = data.localidade || shippingCity.value;
    if (shippingState) shippingState.value = getStateName(data.uf);
    if (shippingComplement && data.complemento) {
      shippingComplement.value = data.complemento;
    }
  } catch {
    // silent
  }
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  let type = params.get("type");
  let id = params.get("id");
  if (!type || !id) {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "pagar" && parts.length >= 3) {
      type = parts[1] === "servico" ? "service" : "product";
      id = parts[2];
    }
  }
  return { type, id };
}

function isBasketMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("basket") === "1") return true;
  return window.location.pathname.includes("/pagar/cesta");
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
  localStorage.setItem(basketKey, JSON.stringify(items || []));
}

function showPaymentMessage(text, variant = "info") {
  if (!paymentStatus) return;
  if (!text) {
    paymentStatus.textContent = "";
    paymentStatus.dataset.variant = "";
    paymentStatus.classList.remove("is-visible");
    return;
  }
  paymentStatus.textContent = text;
  paymentStatus.dataset.variant = variant;
  paymentStatus.classList.add("is-visible");
}

function showStatusLink(href) {
  if (!paymentStatusLink) return;
  if (!href) {
    paymentStatusLink.style.display = "none";
    paymentStatusLink.href = "#";
    return;
  }
  paymentStatusLink.href = href;
  paymentStatusLink.style.display = "inline-flex";
}

function buildStatusUrl(orderId) {
  if (!orderId) return "";
  return `/status-pagamento/pedido/${orderId}`;
}

function validatePayerFields() {
  const email = payerEmail ? payerEmail.value.trim() : "";
  const phone = payerPhone ? payerPhone.value.trim() : "";
  if (!email || !phone) {
    showPaymentMessage("Preencha email e WhatsApp para continuar.", "warning");
    return false;
  }
  return true;
}

function validateShippingFields() {
  if (!requiresAddress) return true;
  const address = getShippingAddress();
  const required = ["name", "postalCode", "street", "number", "district", "city", "state"];
  const missing = required.filter((key) => !address[key]);
  if (missing.length) {
    showPaymentMessage("Preencha o endereco de entrega para continuar.", "warning");
    return false;
  }
  return true;
}

function getShippingAddress() {
  return {
    name: shippingName?.value?.trim() || "",
    postalCode: shippingPostalCode?.value?.trim() || "",
    street: shippingStreet?.value?.trim() || "",
    number: shippingNumber?.value?.trim() || "",
    complement: shippingComplement?.value?.trim() || "",
    district: shippingDistrict?.value?.trim() || "",
    city: shippingCity?.value?.trim() || "",
    state: shippingState?.value?.trim() || ""
  };
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

function updateShippingUI() {
  if (!shippingBlock) return;
  shippingBlock.style.display = requiresAddress ? "block" : "none";
}

function updateMarketplaceUI() {
  if (!marketplaceNotice || !marketplaceLinks) return;
  if (!marketplaceItems.length) {
    marketplaceNotice.style.display = "none";
    marketplaceLinks.innerHTML = "";
    return;
  }
  marketplaceNotice.style.display = "block";
  marketplaceLinks.innerHTML = marketplaceItems
    .map((item) =>
      item.externalUrl
        ? `<a href="${item.externalUrl}" target="_blank" class="btn ghost">Ver em ${getPlatformLabel(item.externalUrl) || "plataforma"}</a>`
        : `<span>${item.name}</span>`
    )
    .join("");
}

function hideCardBrick() {
  if (cardBrick) cardBrick.style.display = "none";
}

function showCardBrick() {
  if (cardBrick) cardBrick.style.display = "";
}

function hidePixResult() {
  if (pixResult) pixResult.classList.remove("active");
}

function showPixResult() {
  if (pixResult) pixResult.classList.add("active");
}

function stopStatusPoll() {
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
}

function startStatusPoll(paymentId) {
  stopStatusPoll();
  if (!paymentId) return;
  statusPollTimer = setInterval(async () => {
    try {
      const resp = await axios.post("/api/payments/check-status", { paymentId });
      if (resp.data?.status === "approved") {
        stopStatusPoll();
        if (currentOrderId) {
          window.location.href = buildStatusUrl(currentOrderId);
        }
      }
    } catch {
      // silent
    }
  }, 8000);
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
      document.title = `${data.portalName} - Pagamento`;
    }
    if (portalBrandEl && data?.brandLabel) {
      portalBrandEl.textContent = data.brandLabel;
    }
    if (data?.showPayments === false) {
      window.location.href = "/";
    }
    if (payCard && data?.mpEnabled === false) {
      payCard.disabled = true;
      payCard.classList.add("disabled");
    }
    if (cardBrick && data?.mpEnabled === false) {
      cardBrick.style.display = "none";
    }
  } catch {
    // silent
  }
}

async function loadItem() {
  const basketMode = isBasketMode();
  const { type, id } = getParams();
  if (!type || !id) {
    if (!basketMode) {
      paymentTitle.textContent = "Item nao encontrado";
      return;
    }
  }

  try {
    if (basketMode) {
      const basketItems = getBasketItems();
      if (!basketItems.length) {
        paymentTitle.textContent = "Nenhum item na cesta";
        paymentDescription.textContent = "Selecione itens no catalogo para continuar.";
        showPaymentMessage("Selecione itens no catalogo antes de pagar.", "warning");
        if (payPix) payPix.disabled = true;
        if (payCard) payCard.disabled = true;
        return;
      }
      const loaded = await Promise.all(
        basketItems.map(async (entry) => {
          const endpoint = entry.itemType === "service" ? "/api/services/" : "/api/products/";
          const resp = await axios.get(`${endpoint}${entry.itemId}`);
          return { ...resp.data, itemType: entry.itemType, quantity: entry.quantity || 1 };
        })
      );
      selectedItems = loaded.filter(Boolean);
      selectedItem = null;
      paymentTotal = 0;
      requiresAddress = false;
      marketplaceItems = [];
      const rows = [];
      selectedItems.forEach((item) => {
        const hasPromo = item.promotion && item.promotion.promoPrice && item.promotion.active;
        const price = Number(hasPromo ? item.promotion.promoPrice : item.regularPrice);
        const qty = Math.max(1, Number(item.quantity || 1));
        const subtotal = price * qty;
        paymentTotal += subtotal;
        if (item.fulfillmentType === "physical") requiresAddress = true;
        if (item.fulfillmentType === "marketplace") {
          marketplaceItems.push({ name: item.name, externalUrl: item.externalUrl || "" });
        }
        const marketplaceLine =
          item.fulfillmentType === "marketplace" && item.externalUrl
            ? `<span class="basket-marketplace">Compre tambem em: <a href="${item.externalUrl}" target="_blank">${getPlatformLabel(item.externalUrl) || "plataforma"}</a></span>`
            : "";
        rows.push(
          `<div class="basket-summary-item">
            <div class="basket-summary-header">${item.name}</div>
            ${marketplaceLine}
            <img src="${item.imageUrl}" alt="${item.name}" />
            <div>
              <span>${formatPrice(price)} x ${qty}</span>
              <strong>${formatPrice(subtotal)}</strong>
            </div>
            <button class="btn ghost" type="button" data-action="remove-summary" data-id="${item.id}" data-type="${item.itemType}">
              Remover
            </button>
          </div>`
        );
      });
      paymentTitle.textContent = "Pagamento do pedido";
      paymentDescription.textContent = "Revise os itens antes de finalizar o pagamento.";
      if (paymentImage) paymentImage.style.display = "none";
      if (basketSummary) basketSummary.style.display = "grid";
      if (basketSummaryList) basketSummaryList.innerHTML = rows.join("");
      if (basketSummaryTotal) basketSummaryTotal.textContent = formatPrice(paymentTotal);
      const qtyCount = selectedItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
      if (basketCountLabel) basketCountLabel.textContent = `${qtyCount} itens`;
      trackPixel("InitiateCheckout", {
        content_type: "bundle",
        content_ids: selectedItems.map((item) => `${item.itemType}:${item.id}`),
        value: Number(paymentTotal || 0),
        currency: "BRL"
      });
      sendEvent("bundle", 0, "initiate_checkout", {
        itemCount: selectedItems.length,
        value: Number(paymentTotal || 0)
      });
      if (paymentOldPrice) paymentOldPrice.textContent = "";
      if (paymentNewPrice) paymentNewPrice.textContent = formatPrice(paymentTotal);
      updateShippingUI();
      if (marketplaceNotice && marketplaceLinks) {
        marketplaceNotice.style.display = "none";
        marketplaceLinks.innerHTML = "";
      }
      return;
    }

    if (basketSummary) basketSummary.style.display = "none";

    const endpoint = type === "service" ? "/api/services/" : "/api/products/";
    const { data } = await axios.get(`${endpoint}${id}`);
    if (!data) {
      paymentTitle.textContent = "Item nao encontrado";
      showPaymentMessage("Nao foi possivel carregar o item.", "warning");
      return;
    }
    const hasPromo = data.promotion && data.promotion.promoPrice && data.promotion.active;
    selectedItem = { ...data, itemType: type };
    selectedItems = [];
    selectedItem.payAmount = Number(hasPromo ? data.promotion.promoPrice : data.regularPrice);
    paymentTotal = selectedItem.payAmount;
    trackPixel("InitiateCheckout", {
      content_type: type,
      content_ids: [`${type}:${selectedItem.id}`],
      value: Number(paymentTotal || 0),
      currency: "BRL"
    });
    sendEvent(type, Number(selectedItem.id), "initiate_checkout", {
      value: Number(paymentTotal || 0)
    });
    requiresAddress = data.fulfillmentType === "physical";
    marketplaceItems =
      data.fulfillmentType === "marketplace"
        ? [{ name: data.name, externalUrl: data.externalUrl || "" }]
        : [];
    paymentTitle.textContent = data.name;
    paymentDescription.textContent = data.description;
    if (paymentImage) {
      paymentImage.src = data.imageUrl;
      paymentImage.alt = data.name;
      paymentImage.style.display = "";
    }
    if (paymentOldPrice) {
      paymentOldPrice.textContent = hasPromo ? formatPrice(data.regularPrice) : "";
    }
    if (paymentNewPrice) {
      paymentNewPrice.textContent = formatPrice(hasPromo ? data.promotion.promoPrice : data.regularPrice);
    }
    updateShippingUI();
    updateMarketplaceUI();
  } catch {
    paymentTitle.textContent = "Item indisponivel";
    showPaymentMessage("Nao foi possivel carregar o item.", "warning");
    if (payPix) payPix.disabled = true;
    if (payCard) payCard.disabled = true;
  }
}

  if (payPix) {
  payPix.addEventListener("click", async () => {
    if (!selectedItem && !selectedItems.length) return;
    if (!validatePayerFields()) return;
    if (!validateShippingFields()) return;
    showPaymentMessage("");
    hideCardBrick();
    hidePixResult();
    stopStatusPoll();
    currentOrderId = "";
    showStatusLink(null);

    const email = payerEmail ? payerEmail.value.trim() : "";
    const phone = payerPhone ? payerPhone.value.trim() : "";

    try {
      const response = await axios.post("/api/payments/pix", {
        ...(selectedItems.length
          ? {
              items: selectedItems.map((item) => ({
                itemType: item.itemType,
                itemId: item.id,
                quantity: item.quantity || 1
              }))
            }
          : { itemType: selectedItem.itemType, itemId: selectedItem.id }),
        payerEmail: email,
        payerPhone: phone,
        shippingAddress: requiresAddress ? getShippingAddress() : null
      });
      const data = response.data || {};
        currentOrderId = data.order_id || "";
        if (currentOrderId && isBasketMode()) {
          setBasketItems([]);
        }
        trackPixel("AddPaymentInfo", {
          content_type: selectedItems.length ? "bundle" : selectedItem?.itemType,
          content_ids: selectedItems.length
            ? selectedItems.map((item) => `${item.itemType}:${item.id}`)
            : [`${selectedItem?.itemType}:${selectedItem?.id}`],
          value: Number(paymentTotal || 0),
          currency: "BRL",
          payment_method: "pix"
        });
        if (selectedItems.length) {
          sendEvent("bundle", 0, "pix_generated", { value: Number(paymentTotal || 0) });
        } else if (selectedItem?.itemType) {
          sendEvent(selectedItem.itemType, Number(selectedItem.id), "pix_generated", {
            value: Number(paymentTotal || 0)
          });
        }

      if (data.qr_code_base64) {
        pixImage.src = data.qr_code_base64.startsWith("data:")
          ? data.qr_code_base64
          : `data:image/png;base64,${data.qr_code_base64}`;
      } else if (data.qr_image_url) {
        pixImage.src = data.qr_image_url;
      } else {
        pixImage.src = "";
      }
      if (pixCode) pixCode.value = data.qr_code || "";
      if (pixLink) {
        pixLink.href = data.ticket_url || "#";
        pixLink.style.display = data.ticket_url ? "inline-flex" : "none";
      }
      showPixResult();
      if (pixResult) pixResult.classList.add("centered");

      if (data.source === "mercadopago" && currentOrderId) {
        const statusUrl = buildStatusUrl(currentOrderId);
        showStatusLink(statusUrl);
        if (data.status === "approved") {
          window.location.href = statusUrl;
          return;
        }
      }

      if (data.payment_id) {
        startStatusPoll(data.payment_id);
      }

      if (data.source === "local") {
        showPaymentMessage("PIX do lojista pronto. Use o QR ou copie a chave.", "success");
      } else {
        showPaymentMessage(
          "Apos o pagamento, aguarde a confirmacao ou envie o comprovante para nosso contato.",
          "success"
        );
      }
    } catch (err) {
      console.error("Erro Mercado Pago (pix):", err?.response?.data || err);
      const reason = err?.response?.data?.error;
      const details = err?.response?.data?.details || "";
      if (err?.response?.status === 401) {
        showPaymentMessage(
          "Nao foi possivel concluir o pagamento agora. Tente novamente em instantes.",
          "warning"
        );
        return;
      }
      if (reason === "invalid_email") {
        showPaymentMessage("Informe um email valido para continuar.", "warning");
        return;
      }
      if (reason === "pix_unavailable") {
        showPaymentMessage("PIX indisponivel. Configure Mercado Pago ou chave PIX no admin.", "warning");
        return;
      }
      if (reason === "missing_access_token") {
        showPaymentMessage("Pagamento indisponivel. Configure o Mercado Pago.", "warning");
        return;
      }
      if (reason === "missing_address") {
        showPaymentMessage("Informe o endereco de entrega para continuar.", "warning");
        return;
      }
      if (details && String(details).toLowerCase().includes("test payments")) {
        showPaymentMessage(
          "Nao foi possivel gerar o PIX agora. Tente novamente ou fale com nossos canais de atendimento.",
          "warning"
        );
        return;
      }
      showPaymentMessage("Nao foi possivel gerar o PIX. Tente novamente.", "error");
    }
  });
}

if (payCard) {
  payCard.addEventListener("click", async () => {
    if (!selectedItem && !selectedItems.length) return;
    if (!validatePayerFields()) return;
    if (!validateShippingFields()) return;
    showPaymentMessage("");
    stopStatusPoll();
    hidePixResult();
    showCardBrick();
    currentOrderId = "";
    showStatusLink(null);

    if (cardBrickLoaded) return;
    if (!portalConfig?.mpPublicKey) {
      showPaymentMessage("Configure a Public Key do Mercado Pago no admin.", "warning");
      return;
    }
    if (!paymentTotal) {
      showPaymentMessage("Nao foi possivel calcular o valor do pedido.", "warning");
      return;
    }
    try {
      await loadMercadoPagoSdk();
      await initCardBrick();
    } catch {
      showPaymentMessage("Nao foi possivel iniciar o checkout de cartao.", "error");
    }
  });
}

async function loadMercadoPagoSdk() {
  if (window.MercadoPago) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function initCardBrick() {
  if (!cardBrickContainer || !portalConfig?.mpPublicKey || !paymentTotal) {
    throw new Error("missing_card_context");
  }
  const mp = new window.MercadoPago(portalConfig.mpPublicKey, { locale: "pt-BR" });
  const bricksBuilder = mp.bricks();

  await bricksBuilder.create("cardPayment", "card-payment-brick", {
    initialization: { amount: Number(paymentTotal || 0) },
    callbacks: {
      onSubmit: async (cardData) => {
        if (!validatePayerFields()) {
          return {};
        }
        try {
          const resp = await axios.post("/api/payments/card-charge", {
            ...(selectedItems.length
              ? {
                  items: selectedItems.map((item) => ({
                    itemType: item.itemType,
                    itemId: item.id,
                    quantity: item.quantity || 1
                  }))
                }
              : { itemType: selectedItem.itemType, itemId: selectedItem.id }),
            ...cardData,
            payer: {
              ...(cardData?.payer || {}),
              email: payerEmail?.value?.trim() || cardData?.payer?.email
            },
            payerPhone: payerPhone?.value?.trim() || "",
            shippingAddress: requiresAddress ? getShippingAddress() : null
          });
            currentOrderId = resp.data?.order_id || "";
            if (currentOrderId && isBasketMode()) {
              setBasketItems([]);
            }
            trackPixel("AddPaymentInfo", {
              content_type: selectedItems.length ? "bundle" : selectedItem?.itemType,
              content_ids: selectedItems.length
                ? selectedItems.map((item) => `${item.itemType}:${item.id}`)
                : [`${selectedItem?.itemType}:${selectedItem?.id}`],
              value: Number(paymentTotal || 0),
              currency: "BRL",
              payment_method: "card"
            });
            if (selectedItems.length) {
              sendEvent("bundle", 0, "card_payment_sent", { value: Number(paymentTotal || 0) });
            } else if (selectedItem?.itemType) {
              sendEvent(selectedItem.itemType, Number(selectedItem.id), "card_payment_sent", {
                value: Number(paymentTotal || 0)
              });
            }
            if (currentOrderId) {
              showStatusLink(buildStatusUrl(currentOrderId));
            }
          if (resp.data?.status === "approved" && currentOrderId) {
            window.location.href = buildStatusUrl(currentOrderId);
            return {};
          }
          showPaymentMessage("Pagamento enviado. Aguarde a confirmacao.", "success");
          if (resp.data?.payment_id) {
            startStatusPoll(resp.data.payment_id);
          }
          return {};
        } catch (err) {
          console.error("Erro Mercado Pago (cartao):", err?.response?.data || err);
          if (err?.response?.data?.error === "missing_address") {
            showPaymentMessage("Informe o endereco de entrega para continuar.", "warning");
            return {};
          }
          if (err?.response?.status === 401) {
            showPaymentMessage(
              "Nao foi possivel concluir o pagamento agora. Tente novamente em instantes.",
              "warning"
            );
            return {};
          }
          const msg =
            err?.response?.data?.error ||
            err?.response?.data?.details ||
            "Erro ao processar cartao.";
          showPaymentMessage(msg, "error");
          return {};
        }
      },
      onError: () => {
        showPaymentMessage("Erro ao carregar o checkout de cartao.", "error");
      },
      onReady: () => {
        cardBrickLoaded = true;
      }
    }
  });
}

if (pixCopy) {
  pixCopy.addEventListener("click", () => {
    if (pixCode && pixCode.value) {
      navigator.clipboard?.writeText?.(pixCode.value).catch(() => {});
    }
  });
}

if (basketSummaryList) {
  basketSummaryList.addEventListener("click", (event) => {
    const action = event.target?.getAttribute("data-action");
    if (action !== "remove-summary") return;
    const itemId = event.target.getAttribute("data-id");
    const itemType = event.target.getAttribute("data-type");
    if (!itemId || !itemType) return;
    const items = getBasketItems().filter(
      (entry) => String(entry.itemId) !== String(itemId) || entry.itemType !== itemType
    );
    setBasketItems(items);
    loadItem();
  });
}

attachPhoneMask(payerPhone);
attachCepMask(shippingPostalCode);
showStatusLink(null);
loadPortalConfig();
loadItem();
