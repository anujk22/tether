import { InfoPage } from "@/components/tether/info-page";

export default function DocsPage() {
  return (
    <InfoPage
      eyebrow="Docs"
      title="How the demo is wired."
      body="The app exposes one real action flow: issue_refund. The agent and downstream system are simulated, while the gate, versioning, rollback, compensation, idempotency, and DSQL writes are real."
      items={[
        {
          title: "Propose",
          body: "POST /v1/actions/propose creates a scripted refund proposal and snapshots prior state.",
        },
        {
          title: "Decide",
          body: "POST /v1/actions/{id}/decision approves or rejects the gated proposal.",
        },
        {
          title: "Rollback",
          body: "POST /v1/actions/{id}/rollback restores v4 and creates compensation.",
        },
      ]}
    />
  );
}
