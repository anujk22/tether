import { TetherQueryProvider } from "@/components/tether/query-provider";
import { TetherConsole } from "@/components/tether/tether-console";

export default function Home() {
  return (
    <TetherQueryProvider>
      <TetherConsole />
    </TetherQueryProvider>
  );
}
