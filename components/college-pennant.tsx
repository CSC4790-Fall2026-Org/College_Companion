"use client";

import Image from "next/image";
import { useState } from "react";
import {
  getGeneratedPennantColors,
  getPennantInitials,
  getPennantKey,
  type PennantKey,
} from "@/lib/colleges";

type CollegePennantProps = {
  schoolName: string;
  pennantKey?: PennantKey;
};

export function CollegePennant({ schoolName, pennantKey }: CollegePennantProps) {
  const key = pennantKey ?? getPennantKey(schoolName);
  const [logoUnavailable, setLogoUnavailable] = useState(false);
  const logo =
    key === "yale"
      ? { src: "/college-logos/yale.svg", background: "#205b3e", foreground: "#f4e8c1" }
      : key === "mit"
        ? { src: "/college-logos/mit.svg", background: "#f4e8c1", foreground: "#750014" }
        : null;
  const colors = logo ?? getGeneratedPennantColors(schoolName);
  const showLogo = logo !== null && !logoUnavailable;

  return (
    <span
      role="img"
      aria-label={`${schoolName} pennant`}
      title={schoolName}
      className="inline-flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden [clip-path:polygon(0_0,100%_0,78%_50%,100%_100%,0_100%)]"
      style={{ backgroundColor: colors.background, color: colors.foreground }}
    >
      {showLogo ? (
        <Image
          src={logo.src}
          alt=""
          aria-hidden="true"
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
          onError={() => setLogoUnavailable(true)}
        />
      ) : (
        <span aria-hidden="true" className="pr-1 text-[10px] font-extrabold tracking-tight">
          {getPennantInitials(schoolName)}
        </span>
      )}
    </span>
  );
}
