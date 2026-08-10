import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#d8e5dc] bg-[#eef5f0] px-4 py-8 pb-24 sm:px-8 sm:py-10 sm:pb-10">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-3 sm:gap-8">
        <div className="max-w-md sm:col-span-1">
          <div className="flex items-center gap-2.5">
            <Image
              src="/bilal-pharmacy-mark.png"
              alt=""
              width={30}
              height={30}
              className="h-8 w-8 object-contain"
            />
            <p className="text-sm font-semibold text-[#1a2e22]">
              Bilal Pharmacy &amp; Healthcare
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#5a6f62]">
            Trusted medications, pharmacist care, and free home delivery.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1d9851]">
            Visit
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#3d5246]">
            Plot 19, Block B Multi Gardens B-17
            <br />
            Islamabad, Pakistan
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1d9851]">
            Contact
          </p>
          <div className="mt-2 space-y-1 text-sm text-[#3d5246]">
            <a
              href="https://wa.me/923335618835"
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-[#1d9851]"
            >
              +92 333 5618835
            </a>
            <a
              href="mailto:bilal.pharmacy2025@gmail.com"
              className="block hover:text-[#1d9851]"
            >
              bilal.pharmacy2025@gmail.com
            </a>
            <Link href="/about" className="block hover:text-[#1d9851]">
              About us
            </Link>
            <Link href="/contact" className="block hover:text-[#1d9851]">
              Contact page
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-[#d8e5dc] pt-6">
        <p className="text-xs text-[#6b8073]">
          © {new Date().getFullYear()} Bilal Pharmacy
        </p>
        <Link
          href="/login"
          className="inline-flex h-8 items-center rounded-md border border-[#c5d9cc] bg-white px-3.5 text-xs font-semibold tracking-wide text-[#3d5246] transition hover:border-[#1d9851] hover:text-[#1d9851]"
        >
          ERP
        </Link>
      </div>
    </footer>
  );
}
