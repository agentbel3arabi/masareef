# Feature: Multi-User & Household Finance

## Purpose
Egyptian and MENA families manage finances collectively — shared accounts, shared Gam3eyas, P2P debts between relatives, parents overseeing children's spending. Multi-user transforms Masareef from a personal tool into a household platform, and is the primary driver for paid subscriptions.

## Concepts

### Household
The root container for all financial data. Every table has `household_id`.
- A household has a name, base currency, and one or more members
- All data belongs to the household, not to individual users
- The first user who creates a household becomes its admin

### Members
Users belong to households via `household_members` with a role.
- A single user can belong to multiple households (e.g., personal + family)
- Each membership has a `display_name` (how they appear in the household)
- Switching households changes the entire data context

### Roles

| Role | See Data | Create/Edit | Manage Members | Delete | Use Case |
|------|----------|-------------|----------------|--------|----------|
| `admin` | Everything | Everything | Yes | Yes | Head of household |
| `member` | Everything except restricted | Everything except restricted | No | Own items only | Spouse, adult family member |
| `viewer` | Everything except restricted | Nothing | No | Nothing | Extended family, accountant |
| `child` | Own-linked items only | Own transactions only | No | Nothing | Children, dependents |

### Restricted Data
Some data types have additional visibility restrictions beyond role:

| Data | admin | member | viewer | child |
|------|-------|--------|--------|-------|
| Accounts & balances | Full | Full | Read-only | Linked account only |
| Transactions | Full | Full | Read-only | Own transactions only |
| Debts (bank loans) | Full | Full | Read-only | Hidden |
| Debts (P2P) | Full | Full | Read-only | Hidden |
| Installments | Full | Full | Read-only | Hidden |
| Gam3eyas | Full | Full | Read-only | Hidden |
| Assets | Full | Full | Read-only | Hidden |
| Budgets | Full | Full | Read-only | Own budget only |
| Savings goals | Full | Full | Read-only | Own goals only |
| Settings | Full | Read most, edit own prefs | Own prefs only | Own prefs only |
| Members | Full CRUD | Read-only | Read-only | Hidden |
| Reports | Full | Full | Read-only | Hidden |

## Household Lifecycle

### Creation
```
1. New user signs up via Supabase Auth
2. User creates a household (name, base currency)
3. User becomes admin of that household
4. User can now invite others
```

### Invitation Flow
```
1. Admin goes to Settings → Household → Invite Member
2. Enters: email, display name, role
3. System sends invitation email with magic link
4. Invitee clicks link → signs up or logs in → joins household with assigned role
5. Invitation expires after 7 days if not accepted
```

Alternatively, admin generates an invite code (6 characters) that can be shared via WhatsApp/Telegram. Invitee enters code in the app to join.

### Switching Households
If a user belongs to multiple households:
- Household selector in sidebar header
- Switching reloads all data for the selected household
- Last active household remembered via user preference

### Leaving / Removal
- Members can leave a household voluntarily
- Admin can remove any non-admin member
- Admin cannot leave if they are the only admin (must transfer admin first)
- Removing a member does not delete their data contributions — household retains all transactions, debts, etc.

## Child Accounts

### Purpose
Parents want to give children visibility into their own finances without exposing the full household picture. A child sees their own allowance account and transactions, nothing else.

### Behavior
- Admin creates a "child" member and links specific accounts to them
- Child logs in → sees only their linked account(s) and their own transactions
- Child can create transactions on their linked accounts
- Child cannot see: other accounts, debts, P2P, Gam3eyas, assets, household settings
- Child can have their own budget and savings goals

### Linked Accounts
Only accounts in the `child_linked_accounts` table are visible to the child member.

> **Data Model:** See [02-data-models.md](../02-data-models.md) → Multi-Tenancy section for the `child_linked_accounts` table schema.

## Shared Features

### Shared Gam3eyas
A Gam3eya can have multiple household members as participants:
- Admin creates Gam3eya, contributions come from a shared or individual account
- Each member can see the schedule and their own payment status
- Members can record their own contributions

### Shared Budgets
A budget can be household-wide or per-member:
- **Household budget:** all members' spending counts against allocations
- **Personal budget:** only the specific member's spending counts
- Budget `created_by` field tracks owner; admin can see all budgets

### Activity Log
Tracks who did what within the household. Visible to admin only. Useful for "who recorded that transaction?" and dispute resolution.

> **Data Model:** See [02-data-models.md](../02-data-models.md) → Multi-Tenancy section for the `household_activity_log` table schema.

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Household Settings | [20-settings-household.html](../stitch-designs/html/20-settings-household.html) | [20-settings-household.md](../stitch-prompts/20-settings-household.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### Household Management

#### `POST /api/v1/households`
Create a new household. Caller becomes admin.

**Request:**
```json
{
  "name": "Al-Masri Family",
  "base_currency": "EGP"
}
```

#### `GET /api/v1/households`
List all households the current user belongs to.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-...",
      "name": "Al-Masri Family",
      "base_currency": "EGP",
      "my_role": "admin",
      "member_count": 4
    },
    {
      "id": "uuid-...",
      "name": "Personal",
      "base_currency": "EGP",
      "my_role": "admin",
      "member_count": 1
    }
  ]
}
```

#### `PUT /api/v1/households/{id}`
Update household name or base currency. Admin only.

#### `POST /api/v1/households/{id}/switch`
Switch active household context. Updates session.

### Member Management

#### `GET /api/v1/households/{id}/members`
List all members with roles.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-...",
      "user_id": "uuid-...",
      "display_name": "Mohamed",
      "role": "admin",
      "email": "mohamed@example.com",
      "joined_at": "2026-01-15T10:00:00Z"
    },
    {
      "id": "uuid-...",
      "user_id": "uuid-...",
      "display_name": "Sara",
      "role": "member",
      "email": "sara@example.com",
      "joined_at": "2026-01-16T14:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/households/{id}/invite`
Invite a new member. Admin only.

**Request:**
```json
{
  "email": "ahmed@example.com",
  "display_name": "Ahmed",
  "role": "member"
}
```

**Response:**
```json
{
  "invitation_id": "uuid-...",
  "invite_code": "ABC123",
  "invite_link": "https://masareef.app/join?code=ABC123",
  "expires_at": "2026-03-30T10:00:00Z"
}
```

#### `POST /api/v1/households/join`
Accept an invitation via code.

**Request:**
```json
{ "code": "ABC123" }
```

#### `PUT /api/v1/households/{id}/members/{member_id}`
Update member role or display name. Admin only.

#### `DELETE /api/v1/households/{id}/members/{member_id}`
Remove a member. Admin only. Cannot remove last admin.

#### `POST /api/v1/households/{id}/members/{member_id}/link-accounts`
Link accounts to a child member.

**Request:**
```json
{
  "account_ids": [3, 7]
}
```

#### `POST /api/v1/households/{id}/leave`
Current user leaves the household voluntarily.

### Activity Log

#### `GET /api/v1/households/{id}/activity`
Recent activity in the household. Admin only.

**Query params:** `page`, `page_size`, `user_id` (filter by member), `action` (filter by action type)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_display_name": "Sara",
      "action": "created_transaction",
      "entity_type": "transaction",
      "entity_id": 542,
      "details": { "amount": -125000, "description": "Carrefour" },
      "created_at": "2026-03-23T14:30:00Z"
    }
  ]
}
```

> **Data Model:** See [02-data-models.md](../02-data-models.md) → Multi-Tenancy section for the `household_invitations`, `child_linked_accounts`, and `household_activity_log` table schemas.

## Pricing Tiers

| Feature | Free | Premium | Business |
|---------|------|---------|----------|
| Households | 1 | 2 | Unlimited |
| Members per household | 1 | 5 | 25 |
| Roles available | admin only | All 4 roles | All 4 roles |
| Activity log | No | 30 days | Unlimited |
| Invite codes | No | Yes | Yes |

## Acceptance Criteria

### Household & Roles
- [ ] User can create a household and becomes admin
- [ ] Admin can invite members via email link or invite code
- [ ] Invite code expires after 7 days
- [ ] Invited user joins with the assigned role
- [ ] User can belong to multiple households and switch between them
- [ ] Role permissions enforced: admin full CRUD, member restricted, viewer read-only, child scoped
- [ ] Admin cannot leave if they are the only admin

### Data Isolation
- [ ] All queries scoped to active household_id
- [ ] Supabase RLS enforces household isolation at DB level
- [ ] Child members see only linked accounts and own transactions
- [ ] P2P debts hidden from child and viewer roles
- [ ] Member removal does not delete their contributed data

### Child Accounts
- [ ] Admin can link specific accounts to a child member
- [ ] Child sees only linked accounts in sidebar and dashboard
- [ ] Child can create transactions on their linked accounts only
- [ ] Child cannot access debts, assets, Gam3eyas, or household settings

### Activity & Audit
- [ ] Activity log records all create/update/delete actions with user attribution
- [ ] Activity log visible to admin only
- [ ] Activity log filterable by member and action type

### Multi-Household
- [ ] Household switcher visible when user has 2+ households
- [ ] Switching household reloads all data contexts
- [ ] Notification preferences are per-user, not per-household
