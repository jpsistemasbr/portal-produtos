import { Promotion, Product } from "../models/index.js";
import { notifyWebhook } from "../services/webhookService.js";
import { removeUploadFile } from "../utils/fileUtils.js";

function normalizeTarget(payload) {
  if (payload.itemType && payload.itemId) {
    return { itemType: payload.itemType, itemId: Number(payload.itemId) };
  }
  if (payload.productId) {
    return { itemType: "product", itemId: Number(payload.productId) };
  }
  if (payload.serviceId) {
    return { itemType: "service", itemId: Number(payload.serviceId) };
  }
  return { itemType: null, itemId: null };
}

async function loadItemMap(promotions) {
  const idsByType = new Map();
  for (const promo of promotions) {
    if (!promo.itemType || !promo.itemId) continue;
    const list = idsByType.get(promo.itemType) || [];
    list.push(promo.itemId);
    idsByType.set(promo.itemType, list);
  }
  const map = new Map();
  for (const [type, ids] of idsByType.entries()) {
    const items = await Product.findAll({
      where: { id: ids, type }
    });
    for (const item of items) {
      map.set(`${type}:${item.id}`, item);
    }
  }
  return map;
}

export async function listPromotions(req, res) {
  const promotions = await Promotion.findAll({ order: [["createdAt", "DESC"]] });
  const itemMap = await loadItemMap(promotions);
  res.json(
    promotions.map((promo) => {
      const item =
        promo.itemType && promo.itemId
          ? itemMap.get(`${promo.itemType}:${promo.itemId}`)
          : null;
      return {
        ...promo.get({ plain: true }),
        itemName: item?.name || null
      };
    })
  );
}

export async function getPromotion(req, res) {
  const promotion = await Promotion.findByPk(req.params.id);
  if (!promotion) {
    return res.status(404).json({ error: "not_found" });
  }
  const item =
    promotion.itemType && promotion.itemId
      ? await Product.findOne({
          where: { id: promotion.itemId, type: promotion.itemType }
        })
      : null;
  res.json({
    ...promotion.get({ plain: true }),
    itemName: item?.name || null
  });
}

export async function createPromotion(req, res) {
  const {
    title,
    promoPrice,
    active,
    startDate,
    endDate,
    bannerUrl,
    linkDemo,
    linkVideo,
    linkTarget,
    itemType,
    itemId,
    productId,
    serviceId
  } = req.body || {};

  const normalizedTarget = normalizeTarget({
    itemType,
    itemId,
    productId,
    serviceId
  });
  if (!title || !promoPrice || !normalizedTarget.itemType || !normalizedTarget.itemId) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const promotion = await Promotion.create({
    title,
    promoPrice,
    active: active ?? true,
    startDate: startDate || null,
    endDate: endDate || null,
    bannerUrl: bannerUrl || null,
    linkDemo: linkDemo || null,
    linkVideo: linkVideo || null,
    linkTarget: linkTarget || "item",
    itemType: normalizedTarget.itemType,
    itemId: normalizedTarget.itemId,
    productId: normalizedTarget.itemType === "product" ? normalizedTarget.itemId : null,
    serviceId: normalizedTarget.itemType === "service" ? normalizedTarget.itemId : null
  });

  await notifyWebhook("promotion_created", promotion);
  res.status(201).json(promotion);
}

export async function updatePromotion(req, res) {
  const promotion = await Promotion.findByPk(req.params.id);
  if (!promotion) {
    return res.status(404).json({ error: "not_found" });
  }

  const body = req.body || {};
  const {
    title,
    promoPrice,
    active,
    startDate,
    endDate,
    bannerUrl,
    linkDemo,
    linkVideo,
    linkTarget,
    itemType,
    itemId,
    productId,
    serviceId
  } = body;

  const normalizedTarget = normalizeTarget({
    itemType: itemType ?? promotion.itemType,
    itemId: itemId ?? promotion.itemId,
    productId: productId ?? promotion.productId,
    serviceId: serviceId ?? promotion.serviceId
  });
  if (!normalizedTarget.itemType || !normalizedTarget.itemId) {
    return res.status(400).json({ error: "invalid_target" });
  }

  const previousBanner = promotion.bannerUrl;
  const hadBannerChange =
    Object.prototype.hasOwnProperty.call(body, "bannerUrl") &&
    bannerUrl !== previousBanner;

  await promotion.update({
    title: title ?? promotion.title,
    promoPrice: promoPrice ?? promotion.promoPrice,
    active: active ?? promotion.active,
    startDate: startDate ?? promotion.startDate,
    endDate: endDate ?? promotion.endDate,
    bannerUrl: bannerUrl ?? promotion.bannerUrl,
    linkDemo: linkDemo ?? promotion.linkDemo,
    linkVideo: linkVideo ?? promotion.linkVideo,
    linkTarget: linkTarget ?? promotion.linkTarget,
    itemType: normalizedTarget.itemType,
    itemId: normalizedTarget.itemId,
    productId: normalizedTarget.itemType === "product" ? normalizedTarget.itemId : null,
    serviceId: normalizedTarget.itemType === "service" ? normalizedTarget.itemId : null
  });

  if (hadBannerChange) {
    removeUploadFile(previousBanner);
  }

  await notifyWebhook("promotion_updated", promotion);
  res.json(promotion);
}

export async function deletePromotion(req, res) {
  const promotion = await Promotion.findByPk(req.params.id);
  if (!promotion) {
    return res.status(404).json({ error: "not_found" });
  }
  removeUploadFile(promotion.bannerUrl);
  await promotion.destroy();
  await notifyWebhook("promotion_deleted", { id: req.params.id });
  res.json({ ok: true });
}
