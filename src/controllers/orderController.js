import { Order } from "../models/index.js";

export async function listOrdersAdmin(_req, res) {
  const orders = await Order.findAll({ order: [["createdAt", "DESC"]], limit: 200 });
  res.json(
    orders.map((order) => ({
      id: order.id,
      itemType: order.itemType,
      itemId: order.itemId,
      itemName: order.itemName,
      amount: order.amount,
      items: order.items,
      method: order.method,
      provider: order.provider,
      status: order.status,
      statusDetail: order.statusDetail,
      paymentId: order.paymentId,
      raw: order.raw,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      notes: order.notes,
      createdAt: order.createdAt
    }))
  );
}

export async function getOrderStatus(req, res) {
  const itemType = String(req.query.type || "");
  const itemId = Number(req.query.id || 0);
  if (!itemType || !itemId) {
    return res.status(400).json({ error: "missing_item" });
  }
  const where = { itemType, itemId };
  const email = String(req.query.email || "").trim();
  const phone = String(req.query.phone || "").trim();
  if (email) where.customerEmail = email;
  if (phone) where.customerPhone = phone;
  const order = await Order.findOne({ where, order: [["createdAt", "DESC"]] });
  if (!order) {
    return res.status(404).json({ error: "not_found" });
  }
  res.json({
    id: order.id,
    itemType: order.itemType,
    itemId: order.itemId,
    itemName: order.itemName,
    amount: order.amount,
    items: order.items,
    method: order.method,
    provider: order.provider,
    status: order.status,
    statusDetail: order.statusDetail,
    paymentId: order.paymentId,
    raw: order.raw,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt
  });
}

export async function getOrderPublic(req, res) {
  const { id } = req.params;
  const order = await Order.findByPk(id);
  if (!order) return res.status(404).json({ error: "not_found" });
  res.json({
    id: order.id,
    itemType: order.itemType,
    itemId: order.itemId,
    itemName: order.itemName,
    amount: order.amount,
    method: order.method,
    provider: order.provider,
    status: order.status,
    statusDetail: order.statusDetail,
    paymentId: order.paymentId,
    raw: order.raw,
    items: order.items,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt
  });
}

export async function markOrderPaid(req, res) {
  const { id } = req.params;
  const order = await Order.findByPk(id);
  if (!order) return res.status(404).json({ error: "not_found" });
  await order.update({ status: "paid" });
  res.json({ ok: true });
}

export async function deleteOrder(req, res) {
  const { id } = req.params;
  const order = await Order.findByPk(id);
  if (!order) return res.status(404).json({ error: "not_found" });
  await order.destroy();
  res.json({ ok: true });
}
