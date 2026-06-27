# Submission Checklist

- [x] App implements one end-to-end action type: `issue_refund`.
- [x] Gate, approval, execution, rollback, compensation, idempotency, audit, traces, and DSQL writes are real.
- [x] Agent and downstream enterprise/payment systems are clearly simulated.
- [x] Aurora DSQL usage is named in Devpost copy.
- [x] Architecture diagram exists in `docs/ARCHITECTURE.md`.
- [x] Devpost draft exists in `docs/DEVPOST.md`.
- [x] Demo script exists in `docs/DEMO_SCRIPT.md`.
- [ ] Published Vercel link.
- [ ] Vercel Team ID.
- [ ] Screenshot proving DSQL usage from AWS console or Vercel storage/config.
- [ ] Sub-3-minute YouTube demo.
- [ ] Submit under Track 2: Monetizable B2B App.
- [ ] Optional builder.aws.com / LinkedIn / dev.to post with `#H0Hackathon`.

## Deployment Inputs Needed

- Vercel project or permission to create one.
- Vercel Team ID for submission notes.
- Confirmation that AWS env vars are set in Vercel: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `DSQL_HOST`, `DSQL_DATABASE`, `DSQL_USER`, `DSQL_PORT`, `DSQL_SSL`.
