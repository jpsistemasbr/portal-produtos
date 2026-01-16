import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/index.js";
import { Event } from "./models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, "..", "public");

function detectDevice(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod"))
    return "ios";
  return "pc";
}

async function logPageView(req, res, fileName = "index.html") {
  try {
    const parsedUrl = new URL(req.originalUrl, `http://${req.headers.host}`);
    const itemType = parsedUrl.searchParams.get("type") || "site";
    const idParam = parsedUrl.searchParams.get("id");
    const itemId = idParam ? Number(idParam) : 0;
    await Event.create({
      itemType,
      itemId: Number.isNaN(itemId) ? 0 : itemId,
      eventName: "page_view",
      device: detectDevice(req.headers["user-agent"]),
      payload: JSON.stringify({ path: req.path, source: "server" })
    });
  } catch (err) {
    // fail silent
  }
  res.sendFile(path.join(publicDir, fileName));
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
  res.sendFile(path.join(publicDir, "admin.html"));
});
app.get("/admin-login", (_req, res) => {
  res.sendFile(path.join(publicDir, "admin-login.html"));
});

app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: "internal_error" });
});

export default app;
