# Notification Template Management & Rendering Architecture

## 1. Overview & Purpose
In the Notification-as-a-Service (NaaS) platform, notification templates are owned and managed **centrally on our platform**, rather than being stored inside client applications.

Client applications trigger notifications by specifying a business event / template identifier (e.g. `order-confirmed`) and providing a dynamic variable payload (e.g. `{ "name": "Anshit", "orderId": "ORD-123" }`). Our platform renders the content and delivers the notification across supported channels.

---

## 2. Responsibilities: Client Application vs. Notification Platform

| Layer | Responsible Entity | Key Responsibilities |
| :--- | :--- | :--- |
| **Business Events & Data** | Client Application | Decides **WHEN** a notification happens and provides context data (`recipient`, `data`). |
| **Content & Layout** | Notification Platform | Manages **WHAT** content is delivered (subjects, bodies, variables, channel formats). |
| **Delivery & Processing** | Notification Platform | Handles **HOW** content is rendered, queued, dispatched, retried, and tracked. |

---

## 3. Template Ownership Model
Every template belongs directly to a single `Project` and indirectly to a customer `Organization`:

```text
Organization ──► Project ──► Template
```

### Unique Name Constraint
Template names are unique per project (`@@unique([projectId, name])`).
- Project A can have a template named `order-confirmed`.
- Project B can also have a template named `order-confirmed`.
- Project A cannot create a second template named `order-confirmed`.

---

## 4. Supported Channels & Content Requirements

| Channel | Subject Required? | Body Required? | Notes |
| :--- | :--- | :--- | :--- |
| **EMAIL** | **Yes** | **Yes** | Supports HTML/Text in body; subject line required. |
| **SMS** | **No** (Forbidden) | **Yes** | Text body only; subjects are rejected. |
| **WHATSAPP** | **No** (Forbidden) | **Yes** | Text body; future template parameters can be added. |
| **PUSH** | **No** (Forbidden) | **Yes** | Text body; payload metadata handled in future phases. |

---

## 5. Variable Syntax & Security
Templates support dynamic string variables using double curly braces: `{{variableName}}`.

### Security Policy
- **No Code Execution**: Variable substitution is performed using pure regular expressions and string replacement.
- **Forbidden Operations**: The renderer **never** uses `eval()`, `Function()`, or dynamic code execution engines. Malicious input strings (such as JavaScript code injections) are sanitized as raw string text.

---

## 6. Rendering Engine & Missing Variable Policy

### Variable Extraction
The renderer scans template text and extracts unique variable tokens using regex `/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g`.

### Missing Variable Handling
If a template requires `{{orderId}}` and the provided `data` payload omits `orderId` (or supplies `null`/`undefined`), the renderer **throws a `ValidationError`**.
- This prevents delivering incomplete or malformed notifications (e.g. `"Hello Anshit, order {{orderId}} confirmed"`).

### Extra Variable Handling
If the client application passes extra fields in `data` that are not referenced in the template, the renderer **ignores extra keys** without throwing an error.

---

## 7. Deletion Strategy
The database schema establishes `onDelete: SetNull` on `Notification.templateId`.
- Templates can be safely deleted via hard deletion (`DELETE /api/v1/projects/:projectId/templates/:templateId`).
- If historical notification records reference a deleted template, their `templateId` foreign key is set to `NULL` by PostgreSQL without corrupting notification history logs.

---

## 8. Future Architecture & Expansion

### Future Template Versioning
Future phases will introduce `TemplateVersion` records to allow historical notifications to reference exact template revisions (v1, v2, v3).

### Future Localization
Internationalization will introduce `TemplateTranslation` models (`templateId`, `locale`, `subject`, `body`), allowing single business event triggers to render in recipient-preferred languages.
