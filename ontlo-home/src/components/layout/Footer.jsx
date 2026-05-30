import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="relative w-full mt-24 border-t border-white/5 bg-gradient-to-b from-black via-black to-[#050505]">
      <div className="max-w-7xl mx-auto px-6 py-16">

        {/* Main */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-12">

          {/* LEFT */}
          <div className="text-center md:text-left max-w-sm">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <img src="/ontlo_transp.png" className="w-12" alt="logo" />
              <span className="text-white font-semibold tracking-wide text-lg">
                Ontlo
              </span>
            </div>

            <p className="text-sm leading-relaxed text-gray-400">
              The next generation social platform built for privacy, real
              connections, and meaningful experiences.
            </p>
          </div>

          {/* CENTER */}
          <div className="flex items-center gap-8 text-sm font-medium">
            <Link
              to="/privacy"
              className="text-gray-400 hover:text-white transition-all duration-300"
            >
              Privacy
            </Link>

            <Link
              to="/terms"
              className="text-gray-400 hover:text-white transition-all duration-300"
            >
              Terms
            </Link>

            <Link
              to="/contact"
              className="text-gray-400 hover:text-white transition-all duration-300"
            >
              Contact
            </Link>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-4">
            {[1, 2].map((_, i) => (
              <a
                key={i}
                href="#"
                className="
                  w-11 h-11 rounded-2xl
                  border border-white/10
                  bg-white/[0.02]
                  backdrop-blur-xl
                  flex items-center justify-center
                  text-gray-400
                  hover:text-white
                  hover:border-fuchsia-500/40
                  hover:bg-fuchsia-500/10
                  transition-all duration-300
                  hover:scale-105
                "
              >
                {i === 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="18" cy="6" r="1" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-14 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">

          <p className="text-xs text-gray-600 tracking-wide">
            © 2026 Ontlo. All rights reserved.
          </p>

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-fuchsia-400/80 font-semibold">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
            Beta Launch Soon
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;