import { InfoPage } from "@/components/tether/info-page";

export default function PricingPage() {
  return (
    <InfoPage
      eyebrow="Pricing"
      title="Built for the hackathon demo."
      body="This submission focuses on the control-plane proof rather than commercial packaging. The product page shows the live system of record."
      items={[
        {
          title: "Free to inspect",
          body: "Run the demo locally and inspect every API response, trace, and version row.",
        },
        {
          title: "DSQL-backed",
          body: "The database is the load-bearing artifact, not a mock UI fixture.",
        },
        {
          title: "Track 2 ready",
          body: "The flow is shaped for Aurora DSQL evaluation and a short demo video.",
        },
      ]}
    />
  );
}
