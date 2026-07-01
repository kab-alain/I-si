import db from "./db";

export async function saveAuditLog(action, data) {
  await db.query(
    "INSERT INTO audit_logs (action, data) VALUES ($1, $2)",
    [action, data]
  );
}
