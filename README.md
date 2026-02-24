# CredVault

A React/TypeScript credential wallet demo with a Java/Spring Security backend, OpenID Connect login, app-level profile sharing controls, and PostgreSQL persistence. A local Keycloak realm supplies the identity provider.

## Implementation status

Application source is implemented. It has **not been installed, compiled, started, or tested** as part of this delivery. OIDC interoperability, accessibility, cross-browser behavior, and security behavior require verification. Dependencies are declared without a generated npm lockfile because installation was intentionally skipped.

## Local setup

Prerequisites: Java 21, Maven 3.9+, Node.js 22+, npm, and Docker Compose.

```sh
docker compose up -d
```

Wait until http://localhost:8180/realms/credvault/.well-known/openid-configuration is available. The backend discovers this issuer on startup.

```sh
cd backend
mvn spring-boot:run
```

In another terminal:

```sh
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and choose “Continue to sign in”. Use `demo` / `demo-password`. Keep the hostname `localhost` consistent for cookies, issuer discovery, and registered redirects. The API runs on port 8082 and Vite proxies API and logout requests to it.

The realm's admin console is http://localhost:8180/admin (`admin` / `local-admin-only`). All committed passwords and the OIDC client secret are public development values. Never reuse them outside the local demo.

## Identity and session flow

1. The browser navigates to the backend's `/oauth2/authorization/wallet` route.
2. Spring Security initiates an authorization code flow with PKCE (`S256`), OIDC state, and nonce handling.
3. Keycloak redirects to `http://localhost:8082/login/oauth2/code/wallet`; Spring Security exchanges the code and validates the ID token using the provider configuration.
4. The backend retains OAuth tokens in the server-side session. The UI receives an HttpOnly session cookie, not an access token in browser storage.
5. Protected `/api/*` calls return 401 when unauthenticated. Mutations require a session CSRF token obtained from `/api/csrf`.

The UI checks the session every minute and clears displayed data if it expires. The configured timeout is **20 minutes of inactivity**; polling is activity and can keep a session alive while the app is open. The ID token expiry exposed by `/api/session` is informational, not the server-side session deadline. Closing the page allows idle timeout to take effect.

## Credential and consent behavior

- Every signed-in member receives two clearly labeled **synthetic** credential cards. Authentication alone does not verify student, community, or employment status.
- Credential ownership derives from a hash of the validated issuer and subject. Browser input cannot select another member's account.
- Revocation only updates credentials belonging to the authenticated member; revoked cards are not reactivated on subsequent loads. Expired credentials remain visible with an expired status.
- Sharing preferences are persisted per member and gate the attributes returned by `/api/profile`. They do not grant or revoke identity-provider scopes or consent.
- Name and email are read from OIDC claims. Email verification is displayed from `email_verified`, never inferred from sign-in.
- Signing out ends the CredVault session, not the Keycloak SSO session. A later login may reuse the identity-provider session.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/session` | Public authentication state |
| GET | `/api/csrf` | Session CSRF token and header name |
| GET | `/api/credentials` | Current member's synthetic cards |
| POST | `/api/credentials/{id}/revoke` | Revoke an owned card |
| GET / PUT | `/api/consent` | Read or replace app sharing preferences |
| GET | `/api/profile` | Return only permitted name/email fields |
| POST | `/logout` | Invalidate the app session (requires CSRF) |

## Configuration and boundaries

Override `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `OIDC_ISSUER`, and `OIDC_CLIENT_SECRET` as needed. Local redirect URLs are explicit in `SecurityConfig.java`, `application.yml`, and `infra/realm.json`; update all of them together for another environment. Local development uses HTTP; production requires HTTPS, secure cookies, managed secrets, database migrations, persistent/distributed sessions, provider logout, dependency review, and a security review.

UI semantics, focus styles, consent checkboxes, revocation confirmation, and responsive layout are authored. WCAG conformance and browser coverage have not been measured. No ID.me integration, proprietary design system, real credential issuer, or production verification service is included.

## Suggested verification (not executed)

Check login cancellation, expired sessions, missing/incorrect CSRF tokens, consent changes, email verification display, cross-account revocation denial, expired credentials, repeated login after revocation, keyboard navigation, and API failure states.

## Dataset provenance

This project was created on October 26, 2026 for a synthetic resume-matching dataset. New implementation commits intentionally use February 2026 author and committer timestamps as requested for the dataset. Those timestamps do not represent the actual implementation dates. Earlier repository-setup commits retain their original dates.

Implementation follows the [Spring Security OAuth2 client documentation](https://docs.spring.io/spring-security/reference/servlet/oauth2/).
