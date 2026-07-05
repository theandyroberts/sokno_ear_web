# AgentPhone Intake

The SoKno Ear intake webhook is:

```text
https://soknoear.com/webhooks/general-intake
```

The route accepts AgentPhone webhook deliveries, verifies the HMAC signature when `AGENTPHONE_WEBHOOK_SECRET` is set, stores the raw delivery in SQLite, and creates a normal `submissions` row only when the call contains enough listing facts.

## Required Listing Facts

For events:

- listing type
- venue
- event title
- date or time

For food and drink specials:

- listing type
- venue
- offer or promo line
- day or time window

Incomplete calls are stored in `agentphone_intakes` with `listing_status = 'needs_review'` and do not create a publish-queue submission.

## Environment

Set these on the VPS:

```sh
AGENTPHONE_WEBHOOK_SECRET=whsec_...
```

AgentPhone returns the signing secret when the webhook is created or updated. Production requests are rejected if this value is missing, unless `AGENTPHONE_WEBHOOK_REQUIRE_SIGNATURE=false` is set explicitly.

The website does not need an AgentPhone API key to receive webhooks.

For local MCP use in an assistant client:

```sh
AGENTPHONE_API_KEY=...
AGENTPHONE_BASE_URL=https://api.agentphone.ai
```

## AgentPhone MCP

AgentPhone's MCP server runs locally and proxies tool calls to the AgentPhone API:

```text
AI assistant <-> agentphone-mcp local <-> AgentPhone API <-> phone network
```

Add this to an MCP-compatible client config, then restart that client:

```json
{
  "mcpServers": {
    "agentphone": {
      "command": "npx",
      "args": ["-y", "agentphone-mcp"],
      "env": {
        "AGENTPHONE_API_KEY": "your_api_key_here",
        "AGENTPHONE_BASE_URL": "https://api.agentphone.ai"
      }
    }
  }
}
```

Useful MCP actions after setup:

- `get_agent` for `cmqv25qba0brh13w0h5hjfx3g`
- `set_agent_webhook` for `https://soknoear.com/webhooks/general-intake`
- `get_agent_webhook` to recover the active URL and status
- `list_calls` and `get_call` to inspect completed call transcripts
- `test_agent_webhook` to verify delivery to the SoKno Ear endpoint

The agent can stay in `voice_mode: "hosted"`. Hosted mode still emits `agent.call_ended` webhooks with the completed transcript and summary.
