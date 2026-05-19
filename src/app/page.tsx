import { DeepResearchAgent } from "@/components/DeepResearchAgent";
import { LandingPage } from "@/components/LandingPage";
import { getCurrentUser } from "@/lib/auth";
import { auth } from "@trigger.dev/sdk";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <LandingPage />;
  }

  // Use trigger token for triggering tasks from frontend
  const triggerToken = await auth.createTriggerPublicToken("deep-research");

  return <DeepResearchAgent triggerToken={triggerToken} />;
}
