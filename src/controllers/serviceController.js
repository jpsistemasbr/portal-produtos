import { Product, Promotion } from "../models/index.js";
import { pickActivePromotion } from "../services/promotionService.js";
import { removeUploadFile } from "../utils/fileUtils.js";

async function loadPromotionsMap(itemType, itemIds) {
  if (!itemIds.length) return new Map();
  const promotions = await Promotion.findAll({
    where: { itemType, itemId: itemIds }
  });
  const map = new Map();
  for (const promo of promotions) {
    const list = map.get(promo.itemId) || [];
    list.push(promo);
    map.set(promo.itemId, list);
  }
  return map;
}

export async function listServices(req, res) {
  const includeInactive = String(req.query.includeInactive || "") === "1";
  const services = await Product.findAll({
    where: {
      type: "service",
      ...(includeInactive ? {} : { active: true })
    }
  });
  const promoMap = await loadPromotionsMap(
    "service",
    services.map((service) => service.id)
  );
  const payload = services.map((service) => {
    const activePromotion = pickActivePromotion(promoMap.get(service.id) || []);
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      imageUrl: service.imageUrl,
      regularPrice: service.regularPrice,
      type: service.type || "service",
      linkDemo: service.linkDemo,
      linkVideo: service.linkVideo,
      fulfillmentType: service.fulfillmentType || "digital",
      externalUrl: service.externalUrl,
      active: service.active,
      detailsList: service.detailsList,
      promotion: activePromotion
        ? {
            id: activePromotion.id,
            title: activePromotion.title,
            promoPrice: activePromotion.promoPrice,
            active: activePromotion.active,
            bannerUrl: activePromotion.bannerUrl,
            startDate: activePromotion.startDate,
            endDate: activePromotion.endDate,
            linkDemo: activePromotion.linkDemo,
            linkVideo: activePromotion.linkVideo,
            linkTarget: activePromotion.linkTarget
          }
        : null
    };
  });
  res.json(payload);
}

export async function getService(req, res) {
  const service = await Product.findOne({
    where: { id: req.params.id, type: "service" }
  });
  if (!service) {
    return res.status(404).json({ error: "not_found" });
  }
  const promotions = await Promotion.findAll({
    where: { itemType: "service", itemId: service.id }
  });
  const activePromotion = pickActivePromotion(promotions || []);
  res.json({
    id: service.id,
    name: service.name,
    description: service.description,
    imageUrl: service.imageUrl,
    regularPrice: service.regularPrice,
    type: service.type || "service",
    linkDemo: service.linkDemo,
    linkVideo: service.linkVideo,
    fulfillmentType: service.fulfillmentType || "digital",
    externalUrl: service.externalUrl,
    active: service.active,
    detailsList: service.detailsList,
        promotion: activePromotion
          ? {
              id: activePromotion.id,
              title: activePromotion.title,
              promoPrice: activePromotion.promoPrice,
              active: activePromotion.active,
              bannerUrl: activePromotion.bannerUrl,
              startDate: activePromotion.startDate,
              endDate: activePromotion.endDate,
          linkDemo: activePromotion.linkDemo,
          linkVideo: activePromotion.linkVideo,
          linkTarget: activePromotion.linkTarget
        }
      : null
  });
}

export async function createService(req, res) {
  const {
    name,
    description,
    imageUrl,
    regularPrice,
    linkDemo,
    linkVideo,
    fulfillmentType,
    externalUrl,
    active,
    detailsList
  } =
    req.body || {};
  if (!name || !description || !imageUrl || !regularPrice) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const service = await Product.create({
    name,
    description,
    imageUrl,
    regularPrice,
    linkDemo: linkDemo || null,
    linkVideo: linkVideo || null,
    type: "service",
    fulfillmentType: fulfillmentType || "digital",
    externalUrl: externalUrl || null,
    active: active ?? true,
    detailsList: detailsList || null
  });
  res.status(201).json(service);
}

export async function updateService(req, res) {
  const service = await Product.findOne({
    where: { id: req.params.id, type: "service" }
  });
  if (!service) {
    return res.status(404).json({ error: "not_found" });
  }
  const body = req.body || {};
  const {
    name,
    description,
    imageUrl,
    regularPrice,
    linkDemo,
    linkVideo,
    fulfillmentType,
    externalUrl,
    active,
    detailsList
  } = body;
  const previousImage = service.imageUrl;
  const hadImageChange =
    Object.prototype.hasOwnProperty.call(body, "imageUrl") &&
    imageUrl !== previousImage;
  await service.update({
    name: name ?? service.name,
    description: description ?? service.description,
    imageUrl: imageUrl ?? service.imageUrl,
    regularPrice: regularPrice ?? service.regularPrice,
    linkDemo: linkDemo ?? service.linkDemo,
    linkVideo: linkVideo ?? service.linkVideo,
    fulfillmentType: fulfillmentType ?? service.fulfillmentType,
    externalUrl: externalUrl ?? service.externalUrl,
    active: active ?? service.active,
    detailsList: detailsList ?? service.detailsList
  });
  if (hadImageChange) {
    removeUploadFile(previousImage);
  }
  res.json(service);
}

export async function deleteService(req, res) {
  const service = await Product.findOne({
    where: { id: req.params.id, type: "service" }
  });
  if (!service) {
    return res.status(404).json({ error: "not_found" });
  }
  removeUploadFile(service.imageUrl);
  await service.destroy();
  res.json({ ok: true });
}
