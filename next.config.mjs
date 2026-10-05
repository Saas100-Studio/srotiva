export function securityHeaders(environment = process.env.NODE_ENV) {
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
  ];
  if (environment === "production") contentSecurityPolicy.push("upgrade-insecure-requests");

  const headers = [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy.join("; "),
    },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
  ];

  // Only advertise HTTPS permanence from a production server. Development and
  // test responses must not pin their hostname in the browser.
  if (environment === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });
  }

  return headers;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders() },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet" }] },
      { source: "/f/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet" }] },
    ];
  },
};

export default nextConfig;
