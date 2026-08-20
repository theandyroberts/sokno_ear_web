import Script from "next/script";

// Analytics. Umami (self-hosted on the VPS, first-party via /stats/* so ad
// blockers don't eat it) is always on in production — cookieless, no consent
// banner needed. GA4/Clarity render only when their NEXT_PUBLIC_* ids are set
// at build time; the site works fine without them.
const UMAMI_WEBSITE_ID = "9ee0480b-3520-47f5-ade3-cc8e69496f69";

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
  const umami = process.env.NODE_ENV === "production";
  if (!gaId && !clarityId && !umami) return null;
  return (
    <>
      {umami && (
        <Script
          src="/stats/script.js"
          data-website-id={UMAMI_WEBSITE_ID}
          data-host-url="https://soknoear.com/stats"
          strategy="afterInteractive"
        />
      )}
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      {clarityId && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
    </>
  );
}
