import Link from "next/link";
import { Github, Twitter, Youtube } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/10 py-10">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-semibold tracking-tight text-zinc-50">
            <span className="h-6 w-6 rounded-lg bg-[linear-gradient(135deg,#22D3EE_0%,#FF2BD6_100%)] shadow-glow" />
            NFT Marketplace
          </div>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Cyberpunk-native marketplace UI with on-chain actions and synced activity.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
            >
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Company</div>
          <div className="mt-4 grid gap-2 text-sm">
            <Link className="text-zinc-300 transition hover:text-web3-cyan" href="/about">
              About
            </Link>
            <Link className="text-zinc-300 transition hover:text-web3-cyan" href="/contact">
              Contact
            </Link>
            <Link className="text-zinc-300 transition hover:text-web3-cyan" href="/subscription">
              Subscription
            </Link>
          </div>

          <div className="mt-8 text-xs font-semibold uppercase tracking-wider text-zinc-400">Marketplace</div>
          <div className="mt-4 grid gap-2 text-sm">
            <Link className="text-zinc-300 transition hover:text-web3-cyan" href="/explore">
              Explore
            </Link>
            <Link className="text-zinc-300 transition hover:text-web3-cyan" href="/events">
              Events
            </Link>
            <Link className="text-zinc-300 transition hover:text-web3-cyan" href="/upload-nft">
              Upload
            </Link>
            <Link className="text-zinc-300 transition hover:text-web3-cyan" href="/profile">
              My Vault
            </Link>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Info</div>
          <div className="mt-4 space-y-2 text-sm text-zinc-400">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-zinc-200">Support</div>
              <div className="mt-1">Use the Contact page to send a message.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-zinc-200">(c) {year}</div>
              <div className="mt-1">All rights reserved.</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
