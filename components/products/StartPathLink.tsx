"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { rememberStartPath, withStartPath } from "./startPath";

type StartPathLinkProps = ComponentProps<typeof Link>;

export function StartPathLink({ href, ...props }: StartPathLinkProps) {
  const [next, setNext] = useState(href);

  useEffect(() => {
    if (typeof href !== "string") return;
    setNext(withStartPath(href, rememberStartPath()));
  }, [href]);

  return <Link href={next} {...props} />;
}

export function RememberStartPath() {
  const searchParams = useSearchParams();

  useEffect(() => {
    rememberStartPath(searchParams.get("path"));
  }, [searchParams]);

  return null;
}
