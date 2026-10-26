# Credential Wallet

A credential dashboard project exploring identity federation, scoped profile access, and accessible account interfaces.

## Status

Initial project scaffold. Application code, authentication integration, tests, and deployment are not implemented yet. The architecture below describes planned work.

## Planned stack

- React and TypeScript for the wallet interface
- Java, Spring Boot, and Spring Security for API access
- A local OpenID Connect provider for authorization code flow with PKCE
- JUnit, React Testing Library, Playwright, and axe-core for verification

## Planned behavior

Sign in through an OIDC provider, display synthetic credentials, request profile scopes with explicit consent, and handle expired sessions and failed authentication. Keep tokens out of browser local storage and validate issuer, audience, expiry, and signatures on protected API requests.

## Implementation milestones

1. Configure a local identity provider and backend session management.
2. Add credential APIs and a typed React dashboard.
3. Add consent and session-expiry interfaces.
4. Test access failures, keyboard navigation, and Chromium, Firefox, and WebKit behavior.

This is an independent educational project. It does not connect to ID.me or use proprietary design-system assets.
