import { pickActivePromotion } from "../services/promotionService.js";
import { Product, Promotion } from "../models/index.js";
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

export async function listProducts(req, res) {
  const includeInactive = String(req.query.includeInactive || "") === "1";
  const products = await Product.findAll({
    where: {
      type: "product",
      ...(includeInactive ? {} : { active: true })
    }
  });
  const promoMap = await loadPromotionsMap(
    "product",
    products.map((product) => product.id)
  );
  const payload = products.map((product) => {
    const activePromotion = pickActivePromotion(promoMap.get(product.id) || []);
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      regularPrice: product.regularPrice,
      type: product.type || "product",
      linkDemo: product.linkDemo,
      linkVideo: product.linkVideo,
      fulfillmentType: product.fulfillmentType || "digital",
      externalUrl: product.externalUrl,
      active: product.active,
      detailsList: product.detailsList,
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

export async function getProduct(req, res) {
  const product = await Product.findOne({
    where: { id: req.params.id, type: "product" }
  });
  if (!product) {
    return res.status(404).json({ error: "not_found" });
  }
  const promotions = await Promotion.findAll({
    where: { itemType: "product", itemId: product.id }
  });
  const activePromotion = pickActivePromotion(promotions || []);
  res.json({
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    regularPrice: product.regularPrice,
    type: product.type || "product",
    linkDemo: product.linkDemo,
    linkVideo: product.linkVideo,
    fulfillmentType: product.fulfillmentType || "digital",
    externalUrl: product.externalUrl,
    active: product.active,
    detailsList: product.detailsList,
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

export async function createProduct(req, res) {
  const {
    name,
    description,
    imageUrl,
    regularPrice,
    linkDemo,
    linkVideo,
    type,
    fulfillmentType,
    externalUrl,
    active,
    detailsList
  } =
    req.body || {};
  if (!name || !description || !imageUrl || !regularPrice) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const product = await Product.create({
    name,
    description,
    imageUrl,
    regularPrice,
    linkDemo: linkDemo || null,
    linkVideo: linkVideo || null,
    type: type === "service" ? "service" : "product",
    fulfillmentType: fulfillmentType || "digital",
    externalUrl: externalUrl || null,
    active: active ?? true,
    detailsList: detailsList || null
  });
  res.status(201).json(product);
}

export async function updateProduct(req, res) {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
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
    type,
    fulfillmentType,
    externalUrl,
    active,
    detailsList
  } = body;
  const previousImage = product.imageUrl;
  const hadImageChange =
    Object.prototype.hasOwnProperty.call(body, "imageUrl") &&
    imageUrl !== previousImage;
  await product.update({
    name: name ?? product.name,
    description: description ?? product.description,
    imageUrl: imageUrl ?? product.imageUrl,
    regularPrice: regularPrice ?? product.regularPrice,
    linkDemo: linkDemo ?? product.linkDemo,
    linkVideo: linkVideo ?? product.linkVideo,
    type: type === "service" ? "service" : type === "product" ? "product" : product.type,
    fulfillmentType: fulfillmentType ?? product.fulfillmentType,
    externalUrl: externalUrl ?? product.externalUrl,
    active: active ?? product.active,
    detailsList: detailsList ?? product.detailsList
  });
  if (hadImageChange) {
    removeUploadFile(previousImage);
  }
  res.json(product);
}

export async function deleteProduct(req, res) {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "not_found" });
  }
  removeUploadFile(product.imageUrl);
  await product.destroy();
  res.json({ ok: true });
}
