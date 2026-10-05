import { apiBaseUrl } from "@/lib/api-client";
import { proxyToApi } from "@/lib/api-proxy";

/** Same-origin gateway to the Udhwa API: /api/v1/* → API /v1/* (sign-in, uploads, session). */
const handler = (req: Request) => proxyToApi(req, { apiUrl: apiBaseUrl(process.env.API_URL), client: "admin" });

export const dynamic = "force-dynamic";
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
