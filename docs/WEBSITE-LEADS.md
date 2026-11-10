# Website leads (Fluent Forms)

New submissions on the RLA website reach the dashboard through a Fluent Forms Pro webhook. Each one is
stored as a lead with origin "website-form", in the New stage, and appears in the Lead Inbox, the
Pipeline, Lead Details, and the Overview lead figures. Past leads come from Courtney's sheet
(`npm run import:leads`).

## How it works

`POST /api/leads/fluent-forms` (`src/app/api/leads/fluent-forms/route.ts`)

- **Auth:** the `X-Webhook-Secret` header must equal `FLUENT_FORMS_WEBHOOK_SECRET`. Without the variable
  the endpoint refuses everything (503).
- **Body:** JSON or form-encoded, "All Data" or "Selected Fields". Fields are found by likely names
  (`src/server/leads/fluent-forms.ts`): name, email, phone, company, message, and so on. Answers it does
  not recognise are added under the message, so nothing is hidden. The full body is kept in
  `lead.form_payload`.
- **Duplicates:** an entry is identified by its answers (form, name, email, phone, message), so a
  resend from Fluent Forms updates the same lead instead of adding one. If the webhook also sends
  `entry_id` (only possible with "Selected Fields" and the `{submission.id}` smart code), the id is paired
  with the answers, so a staging copy of the site cannot overwrite a live lead. A resend refreshes the
  answers but never the stage, deal, or notes.
- **Form name:** a `form_title` field, or `?form=Contact%20Form` on the webhook URL.
- **Source:** classified from the tracking fields below. With no tracking data the source is "Unknown",
  never a guess. The site's own pages never count as a referrer.

## Setup in WordPress

1. Fluent Forms Pro → Integrations → enable **Webhooks**.
2. Install `docs/website-lead-tracking.js` site-wide (WPCode, footer) inside a `<script>` tag.
3. On each form, add six **Hidden Fields** with these Name Attributes: `rla_referrer`,
   `rla_landing_page`, `rla_utm_source`, `rla_utm_medium`, `rla_utm_campaign`, `rla_page_url`.
4. On each form: Settings & Integrations → Webhook → Add New:
   - Request URL: `https://<dashboard host>/api/leads/fluent-forms?form=<Form name, URL-encoded>`
   - Method `POST`, format `JSON`
   - Request header: `X-Webhook-Secret` = the secret
   - Request body: **All Data**
5. Submit a test entry with a made-up name and check the Lead Inbox.

The dashboard must be deployed first: WordPress cannot reach `localhost`.

## Not covered yet

- Courtney's sheet may also list website leads, which would then appear twice. Decide which one is the
  record for website leads before both run.
- Spam: Fluent Forms' own protection (reCAPTCHA, Turnstile, Akismet) applies before the webhook. AI
  spam filtering is Phase 2.
- Settings → Forms still shows sample connection statuses.
