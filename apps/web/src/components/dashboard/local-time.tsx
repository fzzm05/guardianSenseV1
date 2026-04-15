"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

type LocalTimeProps = {
  value: string | null;
  emptyLabel?: string;
};

export function LocalTime({
  value,
  emptyLabel = "Waiting for first update",
}: LocalTimeProps) {
  const isMounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!value) return <>{emptyLabel}</>;
  if (!isMounted) return <>{formatUtcTimestamp(value, emptyLabel)}</>;

  return <>{formatLocalTimestamp(value)}</>;
}

function formatUtcTimestamp(value: string | null, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatLocalTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
