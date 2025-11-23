# Subscription and Credit System Implementation Plan

## Goal Description

Implement a robust subscription and credit system where:

- **Free Tier**: 2 credits/day, resets daily (no accumulation).
- **Pro Tier**: 150 credits/month, resets on billing cycle.
- **Subscription**: 1-month duration, managed via Stripe.
- **UI**: New Subscription tab in Profile to manage plan.
- **Configuration**: All variables managed via constants.

## User Review Required

> [!IMPORTANT] > **Credit Reset Logic**: Free tier credits reset daily at 00:00 UTC (or effectively on first use after a new day). Pro tier credits reset on successful payment/renewal.
> **Database Changes**: Adding `lastCreditResetDate` to User model.

## Proposed Changes

### Models

#### [MODIFY] [User.js](file:///Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/models/User.js)

- Add `lastCreditResetDate` field to track when credits were last reset.

### Services

#### [MODIFY] [subscriptionService.js](file:///Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/services/subscriptionService.js)

- Implement `checkAndResetDailyLimits(user)`:
  - For Free users: Check if `lastCreditResetDate` is before today. If so, reset `creditsUsed` to 0 and update date.
  - For Pro users: Logic handled by webhook (reset on payment), but ensure no daily reset interferes.
- Call `checkAndResetDailyLimits` in `hasCredits` and `trackUsage`.

### Webhooks

#### [MODIFY] [route.js](file:///Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/app/api/webhooks/stripe/route.js)

- On `checkout.session.completed` and `invoice.payment_succeeded`:
  - Reset `creditsUsed` to 0.
  - Ensure `role` is set to 99 (Subscriber).
  - Update `subscriptionExpiresAt`.

### UI

#### [MODIFY] [page.js](file:///Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/app/profile/page.js)

- Add a "Subscription" tab.
- Display current plan details (Name, Credits, Expiry).
- If Free, show "Upgrade to Pro" button (linking to Stripe payment).
- If Pro, show subscription status and renewal date.

### Constants

#### [VERIFY] [constants.js](file:///Users/sukhjot/codes/untitled folder 2/ats-resume-builder-a1/src/lib/constants.js)

- Ensure `PLANS` object contains correct values (Free: 2/day, Pro: 150/month).
