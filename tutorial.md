---
title: "Talk to the Grid: Control Energy Infrastructure with Claude + MCP"
published: false
description: "Dispatch batteries, verify carbon, and read meters — all through natural language. A step-by-step tutorial using the EnergyAtIt MCP server."
tags: mcp, ai, energy, claude
canonical_url: https://energyatit.com/blog/the-end-of-forms
cover_image: https://energyatit.com/og-image.png
---

The energy grid is the largest machine humanity has ever built — and it has no API.

Until now.

[EnergyAtIt](https://energyatit.com) exposes 30+ tools that let Claude dispatch batteries, verify carbon attestations, read meters across 8 industrial protocols, and create demand response events. All through natural language.

This tutorial walks you through connecting Claude to energy infrastructure in under 5 minutes.

---

## Step 1: Install the MCP Server

No dependencies. No config files. One command:

```bash
npx energyatit-mcp-server
```

That's it. The server starts on stdio and registers 30+ tools with any MCP-compatible client.

## Step 2: Add to Claude Desktop

Open your Claude Desktop config:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the server:

```json
{
  "mcpServers": {
    "energyatit": {
      "command": "npx",
      "args": ["-y", "energyatit-mcp-server"],
      "env": {
        "ENERGYATIT_API_KEY": "your-key-here"
      }
    }
  }
}
```

Restart Claude Desktop. You'll see the hammer icon with 30+ tools available.

**No API key yet?** Skip the `env` block entirely — the sandbox works without one.

### Using Claude Code instead?

```bash
claude mcp add energyatit -- npx -y energyatit-mcp-server
```

Done.

---

## Step 3: Explore Your Sites

Ask Claude:

> "What energy sites are available?"

Claude calls `list_sites` and returns your tenant's sites with location, capacity, and asset counts:

```
┌─────────┬───────────────────────┬──────────┬────────┐
│ Site ID │ Name                  │ Location │ Assets │
├─────────┼───────────────────────┼──────────┼────────┤
│ SITE-01 │ Dubai DC Campus       │ Dubai    │ 12     │
│ SITE-02 │ Abu Dhabi Solar Farm  │ AUH      │ 8      │
│ SITE-03 │ Riyadh Edge Facility  │ Riyadh   │ 6      │
└─────────┴───────────────────────┴──────────┴────────┘
```

The sandbox comes pre-loaded with simulated sites, assets, and meter data — so you can explore immediately.

Behind the scenes, Claude is making authenticated API calls to the EnergyAtIt platform. You're just talking.

---

## Step 4: Read Real-Time Data

> "What's the carbon intensity at the Dubai data center?"

Claude calls `get_meter_readings` and `get_grid_prices` to pull real-time data:

```
Dubai DC Campus — Current Readings
───────────────────────────────────
Grid Import:     42.3 MW
Solar Generation: 18.7 MW
Battery SoC:     73%
Carbon Intensity: 0.42 tCO₂/MWh
Grid Price:      $0.087/kWh (off-peak)
```

This works across protocols. The same natural language query triggers Modbus reads from PLCs, OpenADR signals from utilities, and OCPP status from EV chargers — all translated into one clean response.

---

## Step 5: Dispatch a Battery

Here's where it gets interesting. Ask Claude:

> "Dispatch the battery at 2MW for 30 minutes"

Claude calls `dispatch_command`:

```
✓ Dispatch Command Sent
──────────────────────
Asset:     BESS-001 (Tesla Megapack)
Command:   DISCHARGE
Power:     2,000 kW
Duration:  30 min
Status:    EXECUTING
Dispatch ID: DSP-20260213-0847
```

That's a real state change. The platform translates Claude's natural language into protocol-specific commands — Modbus registers for industrial batteries, OCPP messages for EV chargers, OpenADR signals for utility-enrolled loads.

One sentence from you. Eight protocols handled underneath.

### What else can you dispatch?

- `"Charge the EV fleet at 50kW each"` → OCPP 2.0 charging profiles
- `"Curtail HVAC by 30% for the next hour"` → Modbus setpoint writes
- `"Shift the cooling load to off-peak"` → demand response scheduling

---

## Step 6: Generate a Carbon Attestation

> "Generate a carbon attestation certificate for the Dubai facility"

Claude calls `create_carbon_record` and `get_carbon_certificate`:

```
✓ Carbon Attestation Generated
───────────────────────────────
Facility:    FAC-001 (Dubai DC Campus)
Period:      2026-02-13T00:00:00Z → 2026-02-13T23:59:59Z
Consumption: 1,015.2 MWh
Emissions:   426.4 tCO₂e
Intensity:   0.42 tCO₂/MWh
Renewable %: 44.2%

Hash Chain
──────────
Previous:  a7f3c2...e891d4
Current:   3b8e1f...c402a7
Algorithm: SHA-256
Verified:  ✓ Chain intact
```

Every record is appended to a SHA-256 hash chain. Each entry references the previous hash, creating a tamper-evident audit trail. If anyone modifies a historical record, the chain breaks — and `verify_carbon_chain` will catch it.

This is how you get from "trust me" to "verify it yourself" in carbon accounting.

---

## All 30+ Tools

Here's everything Claude can do once connected:

| Category | Tools |
|----------|-------|
| **Sites & Assets** | `list_sites`, `get_site`, `list_assets`, `get_asset` |
| **Dispatch** | `dispatch_command`, `dispatch_history` |
| **Carbon** | `create_carbon_record`, `verify_carbon_chain`, `get_carbon_certificate` |
| **Demand Response** | `create_dr_event`, `dispatch_dr_event`, `settle_dr_event` |
| **Settlements** | `generate_settlement`, `verify_settlement` |
| **Compliance** | `generate_compliance_package`, `generate_scope2_report` |
| **Reliability** | `get_asset_reliability`, `get_site_reliability` |
| **Grid Intel** | `get_grid_capacity`, `get_grid_trends`, `get_grid_prices` |
| **Procurement** | `create_procurement`, `analyze_procurement` |
| **Integrations** | `get_integration_status`, `get_meter_readings` |
| **Sandbox** | `provision_sandbox`, `sandbox_status`, `health_check` |

---

## Get an API Key

The sandbox is free and works without authentication. When you're ready for production:

1. Go to [energyatit.com/developers](https://energyatit.com/developers)
2. Sign up for the Pioneer program
3. Create an API key from Settings → API Keys
4. Add it to your Claude Desktop config as `ENERGYATIT_API_KEY`

Keys are prefixed `eat_live_` (production) or `eat_test_` (sandbox).

---

## Links

- **GitHub**: [github.com/kasathur/energyatit-mcp-server](https://github.com/kasathur/energyatit-mcp-server)
- **npm**: [npmjs.com/package/energyatit-mcp-server](https://www.npmjs.com/package/energyatit-mcp-server)
- **Platform**: [energyatit.com](https://energyatit.com)
- **API Docs**: [energyatit.com/docs](https://energyatit.com/docs)
- **MCP Registry**: [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)

---

## What's Next

We're building toward a world where AI agents autonomously manage energy infrastructure — dispatching batteries when grid prices spike, shifting compute loads to follow renewable generation, and settling carbon in real time.

The MCP server is the interface layer. The grid is the machine. Claude is the operator.

Start with the sandbox. Break things. Then connect it to real iron.

```bash
npx energyatit-mcp-server
```
