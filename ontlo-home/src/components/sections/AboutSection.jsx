
import React from 'react'

const stats = [
  {
    value: 'Connect',
    label: 'With purpose'
  },
  {
    value: 'Discover',
    label: 'New communities'
  },
  {
    value: 'Belong',
    label: 'Where you matter'
  }
]

const AboutSection = () => {
  return (

    <section
      id="about"
      className="relative w-full py-24 md:py-32 overflow-hidden border-t border-white/5"
    >
      {/* Ambient Background */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-fuchsia-600/10 blur-[180px] rounded-full pointer-events-none" />

      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/10 blur-[160px] rounded-full pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20 pointer-events-none" />

      {/* Noise */}
      {/* <div className="absolute inset-0 opacity-[0.025] bg-[url('/noise.png')] pointer-events-none" /> */}

      <div
        className="
          relative z-10
          max-w-8xl
          mx-auto
          px-4
          sm:px-6
          md:px-14
          lg:px-20
        "
      >
        {/* Top Section */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-20 items-start">

          {/* Left Content */}
          <div>
            {/* Label */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(255,255,255,0.03)] mb-10">
              <span className="text-pink-500 text-lg">✦</span>

              <span className="text-[11px] md:text-xs font-semibold tracking-[0.3em] text-gray-300 uppercase">
                Our Story
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-semibold leading-[0.95] tracking-[-0.04em] text-white max-w-5xl">
              Built for
              <br />

              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-400 to-indigo-500">
                authentic 
              </span>

              <br />
              connection.
            </h2>

            {/* Divider */}
            <div className="w-28 h-px bg-gradient-to-r from-pink-500/70 via-fuchsia-500/40 to-transparent my-10" />

            {/* Intro */}
            <p className="text-gray-300 text-lg md:text-2xl leading-relaxed font-light max-w-3xl">
              Ontlo is a modern social platform built for meaningful connections, authentic conversations, and communities that matter. Connect, share, and discover without the noise.
            </p>
          </div>

          {/* Right Glass Card */}
          <div
            className="
              relative
              rounded-[32px]
              border
              border-white/10
              bg-white/[0.03]
              backdrop-blur-3xl
              overflow-hidden
              p-8
              md:p-10
            "
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

            {/* Card Content */}
            <div className="relative z-10 space-y-7">
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  Why Ontlo Exists
                </span>
              </div>

              <p className="text-gray-300 text-lg leading-relaxed font-light">
                The internet became crowded with noise, distractions, and endless scrolling. We believe social networking should help people connect, not compete for attention.
              </p>

              <p className="text-gray-400 leading-relaxed font-light">
                Ontlo is built to bring people closer to the conversations, communities, and ideas that matter most. A place where meaningful interactions matter more than algorithms and where every connection has the opportunity to become something real.
              </p>

              <p className="text-gray-400 leading-relaxed font-light">
                We're building a social platform designed for discovery, belonging, and authentic human connection—helping people share, learn, create, and grow together.
              </p>

              <p className="text-gray-400 leading-relaxed font-light">
                Technology should bring people together, not pull them apart.
              </p>

              {/* Bottom Quote */}
              <div className="pt-6 border-t border-white/10">
                <p className="text-white text-lg leading-relaxed font-light">
                  “Connect without the noise. ”
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-24 grid lg:grid-cols-[0.9fr_1.1fr] gap-16 items-start">

          {/* Left Stats */}
          <div className="space-y-6">
            {stats.map((item, index) => (
              <div
                key={index}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/10
                  bg-white/[0.02]
                  backdrop-blur-xl
                  p-7
                  transition-all
                  duration-500
                  hover:border-fuchsia-500/20
                  hover:bg-white/[0.04]
                "
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-fuchsia-500/5 to-indigo-500/5" />

                <div className="relative z-10">
                  <h3 className="text-2xl md:text-3xl font-semibold text-white mb-2 tracking-tight">
                    {item.value}
                  </h3>

                  <p className="text-gray-400 text-sm md:text-base font-light">
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Long Content */}
          <div className="space-y-8">
            <p className="text-gray-400 text-lg md:text-xl leading-relaxed font-light">
              Ontlo is where meaningful conversations begin. Connect with people who share your interests, discover communities where you belong, and build relationships that go beyond the noise of traditional social media.            </p>

            <p className="text-gray-400 text-lg md:text-xl leading-relaxed font-light">
              We believe social networking should open doors to new ideas, people, and communities. Ontlo is built to help you discover, learn, and connect beyond the limits of endless feeds and predictable recommendations.
            </p>

            <p className="text-gray-400 text-lg md:text-xl leading-relaxed font-light">
              Meaningful connections are built on trust. At Ontlo, privacy, safety, transparency, and user control aren't optional features—they're part of the foundation. We create an environment where you can connect, share, and communicate with confidence, knowing your experience is designed around respect and trust.
            </p>

            {/* Final Statement */}
            <div className="pt-8 border-t border-white/10">
              <p className="text-2xl md:text-3xl leading-relaxed font-light text-white max-w-4xl">
                Ontlo is built for people who want conversations, communities, and connection—not just another feed.<br />
                It's built for moments, conversations, and communities that matter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection

