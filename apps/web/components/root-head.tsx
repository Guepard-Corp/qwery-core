import appConfig from '~/config/app.config';

const siteUrl = appConfig.url;
const name = appConfig.name;

export function RootHead() {
  const structuredData = {
    name: name,
    url: siteUrl,
    logo: `${siteUrl}/images/favicon/favicon-150x150.png`,
    '@context': 'https://schema.org',
    '@type': 'Organization',
  };

  return (
    <>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <link
        rel="apple-touch-icon"
        sizes="144x144"
        href="/images/favicon/apple-touch-icon.png"
      />

      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/images/favicon/favicon-16x16.png"
      />

      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/images/favicon/favicon-32x32.png"
      />

      <link rel="manifest" href="/images/favicon/site.webmanifest" />

      <link
        rel="mask-icon"
        href="/images/favicon/safari-pinned-tab.svg"
        color="#000000"
      />

      <link rel="dns-prefetch" href="//fonts.googleapis.com" />

      <link rel="preconnect" href="https://fonts.gstatic.com" />

      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content={appConfig.themeColor} />

      <meta
        name="description"
        content={appConfig.description}
        key="meta:description"
      />

      <meta property="og:title" key="og:title" content={name} />

      <meta
        property="og:description"
        key="og:description"
        content={appConfig.description}
      />

      <meta property="og:site_name" content={name} />
      <meta property="twitter:title" content={name} />
      <meta property="twitter:card" content="summary_large_image" />

      <script
        async
        key="ld:json"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
