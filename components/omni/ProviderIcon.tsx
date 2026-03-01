"use client";

import { Store } from "lucide-react";
import Image from "next/image";

interface ProviderIconProps {
  providerLogo?: string;
  provider: string;
  size?: "sm" | "md";
}

export function ProviderIcon({ providerLogo, provider, size = "md" }: ProviderIconProps) {
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const imgDim = size === "sm" ? 20 : 24;

  if (providerLogo) {
    return (
      <div className={`flex ${dim} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white`}>
        <Image
          src={providerLogo}
          alt={provider}
          width={imgDim}
          height={imgDim}
          className="object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).parentElement!.innerHTML =
              `<span class="text-[10px] font-bold text-navy-700">${provider.slice(0, 2).toUpperCase()}</span>`;
          }}
        />
      </div>
    );
  }

  const initials = provider
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-lg bg-navy-700/50`}>
      {initials ? (
        <span className="text-[10px] font-bold text-muted-foreground">{initials}</span>
      ) : (
        <Store className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
