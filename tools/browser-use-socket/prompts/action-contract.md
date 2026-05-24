# Action Contract

Return exactly one JSON object:

```json
{
  "action": "find_tab | claim_tab | inspect | click | fill | navigate | evaluate | wait_for_text | wait_for_url | wait_for_selector | stop",
  "args": {},
  "reason": "string",
  "expect": "string",
  "confirmed": false
}
```

Rules:

- `args` must be a JSON object.
- `reason` and `expect` must be non-empty strings.
- Use `confirmed: true` only when intentionally repeating a risky action after human confirmation.
- Use `stop` when the page is ambiguous, blocked, or requires human input.
