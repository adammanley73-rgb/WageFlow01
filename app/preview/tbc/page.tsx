// C:\Users\adamm\Projects\wageflow01\app\preview\tbc\page.tsx

import TheBusinessConsortiumLanding from "@/components/marketing/landings/TheBusinessConsortiumLanding";
import { cookies } from "next/headers";

export default function PreviewTBCLandingPage() {
  const cookieStore = cookies();
  const played = cookieStore.get("tbc_intro_played_v1")?.value === "1";

  return <TheBusinessConsortiumLanding initialShowIntro={!played} />;
}
