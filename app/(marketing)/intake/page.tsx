import { pathFromQuery } from "@/components/products/startPath";
import { redirect } from "next/navigation";

export default function IntakePage({
  searchParams,
}: {
  searchParams?: { path?: string };
}) {
  const path = pathFromQuery(searchParams?.path ?? null);
  if (path === "loan-only") redirect("/start?path=loan");
  if (path === "acr") redirect("/start?path=acr");
  redirect("/start");
}
