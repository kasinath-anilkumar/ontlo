import React from 'react'

const safetyPoints = [
  {
    title: 'Trust by Design',
    description:
      'Privacy, transparency, and user control are built into the foundation of Ontlo, creating a space where people can connect with confidence.'
  },

  {
    title: 'Safe & Respectful Communities',
    description:
      'Thoughtful moderation tools and community standards help foster meaningful conversations and create a welcoming environment for everyone.'
  },

  {
    title: 'Secure Communication',
    description:
      'Whether through messages, voice, or video, every interaction is designed to feel safe, reliable, and respectful.'
  },

  {
    title: 'Clear & Transparent Practices',
    description:
      'We believe trust starts with transparency. Users should always understand how their information is handled and have control over their experience.'
  }
]

const SafetySection = () => {
  return (
    <section
      id="safety"
      className="relative w-full py-20 md:py-28 overflow-hidden border-t border-white/5"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-pink-600/10 blur-[160px] rounded-full pointer-events-none" />

      <div
        className="
          relative z-10
          max-w-8xl
          mx-auto
          px-4
          md:px-16
          lg:px-20
        "
      >
        {/* Label */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(255,255,255,0.03)] mb-8">
          <span className="text-pink-500 text-lg">✦</span>

          <span className="text-[11px] md:text-xs font-semibold tracking-[0.3em] text-gray-300 uppercase">
            Safety & Privacy
          </span>
        </div>

        {/* Heading */}
        <div className="max-w-5xl mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-white mb-8">
            Built on
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-red-400">
              trust, safety, and respect.
            </span>
          </h2>

          <p className="text-gray-400 text-lg md:text-xl leading-relaxed font-light max-w-3xl">
            Privacy is not an afterthought on Ontlo. Every layer of the platform
            is designed to create a safer, more respectful, and more human
            digital experience.
          </p>
        </div>

        {/* Main Card */}
        <div
          className="
            relative
            overflow-hidden
            rounded-[32px]
            border
            border-white/10
            bg-white/[0.03]
            backdrop-blur-2xl
            p-8
            md:p-14
          "
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-red-500/5 pointer-events-none" />

          {/* Top Content */}

          <div className="relative z-10 max-w-4xl mb-14">
            <h3 className="text-2xl md:text-3xl font-semibold text-white mb-6 tracking-tight">
              Built on Trust
            </h3>

            <div className="space-y-6 text-gray-400 text-base md:text-lg leading-relaxed font-light">
              <p>
                Most social platforms compete for attention. Ontlo is built to help
                people connect, discover, and belong.
              </p>

              <p>
                We believe meaningful conversations thrive in environments where people
                feel respected, empowered, and in control. That's why trust,
                transparency, privacy, and safety are built into the foundation of
                everything we create.
              </p>

              <p>
                Our commitment is simple: create a social experience where communities
                feel welcoming, conversations feel genuine, and people can express
                themselves with confidence. Technology should bring people together —
                not stand between them.
              </p>
            </div>
          </div>



          {/* Feature Grid */}
          <div className="relative z-10 grid md:grid-cols-2 gap-6">
            {safetyPoints.map((point, index) => (
              <div
                key={index}
                className="
                  group
                  rounded-3xl
                  border
                  border-white/10
                  bg-black/20
                  p-7
                  hover:border-pink-500/20
                  transition-all
                  duration-300
                "
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-red-500/20 border border-pink-500/10 flex items-center justify-center mb-6">
                  <svg
                    className="w-5 h-5 text-pink-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>

                {/* Title */}
                <h4 className="text-xl font-semibold text-white mb-3 tracking-tight">
                  {point.title}
                </h4>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed font-light">
                  {point.description}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Statement */}
          <div className="relative z-10 mt-14 pt-10 border-t border-white/10">
            <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-light max-w-4xl">
              Ontlo is designed to bring people closer through meaningful conversations, authentic communities, and trusted connections.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SafetySection

