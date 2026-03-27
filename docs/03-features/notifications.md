# Feature: Notifications & Bill Reminders

## Purpose
Users miss payments because they forget — not because they can't afford them. Notifications proactively remind users of upcoming debt payments, Gam3eya contributions, subscription renewals, and budget warnings. Delivered via in-app, email, Telegram, or WhatsApp based on user preference.

## Notification Triggers

### Payment Reminders

| Trigger | When | Message Example |
|---------|------|-----------------|
| Debt payment due | 3 days before due date | "Car Loan payment of 11,750 EGP due on April 15" |
| Debt payment due | Day of due date | "Car Loan payment of 11,750 EGP is due today" |
| Debt payment overdue | 1 day after due date | "Car Loan payment of 11,750 EGP was due yesterday" |
| Installment due | 3 days before month start | "iPhone installment of 4,500 EGP due April 1" |
| Gam3eya contribution | 3 days before due date | "Office Gam3eya contribution of 1,000 EGP due April 1" |
| Gam3eya payout | Day of payout month | "Your Office Gam3eya payout of 10,000 EGP is today!" |
| P2P split due | 3 days before split due_date | "Payment of 20,000 EGP to Khaled due April 1" |
| P2P split overdue | 1 day after due_date | "Payment of 20,000 EGP to Khaled was due yesterday" |
| Credit card statement | On billing_cycle_day | "HSBC CC statement closing today — balance: 45,000 EGP" |
| Credit card payment | 3 days before payment_due_day | "HSBC CC payment due April 20 — minimum: 2,250 EGP" |

### Budget & Spending Alerts

| Trigger | When | Message Example |
|---------|------|-----------------|
| Category at 80% | When spending hits 80% of allocation | "Groceries budget 80% used — 1,000 EGP remaining" |
| Category over budget | When spending exceeds allocation | "Groceries over budget by 500 EGP" |
| Large transaction | Single debit > configurable threshold | "Large transaction: 15,000 EGP at Jumia" |
| Negative balance forecast | Monthly forecast check | "Your balance may go negative in August" |

### System Notifications

| Trigger | When | Message Example |
|---------|------|-----------------|
| Import completed | After import commit | "47 transactions imported to CIB Savings" |
| AI categorization done | After batch categorization | "32 transactions auto-categorized, 5 need review" |
| Exchange rate stale | Rates older than 48 hours | "Exchange rates haven't been updated in 2 days" |
| Savings goal reached | current ≥ target | "Emergency Fund goal reached! 100,000 EGP saved" |
| Debt paid off | Remaining balance = 0 | "Car Loan fully paid off! You saved 5,200 EGP in interest" |
| Gam3eya completed | All months elapsed | "Office Gam3eya completed — net position: 0 EGP" |

## Delivery Channels

### In-App (Default)
- Bell icon in navbar with unread count badge
- Notification drawer/panel with list of recent notifications
- Each notification: title, body, timestamp, read/unread state, deep link
- Click navigates to relevant page (debt detail, budget, transaction list, etc.)
- Mark individual as read, or "Mark all as read"

### Email
- HTML email with Masareef branding
- RTL layout when user locale is Arabic
- Unsubscribe link per notification type
- Sent via **Resend** (primary choice — generous free tier of 3,000 emails/month, simple REST API, good deliverability, supports custom domains). Fallback: Supabase's built-in email (for auth emails only). SendGrid/Postmark are alternatives if Resend proves insufficient at scale.
- Batching: multiple notifications within 5 minutes grouped into single email

### Telegram Bot
- User connects by providing bot token or scanning QR code in Settings
- Messages sent via Telegram Bot API (`sendMessage`)
- Supports Arabic text natively
- Quick actions: reply with "/paid" to mark a payment as recorded

**Setup flow:**
```
1. User goes to Settings → Notifications → Telegram
2. Clicks "Connect Telegram"
3. System shows bot link: t.me/MasareefBot?start={user_token}
4. User opens link, starts bot, bot receives /start with token
5. Backend links Telegram chat_id to user's notification settings
6. Confirmation message sent: "Connected! You'll receive reminders here."
```

### WhatsApp (Future Enhancement)
- Requires WhatsApp Business API (paid, per-message cost)
- Template messages for reminders (pre-approved by Meta)
- Non-template messages for conversational features
- Higher deliverability than Telegram in Egypt (WhatsApp dominance)
- Deferred until user base justifies API cost

## Notification Preferences

Per-user configuration stored in `app_settings`:

```json
{
  "notifications_enabled": true,
  "channels": {
    "in_app": true,
    "email": true,
    "telegram": false,
    "whatsapp": false
  },
  "reminders": {
    "debt_payments": { "enabled": true, "days_before": 3 },
    "installments": { "enabled": true, "days_before": 3 },
    "gam3eya": { "enabled": true, "days_before": 3 },
    "p2p_splits": { "enabled": true, "days_before": 3 },
    "credit_card": { "enabled": true, "days_before": 3 }
  },
  "alerts": {
    "budget_warning": { "enabled": true, "threshold_percent": 80 },
    "budget_over": { "enabled": true },
    "large_transaction": { "enabled": true, "threshold_minor": 1000000 },
    "negative_forecast": { "enabled": true }
  },
  "quiet_hours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  },
  "telegram_chat_id": null,
  "whatsapp_number": null
}
```

## Notification Engine

### Scheduling
Backend scheduled task runs daily at a configurable time (default 08:00 local):
1. Query all upcoming payments across all households for the next 3 days
2. For each due item, check if a notification was already sent (deduplicate)
3. Generate notifications per user based on their channel preferences
4. Queue for delivery: in-app → immediate, email → batched, Telegram → immediate

### Deduplication
Each notification trigger creates a unique key:
```
key = f"{household_id}:{trigger_type}:{source_id}:{due_date}:{days_offset}"
```
If a notification with this key already exists, skip. Prevents duplicate reminders on repeated scheduler runs.

### Retry Logic
- Email/Telegram delivery failures retry 3 times with exponential backoff
- Failed after 3 retries: logged, in-app fallback sent
- Delivery status tracked per notification: `pending`, `sent`, `failed`

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Notifications | [18-notifications.html](../stitch-designs/html/18-notifications.html) | [18-notifications.md](../stitch-prompts/18-notifications.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/notifications`
List notifications for the current user.

**Query params:** `unread_only` (default false), `page`, `page_size`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Car Loan payment due",
      "body": "Payment of 11,750 EGP due on April 15",
      "is_read": false,
      "link": "/debts?highlight=1",
      "created_at": "2026-04-12T08:00:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "page_size": 50,
    "unread_count": 3
  }
}
```

### `POST /api/v1/notifications/{id}/read`
Mark a notification as read.

### `POST /api/v1/notifications/read-all`
Mark all notifications as read for the current user.

### `GET /api/v1/notifications/preferences`
Get notification preferences for the current user.

### `PUT /api/v1/notifications/preferences`
Update notification preferences.

### `POST /api/v1/notifications/telegram/connect`
Generate a Telegram bot connection link.

**Response:**
```json
{
  "data": {
    "bot_link": "https://t.me/MasareefBot?start=abc123token",
    "expires_in_minutes": 30
  }
}
```

### `POST /api/v1/notifications/telegram/disconnect`
Disconnect Telegram bot.

### `POST /api/v1/notifications/test`
Send a test notification to all enabled channels. For verifying setup.

## Acceptance Criteria

### Payment Reminders
- [ ] Debt payment reminders sent 3 days before, day of, and 1 day after due date
- [ ] Installment reminders sent 3 days before month start
- [ ] Gam3eya contribution reminders sent 3 days before due date
- [ ] Gam3eya payout notification sent on payout day
- [ ] P2P split reminders sent 3 days before and 1 day after due date
- [ ] Credit card statement and payment reminders on configured days
- [ ] Reminder timing configurable per user (days_before setting)

### Budget & Spending Alerts
- [ ] Budget warning triggers at configurable threshold (default 80%)
- [ ] Over-budget alert triggers immediately when limit exceeded
- [ ] Large transaction alert triggers above configurable threshold
- [ ] Negative forecast alert sent when monthly check detects future negative balance

### Channels
- [ ] In-app notifications appear in real-time (Supabase Realtime push)
- [ ] Unread count badge updates on navbar bell icon
- [ ] Email notifications batched within 5-minute window
- [ ] Email renders correctly in RTL for Arabic locale
- [ ] Telegram bot connection flow works (QR/link → /start → chat_id linked)
- [ ] Telegram messages delivered with Arabic text support
- [ ] Quick action: "/paid" reply marks the relevant payment as recorded

### Engine
- [ ] Daily scheduler generates all due reminders without duplicates
- [ ] Deduplication key prevents repeated notifications for same event
- [ ] Delivery failures retry 3 times with exponential backoff
- [ ] Failed deliveries fall back to in-app notification
- [ ] Quiet hours suppress non-critical notifications during configured window
- [ ] Test notification reaches all enabled channels
