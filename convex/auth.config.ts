import { AuthConfig } from "convex/server";

const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkJwtIssuerDomain) {
  throw new Error("CLERK_JWT_ISSUER_DOMAIN is not set");
}

export default {
  providers: [
    {
      // Set CLERK_JWT_ISSUER_DOMAIN in the Convex Dashboard environment variables
      // (not .env.local). Find it in Clerk Dashboard → JWT Templates → convex → Issuer URL
      domain: clerkJwtIssuerDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
