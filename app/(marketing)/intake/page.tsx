import { ACR_START_HREF, LOAN_START_HREF, pathFromQuery } from "@/components/products/startPath";
import { redirect } from "next/navigation";

export default function IntakePage({
  searchParams,
}: {
  searchParams?: { path?: string };
}) {
  const path = pathFromQuery(searchParams?.path ?? null);
  if (path === "loan-only") redirect(LOAN_START_HREF);
  if (path === "acr") redirect(ACR_START_HREF);
  redirect("/start");
}
