# Development Milestones

Codex must work in milestones.
Each milestone must:
- Be fully complete
- Pass `npm run test:all`
- Be committed and pushed before moving on

## Vertical Slice 0 — Foundation

### M1: App shell + route groups
- Route groups: /manager, /tutor, /customer
- Base layout and navigation
- Placeholder dashboards
Done when: routes render and tests pass

### M2: Login page + auth wiring
- /login page UI
- Supabase client/server usage
Done when: login page renders and no runtime errors

### M3: Role → route mapping
- Central mapping logic
- Unit tests covering all roles
Done when: mapping tested and green

### M4: Role guards
- Server-side redirect if unauthenticated
- Server-side redirect if wrong role
Done when: guards enforce access correctly

### M5: Profiles + RLS skeleton
- SQL migration for public.profiles
- RLS enabled with minimal policies
Done when: migration exists and valid

### M6: E2E smoke tests
- Homepage loads
- Login page renders
Done when: Playwright tests pass

