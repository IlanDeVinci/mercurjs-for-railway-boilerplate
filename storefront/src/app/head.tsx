export default function Head() {
  const MEILI_HOST = process.env.NEXT_PUBLIC_MEILI_HOST
  const MEILI_ORIGIN = (() => {
    try {
      return MEILI_HOST ? new URL(MEILI_HOST).origin : null
    } catch {
      return null
    }
  })()

  return (
    <>
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
        crossOrigin="anonymous"
      />
      <link
        rel="preconnect"
        href="https://i.imgur.com"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://i.imgur.com" />
      {MEILI_ORIGIN && (
        <>
          <link rel="preconnect" href={MEILI_ORIGIN} crossOrigin="anonymous" />
          <link rel="dns-prefetch" href={MEILI_ORIGIN} />
        </>
      )}
      {/* Image origins for faster LCP */}
      <link
        rel="preconnect"
        href="https://medusa-public-images.s3.eu-west-1.amazonaws.com"
        crossOrigin="anonymous"
      />
      <link
        rel="dns-prefetch"
        href="https://medusa-public-images.s3.eu-west-1.amazonaws.com"
      />
      <link
        rel="preconnect"
        href="https://mercur-connect.s3.eu-central-1.amazonaws.com"
        crossOrigin="anonymous"
      />
      <link
        rel="dns-prefetch"
        href="https://mercur-connect.s3.eu-central-1.amazonaws.com"
      />
      <link
        rel="preconnect"
        href="https://s3.eu-central-1.amazonaws.com"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://s3.eu-central-1.amazonaws.com" />
      <link
        rel="preconnect"
        href="https://api.mercurjs.com"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://api.mercurjs.com" />
    </>
  )
}
