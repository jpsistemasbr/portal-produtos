import { Event } from "../models/index.js";
import sequelize from "../config/database.js";
import { fn, col, Op, literal } from "sequelize";

function detectDevice(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "ios";
  }
  return "pc";
}

function isBotUserAgent(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  return /bot|spider|crawl|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|preview|scanner/.test(
    ua
  );
}

function normalizeUtm(value) {
  if (!value) return null;
  return String(value).slice(0, 255);
}

export async function createEvent(req, res) {
  const { itemType, itemId, eventName, device, payload, clientId, pagePath } =
    req.body || {};
  if (!itemType || itemId === undefined || itemId === null || !eventName) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const ua = req.headers["user-agent"];
  if (isBotUserAgent(ua)) {
    return res.status(204).end();
  }
  const detectedDevice = detectDevice(req.headers["user-agent"]);
  const normalizedDevice =
    device && device !== "unknown" ? device : detectedDevice || "unknown";
  const normalizedPayload =
    payload && typeof payload === "string" ? payload : JSON.stringify(payload || null);
  const resolvedPagePath =
    pagePath ||
    (payload && typeof payload === "object" ? payload.pagePath : null) ||
    (payload && typeof payload === "object" ? payload.path : null) ||
    null;
  const resolvedClientId =
    clientId ||
    (payload && typeof payload === "object" ? payload.clientId : null) ||
    null;
  const resolvedSessionId =
    (payload && typeof payload === "object" ? payload.sessionId : null) ||
    null;
  const resolvedReferrer =
    (payload && typeof payload === "object" ? payload.referrer : null) || null;
  const utmSource =
    normalizeUtm(payload && typeof payload === "object" ? payload.utmSource : null);
  const utmMedium =
    normalizeUtm(payload && typeof payload === "object" ? payload.utmMedium : null);
  const utmCampaign =
    normalizeUtm(payload && typeof payload === "object" ? payload.utmCampaign : null);
  const utmContent =
    normalizeUtm(payload && typeof payload === "object" ? payload.utmContent : null);
  const utmTerm =
    normalizeUtm(payload && typeof payload === "object" ? payload.utmTerm : null);
  const durationMs =
    payload && typeof payload === "object" && payload.durationMs !== undefined
      ? Number(payload.durationMs)
      : null;
  if (eventName === "page_view" && resolvedClientId && resolvedPagePath) {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const existing = await Event.findOne({
      where: {
        eventName: "page_view",
        clientId: resolvedClientId,
        pagePath: resolvedPagePath,
        createdAt: { [Op.gte]: cutoff }
      }
    });
    if (existing) {
      return res.status(200).json({ ok: true, deduped: true });
    }
  }
  const event = await Event.create({
    itemType,
    itemId,
    eventName,
    device: normalizedDevice,
    clientId: resolvedClientId,
    pagePath: resolvedPagePath,
    sessionId: resolvedSessionId,
    referrer: resolvedReferrer,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    durationMs: Number.isNaN(durationMs) ? null : durationMs,
    isBot: false,
    payload: normalizedPayload
  });
  res.status(201).json(event);
}

export async function summary(req, res) {
  const rows = await Event.findAll({
    attributes: [
      "itemType",
      "itemId",
      [fn("COUNT", col("id")), "total"]
    ],
    group: ["itemType", "itemId"]
  });

  const summaryMap = rows.reduce((acc, row) => {
    const key = `${row.itemType}:${row.itemId}`;
    acc[key] = Number(row.get("total"));
    return acc;
  }, {});

  res.json(summaryMap);
}

export async function listEvents(req, res) {
  const limit = Math.min(Number(req.query.limit || 200), 500);
  const events = await Event.findAll({
    order: [["createdAt", "DESC"]],
    limit
  });
  res.json(events);
}

export async function metrics(req, res) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfCohort = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [visits, devices, itemClicks] = await Promise.all([
    Event.count({ where: { eventName: "page_view" } }),
    Event.findAll({
      attributes: ["device", [fn("COUNT", col("id")), "total"]],
      where: { eventName: "page_view" },
      group: ["device"]
    }),
    Event.findAll({
      attributes: [
        "itemType",
        "itemId",
        "eventName",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        eventName: [
          "card_click",
          "demo_click",
          "video_click",
          "saiba_mais_click",
          "promo_demo_click",
          "promo_video_click"
        ]
      },
      group: ["itemType", "itemId", "eventName"]
    })
  ]);

  const [
    uniqueVisitorsToday,
    uniqueVisitorsAll,
    sessionsToday,
    timeOnPageToday
  ] = await Promise.all([
    Event.count({
      distinct: true,
      col: "clientId",
      where: {
        eventName: "page_view",
        clientId: { [Op.ne]: null },
        createdAt: { [Op.gte]: startOfDay }
      }
    }),
    Event.count({
      distinct: true,
      col: "clientId",
      where: { eventName: "page_view", clientId: { [Op.ne]: null } }
    }),
    Event.count({
      distinct: true,
      col: "sessionId",
      where: {
        eventName: "page_view",
        sessionId: { [Op.ne]: null },
        createdAt: { [Op.gte]: startOfDay }
      }
    }),
    Event.findAll({
      attributes: [[fn("AVG", col("durationMs")), "avgDuration"]],
      where: { eventName: "time_on_page", createdAt: { [Op.gte]: startOfDay } }
    })
  ]);

  const pageViewsBySession = await Event.findAll({
    attributes: ["sessionId", [fn("COUNT", col("id")), "total"]],
    where: {
      eventName: "page_view",
      sessionId: { [Op.ne]: null },
      createdAt: { [Op.gte]: startOfDay }
    },
    group: ["sessionId"]
  });
  const sessionCounts = pageViewsBySession
    .map((row) => Number(row.get("total")))
    .filter((value) => value > 0);
  const totalSessions = sessionCounts.length;
  const bounceSessions = sessionCounts.filter((count) => count === 1).length;
  const bounceRate = totalSessions ? bounceSessions / totalSessions : 0;

  const funnelEvents = ["page_view", "view_item", "pay_start_click", "purchase"];
  const funnelTotals = await Event.findAll({
    attributes: ["eventName", [fn("COUNT", col("id")), "total"]],
    where: { eventName: funnelEvents },
    group: ["eventName"]
  });
  const funnelSessions = await Event.findAll({
    attributes: ["eventName", [fn("COUNT", literal("DISTINCT sessionId")), "total"]],
    where: { eventName: funnelEvents, sessionId: { [Op.ne]: null } },
    group: ["eventName"]
  });
  const funnel = funnelEvents.map((name) => ({
    eventName: name,
    total:
      Number(funnelTotals.find((row) => row.eventName === name)?.get("total")) || 0,
    sessions:
      Number(funnelSessions.find((row) => row.eventName === name)?.get("total")) || 0
  }));

  const [firstSeenRows] = await sequelize.query(
    `
    SELECT clientId, MIN(date(createdAt)) AS firstDate
    FROM events
    WHERE eventName = 'page_view' AND clientId IS NOT NULL
    GROUP BY clientId;
    `
  );
  const firstSeenMap = new Map(
    (firstSeenRows || []).map((row) => [row.clientId, row.firstDate])
  );
  const [dailyRows] = await sequelize.query(
    `
    SELECT clientId, date(createdAt) AS day
    FROM events
    WHERE eventName = 'page_view'
      AND clientId IS NOT NULL
      AND createdAt >= :startDate
    GROUP BY clientId, day;
    `,
    { replacements: { startDate: startOfCohort.toISOString() } }
  );
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(startOfCohort.getTime() + i * 24 * 60 * 60 * 1000);
    days.push(day.toISOString().slice(0, 10));
  }
  const cohorts = days.map((day) => ({
    date: day,
    newVisitors: 0,
    returningVisitors: 0
  }));
  const dayIndex = new Map(days.map((day, idx) => [day, idx]));
  (dailyRows || []).forEach((row) => {
    const idx = dayIndex.get(row.day);
    if (idx === undefined) return;
    const firstDate = firstSeenMap.get(row.clientId);
    if (firstDate === row.day) {
      cohorts[idx].newVisitors += 1;
    } else {
      cohorts[idx].returningVisitors += 1;
    }
  });

  const deviceBreakdown = devices.reduce((acc, row) => {
    acc[row.device] = Number(row.get("total"));
    return acc;
  }, {});

  res.json({
    visits,
    deviceBreakdown,
    uniqueVisitorsToday,
    uniqueVisitorsAll,
    sessionsToday,
    bounceRateToday: bounceRate,
    avgTimeOnPageTodayMs:
      Number(timeOnPageToday?.[0]?.get("avgDuration")) || 0,
    funnel,
    cohorts,
    itemClicks: itemClicks.map((row) => ({
      itemType: row.itemType,
      itemId: row.itemId,
      eventName: row.eventName,
      total: Number(row.get("total"))
    }))
  });
}

export async function groupedEvents(req, res) {
  const rows = await Event.findAll({
    attributes: [
      "eventName",
      "itemType",
      "itemId",
      "device",
      [fn("COUNT", col("id")), "total"]
    ],
    group: ["eventName", "itemType", "itemId", "device"]
  });

  res.json(
    rows.map((row) => ({
      eventName: row.eventName,
      itemType: row.itemType,
      itemId: row.itemId,
      device: row.device,
      total: Number(row.get("total"))
    }))
  );
}

export async function deleteEvents(req, res) {
  const { eventName, itemType, itemId } = req.body || {};
  if (!eventName) {
    return res.status(400).json({ error: "missing_event_name" });
  }
  const where = { eventName };
  if (itemType) where.itemType = itemType;
  if (itemId !== undefined && itemId !== null) where.itemId = Number(itemId);
  const deleted = await Event.destroy({ where });
  res.json({ ok: true, deleted });
}

export async function deleteAllEvents(_req, res) {
  const deleted = await Event.destroy({ where: {} });
  res.json({ ok: true, deleted });
}
