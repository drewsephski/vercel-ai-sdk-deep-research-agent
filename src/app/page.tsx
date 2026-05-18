import { DeepResearchAgent } from "@/components/DeepResearchAgent";
import { auth } from "@trigger.dev/sdk";

export default async function Home() {
  // Use trigger token for triggering tasks from frontend
  const triggerToken = await auth.createTriggerPublicToken("deep-research");

  return <DeepResearchAgent triggerToken={triggerToken} />;
}
