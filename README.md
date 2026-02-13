# EnergyAtIt MCP Server

Connect AI agents to energy infrastructure. The first and only energy MCP server.

## What it does

30+ tools that let Claude, GPT, or any MCP-compatible AI agent:

| Tool | What it does |
|------|-------------|
| `list_sites` | List all energy sites in your tenant |
| `list_assets` | List BESS, HVAC, Solar, EV charger assets |
| `dispatch_command` | Send commands to batteries, solar inverters, EV chargers |
| `dispatch_history` | View dispatch command history |
| `generate_settlement` | Generate hash-chained settlement records |
| `verify_settlement` | Verify settlement hash chain integrity |
| `generate_compliance_package` | Generate IEC 61850, ISO 50001, GHG Scope 2 packages |
| `generate_scope2_report` | GHG Protocol Scope 2 compliance report |
| `get_asset_reliability` | Asset reliability scoring |
| `get_site_reliability` | Site-level reliability with per-asset breakdown |
| `get_grid_capacity` | Grid capacity intelligence by region |
| `get_meter_readings` | Read energy meters across protocols |
| `create_dr_event` | Create demand response events (shed, shift, shimmy) |
| `dispatch_dr_event` | Execute DR event dispatch |
| `settle_dr_event` | Settle DR events with carbon attestation |
| `create_carbon_record` | Append to SHA-256 hash-chained carbon ledger |
| `verify_carbon_chain` | Verify carbon hash chain integrity |
| `get_carbon_certificate` | Generate carbon attestation certificates |
| `create_procurement` | PPA, REC, and carbon offset procurement |
| `analyze_procurement` | Run procurement analysis and ranking |
| `get_integration_status` | Check Modbus, OpenADR, BESS, grid price feeds |
| `get_grid_prices` | Real-time grid electricity pricing |
| `provision_sandbox` | Get a sandbox with simulated energy data |
| `health_check` | Platform health and connectivity check |

## Quick Start

### Install

```bash
npx energyatit-mcp-server
```

### Claude Desktop Config

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

No API key? The sandbox works without one -- try it first.

### Claude Code

```bash
claude mcp add energyatit -- npx -y energyatit-mcp-server
```

### Try it

Once connected, ask Claude:
- "What energy sites do I have?"
- "What's the reliability score for site 1?"
- "Dispatch the battery at 2MW for 30 minutes"
- "Generate a carbon certificate for facility FAC-001"
- "Create a demand response event to shed 500kW"
- "What grid capacity is available in the UAE?"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENERGYATIT_API_KEY` | No | Your API key (`eat_live_xxx` or `eat_test_xxx`) |
| `ENERGYATIT_TOKEN` | No | JWT token (alternative to API key) |
| `ENERGYATIT_BASE_URL` | No | API base URL (default: `https://energyatit.com`) |

## Supported Protocols

IEC 61850 | DNP3 | Modbus TCP/RTU | OpenADR 2.0b | OCPP 1.6/2.0 | IEEE 2030.5 | ICCP/TASE.2 | REST

## Links

- Platform: [energyatit.com](https://energyatit.com)
- Developer Portal: [energyatit.com/developers](https://energyatit.com/developers)
- API Docs: [energyatit.com/docs](https://energyatit.com/docs)
- Blog: [energyatit.com/blog](https://energyatit.com/blog)

## Get an API Key

1. Go to [energyatit.com/developers](https://energyatit.com/developers)
2. Sign up for the Pioneer program or request access
3. Create an API key from Settings > API Keys
4. Or just use the sandbox -- no key needed

## License

MIT

---

Built by [Karthikeyan DS](mailto:dsk@energyatit.com)
