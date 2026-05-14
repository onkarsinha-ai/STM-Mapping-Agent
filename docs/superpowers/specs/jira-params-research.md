# Jira Connection Parameters Research

## 1. Jira Cloud (Atlassian Cloud-Hosted)

### Required Connection Fields
- **Base URL / Site URL** — The Atlassian site URL, e.g. `https://<your-domain>.atlassian.net`
- **Authentication method** — Selector for how the user will authenticate

### Optional Connection Fields
- **Project Key(s)** — Restrict connection to specific Jira projects (comma-separated or multi-select)
- **Default Issue Type** — Pre-selected issue type for operations
- **API Version** — Usually auto-detected; allow override if needed

### Authentication Methods Available

#### 1a. Basic Auth (Email + API Token)
- **Email address** — The Atlassian account email
- **API Token** — Generated from https://id.atlassian.com/manage-profile/security/api-tokens
- Note: Password authentication was deprecated by Atlassian; API tokens are required for Basic Auth with Jira Cloud.

#### 1b. OAuth 2.0 (3LO — Three-Legged OAuth)
- **Client ID** — From the Atlassian developer console app
- **Client Secret** — From the Atlassian developer console app
- **Authorization URL** — `https://auth.atlassian.com/authorize`
- **Token URL** — `https://auth.atlassian.com/oauth/token`
- **Redirect URI** — Must match the app registration exactly
- **Scopes** — Space-separated list of scopes (see below)
- **Cloud ID** — The Atlassian cloud instance ID (obtained after authorization)

#### 1c. Personal Access Tokens (PATs)
- Not available for Jira Cloud. PATs are a Jira Server/Data Center feature only.

### Required Permissions / Scopes for Read-Only Access
- `read:jira-work` — Read issue data, comments, transitions, etc.
- `read:jira-user` — Read user information (for assignee/reporter fields)
- `read:project:jira` — Read project metadata
- `offline_access` — If refresh tokens are needed for long-lived connections

---

## 2. Jira Server / Data Center (Self-Hosted)

### Required Connection Fields
- **Base URL** — The self-hosted Jira instance URL, e.g. `https://jira.company.com` or `http://jira.internal:8080`
- **Authentication method** — Selector for how the user will authenticate

### Optional Connection Fields
- **Project Key(s)** — Restrict connection to specific projects
- **Default Issue Type** — Pre-selected issue type
- **SSL/TLS Verification** — Toggle for certificate validation (useful for internal/self-signed certs)
- **Proxy Settings** — Host, port, username, password if required
- **API Version** — Allow override (e.g. `2` or `3` for newer Data Center versions)

### Authentication Methods Available

#### 2a. Basic Auth (Username + Password)
- **Username** — Jira username (not email, unless configured that way)
- **Password** — Jira user password or API token (if API tokens are enabled in Server/DC)
- Note: In Jira Server, the password field can accept either the actual password or a personal access token depending on the Jira version and configuration.

#### 2b. Personal Access Tokens (PATs)
- **PAT** — Token generated from Jira UI: Profile → Personal Access Tokens
- Note: Available in Jira Data Center 8.14+ and Jira Server 8.14+ with the feature enabled by an admin.

#### 2c. OAuth 1.0a
- **Consumer Key** — Registered application consumer key
- **Private Key** — RSA private key for signing requests
- **Access Token** — OAuth 1.0a access token
- **Access Token Secret** — OAuth 1.0a token secret
- Note: OAuth 1.0a is the legacy OAuth protocol for Jira Server. OAuth 2.0 is not natively supported in Server/DC.

#### 2d. OAuth 2.0 (Limited / Add-on)
- Not natively supported in Jira Server/Data Center core.
- Some third-party plugins or reverse-proxy OAuth solutions may exist, but they are not standard.

### Required Permissions for Read-Only Access
- **Browse Projects** project permission — Required to see any issues in a project
- **Issue Permissions > Browse Issues** — Required to view issue details
- **User Permissions > View Users** — Required to resolve user fields (assignee, reporter)
- For PATs: The token inherits the permissions of the user who created it
- For OAuth 1.0a: Scopes are configured during app link setup in Jira admin

---

## 3. Authentication Method Comparison Summary

| Method | Jira Cloud | Jira Server | Jira Data Center | Recommended For |
|--------|-----------|-------------|------------------|-----------------|
| Basic Auth (Email + API Token) | Yes | No (Password only) | No (Password only) | Scripts, single-user integrations |
| Basic Auth (Username + Password) | Deprecated | Yes | Yes | Legacy integrations |
| OAuth 2.0 (3LO) | Yes | No | No | Multi-user apps, user-impersonation |
| Personal Access Tokens (PAT) | No | 8.14+ | 8.14+ | Secure server automation |
| OAuth 1.0a | No | Yes | Yes | App links, plugin integrations |

---

## 4. Connection Form UI Recommendations

### Dynamic Field Visibility
- Show/hide fields based on the selected **Authentication Method** and **Jira Type** (Cloud vs. Server/DC).
- If Jira Cloud is selected, disable/hide PAT and OAuth 1.0a options.
- If Jira Server/DC is selected, disable/hide OAuth 2.0 (3LO) option.

### Validation Hints
- Base URL should end with the domain; do not append `/rest/api/2` — the connector should handle API paths.
- For Jira Cloud, validate the base URL matches `*.atlassian.net` or a custom domain.
- For OAuth 2.0, provide a "Test Connection" or "Authorize" button that initiates the OAuth flow.
- For PATs, warn the user if their Jira Server version is below 8.14.

### Security Notes
- API tokens, PATs, client secrets, and passwords should be stored encrypted (e.g., in a secrets manager or encrypted DB column).
- OAuth 2.0 refresh tokens should be stored securely and rotated on use.
- Never log credentials or tokens.
