# Publish checklist (before going public and before every release)

- [ ] `gitleaks detect --source . --log-opts="--all"` is clean across the full history
- [ ] No personal data in fixtures, tests, screenshots, OG images or examples
- [ ] `.env.example` complete; `.env*` ignored; no real values anywhere
- [ ] `pnpm licenses list` shows only AGPL-compatible licences
- [ ] `brand-guard` CI job green; no Anthropic assets or copied doc text
- [ ] Mascot licence from the illustrator in `docs/licences/`
- [ ] Security headers tested in e2e (CSP without unsafe-inline scripts, HSTS, nosniff, referrer policy, permissions policy)
- [ ] SBOM generated and attached to the release
- [ ] Actions pinned to SHAs; Dependabot on; lockfile frozen in CI
- [ ] Preview deploys use a separate KV namespace and the `none` LLM provider (set in the Pages dashboard, see functions/README.md)
- [ ] `DATA.md` matches the privacy page word for word
- [ ] LICENSE and LICENSE-DATA contain full licence text
- [ ] README leads with the architecture diagram and the disclaimer
