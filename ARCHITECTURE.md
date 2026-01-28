# Architecture Notes

## Auth Flow
- Supabase email/password auth
- User metadata stored in public.profiles
- Role read server-side only

## Authorization
- Guards implemented in layouts or server components
- No client-side-only protection
- Redirect unauth users to /login
- Redirect wrong-role users to correct area

## Testing Strategy
- Vitest for logic (role mapping, guards)
- Playwright for page existence and routing
- `npm run test:all` is the quality gate

## Commit Strategy
- One commit per milestone
- No partial milestone commits
- Commits only when tests are green

