import Script from "next/script";

import { readLegacyLanding } from "@/lib/landing/read-legacy-landing";

export const dynamic = "force-dynamic";

export default function LandingPage() {
  const landing = readLegacyLanding();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: landing.styles }} />
      <div
        style={{ display: "contents" }}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: landing.body }}
      />
      <Script id="herex-landing-interactions" strategy="afterInteractive">
        {landing.script}
      </Script>
    </>
  );
}
