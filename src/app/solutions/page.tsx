import { InfoPage } from "@/components/tether/info-page";

export default function SolutionsPage() {
  return (
    <InfoPage
      eyebrow="Solutions"
      title="Govern agent actions by team."
      body="Use Tether as the shared write path for support, finance, security, and operations teams that need AI agents to act with evidence and rollback."
      items={[
        {
          title: "Support",
          body: "Route high-risk refunds for human approval before customer state changes.",
        },
        {
          title: "Finance",
          body: "See every proposed payment reversal, decision, and compensation record.",
        },
        {
          title: "Operations",
          body: "Keep agent actions idempotent, traceable, and reversible across tools.",
        },
      ]}
    />
  );
}
