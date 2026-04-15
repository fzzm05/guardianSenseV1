"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    // Suppress React 19 warning regarding scripts inside components
    // this is a false positive triggered by next-themes' flash-prevention script
    if (process.env.NODE_ENV !== "development") return;

    const orig = console.error;
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Encountered a script tag")
      ) {
        return;
      }
      orig.apply(console, args);
    };

    return () => {
      console.error = orig;
    };
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
