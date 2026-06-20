import Script from "next/script";

// Google Analytics (GA4). Renders only when NEXT_PUBLIC_GA_ID is set at build time
// (add it to .env.local on the VPS, then redeploy). No-ops otherwise, so the site
// works fine without it.
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
