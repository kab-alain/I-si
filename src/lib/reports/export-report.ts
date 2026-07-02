/**
 * Climate Risk Report Export — CSV and PDF (no external dependencies).
 */

export interface AlertRow {
  kind: string;
  severity: string;
  date: string;
  description?: string;
}

export interface ReportData {
  location: string;
  floodRisk: number; // 0-100
  droughtRisk: number; // 0-100
  prediction: string;
  timestamp: string;
  timeRange?: string;          // e.g. "Last 30 days"
  alerts?: AlertRow[];         // detailed alert rows
}

function formatScore(score: number): string {
  const percent = score <= 1 ? score * 100 : score;
  return `${percent.toFixed(1)}%`;
}

function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'extreme': return '#dc2626';
    case 'high':    return '#ea580c';
    case 'moderate':return '#d97706';
    default:        return '#16a34a';
  }
}

function severityBg(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'extreme': return '#fef2f2';
    case 'high':    return '#fff7ed';
    case 'moderate':return '#fffbeb';
    default:        return '#f0fdf4';
  }
}

function riskColor(score: number): string {
  const pct = score <= 1 ? score * 100 : score;
  if (pct >= 75) return '#dc2626';
  if (pct >= 50) return '#ea580c';
  if (pct >= 25) return '#d97706';
  return '#16a34a';
}

/**
 * Export report data as CSV and trigger browser download.
 */
export function exportReportCSV(data: ReportData): void {
  const lines: string[] = [];

  // Summary section
  lines.push(['Location', 'Time Range', 'Flood Risk', 'Drought Risk', 'Prediction', 'Generated At'].join(','));
  lines.push([
    `"${data.location.replace(/"/g, '""')}"`,
    `"${data.timeRange ?? 'N/A'}"`,
    formatScore(data.floodRisk),
    formatScore(data.droughtRisk),
    `"${data.prediction.replace(/"/g, '""')}"`,
    data.timestamp,
  ].join(','));

  // Alerts section
  if (data.alerts && data.alerts.length > 0) {
    lines.push('');
    lines.push('Alert Kind,Severity,Date,Description');
    for (const alert of data.alerts) {
      lines.push([
        `"${alert.kind.replace(/"/g, '""')}"`,
        alert.severity,
        alert.date,
        `"${(alert.description ?? '').replace(/"/g, '""')}"`,
      ].join(','));
    }
  }

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `climate-risk-report-${dateStamp()}.csv`);
}

/**
 * Export report data as a rich PDF with detailed alert table and trigger browser download.
 * Uses an HTML page opened in a new window and window.print() for PDF output.
 */
export function exportReportPDF(data: ReportData): void {
  const floodPct  = data.floodRisk  <= 1 ? data.floodRisk  * 100 : data.floodRisk;
  const droughtPct = data.droughtRisk <= 1 ? data.droughtRisk * 100 : data.droughtRisk;

  const alertsHtml = (data.alerts && data.alerts.length > 0)
    ? `
      <h2 class="section-title">Detected Alert Events</h2>
      <table class="alerts-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Alert Kind</th>
            <th>Severity</th>
            <th>Date / Time</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${data.alerts.map((a, i) => `
            <tr>
              <td class="center">${i + 1}</td>
              <td><strong>${a.kind}</strong></td>
              <td class="center">
                <span class="badge" style="background:${severityBg(a.severity)};color:${severityColor(a.severity)};">
                  ${a.severity.charAt(0).toUpperCase() + a.severity.slice(1)}
                </span>
              </td>
              <td class="center mono">${a.date}</td>
              <td>${a.description ?? '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : `<div class="no-alerts">No specific alert events recorded for this period.</div>`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Climate Risk Report — ${data.location}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a2e;
      background: #fff;
      padding: 32px 40px;
      font-size: 13px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-left h1 {
      font-size: 22px;
      font-weight: 700;
      color: #4f46e5;
      letter-spacing: -0.5px;
    }
    .header-left .subtitle { color: #6b7280; font-size: 12px; margin-top: 4px; }
    .header-right { text-align: right; font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .header-right strong { color: #374151; }

    /* ── Meta ── */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .meta-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .meta-card label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-card .value {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 4px;
    }

    /* ── Risk Bars ── */
    .risk-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    .risk-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .risk-card label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .risk-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }
    .risk-bar-bg {
      flex: 1;
      height: 10px;
      background: #e2e8f0;
      border-radius: 99px;
      overflow: hidden;
    }
    .risk-bar-fill {
      height: 100%;
      border-radius: 99px;
    }
    .risk-pct {
      font-size: 15px;
      font-weight: 700;
      min-width: 48px;
      text-align: right;
    }

    /* ── Prediction ── */
    .prediction-box {
      background: #eef2ff;
      border-left: 4px solid #4f46e5;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin-bottom: 24px;
    }
    .prediction-box label {
      font-size: 10px;
      font-weight: 700;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .prediction-box p { margin-top: 4px; color: #1e293b; }

    /* ── Section title ── */
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }

    /* ── Alerts table ── */
    .alerts-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 28px;
    }
    .alerts-table thead tr {
      background: #4f46e5;
      color: #fff;
    }
    .alerts-table th {
      padding: 9px 12px;
      font-weight: 600;
      text-align: left;
      letter-spacing: 0.3px;
    }
    .alerts-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .alerts-table tbody tr:nth-child(even) { background: #f8fafc; }
    .alerts-table tbody tr:hover { background: #eef2ff; }
    .center { text-align: center; }
    .mono { font-family: monospace; font-size: 11px; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
    }
    .no-alerts {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      margin-bottom: 28px;
    }

    /* ── Footer ── */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #9ca3af;
    }

    @media print {
      body { padding: 16px 20px; }
      .alerts-table thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>🌍 Climate Risk Report</h1>
      <div class="subtitle">Rwanda Climate Risk Intelligence Platform (I-si)</div>
    </div>
    <div class="header-right">
      <div><strong>Generated:</strong> ${new Date(data.timestamp).toLocaleString()}</div>
      <div><strong>Platform:</strong> I-si Climate Risk Platform</div>
    </div>
  </div>

  <!-- Meta info -->
  <div class="meta-grid">
    <div class="meta-card">
      <label>📍 Location</label>
      <div class="value">${data.location}</div>
    </div>
    <div class="meta-card">
      <label>📅 Time Range</label>
      <div class="value">${data.timeRange ?? 'Current'}</div>
    </div>
    <div class="meta-card">
      <label>⚠️ Total Alerts</label>
      <div class="value">${data.alerts?.length ?? 0} event${(data.alerts?.length ?? 0) !== 1 ? 's' : ''}</div>
    </div>
  </div>

  <!-- Risk indicators -->
  <div class="risk-grid">
    <div class="risk-card">
      <label>🌊 Flood Risk</label>
      <div class="risk-row">
        <div class="risk-bar-bg">
          <div class="risk-bar-fill" style="width:${floodPct}%;background:${riskColor(floodPct)};"></div>
        </div>
        <span class="risk-pct" style="color:${riskColor(floodPct)};">${floodPct.toFixed(1)}%</span>
      </div>
    </div>
    <div class="risk-card">
      <label>🏜️ Drought Risk</label>
      <div class="risk-row">
        <div class="risk-bar-bg">
          <div class="risk-bar-fill" style="width:${droughtPct}%;background:${riskColor(droughtPct)};"></div>
        </div>
        <span class="risk-pct" style="color:${riskColor(droughtPct)};">${droughtPct.toFixed(1)}%</span>
      </div>
    </div>
  </div>

  <!-- Prediction -->
  <div class="prediction-box">
    <label>🔮 Prediction</label>
    <p>${data.prediction}</p>
  </div>

  <!-- Alert Events Table -->
  ${alertsHtml}

  <!-- Footer -->
  <div class="footer">
    <span>© ${new Date().getFullYear()} Rwanda Climate Risk Platform. Confidential.</span>
    <span>I-si | Generated: ${new Date(data.timestamp).toLocaleDateString()}</span>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    // Fallback: download as HTML if popup blocked
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    downloadBlob(blob, `climate-risk-report-${dateStamp()}.html`);
  }
}

function dateStamp(): string {
  return new Date().toISOString().split('T')[0];
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Derive a simple prediction string from risk scores.
 */
export function derivePrediction(floodRisk: number, droughtRisk: number): string {
  const flood = floodRisk <= 1 ? floodRisk * 100 : floodRisk;
  const drought = droughtRisk <= 1 ? droughtRisk * 100 : droughtRisk;

  if (flood > 80 && drought > 75) {
    return 'Compound risk: elevated flood and drought conditions. Monitor closely.';
  }
  if (flood > 80) {
    return 'Flood risk elevated. Increased likelihood of flooding within 7 days.';
  }
  if (drought > 75) {
    return 'Drought conditions worsening. Water stress expected to increase.';
  }
  if (flood > 50) {
    return 'Moderate flood risk. Watch rainfall trends over the next week.';
  }
  if (drought > 50) {
    return 'Moderate drought risk. Consider water conservation measures.';
  }
  return 'Conditions stable. No significant climate risk predicted in the near term.';
}
