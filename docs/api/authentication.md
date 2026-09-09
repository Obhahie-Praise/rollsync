````md
# Roll SYNC API — Authentication

The Roll SYNC API is consumed by three primary clients:

```text
Web Application
Mobile Application
Third-Party Applications / SDK
````

All three use the same backend authentication and authorization infrastructure.

The client is responsible for storing and presenting authentication state appropriately for its platform.

The backend is always responsible for determining whether a request is authenticated and authorized.

---

# 1. Authentication Architecture

Roll SYNC separates **authentication** from **authorization**.

```text
Client
  ↓
Authentication
  ↓
Authenticated Identity
  ↓
Organization Membership
  ↓
Permissions
  ↓
API Request
```

Authentication answers:

> "Who is making this request?"

Authorization answers:

> "What is this identity allowed to do?"

These must never be treated as the same concern.

---

# 2. Supported Clients

The same authentication system supports:

### Web

The Roll SYNC web application uses secure browser-based authentication.

### Mobile

The Roll SYNC mobile application uses token-based authentication suitable for native applications.

### SDK / API

Third-party applications authenticate through API credentials or supported OAuth mechanisms depending on the integration.

The backend remains the common authority.

```text
                    Roll SYNC API
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
         Web           Mobile          SDK
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 Authentication
                         │
                         ▼
                  Authorization
```

---

# 3. Authentication Provider

Roll SYNC uses a centralized authentication system capable of supporting:

* Email/password authentication
* Social sign-in
* Session management
* Mobile authentication
* Web authentication
* Account recovery
* Email verification
* Multi-device sessions

The authentication implementation should use a library that supports the web and mobile requirements without forcing each client to implement authentication independently.

The authentication provider is responsible for establishing identity.

The Roll SYNC backend is responsible for applying Roll SYNC-specific authorization.

---

# 4. Identity

A user has one global Roll SYNC identity.

A user should not need separate accounts for:

```text
Web
Mobile
Organizations
API-connected applications
```

Example:

```text
User
  │
  ├── Web Session
  ├── Mobile Session
  └── Organization Memberships
```

This allows the same person to move between supported Roll SYNC clients without creating duplicate identities.

---

# 5. User Account

A user account contains identity information required by Roll SYNC.

Conceptually:

```text
User
├── id
├── email
├── name
├── image
├── email_verified
├── created_at
└── updated_at
```

Authentication-specific fields should remain inside the authentication system where possible.

Roll SYNC should not duplicate credentials unnecessarily.

Passwords must never be stored directly by application code.

---

# 6. Social Sign-In

Roll SYNC should support social authentication where configured.

Potential providers include:

```text
Google
Apple
Microsoft
```

The initial implementation may launch with a smaller provider set.

Social authentication follows:

```text
User
  ↓
Provider
  ↓
Identity Verification
  ↓
Roll SYNC
  ↓
User Account
  ↓
Session
```

The provider verifies the user's identity.

Roll SYNC then associates that identity with the appropriate user account.

---

# 7. Email Authentication

Email authentication should support:

* Email/password
* Email verification
* Password reset
* Account recovery

Email addresses should be unique at the user-account level.

Verification status should be available to authorization logic where certain operations require a verified email.

---

# 8. Sessions

A session represents an authenticated interaction between a client and Roll SYNC.

Conceptually:

```text
User
  │
  ├── Session A
  ├── Session B
  └── Session C
```

A user may have multiple active sessions across:

* Web browsers
* Mobile devices
* Other authorized clients

Each session should be independently revocable.

---

# 9. Web Sessions

The web application should use secure HTTP-only cookies for authentication where supported by the authentication framework.

The browser should not need direct access to sensitive session credentials.

Recommended properties include:

```text
HttpOnly
Secure
SameSite
```

The exact configuration depends on the deployment environment and authentication library.

The web client should communicate with the Roll SYNC API using the authenticated session.

---

# 10. Mobile Sessions

Mobile applications cannot rely on browser cookie behavior as their primary authentication mechanism.

The mobile application should therefore use a token/session mechanism appropriate for native applications.

Conceptually:

```text
Mobile App
   ↓
Sign In
   ↓
Authentication Provider
   ↓
Session / Token
   ↓
Secure Device Storage
   ↓
API Requests
```

Tokens or session credentials should be stored using the platform's secure storage facilities.

They should not be stored in ordinary unencrypted application storage.

---

# 11. Mobile Token Lifecycle

The mobile application should support:

```text
Sign In
   ↓
Access Credential
   ↓
API Requests
   ↓
Credential Expiration
   ↓
Refresh
   ↓
Continue
```

If the session can no longer be refreshed:

```text
Refresh Failure
   ↓
Clear Credentials
   ↓
Require Sign In
```

The mobile application should not silently create a new account when authentication fails.

---

# 12. Offline Authentication

Offline attendance requires special consideration.

The mobile application may have a valid authenticated session while temporarily having no network connection.

Therefore:

```text
Authentication State
        ≠
Network Connectivity
```

A user may be authenticated locally while offline.

The application may therefore continue to create eligible local attendance operations while offline if the organization's entitlements allow offline synchronization.

The server ultimately remains authoritative.

---

# 13. Offline Authorization

Offline mode cannot perform a fresh server authorization check for every operation.

The mobile client therefore needs a locally available representation of the permissions required for supported offline operations.

For example:

```text
Cached Identity
Cached Organization Membership
Cached Offline Entitlement
Cached Session Context
```

This information is used only to determine whether the client should allow an offline operation to be queued.

When synchronization occurs, the backend performs authoritative validation again.

```text
OFFLINE

Local Authorization
      ↓
Queue Operation


ONLINE

Queued Operation
      ↓
Server Authentication
      ↓
Server Authorization
      ↓
Server Validation
      ↓
Accept / Reject
```

Local authorization must never be considered proof that the server must accept the operation.

---

# 14. Organization Membership

Authentication identifies the user.

Organization membership determines which organizations the user can access.

Conceptually:

```text
User
 │
 ├── Membership → Organization A
 │
 └── Membership → Organization B
```

A user may belong to multiple organizations.

This is important because the same account may be:

```text
Teacher at School A
Administrator at School B
Participant at Event C
```

without requiring multiple accounts.

---

# 15. Organization Roles

Memberships may contain roles.

Example:

```text
Organization
    │
    ├── Owner
    ├── Administrator
    ├── Attendance Manager
    ├── Staff
    └── Participant
```

The exact role system belongs to the authorization domain.

Authentication only establishes the user's identity.

---

# 16. Authorization

Every protected API request should pass through authorization.

Conceptually:

```text
Request
  ↓
Authenticate
  ↓
Identify User
  ↓
Resolve Organization
  ↓
Resolve Membership
  ↓
Check Permission
  ↓
Execute Request
```

For example:

```text
POST /attendance/sessions/:id/records

User
  ↓
Authenticated ✓
  ↓
Member of organization ✓
  ↓
Can record attendance ✓
  ↓
Execute
```

---

# 17. Resource Ownership

Resources should always be checked against the authenticated organization.

A user must not be able to access a resource simply because they know its ID.

Bad:

```text
GET /organizations/{id}/attendance
```

with no authorization check.

Correct:

```text
Authenticate
↓
Verify organization membership
↓
Verify permission
↓
Return data
```

This protects against insecure direct object references.

---

# 18. Organization Isolation

Organizations are logically isolated from one another.

```text
Organization A
├── Users
├── Attendance
├── Sessions
└── Events

Organization B
├── Users
├── Attendance
├── Sessions
└── Events
```

A request authenticated as a member of Organization A must not be able to access Organization B's data unless an explicit cross-organization permission exists.

Organization boundaries are enforced on the server.

---

# 19. API Authentication

Third-party applications should not use ordinary user passwords to access the Roll SYNC API.

API access should use dedicated credentials.

Potential mechanisms include:

```text
API Keys
OAuth 2.0
Service Credentials
```

The mechanism used depends on the integration type.

---

# 20. API Keys

API keys are appropriate for server-to-server integrations where a customer controls the consuming application.

Conceptually:

```text
Customer Server
      ↓
API Key
      ↓
Roll SYNC API
```

Keys should:

* Be generated securely
* Be shown only when appropriate
* Be stored hashed where possible
* Have scopes
* Be revocable
* Have usage tracked
* Be associated with an organization

The raw secret should not be stored unnecessarily.

---

# 21. API Key Scopes

API credentials should support restricted scopes.

Example:

```text
attendance:read
attendance:write
sessions:read
sessions:write
participants:read
```

A customer that only needs to read attendance should not automatically receive write access.

Example:

```text
API Key

Scopes:
├── attendance:read
└── sessions:read
```

The backend checks scopes before executing protected operations.

---

# 22. SDK Authentication

The Roll SYNC SDK is a client interface over the Roll SYNC API.

The SDK does not create an independent authentication system.

```text
Customer Application
        ↓
Roll SYNC SDK
        ↓
Roll SYNC API
        ↓
Authentication
        ↓
Authorization
```

SDK authentication credentials are ultimately API credentials or another supported API authentication mechanism.

This ensures that API and SDK access remain consistent.

---

# 23. SDK User Authentication

Some integrations may need to authenticate the end user rather than the customer's server.

For these use cases, Roll SYNC may support OAuth-style flows.

Conceptually:

```text
End User
   ↓
Customer Application
   ↓
Roll SYNC Authorization
   ↓
User Grants Permission
   ↓
Customer Application
   ↓
Roll SYNC API
```

This should be introduced when third-party application requirements justify it.

The initial MVP can focus on organization-level API credentials.

---

# 24. Authentication vs API Credentials

A normal user session and an API credential are different things.

### User session

Represents:

> "This person is signed in."

### API credential

Represents:

> "This application is authorized to access this organization's Roll SYNC resources."

They should not be interchangeable.

---

# 25. Authentication Middleware

Protected API routes should pass through centralized authentication middleware.

Conceptually:

```text
Incoming Request
       ↓
Auth Middleware
       ↓
Authenticated Principal
       ↓
Authorization Middleware
       ↓
Route Handler
```

The route handler should receive an already-resolved authenticated principal rather than independently parsing credentials.

---

# 26. Authenticated Principal

Internally, the API can represent an authenticated request with a principal.

Conceptually:

```ts
type AuthenticatedPrincipal = {
  userId: string
  organizationId?: string
  membershipId?: string
  authType: "session" | "api_key" | "oauth"
}
```

The exact implementation belongs to the backend.

The important principle is that route handlers should work with a normalized authenticated identity regardless of how the request was authenticated.

---

# 27. Authentication Errors

Authentication failures should use consistent API responses.

### Missing credentials

```text
401 Unauthorized
```

### Invalid or expired credentials

```text
401 Unauthorized
```

### Authenticated but insufficient permission

```text
403 Forbidden
```

The API should not expose unnecessary information about why authentication failed.

---

# 28. API Credential Errors

API credentials should be rejected when:

* The key is invalid
* The key has been revoked
* The key has expired
* The key lacks the required scope
* The organization no longer has API access
* The subscription does not include the required entitlement

For example:

```text
API Key
   ↓
Valid ✓
   ↓
Organization API Entitlement
   ↓
Missing ✗
   ↓
403 Forbidden
```

---

# 29. Billing-Aware Authentication

Authentication establishes identity.

Billing determines whether certain API capabilities are available.

These systems should remain separate.

```text
Authentication
      ↓
Who are you?

Authorization
      ↓
What can you access?

Entitlements
      ↓
What capabilities has your organization purchased?
```

For example, an authenticated user may exist successfully but still be unable to use the API if their organization's subscription does not include API access.

---

# 30. API Access and Custom Plans

Custom API-only customers are supported naturally through entitlement checks.

Example:

```text
Organization
   ↓
CUSTOM Subscription
   ↓
api = true
sdk = true
dashboard = false
mobile = false
```

The customer can authenticate against the API without requiring a Roll SYNC dashboard subscription.

---

# 31. Session Revocation

Users should be able to revoke active sessions.

Potential functionality:

```text
Current Device
Other Devices
Sign Out Everywhere
```

Revoking a session should invalidate its ability to access protected resources.

API credentials should have independent revocation.

Revoking a user's web session should not automatically revoke an organization's API key unless explicitly intended.

---

# 32. API Key Rotation

API keys should support rotation.

A customer should be able to:

```text
Create new key
      ↓
Deploy new key
      ↓
Verify integration
      ↓
Revoke old key
```

This allows credential rotation without downtime.

---

# 33. Auditability

Security-sensitive authentication events should be auditable where appropriate.

Examples:

```text
User signed in
User signed out
Password changed
API key created
API key revoked
OAuth authorization granted
Session revoked
```

Authentication logs should not contain raw passwords, API secrets, or access tokens.

---

# 34. Rate Limiting

Authentication endpoints should be rate-limited.

Particularly sensitive endpoints include:

```text
Login
Password reset
Verification
Token refresh
API authentication
```

API customers should also have rate limits determined by their subscription and API entitlement.

```text
Request
  ↓
Authentication
  ↓
Rate Limit
  ↓
Authorization
  ↓
Request Execution
```

---

# 35. Security Principles

The authentication system follows these rules:

1. **Never trust the client.**
2. **Never store plaintext passwords.**
3. **Never expose authentication secrets unnecessarily.**
4. **Authenticate before authorizing.**
5. **Authorize every protected resource.**
6. **Enforce organization isolation server-side.**
7. **Keep API credentials separate from user sessions.**
8. **Make credentials revocable.**
9. **Make authentication operations auditable where appropriate.**
10. **Treat offline authorization as provisional until server reconciliation.**

---

# 36. Canonical Web Flow

```text
User
 ↓
Web Application
 ↓
Sign In
 ↓
Authentication Provider
 ↓
Session Created
 ↓
Secure Cookie
 ↓
Roll SYNC API
 ↓
Authenticate Session
 ↓
Resolve User
 ↓
Resolve Organization
 ↓
Check Permission
 ↓
Execute Request
```

---

# 37. Canonical Mobile Flow

```text
User
 ↓
Mobile Application
 ↓
Sign In
 ↓
Authentication Provider
 ↓
Session / Token
 ↓
Secure Device Storage
 ↓
Roll SYNC API
 ↓
Authenticate
 ↓
Authorize
 ↓
Execute Request
```

---

# 38. Canonical SDK Flow

```text
Customer Application
 ↓
Roll SYNC SDK
 ↓
API Credential
 ↓
Roll SYNC API
 ↓
Authenticate Credential
 ↓
Resolve Organization
 ↓
Check API Entitlement
 ↓
Check Scope
 ↓
Execute Request
```

---

# 39. Canonical Offline Flow

```text
Mobile User
 ↓
Authenticated Local Session
 ↓
Offline Attendance Intent
 ↓
Local Authorization Check
 ↓
Local Pending Queue
 ↓
Network Available
 ↓
Roll SYNC API
 ↓
Server Authentication
 ↓
Server Authorization
 ↓
Attendance Validation
 ↓
Accept / Reject
 ↓
Local Reconciliation
```

---

# 40. Authentication Boundary

The final architectural boundary is:

```text
┌───────────────────────────────────────┐
│              CLIENTS                  │
│                                       │
│ Web        Mobile        SDK          │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│            ROLL SYNC API              │
│                                       │
│ Authentication                        │
│ Authorization                         │
│ Entitlements                          │
│ Rate Limiting                          │
│ Business Logic                         │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│              DATA                     │
│                                       │
│ Users                                  │
│ Organizations                          │
│ Memberships                            │
│ Attendance                             │
│ Subscriptions                          │
│ Entitlements                           │
└───────────────────────────────────────┘
```

The API is therefore the security boundary for Roll SYNC.

Clients may provide authentication credentials and request operations, but **the backend always makes the final decision about identity, authorization, entitlement, and access.**

```
```
