import { Event } from "../models/index.js";
import { fn, col } from "sequelize";

export async function createEvent(req, res) {
  const { itemType, itemId, eventName, device, payload } = req.body || {};
  if (!itemType || itemId === undefined || itemId === null || !eventName) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const event = await Event.create({
    itemType,
    itemId,
    eventName,
    device: device || "unknown",
    payload: payload ? JSON.stringify(payload) : null
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

  const deviceBreakdown = devices.reduce((acc, row) => {
    acc[row.device] = Number(row.get("total"));
    return acc;
  }, {});

  res.json({
    visits,
    deviceBreakdown,
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
