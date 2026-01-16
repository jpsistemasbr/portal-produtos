export function isPromotionActive(promotion) {
  if (!promotion || !promotion.active) return false;
  const now = new Date();
  if (promotion.startDate && new Date(promotion.startDate) > now) return false;
  if (promotion.endDate && new Date(promotion.endDate) < now) return false;
  return true;
}

export function pickActivePromotion(promotions) {
  const activePromos = (promotions || []).filter(isPromotionActive);
  return activePromos.length ? activePromos[0] : null;
}
