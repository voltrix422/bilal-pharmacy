import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f5f5f5] p-3 sm:p-4">
      <div className="relative flex min-h-[calc(100vh-1.5rem)] w-full justify-center rounded-xl border border-[#bdbdbd] bg-[#f5f5f5] sm:min-h-[calc(100vh-2rem)]">
        <div className="w-full max-w-[300px] animate-fade-in self-start px-6 pt-[10vh] sm:pt-[12vh]">
          <div className="mb-9 flex justify-center">
            <Image
              src="/bilal-pharmacy-logo.png"
              alt="Bilal Pharmacy & Health Care"
              width={180}
              height={140}
              className="h-24 w-auto object-contain sm:h-28"
              priority
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
