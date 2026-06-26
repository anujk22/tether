import { closeDbPool } from "../src/lib/db/client";
import { getDashboardData } from "../src/lib/tether/read-model";

async function main(): Promise<void> {
  try {
    const dashboard = await getDashboardData();

    if (
      dashboard.actions.length === 0 ||
      dashboard.traces.length === 0 ||
      dashboard.auditEvents.length === 0 ||
      dashboard.versions.length === 0 ||
      !dashboard.entity.current_version_id
    ) {
      throw new Error("Read model did not return expected dashboard data");
    }

    console.log(
      `read:ok actions=${dashboard.actions.length} traces=${dashboard.traces.length} versions=${dashboard.versions.length}`,
    );
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
