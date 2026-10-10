import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const router = Router();
router.use(requireAuth);

function toClient(row) {
  return { ...row, id: row.id ?? row.complaint_id, date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "", mine: true, confirmed: false, photo: "", history: row.history || [] };
}

router.post("/", async (req, res, next) => {
  let client;
  let transaction = false;
  try {
    const { title, category, description, location, anonymous = false } = req.body || {};
    if (![title, category, description, location].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Title, category, description and location are required" });
    }
    client = await pool.connect();
    await client.query("BEGIN"); transaction = true;
    const result = await client.query(
      `INSERT INTO complaints (user_id,title,category,description,location,is_anonymous)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING complaint_id AS id, public_id, title, category, description, location, status, is_anonymous, created_at, updated_at`,
      [req.user.sub, title.trim(), category.trim(), description.trim(), location.trim(), Boolean(anonymous)]
    );
    const c = result.rows[0];
    await client.query(
      `INSERT INTO complaint_history (complaint_id,changed_by,old_status,new_status,remarks,status,note)
       VALUES ($1,$2,NULL,$3,$4,$3,$4)`, [c.id, req.user.sub, c.status, "Complaint submitted"]
    );
    await client.query("COMMIT"); transaction = false;
    res.status(201).json({ complaint: toClient(c) });
  } catch (err) { if (client && transaction) await client.query("ROLLBACK").catch(() => {}); next(err); }
  finally { client?.release(); }
});

router.get("/mine", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.complaint_id AS id,c.public_id,c.title,c.category,c.description,c.location,c.status,c.is_anonymous,c.created_at,c.updated_at
       FROM complaints c WHERE c.user_id=$1 ORDER BY c.created_at DESC`, [req.user.sub]
    );
    res.json({ complaints: result.rows.map(toClient) });
  } catch (err) { next(err); }
});

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.complaint_id AS id,c.public_id,c.title,c.category,c.description,c.location,c.status,c.is_anonymous,c.created_at,c.updated_at,
       CASE WHEN c.is_anonymous THEN 'Anonymous' ELSE COALESCE(u.name,'Former user') END AS reporter
       FROM complaints c LEFT JOIN users u ON u.user_id=c.user_id ORDER BY c.created_at DESC LIMIT 500`
    );
    res.json({ complaints: result.rows.map(r => ({ ...toClient(r), mine: false })) });
  } catch (err) { next(err); }
});

router.patch("/:id/status", requireAdmin, async (req, res, next) => {
  let client; let transaction = false;
  try {
    const allowed = ["Pending", "In Progress", "Completed"];
    const { status, note = "" } = req.body || {};
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    client = await pool.connect(); await client.query("BEGIN"); transaction = true;
    const current = await client.query("SELECT status FROM complaints WHERE complaint_id=$1 FOR UPDATE", [req.params.id]);
    if (!current.rowCount) { await client.query("ROLLBACK"); transaction = false; return res.status(404).json({ error: "Complaint not found" }); }
    const oldStatus = current.rows[0].status;
    const updated = await client.query(
      `UPDATE complaints SET status=$1,updated_at=NOW() WHERE complaint_id=$2
       RETURNING complaint_id AS id,public_id,status,updated_at`, [status, req.params.id]
    );
    await client.query(
      `INSERT INTO complaint_history (complaint_id,changed_by,old_status,new_status,remarks,status,note)
       VALUES ($1,$2,$3,$4,$5,$4,$5)`, [req.params.id, req.user.sub, oldStatus, status, String(note).slice(0,1000)]
    );
    await client.query("COMMIT"); transaction = false;
    res.json({ complaint: updated.rows[0] });
  } catch (err) { if (client && transaction) await client.query("ROLLBACK").catch(() => {}); next(err); }
  finally { client?.release(); }
});

router.get("/:id/history", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT h.status,h.note,h.changed_at AS created_at FROM complaint_history h
       JOIN complaints c ON c.complaint_id=h.complaint_id
       WHERE c.complaint_id=$1 AND (c.user_id=$2 OR $3='admin') ORDER BY h.changed_at DESC`,
      [req.params.id, req.user.sub, req.user.role]
    );
    if (!result.rowCount) return res.status(404).json({ error: "No history found or access denied" });
    res.json({ history: result.rows });
  } catch (err) { next(err); }
});
export default router;
