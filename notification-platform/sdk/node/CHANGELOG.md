# Changelog

All notable changes to the `notification-platform-node` SDK will be documented in this file.

## [1.0.0] - 2026-08-21

### Added
- Official initial release of `notification-platform-node` SDK.
- Core HTTP client with native `fetch` support and automatic exponential backoff retries.
- Resource namespaces: `events`, `notifications`, `recipients`, `preferences`, `devices`, `templates`, `workflows`, `webhooks`.
- Webhook HMAC SHA-256 constant-time signature verifier helper.
- Normalized error class hierarchy (`NotificationPlatformError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `ServerError`, `TimeoutError`, `NetworkError`).
- TypeScript declaration file (`types/index.d.ts`).
