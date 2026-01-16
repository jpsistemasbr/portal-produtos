import { PortalConfig } from "../models/index.js";

function sanitizePublicConfig(config) {
  const data = config.get({ plain: true });
  delete data.mpAccessToken;
  delete data.adminEmail;
  delete data.adminPasswordHash;
  return data;
}

export async function getPortalConfig(_req, res) {
  let config = await PortalConfig.findOne();
  if (!config) {
    config = await PortalConfig.create({});
  }
  res.json(sanitizePublicConfig(config));
}

export async function getPortalConfigAdmin(_req, res) {
  let config = await PortalConfig.findOne();
  if (!config) {
    config = await PortalConfig.create({});
  }
  const data = config.get({ plain: true });
  delete data.adminPasswordHash;
  data.testPayerEmail = process.env.MERCADOPAGO_TEST_PAYER_EMAIL || "";
  data.mpEnv = process.env.MERCADOPAGO_ENV || "";
  res.json(data);
}

export async function updatePortalConfig(req, res) {
  const payload = req.body || {};
  const config = await PortalConfig.findOne();
  if (!config) {
    const created = await PortalConfig.create(payload);
    if (payload.adminPassword) {
      const bcrypt = (await import("bcryptjs")).default;
      const hash = await bcrypt.hash(String(payload.adminPassword), 10);
      await created.update({ adminPasswordHash: hash });
    }
    const data = created.get({ plain: true });
    delete data.adminPasswordHash;
    return res.json(data);
  }
  await config.update({
    brandLabel: payload.brandLabel ?? config.brandLabel,
    portalName: payload.portalName ?? config.portalName,
    heroTagline: payload.heroTagline ?? config.heroTagline,
    heroTitle: payload.heroTitle ?? config.heroTitle,
    heroSubtitle: payload.heroSubtitle ?? config.heroSubtitle,
    promoBandTitle: payload.promoBandTitle ?? config.promoBandTitle,
    promoBandSubtitle: payload.promoBandSubtitle ?? config.promoBandSubtitle,
    promoBandCtaLabel: payload.promoBandCtaLabel ?? config.promoBandCtaLabel,
    promoSectionTitle: payload.promoSectionTitle ?? config.promoSectionTitle,
    menuBgColor: payload.menuBgColor ?? config.menuBgColor,
    pageBgColor: payload.pageBgColor ?? config.pageBgColor,
    textColor: payload.textColor ?? config.textColor,
    adminEmail: payload.adminEmail ?? config.adminEmail,
    showProducts: payload.showProducts ?? config.showProducts,
    showServices: payload.showServices ?? config.showServices,
    showPromotions: payload.showPromotions ?? config.showPromotions,
    showDetails: payload.showDetails ?? config.showDetails,
    showPayments: payload.showPayments ?? config.showPayments,
    showContact: payload.showContact ?? config.showContact,
    showSuccess: payload.showSuccess ?? config.showSuccess,
    successTitle: payload.successTitle ?? config.successTitle,
    successMessage: payload.successMessage ?? config.successMessage,
    supportEmail: payload.supportEmail ?? config.supportEmail,
    supportWhatsApp: payload.supportWhatsApp ?? config.supportWhatsApp,
    pixelEnabled: payload.pixelEnabled ?? config.pixelEnabled,
    pixelId: payload.pixelId ?? config.pixelId,
    mpEnabled: payload.mpEnabled ?? config.mpEnabled,
    mpAccessToken: payload.mpAccessToken ?? config.mpAccessToken,
    mpPublicKey: payload.mpPublicKey ?? config.mpPublicKey,
    pixKey: payload.pixKey ?? config.pixKey,
    pixQrUrl: payload.pixQrUrl ?? config.pixQrUrl,
    mpCheckIntervalMinutes: payload.mpCheckIntervalMinutes ?? config.mpCheckIntervalMinutes
  });
  if (payload.adminPassword) {
    const bcrypt = (await import("bcryptjs")).default;
    const hash = await bcrypt.hash(String(payload.adminPassword), 10);
    await config.update({ adminPasswordHash: hash });
  }
  const data = config.get({ plain: true });
  delete data.adminPasswordHash;
  res.json(data);
}
