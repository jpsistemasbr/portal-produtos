import axios from "axios";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { Op } from "sequelize";
import { Product, Promotion, PortalConfig, Order } from "../models/index.js";
import { pickActivePromotion } from "../services/promotionService.js";
import { sendOrderEmail } from "../services/emailService.js";

const MP_API = "https://api.mercadopago.com";

function maskCredential(value) {
  if (!value || typeof value !== "string") return "nao informado";
  const trimmed = value.trim();
  if (trimmed.length <= 6) return `${trimmed[0] || ""}***`;
  return `${trimmed.slice(0, 6)}***${trimmed.slice(-4)}`;
}

function logMpCredentials(label, accessToken) {
  console.log(label, {
    token: maskCredential(accessToken),
    testPayer: maskCredential(process.env.MERCADOPAGO_TEST_PAYER_EMAIL)
  });
}

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.headers.host}`;
}

function normalizeBaseUrl(value, fallback) {
  if (value && /^https?:\/\//i.test(value)) return value;
  if (value) return `https://${value}`;
  return fallback;
}

function sanitizeEnvUrl(value) {
  if (!value) return "";
  return value.split(" ")[0].trim();
}

function resolvePayerEmail(_accessToken, payerEmail) {
  const envMode = String(process.env.MERCADOPAGO_ENV || "").toUpperCase();
  if (envMode === "PROD" || envMode === "PRODUCTION") {
    return payerEmail;
  }
  const envEmail = (process.env.MERCADOPAGO_TEST_PAYER_EMAIL || "").trim();
  if (envEmail) return envEmail;
  return payerEmail;
}

function shouldFallbackToLocalPix(error) {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || "");
  return status === 403 && /test payments|staging/i.test(message);
}

async function buildLocalPixPayload(config) {
  if (!config) return null;
  const pixKey = (config.pixKey || "").trim();
  const pixQrUrl = (config.pixQrUrl || "").trim();
  if (!pixKey && !pixQrUrl) return null;

  let qrCodeBase64 = null;
  if (!pixQrUrl && pixKey) {
    try {
      qrCodeBase64 = await QRCode.toDataURL(pixKey, { width: 240, margin: 1 });
    } catch {
      qrCodeBase64 = null;
    }
  }

  return {
    source: "local",
    qr_code: pixKey || null,
    qr_code_base64: qrCodeBase64,
    qr_image_url: pixQrUrl || null,
    ticket_url: null,
    status: "pending"
  };
}

async function createOrder(payload) {
  try {
    return await Order.create(payload);
  } catch {
    return null;
  }
}

async function updateOrderByPayment(paymentId, updates) {
  if (!paymentId) return;
  await Order.update(updates, { where: { paymentId: String(paymentId) } });
}

async function fetchPaymentStatus(accessToken, paymentId) {
  const resp = await axios.get(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return resp.data || null;
}

async function loadItem(itemType, itemId) {
  if (itemType === "product" || itemType === "service") {
    const item = await Product.findOne({
      where: { id: itemId, type: itemType }
    });
    if (!item) return null;
    const promotions = await Promotion.findAll({
      where: { itemType, itemId: item.id }
    });
    item.Promotions = promotions;
    return item;
  }
  return null;
}

async function buildOrderItems(items) {
  const normalized = [];
  let total = 0;
  let requiresAddress = false;
  const marketplaceItems = [];
  for (const entry of items) {
    const entryType = entry?.itemType;
    const entryId = Number(entry?.itemId);
    if (!entryType || !entryId) continue;
    const item = await loadItem(entryType, entryId);
    if (!item) continue;
    const pricing = buildPricing(item);
    const unitPrice = Number(pricing.price || 0);
    const quantity = Math.max(1, Number(entry?.quantity || 1));
    const subtotal = unitPrice * quantity;
    total += subtotal;
    const fulfillmentType = item.fulfillmentType || "digital";
    const externalUrl = item.externalUrl || null;
    if (fulfillmentType === "physical") requiresAddress = true;
    if (fulfillmentType === "marketplace") {
      marketplaceItems.push({ name: item.name, externalUrl });
    }
    normalized.push({
      itemType: entryType,
      itemId: entryId,
      name: item.name,
      unitPrice,
      quantity,
      subtotal,
      fulfillmentType,
      externalUrl,
      imageUrl: item.imageUrl || null
    });
  }
  return { items: normalized, total, requiresAddress, marketplaceItems };
}

function normalizeShippingAddress(address) {
  if (!address) return null;
  const payload = {
    name: String(address.name || "").trim(),
    postalCode: String(address.postalCode || "").trim(),
    street: String(address.street || "").trim(),
    number: String(address.number || "").trim(),
    complement: String(address.complement || "").trim(),
    district: String(address.district || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim()
  };
  return payload;
}

function buildPricing(item) {
  const activePromotion = pickActivePromotion(item.Promotions || []);
  const price = activePromotion ? Number(activePromotion.promoPrice) : Number(item.regularPrice);
  return { price, promotion: activePromotion };
}

function isValidUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function createPix(req, res) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const { itemType, itemId, payerEmail, payerPhone, items, shippingAddress } = req.body || {};
  const email = String(payerEmail || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "invalid_email" });
  }
  const hasItems = Array.isArray(items) && items.length > 0;
  if (!hasItems && (!itemType || !itemId)) {
    return res.status(400).json({ error: "missing_item" });
  }
  let orderItems = [];
  let totalAmount = 0;
  let mainItem = null;
  let requiresAddress = false;
  if (hasItems) {
    const result = await buildOrderItems(items);
    orderItems = result.items;
    totalAmount = result.total;
    requiresAddress = result.requiresAddress;
  } else {
    const item = await loadItem(itemType, itemId);
    if (!item) {
      return res.status(404).json({ error: "not_found" });
    }
    mainItem = item;
    const { price } = buildPricing(item);
    totalAmount = price;
    orderItems = [
      {
        itemType,
        itemId: item.id,
        name: item.name,
        unitPrice: Number(price || 0),
        quantity: 1,
        subtotal: Number(price || 0),
        fulfillmentType: item.fulfillmentType || "digital",
        externalUrl: item.externalUrl || null,
        imageUrl: item.imageUrl || null
      }
    ];
    requiresAddress = (item.fulfillmentType || "digital") === "physical";
  }
  if (!orderItems.length) {
    return res.status(400).json({ error: "invalid_items" });
  }
  const normalizedAddress = normalizeShippingAddress(shippingAddress);
  if (requiresAddress) {
    const requiredKeys = ["name", "postalCode", "street", "number", "district", "city", "state"];
    const missing = requiredKeys.filter((key) => !normalizedAddress?.[key]);
    if (missing.length) {
      return res.status(400).json({ error: "missing_address" });
    }
  }

  const portalConfig = await PortalConfig.findOne();
  const localPixPayload = await buildLocalPixPayload(portalConfig);
  const mpEnabled = portalConfig?.mpEnabled !== false;
  const mpAccessToken = portalConfig?.mpAccessToken || accessToken;
  const notificationUrl = sanitizeEnvUrl(process.env.MERCADOPAGO_NOTIFICATION_URL);
  const resolvedEmail = resolvePayerEmail(mpAccessToken, email);
  let order = null;
  if (!mpEnabled) {
    if (localPixPayload) return res.json({ ...localPixPayload, order_id: null });
    return res.status(400).json({ error: "pix_unavailable" });
  }
  if (!mpAccessToken) {
    return res.status(400).json({ error: "missing_access_token" });
  }
  logMpCredentials("[pix] Credenciais MP:", mpAccessToken);

  try {
    const response = await axios.post(
      `${MP_API}/v1/payments`,
      {
        transaction_amount: totalAmount,
        payment_method_id: "pix",
        description: mainItem?.name || `Pedido com ${orderItems.length} itens`,
        external_reference: hasItems ? `bundle:${orderItems.length}` : `${itemType}:${itemId}`,
        ...(isValidUrl(notificationUrl) ? { notification_url: notificationUrl } : {}),
        payer: { email: resolvedEmail }
      },
      {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          "X-Idempotency-Key": randomUUID()
        }
      }
    );

    const data = response.data || {};
    const pixMessage = data?.message || data?.status_detail || data?.status || "sucesso";
    console.log("PIX Mercado Pago:", pixMessage, data);
    order = await createOrder({
      itemType: hasItems ? "bundle" : itemType,
      itemId: hasItems ? 0 : mainItem.id,
      itemName: mainItem?.name || `Pedido com ${orderItems.length} itens`,
      amount: totalAmount,
      items: JSON.stringify(orderItems),
      method: "pix",
      status: "pending",
      provider: "mercadopago",
      statusDetail: data.status_detail || null,
      paymentId: data.id ? String(data.id) : null,
      raw: JSON.stringify(data),
      customerEmail: email || null,
      customerPhone: payerPhone || null,
      shippingAddress: normalizedAddress ? JSON.stringify(normalizedAddress) : null
    });
    if (order?.id) {
      await sendOrderEmail({
        to: email,
        portalName: portalConfig?.portalName,
        order,
        items: orderItems
      });
    }
    if (data.id) {
      await updateOrderByPayment(data.id, {
        status: data.status || "pending",
        statusDetail: data.status_detail || null,
        paymentId: String(data.id),
        raw: JSON.stringify(data),
        provider: "mercadopago"
      });
    }
    res.json({
      source: "mercadopago",
      order_id: order?.id || null,
      payment_id: data.id || null,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code || null,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      ticket_url: data.point_of_interaction?.transaction_data?.ticket_url || null,
      status: data.status || null
    });
  } catch (error) {
    console.error("Erro ao gerar PIX (Mercado Pago):", error?.response?.data || error);
    if (shouldFallbackToLocalPix(error)) {
      if (localPixPayload) {
        return res.json({ ...localPixPayload, order_id: null });
      }
    }
    if (order?.id) {
      await Order.update(
        { status: "failed", notes: error?.response?.data?.message || "pix_error" },
        { where: { id: order.id } }
      );
    }
    const statusCode = error?.response?.status || 500;
    return res.status(statusCode).json({
      error: "pix_error",
      details: error?.response?.data?.message || error?.message || "pix_error"
    });
  }
}

export async function createCardPreference(req, res) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const { itemType, itemId } = req.body || {};
  if (!itemType || !itemId) {
    return res.status(400).json({ error: "missing_item" });
  }
  const item = await loadItem(itemType, itemId);
  if (!item) {
    return res.status(404).json({ error: "not_found" });
  }
  const { price } = buildPricing(item);
  const portalConfig = await PortalConfig.findOne();
  const mpEnabled = portalConfig?.mpEnabled !== false;
  const mpAccessToken = portalConfig?.mpAccessToken || accessToken;
  if (!mpEnabled) {
    return res.status(400).json({ error: "mp_disabled" });
  }
  if (!mpAccessToken) {
    return res.status(400).json({ error: "missing_access_token" });
  }
  const baseUrl = normalizeBaseUrl(sanitizeEnvUrl(process.env.SITE_URL), getBaseUrl(req));
  const detailType = itemType === "service" ? "servico" : "produto";
  const successUrl = `${baseUrl}/status-pagamento/${detailType}/${item.id}?status=approved&method=card`;
  const pendingUrl = `${baseUrl}/status-pagamento/${detailType}/${item.id}?status=pending&method=card`;
  const failureUrl = `${baseUrl}/status-pagamento/${detailType}/${item.id}?status=failed&method=card`;
  const autoReturn = successUrl.startsWith("https://") ? "approved" : undefined;

  const response = await axios.post(
    `${MP_API}/checkout/preferences`,
    {
      items: [
        {
          title: item.name,
          quantity: 1,
          currency_id: "BRL",
          unit_price: price
        }
      ],
      external_reference: `${itemType}:${item.id}`,
      back_urls: {
        success: successUrl,
        pending: pendingUrl,
        failure: failureUrl
      },
      ...(autoReturn ? { auto_return: autoReturn } : {})
    },
    {
      headers: { Authorization: `Bearer ${mpAccessToken}` }
    }
  );

  const data = response.data || {};
  res.json({
    preferenceId: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point
  });
}

export async function createCardCharge(req, res) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const {
    itemType,
    itemId,
    token,
    payment_method_id,
    issuer_id,
    installments,
    payer = {},
    payerPhone,
    items,
    shippingAddress
  } = req.body || {};
  const hasItems = Array.isArray(items) && items.length > 0;
  if ((!hasItems && (!itemType || !itemId)) || !token || !payment_method_id) {
    return res.status(400).json({ error: "missing_card_fields" });
  }

  let orderItems = [];
  let totalAmount = 0;
  let mainItem = null;
  let requiresAddress = false;
  if (hasItems) {
    const result = await buildOrderItems(items);
    orderItems = result.items;
    totalAmount = result.total;
    requiresAddress = result.requiresAddress;
  } else {
    const item = await loadItem(itemType, itemId);
    if (!item) {
      return res.status(404).json({ error: "not_found" });
    }
    mainItem = item;
    const { price } = buildPricing(item);
    totalAmount = price;
    orderItems = [
      {
        itemType,
        itemId: item.id,
        name: item.name,
        unitPrice: Number(price || 0),
        quantity: 1,
        subtotal: Number(price || 0),
        fulfillmentType: item.fulfillmentType || "digital",
        externalUrl: item.externalUrl || null
      }
    ];
    requiresAddress = (item.fulfillmentType || "digital") === "physical";
  }
  if (!orderItems.length) {
    return res.status(400).json({ error: "invalid_items" });
  }
  const normalizedAddress = normalizeShippingAddress(shippingAddress);
  if (requiresAddress) {
    const requiredKeys = ["name", "postalCode", "street", "number", "district", "city", "state"];
    const missing = requiredKeys.filter((key) => !normalizedAddress?.[key]);
    if (missing.length) {
      return res.status(400).json({ error: "missing_address" });
    }
  }

  const portalConfig = await PortalConfig.findOne();
  const mpEnabled = portalConfig?.mpEnabled !== false;
  const mpAccessToken = portalConfig?.mpAccessToken || accessToken;
  if (!mpEnabled) {
    return res.status(400).json({ error: "mp_disabled" });
  }
  if (!mpAccessToken) {
    return res.status(400).json({ error: "missing_access_token" });
  }
  logMpCredentials("[cartao] Credenciais MP:", mpAccessToken);

  const notificationUrl = sanitizeEnvUrl(process.env.MERCADOPAGO_NOTIFICATION_URL);
  const email = resolvePayerEmail(mpAccessToken, payer.email || "cliente@portal.com");
  let order = null;

  try {
    const response = await axios.post(
      `${MP_API}/v1/payments`,
      {
        transaction_amount: totalAmount,
        token,
        description: mainItem?.name || `Pedido com ${orderItems.length} itens`,
        installments: Number(installments) || 1,
        payment_method_id,
        issuer_id: issuer_id || undefined,
        external_reference: hasItems ? `bundle:${orderItems.length}` : `${itemType}:${itemId}`,
        ...(isValidUrl(notificationUrl) ? { notification_url: notificationUrl } : {}),
        payer: {
          email,
          identification: payer.identification || undefined
        }
      },
      {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          "X-Idempotency-Key": randomUUID()
        }
      }
    );

    const data = response.data || {};
    const cardMessage = data?.message || data?.status_detail || data?.status || "sucesso";
    console.log("Cartao Mercado Pago:", cardMessage, data);
    order = await createOrder({
      itemType: hasItems ? "bundle" : itemType,
      itemId: hasItems ? 0 : mainItem.id,
      itemName: mainItem?.name || `Pedido com ${orderItems.length} itens`,
      amount: totalAmount,
      items: JSON.stringify(orderItems),
      method: "card",
      status: "pending",
      provider: "mercadopago",
      statusDetail: data.status_detail || null,
      paymentId: data.id ? String(data.id) : null,
      raw: JSON.stringify(data),
      customerEmail: payer.email || null,
      customerPhone: payerPhone || null,
      shippingAddress: normalizedAddress ? JSON.stringify(normalizedAddress) : null
    });
    if (order?.id) {
      await sendOrderEmail({
        to: payer.email,
        portalName: portalConfig?.portalName,
        order,
        items: orderItems
      });
    }
    if (data.id) {
      await updateOrderByPayment(data.id, {
        status: data.status || "pending",
        statusDetail: data.status_detail || null,
        paymentId: String(data.id),
        raw: JSON.stringify(data),
        provider: "mercadopago"
      });
    }
    res.json({
      order_id: order?.id || null,
      payment_id: data.id,
      status: data.status,
      status_detail: data.status_detail
    });
  } catch (error) {
    console.error("Erro ao processar cartao (Mercado Pago):", error?.response?.data || error);
    if (order?.id) {
      await Order.update(
        { status: "failed", notes: error?.response?.data?.message || "card_error" },
        { where: { id: order.id } }
      );
    }
    const statusCode = error?.response?.status || 500;
    res.status(statusCode).json({
      error: "card_error",
      details: error?.response?.data?.message || error?.message || "card_error"
    });
  }
}

export async function handleWebhook(_req, res) {
  res.status(200).json({ ok: true });
}

export async function checkPaymentStatus(req, res) {
  const { paymentId } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: "missing_payment_id" });
  const portalConfig = await PortalConfig.findOne();
  const mpAccessToken = portalConfig?.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!mpAccessToken) return res.status(400).json({ error: "missing_access_token" });

  try {
    const data = await fetchPaymentStatus(mpAccessToken, paymentId);
    if (data?.id) {
      await updateOrderByPayment(data.id, {
        status: data.status || "pending",
        statusDetail: data.status_detail || null,
        raw: JSON.stringify(data),
        provider: "mercadopago"
      });
    }
    res.json({
      payment_id: data?.id || null,
      status: data?.status || null,
      status_detail: data?.status_detail || null
    });
  } catch (error) {
    res.status(500).json({
      error: "status_error",
      details: error?.response?.data?.message || error?.message || "status_error"
    });
  }
}

export async function runPaymentCron() {
  const portalConfig = await PortalConfig.findOne();
  const mpAccessToken =
    portalConfig?.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!portalConfig?.mpEnabled || !mpAccessToken) return;
  logMpCredentials("[cron] Credenciais MP:", mpAccessToken);

  const pending = await Order.findAll({
    where: {
      status: { [Op.in]: ["pending", "in_process"] },
      paymentId: { [Op.ne]: null },
      [Op.or]: [{ provider: "mercadopago" }, { provider: null }]
    },
    order: [["createdAt", "DESC"]],
    limit: 200
  });

  console.log(`[cron] Pendentes para checagem: ${pending.length}`);
  let updatedCount = 0;
  for (const payment of pending) {
    if (!payment.paymentId) continue;
    try {
      const data = await fetchPaymentStatus(mpAccessToken, payment.paymentId);
      await Order.update(
        {
          status: data?.status || null,
          statusDetail: data?.status_detail || null,
          raw: data ? JSON.stringify(data) : payment.raw
        },
        { where: { id: payment.id } }
      );
      if (data?.id) {
        await updateOrderByPayment(data.id, { status: data.status || "pending" });
      }
      updatedCount += 1;
    } catch (error) {
      const details = error?.response?.data || error?.message || error;
      console.error(
        `[cron] Falha ao atualizar pagamento ${payment.paymentId}:`,
        details
      );
    }
  }
  console.log(`[cron] Atualizados: ${updatedCount}`);
}
