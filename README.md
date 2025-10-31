<div align="center">

# Lifecycle – Enterprise Hardware Lifecycle & EoL Forecaster

**AI-ready SaaS platform that discovers, enriches, and forecasts End-of-Life (EoL) & End-of-Support (EoS) timelines for enterprise hardware.**

Turning CapEx chaos into predictable, risk-aware insights.

</div>

---

## 🚀 Why Lifecycle?

Enterprise IT teams wrangle thousands of devices—servers, switches, firewalls, appliances—from dozens of vendors. Tracking when they fall out of support is traditionally a manual slog that leads to:

- **⚠️ Security exposure** — unsupported firmware lingering in production.
- **💸 Unplanned CapEx** — refresh shocks when thousands of assets expire together.
- **⏳ Manual effort** — weeks of spreadsheets and vendor portal lookups.

Lifecycle automates the full lifecycle intelligence loop: ingest inventory, enrich with vendor data, forecast upcoming cliffs, and alert stakeholders before problems land in change control.

---

## 🧩 Core Features

### 1. 🔍 EoL / EoS Lookup (MVP Complete)
- Drag-and-drop CSV or paste asset lists (expects `vendor,model`).
- Enriched results show vendor-verified End-of-Sale, End-of-Support, End-of-Life.
- Recommended replacement models + advisory URLs.
- Risk buckets: Critical (0–3m), High (3–6m), Medium (6–12m), Low (12–24m, 24+).
- CSV export and lifecycle “support cliff” visualization via Recharts.

### 2. 📊 Forecast Dashboard *(planned)*
- Visualize lifecycle cliffs across 3, 6, 12, 24 months.
- Filter by business service, site, category, vendor.

### 3. ⚙️ Tenant-Aware Alerting (UI + backend scaffolding)
- Tenant-specific thresholds (e.g., alert 45 days before EoL, 30 before EoS).
- Schedules (daily / weekly), quiet hours, and delivery channels.
- Ready for email, Slack webhook, generic HTTP webhook delivery.

### 4. 🏢 Multi-Tenant Architecture
- Add `organization_id` to requests/datasets; enforce row-level isolation.
- JWT/OIDC claim carries tenant context (Auth0/Okta ready).
- Storage pattern: `data/tenants/{org_id}/…` for assets and settings.

### 5. 💼 Finance & Risk Insights *(roadmap)*
- 3-year CapEx refresh forecast.
- Highlight business services at risk.
- CMDB connectors (ServiceNow, Freshservice) for two-way sync.

---

## 🧠 System Flow

1. **Ingest** – Upload CSV (or future discovery connector) → stored under tenant namespace.
2. **Enrich** – FastAPI endpoint matches models against the curated EoL dataset (3k+ vendor records target).
3. **Forecast & Alert** – APScheduler job scans tenant assets, applying alert thresholds (`days_to_eol/days_to_eos`), respecting quiet hours, and firing notifications.
4. **UI** – Operators manage lookups, settings, and exports in the Next.js App Router frontend.

```
┌──────────┐   ingest   ┌──────────────┐   enrich   ┌───────────────┐   alert   ┌────────────┐
│ inventory│──────────▶│ tenant assets│──────────▶│ lifecycle data│──────────▶│ alerts/email│
│   CSV/API│            │  (per org)   │            │   enrichment  │            │  /webhooks  │
└──────────┘            └──────────────┘            └───────────────┘            └────────────┘
                                    ▲                                       │
                                    └────────────── UI / dashboards ◀────────┘
```

---

## 🛠️ Tech Stack

| Layer        | Technology                    | Details                                                     |
|--------------|-------------------------------|-------------------------------------------------------------|
| **Frontend** | Next.js (App Router), React   | Modern SPA with shadcn/Tailwind UI kit, dark mode           |
|              | TailwindCSS + shadcn/ui       | Clean SaaS feel, reusable components (cards, sliders, etc.) |
|              | Recharts                      | Support-cliff visualizations                                |
|              | Axios                         | Calls FastAPI backend                                       |
|              | Sonner                        | Toast notifications                                         |
| **Backend**  | FastAPI                       | Typed Python APIs for lookups and (future) tenant settings   |
|              | Pandas                        | CSV ingestion + enrichment pipeline                          |
|              | APScheduler *(planned)*       | Multi-tenant alert scheduling                               |
|              | httpx *(planned)*             | Slack / webhook delivery                                    |
| **Infra**    | Docker + Compose *(roadmap)*  | One-click dev/prod deployment                               |
| **Auth**     | Auth0 / OIDC *(roadmap)*      | Tenant-aware JWT claims                                     |

---

## 📂 Repository Layout

```
lifecycle/
├── lifecycle-api/
│   ├── main.py                # FastAPI entrypoint
│   ├── routes/
│   │   ├── check_eol.py       # Lookup endpoint, risk scoring
│   │   └── tenants.py         # (planned) tenant settings & uploads
│   ├── scheduler.py           # APScheduler job (alert scanning)
│   ├── data/
│   │   ├── eol_dataset.csv    # Sample EoL references
│   │   └── tenants/{org}/…    # Tenant assets & settings (future)
│   └── requirements.txt
│
└── lifecycle-web/
    ├── app/
    │   ├── page.tsx           # Lookup UI (pagination, filters, chart)
    │   ├── settings/page.tsx  # Tenant alert settings UI
    │   └── layout.tsx
    ├── components/ui/         # shadcn primitives (button, slider, etc.)
    ├── tailwind.config.ts
    └── sample_*               # Demo CSVs (assets + enriched results)
```

---

## ⚙️ Local Development

### 1. Backend
```bash
cd lifecycle-api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# FastAPI runs on http://localhost:8000
```

### 2. Frontend
```bash
cd ../lifecycle-web
npm install
npm run dev -- --port 3000
# Next.js runs on http://localhost:3000 (Settings link → /settings)
```

The frontend targets `http://localhost:8000/api` by default and no longer requires manual API base configuration.

---

## 🗂️ Sample Data

| File                                     | Description                                                                 |
|------------------------------------------|-----------------------------------------------------------------------------|
| `lifecycle-api/data/eol_dataset.csv`     | Seed dataset (extend with Cisco/Dell/HPE/etc. records).                     |
| `lifecycle-web/sample_assets_5000.csv`   | Realistic 5,000-row tenant inventory (multiple sites, services, vendors).   |
| `lifecycle-web/sample_eol_results.csv`   | Compact enriched results example.                                           |
| `lifecycle-web/sample_eol_results_full.csv` | Enriched results with purchase/install/warranty and refresh suggestions. |

Upload assets via the main UI or `POST /api/check-eol` with `{"assets": [{"vendor": "Cisco", "model": "Catalyst 9300-48P"}]}` payloads.

---

## 🔔 Example Alert Payload

```
Subject: [Lifecycle] acme-inc: 4 assets nearing support deadlines
- Cisco Catalyst 2960X-48FPS-L  (EoL in 18 days)
- Dell PowerEdge R740           (EoS in 92 days)
- Fortinet FortiGate 100E       (EoL expired)

Recipients:
- Email: ciso@acme.example
- Slack: #infra-alerts
- Webhook: https://ops.acme.example/webhooks/lifecycle
```

Backend alert jobs will inspect `days_to_eol` / `days_to_eos` fields and honor tenant-configured quiet hours.

---

## 🧭 Roadmap Snapshot

- [x] CSV upload + lookup + export (frontend + backend).
- [x] Tenant settings UI (thresholds, schedules, quiet hours, delivery).
- [x] Risk scoring with `days_to_eol` and `recommended_refresh_date`.
- [ ] Persist tenant settings (`POST /api/tenants/:org_id/settings`).
- [ ] APScheduler worker + alert delivery (email/Slack/webhook via httpx).
- [ ] Postgres-backed multi-tenant store (replace CSV for scale).
- [ ] Integrations with CMDBs (ServiceNow, Freshservice) & discovery tools (Intune, Lansweeper).
- [ ] Predictive CapEx dashboards & business-service risk reports.

---

## 💡 Why Lifecycle Is Different

| Traditional Approach                | Lifecycle Advantage                                      |
|-------------------------------------|----------------------------------------------------------|
| Manual Excel tracking               | Automated enrichment + instant lookup results            |
| Locked into big-ticket platforms    | Lightweight APIs & open dataset approach                 |
| Fragmented alerting per team        | Unified tenant-aware notifications (CIO, CISO, Ops)      |
| High cost / complex deployments     | Free tool today, SaaS tier tomorrow                      |

---

## 🤝 Contributing & Feedback

We welcome pull requests and issue reports—especially new vendor datasets, connectors, or alerting integrations. For roadmap discussions or enterprise pilots, reach out via issues or your CompasIQ contact.

---

## 📄 License

MIT (see `LICENSE` if present) or contact the maintainers for commercial terms.
