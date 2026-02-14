#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Proxy support ─────────────────────────────────────────────────────────
// Node.js native fetch does not respect https_proxy / http_proxy env vars.
// When running behind a proxy (e.g. corporate networks, containers), we use
// undici's ProxyAgent so all fetch() calls are routed correctly.
const PROXY_URL = process.env.https_proxy ?? process.env.HTTPS_PROXY ??
                  process.env.http_proxy  ?? process.env.HTTP_PROXY  ?? "";
if (PROXY_URL) {
  try {
    const { ProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new ProxyAgent(PROXY_URL));
  } catch {
    // undici not available — proxy won't be used
  }
}

// ─── Config ────────────────────────────────────────────────────────────────

const BASE_URL = (
  process.env.ENERGYATIT_BASE_URL ??
  process.env.ENERGYATIT_URL ??
  "https://energyatit.com"
).replace(/\/$/, "");

const API_KEY = process.env.ENERGYATIT_API_KEY ?? "";
const TOKEN = process.env.ENERGYATIT_TOKEN ?? "";
const DEMO_MODE = !API_KEY && !TOKEN;

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
  else if (API_KEY) h["X-API-Key"] = API_KEY;
  return h;
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  const json = await res.json() as Record<string, unknown>;
  if (json.success === false) throw new Error(String(json.error ?? `API error ${res.status}`));
  return json.data ?? json;
}

async function apiPost(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as Record<string, unknown>;
  if (json.success === false) throw new Error(String(json.error ?? `API error ${res.status}`));
  return json.data ?? json;
}

async function apiPatch(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as Record<string, unknown>;
  if (json.success === false) throw new Error(String(json.error ?? `API error ${res.status}`));
  return json.data ?? json;
}

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(err: unknown) {
  return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true as const };
}

// ─── MCP Server ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "energyatit",
  version: "0.2.0",
});

// ── Sites ────────────────────────────────────────────────────────────────

server.tool("list_sites", "List all energy sites in your tenant", {}, async () => {
  try { return text(await apiGet(DEMO_MODE ? "/api/v1/demo/sites" : "/api/sites")); }
  catch (e) { return errorResult(e); }
});

server.tool("get_site", "Get details of a specific site", {
  site_id: z.number().describe("Site ID"),
}, async ({ site_id }) => {
  try { return text(await apiGet(`/api/sites/${site_id}`)); }
  catch (e) { return errorResult(e); }
});

// ── Assets ───────────────────────────────────────────────────────────────

server.tool("list_assets", "List assets, optionally filtered by site", {
  site_id: z.number().optional().describe("Optional site ID filter"),
}, async ({ site_id }) => {
  try {
    if (DEMO_MODE) return text(await apiGet("/api/v1/demo/assets"));
    const qs = site_id ? `?siteId=${site_id}` : "";
    return text(await apiGet(`/api/assets${qs}`));
  } catch (e) { return errorResult(e); }
});

// ── Grid Connections ─────────────────────────────────────────────────────

server.tool("list_grid_connections", "List grid connections for a site", {
  site_id: z.number().describe("Site ID"),
}, async ({ site_id }) => {
  try { return text(await apiGet(`/api/grid-connections?siteId=${site_id}`)); }
  catch (e) { return errorResult(e); }
});

// ── Meter Readings ───────────────────────────────────────────────────────

server.tool("get_meter_readings", "Get meter readings for a grid connection", {
  grid_connection_id: z.number().describe("Grid connection ID"),
}, async ({ grid_connection_id }) => {
  try { return text(await apiGet(`/api/meter-readings?gridConnectionId=${grid_connection_id}`)); }
  catch (e) { return errorResult(e); }
});

// ── Dispatch ─────────────────────────────────────────────────────────────

server.tool("dispatch_command", "Send a dispatch command to an asset (battery, HVAC, EV charger, etc.)", {
  asset_id: z.number().describe("Asset ID"),
  command: z.string().describe("Command: charge, discharge, reduce, curtail, shed_load, restore"),
  target_kw: z.number().optional().describe("Target power in kW"),
  duration_minutes: z.number().optional().describe("Duration in minutes"),
}, async ({ asset_id, command, target_kw, duration_minutes }) => {
  try {
    return text(await apiPost(`/api/v1/dispatch/${asset_id}/command`, {
      command,
      targetKw: target_kw,
      durationMinutes: duration_minutes,
    }));
  } catch (e) { return errorResult(e); }
});

server.tool("dispatch_history", "Get dispatch history for an asset", {
  asset_id: z.number().describe("Asset ID"),
}, async ({ asset_id }) => {
  try { return text(await apiGet(`/api/v1/dispatch/${asset_id}/history`)); }
  catch (e) { return errorResult(e); }
});

// ── Settlements ──────────────────────────────────────────────────────────

server.tool("list_settlements", "List settlements for a site", {
  site_id: z.number().optional().describe("Optional site ID filter"),
}, async ({ site_id }) => {
  try {
    const qs = site_id ? `?siteId=${site_id}` : "";
    return text(await apiGet(`/api/settlements${qs}`));
  } catch (e) { return errorResult(e); }
});

server.tool("generate_settlement", "Generate a hash-chained settlement for a site", {
  site_id: z.number().describe("Site ID"),
  period_start: z.string().describe("Period start (ISO date)"),
  period_end: z.string().describe("Period end (ISO date)"),
}, async ({ site_id, period_start, period_end }) => {
  try {
    return text(await apiGet(`/api/v1/settlements/${site_id}/generate?periodStart=${period_start}&periodEnd=${period_end}`));
  } catch (e) { return errorResult(e); }
});

server.tool("verify_settlement", "Verify a settlement's hash chain integrity", {
  settlement_id: z.number().describe("Settlement ID"),
}, async ({ settlement_id }) => {
  try { return text(await apiGet(`/api/v1/settlements/${settlement_id}/verify`)); }
  catch (e) { return errorResult(e); }
});

// ── Carbon Attestation ───────────────────────────────────────────────────

server.tool("get_carbon_attestation", "Get carbon attestation for a site", {
  site_id: z.number().describe("Site ID"),
}, async ({ site_id }) => {
  try { return text(await apiGet(DEMO_MODE ? "/api/v1/demo/carbon" : `/api/v1/settlements/${site_id}/carbon-attestation`)); }
  catch (e) { return errorResult(e); }
});

server.tool("create_carbon_record", "Create a carbon attestation record in the hash chain", {
  meter_id: z.string().describe("Meter ID"),
  facility_id: z.string().describe("Facility UUID"),
  timestamp: z.string().describe("ISO timestamp"),
  kwh: z.number().describe("Energy in kWh"),
  grid_zone: z.string().optional().describe("Grid zone"),
}, async (params) => {
  try {
    return text(await apiPost("/api/v1/carbon/record", {
      meterId: params.meter_id,
      facilityId: params.facility_id,
      timestamp: params.timestamp,
      kwh: params.kwh,
      gridZone: params.grid_zone,
    }));
  } catch (e) { return errorResult(e); }
});

server.tool("verify_carbon_chain", "Verify the SHA-256 hash chain for a meter", {
  meter_id: z.string().describe("Meter ID"),
}, async ({ meter_id }) => {
  try { return text(await apiGet(`/api/v1/carbon/verify/${meter_id}`)); }
  catch (e) { return errorResult(e); }
});

server.tool("get_carbon_certificate", "Generate a carbon certificate for a facility", {
  facility_id: z.string().describe("Facility UUID"),
  start: z.string().describe("Period start (ISO date)"),
  end: z.string().describe("Period end (ISO date)"),
}, async ({ facility_id, start, end }) => {
  try { return text(await apiGet(`/api/v1/carbon/certificate/${facility_id}?start=${start}&end=${end}`)); }
  catch (e) { return errorResult(e); }
});

// ── Demand Response ──────────────────────────────────────────────────────

server.tool("create_dr_event", "Create a demand response event", {
  signal_type: z.string().describe("Signal type: shed, shift, shimmy"),
  facility_id: z.string().describe("Facility UUID"),
  scheduled_start: z.string().describe("Start time (ISO)"),
  target_reduction_kw: z.number().optional().describe("Target reduction in kW"),
  duration_minutes: z.number().optional().describe("Duration in minutes"),
}, async (params) => {
  try {
    return text(await apiPost("/api/v1/dr/events", {
      signalType: params.signal_type,
      facilityId: params.facility_id,
      scheduledStart: params.scheduled_start,
      targetReductionKw: params.target_reduction_kw,
      durationMinutes: params.duration_minutes,
    }));
  } catch (e) { return errorResult(e); }
});

server.tool("list_dr_events", "List demand response events", {
  status: z.string().optional().describe("Filter by status"),
  facility_id: z.string().optional().describe("Filter by facility"),
}, async ({ status, facility_id }) => {
  try {
    if (DEMO_MODE) return text(await apiGet("/api/v1/demo/dr/events"));
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (facility_id) qs.set("facility_id", facility_id);
    const q = qs.toString() ? `?${qs.toString()}` : "";
    return text(await apiGet(`/api/v1/dr/events${q}`));
  } catch (e) { return errorResult(e); }
});

server.tool("get_dr_event", "Get details of a DR event", {
  event_id: z.string().describe("Event UUID"),
}, async ({ event_id }) => {
  try { return text(await apiGet(`/api/v1/dr/events/${event_id}`)); }
  catch (e) { return errorResult(e); }
});

server.tool("dispatch_dr_event", "Execute dispatch for a DR event", {
  event_id: z.string().describe("Event UUID"),
}, async ({ event_id }) => {
  try { return text(await apiPost(`/api/v1/dr/events/${event_id}/dispatch`)); }
  catch (e) { return errorResult(e); }
});

server.tool("settle_dr_event", "Settle a DR event with carbon attestation", {
  event_id: z.string().describe("Event UUID"),
}, async ({ event_id }) => {
  try { return text(await apiPost(`/api/v1/dr/events/${event_id}/settle`)); }
  catch (e) { return errorResult(e); }
});

// ── Compliance ───────────────────────────────────────────────────────────

server.tool("generate_compliance_package", "Generate a compliance package for a site", {
  site_id: z.number().describe("Site ID"),
  standard: z.string().optional().describe("Standard: IEC61850, ISO50001, GHG_Scope2"),
}, async ({ site_id, standard }) => {
  try { return text(await apiPost(`/api/v1/comply/${site_id}/generate`, { standard })); }
  catch (e) { return errorResult(e); }
});

server.tool("list_compliance_packages", "List compliance packages for a site", {
  site_id: z.number().describe("Site ID"),
}, async ({ site_id }) => {
  try { return text(await apiGet(`/api/v1/comply/${site_id}/packages`)); }
  catch (e) { return errorResult(e); }
});

server.tool("generate_scope2_report", "Generate GHG Scope 2 compliance report", {
  facility_id: z.string().describe("Facility UUID"),
  period_start: z.string().describe("Period start"),
  period_end: z.string().describe("Period end"),
  methodology: z.enum(["location-based", "market-based", "dual"]).optional(),
}, async (params) => {
  try {
    return text(await apiPost("/api/v1/comply/report", {
      facility_id: params.facility_id,
      period_start: params.period_start,
      period_end: params.period_end,
      methodology: params.methodology,
    }));
  } catch (e) { return errorResult(e); }
});

// ── Intel ────────────────────────────────────────────────────────────────

server.tool("get_asset_reliability", "Get reliability score for an asset", {
  asset_id: z.number().describe("Asset ID"),
}, async ({ asset_id }) => {
  try { return text(await apiGet(`/api/v1/intel/assets/${asset_id}/score`)); }
  catch (e) { return errorResult(e); }
});

server.tool("get_site_reliability", "Get reliability score for a site", {
  site_id: z.number().describe("Site ID"),
}, async ({ site_id }) => {
  try { return text(await apiGet(`/api/v1/intel/sites/${site_id}/score`)); }
  catch (e) { return errorResult(e); }
});

server.tool("get_grid_capacity", "Get grid capacity for a region", {
  region: z.string().describe("Region code (e.g. AE-DXB, PH-LUZ)"),
}, async ({ region }) => {
  try { return text(await apiGet(`/api/v1/intel/grid/${region}/capacity`)); }
  catch (e) { return errorResult(e); }
});

server.tool("get_grid_trends", "Get grid capacity trends for a region", {
  region: z.string().describe("Region code"),
}, async ({ region }) => {
  try { return text(await apiGet(`/api/v1/intel/grid/${region}/trends`)); }
  catch (e) { return errorResult(e); }
});

// ── Procurement ──────────────────────────────────────────────────────────

server.tool("create_procurement", "Create an energy procurement request", {
  type: z.string().describe("Type: ppa, rec, carbon_offset"),
  volume_kwh: z.number().describe("Volume in kWh"),
  region: z.string().optional().describe("Region"),
}, async (params) => {
  try { return text(await apiPost("/api/v1/procurement", params)); }
  catch (e) { return errorResult(e); }
});

server.tool("analyze_procurement", "Run analysis on a procurement request", {
  id: z.number().describe("Procurement request ID"),
}, async ({ id }) => {
  try { return text(await apiPost(`/api/v1/procurement/${id}/analyze`)); }
  catch (e) { return errorResult(e); }
});

server.tool("get_procurement_options", "Get procurement options", {
  id: z.number().describe("Procurement request ID"),
}, async ({ id }) => {
  try { return text(await apiGet(`/api/v1/procurement/${id}/options`)); }
  catch (e) { return errorResult(e); }
});

// ── Integration Status ───────────────────────────────────────────────────

server.tool("get_integration_status", "Get status of all integrations (Modbus, OpenADR, BESS, grid prices)", {}, async () => {
  try { return text(await apiGet("/api/v1/integrations/status")); }
  catch (e) { return errorResult(e); }
});

server.tool("get_grid_prices", "Get current grid electricity prices", {
  region: z.string().optional().describe("Region code"),
}, async ({ region }) => {
  try {
    const path = region ? `/api/v1/integrations/grid-prices/${region}` : "/api/v1/integrations/grid-prices";
    return text(await apiGet(path));
  } catch (e) { return errorResult(e); }
});

// ── Sandbox ──────────────────────────────────────────────────────────────

server.tool("provision_sandbox", "Provision a developer sandbox environment with simulated data", {}, async () => {
  try { return text(await apiPost("/api/v1/sandbox/provision")); }
  catch (e) { return errorResult(e); }
});

server.tool("sandbox_status", "Check sandbox environment status and usage", {}, async () => {
  try { return text(await apiGet("/api/v1/sandbox/status")); }
  catch (e) { return errorResult(e); }
});

// ── Health ───────────────────────────────────────────────────────────────

server.tool("health_check", "Check platform health and connectivity", {}, async () => {
  try { return text(await apiGet("/api/health")); }
  catch (e) { return errorResult(e); }
});

// ─── Resources ─────────────────────────────────────────────────────────────

server.resource(
  "platform-overview",
  "energyatit://overview",
  async () => ({
    contents: [{
      uri: "energyatit://overview",
      mimeType: "text/plain",
      text: [
        "EnergyAtIt — Energy Infrastructure Platform",
        "",
        "Capabilities:",
        "  - Sites & Assets: Manage energy sites, assets (BESS, HVAC, Solar, EV chargers)",
        "  - Dispatch: Send commands to batteries, HVAC, EV chargers",
        "  - Carbon Attestation: SHA-256 hash-chained carbon records with certificates",
        "  - Demand Response: Create, dispatch, measure, and settle DR events",
        "  - Settlements: Generate and verify hash-chained energy settlements",
        "  - Compliance: Generate IEC 61850, ISO 50001, GHG Scope 2 packages",
        "  - Intel: Reliability scores, grid capacity, load forecasting",
        "  - Procurement: PPA, REC, and carbon offset procurement",
        "  - Integrations: Modbus, OpenADR 2.0b, OCPP 2.0, IEC 61850",
        "",
        `Connected to: ${BASE_URL}`,
        `Auth: ${TOKEN ? "JWT token" : API_KEY ? "API key" : "none (set ENERGYATIT_API_KEY)"}`,
      ].join("\n"),
    }],
  }),
);

// ─── Start ─────────────────────────────────────────────────────────────────

async function main() {
  if (DEMO_MODE) {
    console.error("No API key set — running in demo mode (read-only public data).");
    console.error("Set ENERGYATIT_API_KEY for full access, or call provision_sandbox to get a sandbox key.");
  }
  console.error(`EnergyAtIt MCP server v0.2.0 — connecting to ${BASE_URL}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("EnergyAtIt MCP server running on stdio");
}

main().catch((err) => {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});
