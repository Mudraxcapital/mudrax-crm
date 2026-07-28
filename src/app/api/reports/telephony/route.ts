import { runTypedReport } from "../_lib/runTypedReport";

export async function POST(request: Request) {
  return runTypedReport(request, "TELEPHONY");
}
