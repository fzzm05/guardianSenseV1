import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-md bg-neutral-200/50 dark:bg-white/5 ${className}`}
      {...props}
    />
  );
}
