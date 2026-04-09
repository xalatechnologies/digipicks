# DigiPicks Product Requirements Document (PRD)

## 1. Introduction

### 1.1 Product name

DigiPicks

### 1.2 Product summary

DigiPicks is a premium sports-picks creator platform where vetted creators publish free and paid picks, subscribers discover and follow trusted creators, and the platform manages subscriptions, access, payouts, moderation, and operational oversight.

The product sits in the same market category as Whop, DubClub, and Winible, but is positioned as a more curated, trust-first, sports-picks-native platform rather than a broad creator marketplace.

### 1.3 Problem statement

Sports betting creators and subscribers currently operate across fragmented tools such as social platforms, chat groups, payment links, spreadsheets, and email. This creates weak trust, poor monetization control, inconsistent access handling, and limited visibility into results and performance.

DigiPicks solves this by bringing discovery, gated content, subscriptions, creator monetization, results tracking, and platform operations into one structured system.

## 2. Goals

### 2.1 Business goals

1. Build a premium creator marketplace for sports picks.
2. Enable creators to monetize through recurring subscriptions and future digital products.
3. Increase subscriber trust through verified creators, structured picks, and clear performance visibility.
4. Give platform operators strong control over creator quality, billing health, moderation, and compliance.
5. Create a scalable product foundation for future growth features such as referrals, smart pricing, auto-grading, and integrations.

### 2.2 User goals

#### Creators

- Publish picks and analysis professionally.
- Sell subscriptions and future products.
- Manage subscribers, access, branding, and communication.
- Track revenue, growth, and performance.

#### Subscribers

- Discover trustworthy creators.
- Subscribe and access premium content easily.
- Follow picks, save content, and track results.
- Manage billing, notifications, and account settings.

#### Admins

- Review and approve creators.
- Manage users, creators, subscriptions, billing issues, and moderation.
- Protect trust, safety, and compliance.

## 3. Product principles

1. Trust before hype.
2. Curated quality over open noise.
3. Structured picks over unstructured posting.
4. Subscription state must drive access everywhere.
5. Creator, subscriber, and admin experiences must remain clearly separated.
6. Monetization, billing, and payouts are first-class product capabilities.
7. The product must be maintainable and extensible without major rewrites.

## 4. Personas

### 4.1 Visitor

An unauthenticated user exploring the platform, creators, and event-related content.

### 4.2 Applicant Creator

A prospective creator applying to join the platform and submitting proof, niche, and profile information.

### 4.3 Approved Creator

A vetted creator who manages picks, pricing, subscribers, payouts, branding, and growth.

### 4.4 Subscriber

A paying or free user who discovers creators, consumes content, and manages subscriptions and results.

### 4.5 Platform Admin

An internal operator who manages creator approval, billing oversight, moderation, user states, auditability, and system health.

### 4.6 Support / Trust & Safety

An operational role that handles disputes, account issues, refunds, abuse investigation, and GDPR-related support requests.

## 5. User stories

### 5.1 Discovery and acquisition

- As a visitor, I want to understand the platform quickly from the homepage so I can decide whether to browse creators, sign up, or apply.
- As a visitor, I want to browse creators and events so I can evaluate platform value.
- As a visitor, I want to open creator profiles so I can compare creators before subscribing.
- As a prospective creator, I want an application flow so I can request access to the platform.

### 5.2 Authentication and onboarding

- As a visitor, I want to create an account so I can subscribe or interact with the platform.
- As a creator or subscriber, I want to sign in and be routed to the correct experience so I do not enter the wrong surface.
- As an applicant creator, I want to submit proof, niche, and profile information so I can be reviewed.
- As an admin, I want to review creator applications so only qualified creators are approved.

### 5.3 Creator operations

- As a creator, I want to create subscription plans so I can monetize my audience.
- As a creator, I want to publish free and premium picks so I can balance reach and monetization.
- As a creator, I want to manage my posts, subscribers, revenue, and payouts so I can run my business.
- As a creator, I want to control access rules and branding so my business feels professional.
- As a creator, I want to send messages or promotions to subscribers so I can improve retention and growth.

### 5.4 Subscriber experience

- As a subscriber, I want to search and filter creators so I can find the best fit for my interests.
- As a subscriber, I want to subscribe securely so I can unlock premium content.
- As a subscriber, I want a personalized feed so I can consume content from creators I follow.
- As a subscriber, I want to save posts and track followed plays so I can revisit and measure outcomes.
- As a subscriber, I want to manage subscriptions, billing, and notifications so I stay in control.

### 5.5 Admin and support operations

- As an admin, I want to manage creator status and verification so the marketplace stays trusted.
- As an admin, I want to monitor subscriptions, failed payments, and transactions so the business remains healthy.
- As an admin or support operator, I want to intervene in billing/access issues so customers do not lose trust.
- As an admin, I want moderation and audit tooling so actions are safe and traceable.

## 6. Scope

### 6.1 MVP scope

The MVP includes:

1. Public website and discovery
2. Authentication and identity
3. Creator onboarding and verification workflow
4. Creator profile and discovery
5. Subscription plans and recurring monetization
6. Posts, picks, and content publishing
7. Sports event association and cutoff handling
8. Pick grading and performance tracking
9. Customer feed and gated content consumption
10. Billing and payment management
11. Notifications
12. Saved content and personal library
13. Access control and entitlements
14. Settings and profile management
15. Admin operations

### 6.2 Post-MVP scope

The following are planned after MVP unless already partially available:

- Referrals and affiliate tools
- Smart pricing recommendations
- Promotions and growth manager
- Auto-grading from external odds/event providers
- Advanced messaging segmentation
- One-time creator products beyond subscriptions
- Deeper public analytics and historical result pages
- AI-assisted insights and recommendations
- External community integrations such as Discord or Telegram

## 7. Functional requirements

### 7.1 Public website and marketing

The system shall:

- Provide a public homepage with value proposition, creator previews, trust messaging, events, and CTAs.
- Provide a creators listing and discovery surface.
- Provide public creator profile pages.
- Provide a network/about-style page describing the platform promise.
- Provide an application entry point for prospective creators.
- Gracefully handle missing featured creators or event data without breaking public pages.

### 7.2 Authentication and identity

The system shall:

- Support account registration.
- Support secure login and logout.
- Support session persistence.
- Support password reset.
- Support role-based routing after login.
- Support optional connected accounts where enabled.
- Support secure handling of suspended, incomplete, or multi-role accounts.

### 7.3 Creator onboarding and verification

The system shall:

- Allow creator application submission with identity, niche, bio, performance proof, and external presence.
- Store applications in a review queue.
- Allow admins to approve, reject, or request more information.
- Maintain creator verification status.
- Display creator verification state on eligible public surfaces.

### 7.4 Creator profile and discovery

The system shall:

- Display creator cards with avatar, summary, price, niche/category, and trust indicators.
- Support search by creator name, handle, sport, and keyword.
- Support filtering by sport, category, trending state, and free/premium indicators where configured.
- Provide public creator profile pages with bio, positioning, pricing, and subscribe CTA.
- Exclude hidden, suspended, or unpublished creators from discovery.

### 7.5 Subscription plans, products, and monetization

The system shall:

- Allow creators to create recurring subscription plans.
- Support weekly, monthly, and yearly billing intervals unless business rules later restrict them.
- Allow creators to configure name, description, price, status, interval, benefits, and access mapping.
- Allow future support for creator products beyond subscriptions.
- Provide creator earnings and monetization summaries.
- Support smart pricing capabilities where enabled.

### 7.6 Posts, picks, and content publishing

The system shall:

- Allow creators to create posts and structured picks.
- Support draft and published states.
- Support premium and free visibility states.
- Support event association and betting metadata.
- Display creator post inventory and performance-related summaries.
- Support scheduled or immediate publication where available.
- Track allowed engagement actions such as saves and views where enabled.

### 7.7 Sports events and pick association

The system shall:

- Provide browsable sports events, including filtering and search.
- Allow creators to attach picks to sports events.
- Enforce event cutoff or lock timing for publishing/editing when required.
- Handle delayed or changed event timing safely.

### 7.8 Pick grading and performance tracking

The system shall:

- Support pick lifecycle states including pending, win, loss, push, void, cancelled, and disputed where applicable.
- Recalculate creator and subscriber performance metrics after grading changes.
- Provide creator performance metrics such as wins, losses, pushes, win rate, ROI, and net units.
- Provide subscribers with tracked results and personal performance views.
- Support breakdowns by time interval, sport, and recent activity where configured.

### 7.9 Customer feed and content consumption

The system shall:

- Provide a subscriber feed containing entitled content.
- Clearly mark free and premium content.
- Support locked states for inaccessible premium content.
- Support save/bookmark actions.
- Support post detail viewing subject to entitlement rules.
- Handle expired access, deleted content, and suspended creators gracefully.

### 7.10 Billing and payment management

The system shall:

- Allow subscribers to purchase subscriptions through secure checkout.
- Create recurring subscriptions and entitlements.
- Display active subscriptions with renewal date, price, and status.
- Allow cancellation according to platform billing rules.
- Support payment method management.
- Display billing history including charges, statuses, and refunds where relevant.
- Handle payment failures, retries, and access changes safely.

### 7.11 Notifications and messaging

The system shall:

- Support notification preferences per user.
- Generate notifications for important events such as new posts, billing changes, and platform updates.
- Support in-app notifications at minimum.
- Support creator messaging to eligible subscribers where enabled and policy-compliant.

### 7.12 Saved content and personal library

The system shall:

- Allow subscribers to save posts.
- Allow subscribers to bookmark creators where enabled.
- Provide a saved library surface.
- Allow removal of saved items.
- Handle deleted or inaccessible saved references gracefully.

### 7.13 Growth, referrals, and promotion

The system may support:

- Referral tools
- Promo links and campaigns
- Growth dashboards
- Smart pricing and pricing optimization

These are post-MVP unless explicitly enabled earlier.

### 7.14 Access control and entitlements

The system shall:

- Enforce premium access using active subscription or product entitlement state.
- Support creator-defined mapping of tiers to content/product access.
- Support locked-content labels and clear access-state messaging.
- Support cancellation, expiration, payment failure, and grace-period logic.
- Support authorized admin overrides with audit logging.

### 7.15 Settings and account management

The system shall:

- Allow users to update profile details.
- Support connected account management where enabled.
- Support notification preferences.
- Support theme and UI preference persistence where applicable.
- Support secure sign-out.
- Require additional security checks for sensitive account changes when appropriate.

### 7.16 Admin operations

The system shall:

- Allow admins to manage creators, users, and creator applications.
- Allow content moderation and content state changes.
- Allow billing/access support actions by authorized operators.
- Maintain audit logs for critical administrative and security-relevant actions.
- Support compliance-related operational tasks such as export, deletion workflow handling, and dispute investigation.

## 8. Non-functional requirements

### 8.1 Security

- Strong session management is required.
- RBAC is required across all protected surfaces.
- Passwords must use modern one-way hashing.
- Optional MFA is required for admins at minimum and desirable for creators.
- Sensitive actions should support step-up verification where needed.
- Rate limiting is required for auth, messaging, search, applications, and checkout-related endpoints.
- CSRF protection is required for cookie-based authenticated state changes.
- File uploads must be validated and scanned.
- Secrets must never be exposed to clients.

### 8.2 Privacy and GDPR

- Data minimization must be applied.
- Personal data must have defined processing purposes and retention rules.
- Users must be able to access, export, and request deletion of their data subject to legal constraints.
- Billing, support, analytics, and audit workflows must avoid unnecessary retention of sensitive content.
- Processor/vendor handling must be documented where required.

### 8.3 Accessibility

- WCAG 2.1 AA compliance is required.
- Full keyboard support is required.
- Visible focus states are required.
- Interactive controls require accessible labels.
- Forms require clear labels, instructions, and error association.
- Dynamic updates must be accessible to assistive technologies.
- Charts and highly visual dashboards must provide accessible alternatives.

### 8.4 Performance

- Public pages should load quickly on mobile and low-bandwidth conditions.
- Search and filtering should feel near-real-time.
- Feed and discovery surfaces must support pagination or incremental loading.
- Public creator and event pages should use appropriate caching.
- Delayed event or grading data should not break the UI.

### 8.5 Reliability

- Critical flows must degrade safely during payment, notification, grading, or event-feed delays.
- Retry mechanisms are required for async jobs such as billing webhooks, notifications, and grading syncs.
- Idempotency is required for billing-related events.
- Monitoring and alerting are required for payment issues, provisioning failures, access mismatches, event ingestion failures, and moderation backlog growth.

### 8.6 Scalability

- The architecture must scale across creators, subscribers, posts, plans, events, and notifications.
- Auth, content, billing, notifications, and analytics should remain separable at service/domain level.
- Read-heavy discovery/feed experiences must scale independently from write-heavy creator and billing workflows.

### 8.7 UX

- Mobile-first responsive design is required.
- Premium lock states must be clear, not confusing.
- Zero states must be intentional and actionable.
- Financial states such as renewal, cancellation consequences, and status must be transparent.
- Role transitions must be obvious so creators and subscribers do not get confused.

## 9. Data model overview

The core domain shall include at minimum the following entities:

- User
- CreatorProfile
- CreatorApplication
- SubscriptionPlan
- Product
- Subscription
- Post
- Pick
- SportsEvent
- PickResult / GradeRecord
- SavedItem
- Notification
- PaymentMethod
- Invoice / BillingTransaction
- Message
- AuditLog

### Ownership rules

- Users own personal settings, saved items, and account preferences.
- Creators own their profiles, posts, plans, and creator-facing settings, subject to platform moderation authority.
- Subscribers own their subscription choices and saved references.
- Platform operators own audit, moderation, reconciliation, and system-operation records within privacy and legal constraints.

### Data partitioning model

This product is a platform with creator-scoped operational domains, not a B2B enterprise multi-tenant SaaS in the traditional organizational sense. The correct model is:

- one platform
- many creators
- many subscribers
- creator-scoped content and monetization domains
- user-level personalization
- platform-level operational governance

## 10. Competitive positioning

DigiPicks competes in the same market as Whop, DubClub, and Winible, but should differentiate through:

1. stronger trust through verified and structured picks
2. cleaner creator-to-subscriber operating model
3. better premium content gating and entitlement clarity
4. stronger creator performance visibility
5. stronger admin and trust/safety operations

DigiPicks should avoid becoming a generic creator marketplace. It should remain sports-picks-first, premium, curated, and trust-oriented.

## 11. Assumptions

1. The platform is curated and creator approval is manual.
2. The system supports both free and premium content.
3. Recurring subscriptions are part of MVP.
4. Event-linked pick tracking is part of the product model.
5. Admin tooling is required even where not shown in all visual references.
6. External event or sports-data integration is required for full production readiness.
7. Growth/referral/promo features may exist as later modules if not completed in MVP.

## 12. Open questions

1. What exact pick types are supported at launch: singles, parlays, props, live picks, analysis-only posts?
2. What exact creator verification criteria are required?
3. What creator metrics are public versus private?
4. What is the exact payment provider and payout model?
5. What is the cancellation and grace-period policy?
6. How are disputed picks resolved and displayed?
7. Are products limited to subscriptions in MVP?
8. Is messaging one-to-many only, or also direct one-to-one?
9. What jurisdictions are in scope given betting-related legal sensitivity?
10. Is multilingual support required at launch?
11. Are separate internal admin roles required for finance, moderation, and creator approval?

## 13. Success metrics

- Creator application-to-approval rate
- Approved creator activation rate
- Subscriber conversion rate from creator profile to paid checkout
- Monthly recurring revenue
- Subscriber retention rate
- Failed payment recovery rate
- Creator revenue per active creator
- Feed engagement and repeat visits
- Support-resolution time for billing/access issues

## 14. Delivery recommendation

This PRD is the single product source of truth.

Implementation planning should now be split into separate artifacts:

1. MVP backlog with epics and stories
2. Technical architecture and service boundaries
3. Data model and schema specification
4. Acceptance test matrix
5. Post-MVP roadmap
