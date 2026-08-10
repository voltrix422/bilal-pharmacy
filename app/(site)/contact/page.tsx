import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d9851]">
        Contact
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1a2e22]">
        Get in touch
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5a6f62]">
        Reach Bilal Pharmacy &amp; Healthcare by phone, WhatsApp, email, or
        visit us in person.
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-2xl border border-[#d8e5dc] bg-white p-5">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#1d9851]" />
            <div>
              <p className="text-sm font-semibold text-[#1a2e22]">Address</p>
              <p className="mt-1 text-sm leading-relaxed text-[#3d5246]">
                Plot 19, Block B Multi Gardens B-17,
                <br />
                Islamabad, Pakistan
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#d8e5dc] bg-white p-5">
          <div className="flex gap-3">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#1d9851]" />
            <div>
              <p className="text-sm font-semibold text-[#1a2e22]">Phone / WhatsApp</p>
              <a
                href="https://wa.me/923335618835"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-medium text-[#1d9851] hover:underline"
              >
                +92 333 5618835
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#d8e5dc] bg-white p-5">
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#1d9851]" />
            <div>
              <p className="text-sm font-semibold text-[#1a2e22]">Email</p>
              <a
                href="mailto:bilal.pharmacy2025@gmail.com"
                className="mt-1 inline-block text-sm font-medium text-[#1d9851] hover:underline"
              >
                bilal.pharmacy2025@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="https://wa.me/923335618835"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex h-11 items-center rounded-md bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1ebe57]"
      >
        Message on WhatsApp
      </Link>
    </article>
  );
}
