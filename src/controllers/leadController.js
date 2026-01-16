import { Lead } from "../models/index.js";

export async function listLeads(_req, res) {
  const leads = await Lead.findAll({ order: [["createdAt", "DESC"]], limit: 200 });
  res.json(leads);
}

export async function createLead(req, res) {
  const { name, email, phone, source } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const lead = await Lead.create({
    name,
    email,
    phone: phone || null,
    source: source || null
  });
  res.status(201).json(lead);
}

export async function deleteLead(req, res) {
  const lead = await Lead.findByPk(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: "not_found" });
  }
  await lead.destroy();
  res.json({ ok: true });
}

export async function deleteAllLeads(_req, res) {
  const deleted = await Lead.destroy({ where: {} });
  res.json({ ok: true, deleted });
}
