import { Suspense } from "react";

import { TetherConsole } from "@/components/tether/tether-console";
import { TetherQueryProvider } from "@/components/tether/query-provider";

export default function ConsolePage() {
  return (
    <TetherQueryProvider>
      <Suspense fallback={null}>
        <TetherConsole />
      </Suspense>
    </TetherQueryProvider>
  );
}
