# Project Rules

## Versioning
- Version format is always `x.xxx` (3 decimal places), e.g. `1.940`, `1.941`
- **Bump the version after every change**, before committing
- Version is set at `const VERSION="x.xxx"` in `index.html`
- The PostToolUse hook automatically creates a versioned download file `Risk-Threat-Assessment-Tool-vX.XXX.html` after each commit

## Git Workflow
- Development branch: `claude/review-app-improvements-iNAvy`
- **After every push to the development branch, immediately merge to `main` and push main**
- Merge command sequence: `git checkout main && git merge claude/review-app-improvements-iNAvy --no-edit && git push origin main && git checkout claude/review-app-improvements-iNAvy`
- This keeps Vercel (which deploys from `main`) always up to date
