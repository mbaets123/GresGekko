"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DarkModeToggle } from "./DarkModeToggle";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-gres-blue/10 bg-white dark:bg-gray-900 shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/grescollege-logo.png"
            alt="Grescollege"
            width={36}
            height={36}
            className="rounded-lg shadow-sm"
          />
          <div className="flex flex-col">
            <span className="font-heading text-base leading-tight text-gres-blue tracking-wide">
              Biologie met GresGekko
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-gres-yellow">
              Leerjaar 1 vmbo - havo
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {!isHome && (
            <Link
              href="/"
              className="rounded-lg bg-gres-blue/10 px-4 py-2 text-sm font-medium text-gres-blue transition-all hover:bg-gres-blue/20"
            >
              Hoofdmenu
            </Link>
          )}
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}
