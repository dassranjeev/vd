import Script from "next/script";

import type { SettingsShape } from "@/lib/settings";

/**
 * GA4 and Microsoft Clarity, both injected only once an ID has been saved in
 * /admin/settings → Analytics. No ID means no third-party script at all.
 */
export function Analytics({ analytics }: { analytics: SettingsShape["analytics"] }) {
  const ga = analytics.gaMeasurementId.trim();
  const clarity = analytics.clarityProjectId.trim();

  return (
    <>
      {ga && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(ga)}, { anonymize_ip: true });`}
          </Script>
        </>
      )}

      {clarity && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(clarity)});`}
        </Script>
      )}
    </>
  );
}
