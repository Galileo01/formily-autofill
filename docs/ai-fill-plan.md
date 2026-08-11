# AI Fill Implementation Plan

## Goal

Validate the shortest useful vertical slice:

```text
complete FormGraph + natural-language instruction
  -> AI or local Smoke generator
  -> FillOperation[] preview
  -> form.setValuesIn(path, value)
  -> per-operation execution result
```

The first phase validates the data path. It does not require a complete component
adapter system. Arrays, recursive arrays, rich-text values, upload metadata, and
custom component values may all be passed as JSON values on their container path.

## Contracts

```ts
type FillOperation = {
  path: string
  value: JsonValue
  reason?: string
}

type FillResponse = {
  operations: FillOperation[]
}
```

The AI response parser must reject missing, unknown, or duplicate paths before
anything is written to the inspected page.

## Phase 1: PoC

Implemented scope:

- Pass the current form's complete flat FormGraph to the fill panel.
- Accept a natural-language instruction.
- Call an OpenAI-compatible `/chat/completions` endpoint.
- Send AI requests from the Background Service Worker; the DevTools panel never
  sends an API key in runtime messages.
- Require `FillOperation[]` output and retain compatibility with legacy path-value objects.
- Preview operations before applying them.
- Apply each value with Formily v2 `form.setValuesIn(path, structuredClone(value))`
  and retain a legacy `setFieldValue` fallback.
- Wait for `inspectedWindow.eval` callback and show real per-path results.
- Provide a deterministic local Smoke operation to isolate page-bridge failures from AI failures.
- Unit-test prompt construction, response parsing, path validation, and Smoke generation.

Acceptance:

1. `pnpm test`, `pnpm compile`, and `pnpm build` pass on Node 22.
2. Local Smoke can generate, preview, and apply a value without network access.
3. The AI receives every path in the current FormGraph.
4. Arrays and complex JSON values survive preview and application.
5. The UI never reports success before the page Hook returns an execution result.

## AI service configuration

### Built-in PoC service

For controlled development, copy `.env.example` to the ignored `.env.local` or
`.env` and provide:

```dotenv
WXT_AI_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=development-only-openrouter-key
WXT_AI_MODEL=openrouter/free
```

The direct provider key is read only when `import.meta.env.DEV` is true. It is still
embedded in the development extension bundle and must only be a short-lived PoC
credential. Production builds do not use `OPENROUTER_API_KEY` as an internal service key.

The PoC defaults to OpenRouter's Free Models Router. It dynamically selects an
available free model, so model quality, latency, and rate limits can vary between
requests. OpenRouter requests include a JSON Schema response format and require a
provider that supports it.

### Custom service

Users can switch to custom mode and provide their own Base URL, API Key, and model.

- Base URL and model are stored in `chrome.storage.local`.
- API Key defaults to `chrome.storage.session` and disappears after the browser
  session ends.
- Persistent API Key storage is an explicit opt-in.
- Storage access is restricted to trusted extension contexts.
- HTTPS origins are requested dynamically with `optional_host_permissions`; local
  HTTP is accepted only in development.

### Form data disclosure

AI generation sends the selected form's complete FormGraph to the configured
service. The graph can contain current values, initial values, and component
configuration. Before each form can use AI generation, the DevTools panel shows
this warning and requires an explicit acknowledgement. This acknowledgement does
not redact data: do not send unauthorized sensitive production data to a direct
provider or custom service. Use local Smoke for page-bridge validation; future
Gateway work must add server-side redaction and logging controls.

### Production built-in service

The production shape is an extension-owned, OpenAI-compatible Gateway configured by
the public `WXT_AI_GATEWAY_BASE_URL` and optional `WXT_AI_GATEWAY_MODEL` values. The
extension sends no provider `Authorization` header in this mode. The Gateway keeps
the real provider credential on the server and must handle user/device authentication,
rate limits, quotas, request-size limits, abuse controls, and log redaction.

## Phase 2: Accuracy and component adapters

After the PoC succeeds on real forms:

- Normalize FormGraph into a compact field description to reduce token usage.
- Add component-specific hints and validators.
- Add editable/enabled controls per operation.
- Improve ArrayTable, upload, rich-text, and custom-component fixtures.
- Add a connection test and clearer provider diagnostics.
- Implement and deploy the server-side Gateway outside this extension repository.

## Manual validation targets

1. Formily login/register example: strings and password fields.
2. Formily calculator example: numeric fields and reactions.
3. A complex fixture: ArrayTable, nested objects, rich text, upload metadata, and a custom component.

## FormGraph fixture and regression strategy

Maintain two fixture sources instead of relying on model output snapshots:

1. Small synthetic graphs under `src/ai/__fixtures__/` for prompt, parser,
   validation, and Smoke unit tests.
2. Sanitized snapshots captured from real Formily pages under
   `tests/fixtures/form-graphs/` for compatibility regression.

Each fixture case should contain:

```ts
type FormGraphFixtureCase = {
  name: string
  source: string
  graph: Record<string, unknown>
  instruction: string
  assertions: {
    expectedWritablePaths: string[]
    forbiddenPaths?: string[]
    expectedValueKinds?: Record<string, string>
  }
}
```

Initial fixture matrix:

- Login: string, password, required constraints.
- Calculator: number fields and reaction-derived values.
- Nested object: object containers and leaf paths.
- ArrayTable: array container, row objects, and nested rows.
- Recursive array: children arrays with multiple levels.
- Choice controls: select, checkbox group, radio, and cascader values.
- Date controls: date, date range, and timestamp-shaped values.
- Field state: hidden, disabled, read-only, display-none, and VoidField nodes.
- Complex components: rich-text value, upload metadata, and a custom JSON value.
- Lifecycle: multiple forms, string form instance IDs, refresh, and unmounted forms.

Test layers:

1. Serialization tests assert that functions, cycles, React nodes, symbols, and
   observable values are converted safely.
2. Contract tests use deterministic mocked model responses and assert valid paths,
   JSON value shapes, duplicate rejection, and root/layout exclusion.
3. Apply tests assert per-path cloning, partial failure reporting, string instance
   IDs, and real values read back after `setValuesIn` or the legacy fallback.
4. Browser E2E tests load actual Formily forms and verify capture, preview,
   confirmation, refill, refresh, and multi-form switching.
5. Live-provider Smoke tests are optional and non-blocking; they assert protocol
   validity rather than exact generated values because free-model routing is
   nondeterministic.

All captured graphs must remove personal data, tokens, URLs with credentials, and
application-specific identifiers before being committed.
