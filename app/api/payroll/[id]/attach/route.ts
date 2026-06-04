// C:\Projects\wageflow01\app\api\payroll\[id]\attach\route.ts

import { POST as attachDueEmployeesPost } from "../attach-employees/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, ctx: RouteContext) {
  return attachDueEmployeesPost(req, ctx);
}
