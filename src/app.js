import express from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/index.js";
import { Event, Product, PortalConfig } from "./models/index.js";
import Service from "./models/service.js";
import { Op } from "sequelize";
import crypto from "crypto";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(
  compression({
    level: 6,
    threshold: 1024
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false
});
const apiSlowDown = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 120,
  delayMs: () => 500
});

app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));

const publicDir = path.join(__dirname, "..", "public");
const portalViewsDir = path.join(publicDir, "portal", "views");
const adminViewsDir = path.join(publicDir, "admin", "views");
const uploadsDir = path.join(publicDir, "uploads");

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function detectDevice(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod"))
    return "ios";
  return "pc";
}

function isBotUserAgent(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  return /bot|spider|crawl|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|preview|scanner/.test(
    ua
  );
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((entry) => {
    const [key, ...rest] = entry.trim().split("=");
    if (!key) return;
    cookies[key] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

function getClientId(cookies) {
  return cookies.cid || null;
}

function getSessionId(cookies) {
  return cookies.sid || null;
}

function ensureClientId() {
  const clientId = crypto.randomUUID();
  const cookie = `cid=${clientId}; Path=/; Max-Age=31536000; SameSite=Lax`;
  return { id: clientId, cookie };
}

function ensureSessionId() {
  const sessionId = crypto.randomUUID();
  const cookie = `sid=${sessionId}; Path=/; Max-Age=1800; SameSite=Lax`;
  return { id: sessionId, cookie };
}

function refreshSessionCookie(sessionId) {
  return `sid=${sessionId}; Path=/; Max-Age=1800; SameSite=Lax`;
}

function setCookies(res, cookies) {
  if (!cookies.length) return;
  res.setHeader("Set-Cookie", cookies);
}

async function logPageView(req, res, fileName = "index.html") {
  try {
    const ua = req.headers["user-agent"];
    if (isBotUserAgent(ua)) {
      return res.sendFile(path.join(portalViewsDir, fileName));
    }
    const parsedUrl = new URL(req.originalUrl, `http://${req.headers.host}`);
    const itemType = parsedUrl.searchParams.get("type") || "site";
    const idParam = parsedUrl.searchParams.get("id");
    const itemId = idParam ? Number(idParam) : 0;
    const cookies = parseCookies(req.headers.cookie || "");
    let clientId = getClientId(cookies);
    let sessionId = getSessionId(cookies);
    const cookiesToSet = [];
    if (!clientId) {
      const created = ensureClientId();
      clientId = created.id;
      cookiesToSet.push(created.cookie);
    }
    if (!sessionId) {
      const created = ensureSessionId();
      sessionId = created.id;
      cookiesToSet.push(created.cookie);
    } else {
      cookiesToSet.push(refreshSessionCookie(sessionId));
    }
    setCookies(res, cookiesToSet);
    const pagePath = parsedUrl.pathname;
    const utmSource = parsedUrl.searchParams.get("utm_source");
    const utmMedium = parsedUrl.searchParams.get("utm_medium");
    const utmCampaign = parsedUrl.searchParams.get("utm_campaign");
    const utmContent = parsedUrl.searchParams.get("utm_content");
    const utmTerm = parsedUrl.searchParams.get("utm_term");
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const existing = await Event.findOne({
      where: {
        eventName: "page_view",
        clientId,
        pagePath,
        createdAt: { [Op.gte]: cutoff }
      }
    });
    if (!existing) {
      await Event.create({
        itemType,
        itemId: Number.isNaN(itemId) ? 0 : itemId,
        eventName: "page_view",
        device: detectDevice(req.headers["user-agent"]),
        clientId,
        sessionId,
        pagePath,
        referrer: req.headers.referer || null,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        isBot: false,
        payload: JSON.stringify({
          path: req.path,
          source: "server",
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm
        })
      });
    }
  } catch (err) {
    // fail silent
  }
  res.sendFile(path.join(portalViewsDir, fileName));
}

app.get("/", (req, res) => logPageView(req, res, "index.html"));
app.get("/index.html", (req, res) => logPageView(req, res, "index.html"));
app.get("/detail.html", (req, res) => logPageView(req, res, "detail.html"));
app.get("/payment.html", (req, res) => logPageView(req, res, "payment.html"));
app.get("/success.html", (req, res) => logPageView(req, res, "success.html"));
app.get("/item/produto/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/detail.html?type=product&id=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "detail.html");
});
app.get("/item/servico/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/detail.html?type=service&id=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "detail.html");
});
app.get("/pagar/produto/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/payment.html?type=product&id=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "payment.html");
});
app.get("/pagar/servico/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/payment.html?type=service&id=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "payment.html");
});
app.get("/pagar/cesta", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/payment.html?basket=1${query ? `&${query}` : ""}`;
  return logPageView(req, res, "payment.html");
});
app.get("/sucesso/produto/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/success.html?type=product&id=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "success.html");
});
app.get("/sucesso/servico/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/success.html?type=service&id=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "success.html");
});
app.get("/status-pagamento/produto/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/success.html?type=product&id=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "success.html");
});
app.get("/status-pagamento/servico/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/success.html?type=service&id=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "success.html");
});
app.get("/status-pagamento/pedido/:id", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  req.url = `/success.html?orderId=${req.params.id}${query ? `&${query}` : ""}`;
  return logPageView(req, res, "success.html");
});
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(adminViewsDir, "admin.html"));
});
app.get("/admin-login", (_req, res) => {
  res.sendFile(path.join(adminViewsDir, "admin-login.html"));
});

app.get("/og/:type/:id.png", async (req, res) => {
  try {
    const { type, id } = req.params;
    const itemId = Number(id);
    if (!itemId) return res.status(404).end();
    const model = type === "service" ? Service : Product;
    const item = await model.findByPk(itemId);
    if (!item) return res.status(404).end();

    const title = escapeXml(item.name || "Portal Produtos");
    const subtitle = escapeXml((item.description || "").slice(0, 140));
    const price = item.regularPrice ? `R$ ${Number(item.regularPrice).toFixed(2)}` : "";

    const baseSvg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0b1119"/>
            <stop offset="100%" stop-color="#182232"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" rx="36" fill="url(#bg)"/>
        <rect x="64" y="64" width="1072" height="502" rx="28" fill="#121a25" opacity="0.92"/>
        <text x="120" y="190" font-size="44" font-family="Arial, sans-serif" fill="#f5f7fa" font-weight="700">${title}</text>
        <text x="120" y="250" font-size="24" font-family="Arial, sans-serif" fill="#a9b4c3">${subtitle}</text>
        <text x="120" y="320" font-size="26" font-family="Arial, sans-serif" fill="#ffc476">${escapeXml(price)}</text>
        <text x="120" y="540" font-size="18" font-family="Arial, sans-serif" fill="#ff8a4c">Portal JP Sistemas BR</text>
      </svg>
    `;

    const base = sharp(Buffer.from(baseSvg));
    const composites = [];
    if (item.imageUrl && item.imageUrl.startsWith("/uploads/")) {
      const imagePath = path.join(uploadsDir, path.basename(item.imageUrl));
      try {
        const image = await sharp(imagePath)
          .resize(420, 420, { fit: "cover" })
          .toBuffer();
        composites.push({ input: image, top: 140, left: 720 });
      } catch {
        // ignore missing image
      }
    }

    const png = await base.composite(composites).png().toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(png);
  } catch {
    res.status(500).end();
  }
});

app.use(
  express.static(publicDir, {
    maxAge: "7d",
    setHeaders: (res, filePath) => {
      if (filePath.includes(path.join("public", "shared"))) {
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    }
  })
);

function getBaseUrl(req) {
  const configured = (process.env.PUBLIC_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const host = req.get("host");
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${host}`;
}

app.get("/robots.txt", async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /admin-login",
    "Disallow: /api",
    "Disallow: /uploads",
    `Sitemap: ${baseUrl}/sitemap.xml`
  ].join("\n");
  res.type("text/plain").send(body);
});

app.get("/sitemap.xml", async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const portalConfig = await PortalConfig.findOne();
  const showProducts = portalConfig?.showProducts !== false;
  const showServices = portalConfig?.showServices !== false;
  const urls = [{ loc: `${baseUrl}/`, lastmod: new Date().toISOString() }];

  if (showProducts) {
    const products = await Product.findAll({
      where: { active: true },
      attributes: ["id", "updatedAt"]
    });
    products.forEach((item) => {
      urls.push({
        loc: `${baseUrl}/item/produto/${item.id}`,
        lastmod: item.updatedAt?.toISOString?.() || new Date().toISOString()
      });
    });
  }

  if (showServices) {
    const services = await Service.findAll({
      where: { active: true },
      attributes: ["id", "updatedAt"]
    });
    services.forEach((item) => {
      urls.push({
        loc: `${baseUrl}/item/servico/${item.id}`,
        lastmod: item.updatedAt?.toISOString?.() || new Date().toISOString()
      });
    });
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls
      .map(
        (entry) =>
          `<url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod></url>`
      )
      .join("") +
    "</urlset>";
  res.type("application/xml").send(body);
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/admin", authLimiter);
app.use("/api", apiLimiter, apiSlowDown, apiRoutes);

app.use((err, _req, res, _next) => {
  console.error("[api] internal_error", {
    message: err?.message,
    stack: err?.stack
  });
  res.status(500).json({ error: "internal_error" });
});

export default app;
