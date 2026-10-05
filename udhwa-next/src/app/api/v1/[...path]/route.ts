import { apiBaseUrl } from "@/lib/api-client";
import { proxyToApi } from "@/lib/api-proxy";

/**
 * Same-origin gateway to the Udhwa API: /api/v1/* → API /v1/*.
 * Browser code (sign-in, uploads, session) talks to this site only, so the
 * session cookie is first-party and no CORS is needed.
 */
const handler = (req: Request) => proxyToApi(req, { apiUrl: apiBaseUrl(process.env.API_URL), client: "web", blockPaths: ["/v1/admin"] });

export const dynamic = "force-dynamic";
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
