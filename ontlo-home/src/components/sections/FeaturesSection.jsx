import React from 'react'

const featuresData = [
  {
    title: 'Meaningful Connections',
    description:
      'Build genuine relationships through conversations, shared interests, and authentic interactions that go beyond likes and endless scrolling.',
    color: 'from-fuchsia-500 to-pink-500',
    iconColor: 'text-fuchsia-400',
    icon: (
      <svg
        className="w-6 h-6 stroke-current transition-all duration-500"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },

  {
    title: 'Discover Communities',
    description:
      'Explore communities, ideas, and conversations that match your interests and help you connect with people who share your passions.',
    color: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-400',
    icon: (
      <svg
        className="w-6 h-6 stroke-current transition-all duration-500"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    )
  },

  {
    title: 'Conversations That Matter',
    description:
      'Join  conversations designed to encourage meaningful discussion, new perspectives, and deeper human connection.',
    color: 'from-violet-500 to-purple-500',
    iconColor: 'text-violet-400',
    icon: (
      <svg
        className="w-6 h-6 stroke-current transition-all duration-500"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1v22" />
        <path d="M17 5H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H7" />
      </svg>
    )
  },

  {
    title: 'Trust by Design',
    description:
      'Privacy, transparency, safety, and user control are built into the foundation of Ontlo, creating a space where connections can grow with confidence.',
    color: 'from-blue-500 to-indigo-500',
    iconColor: 'text-blue-400',
    icon: (
      <svg
        className="w-6 h-6 stroke-current transition-all duration-500"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="11" r="2" />
        <path d="M12 13v3" />
      </svg>
    )
  },

  {
    title: 'Safe & Respectful Spaces',
    description:
      'Thoughtful moderation tools and community standards help create an environment where everyone can participate with confidence.',
    color: 'from-orange-500 to-rose-500',
    iconColor: 'text-orange-400',
    icon: (
      <svg
        className="w-6 h-6 stroke-current transition-all duration-500"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12c0 1.66-.5 3.2-1.36 4.48L21 21l-4.52-1.36A8.96 8.96 0 0 1 12 21a9 9 0 1 1 9-9z" />
      </svg>
    )
  },

  {
    title: 'Built Around People',
    description:
      'Technology should strengthen human connection, not compete for attention. Every part of Ontlo is designed to help people connect, discover, and belong.',
    color: 'from-indigo-500 to-fuchsia-500',
    iconColor: 'text-indigo-400',
    icon: (
      <svg
        className="w-6 h-6 stroke-current transition-all duration-500"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
      </svg>
    )
  }
]

const FeaturesSection = () => {
  return (
    <section
      id="features"
      className="relative w-full py-20 md:py-28 overflow-hidden border-t border-white/5"
    >
      {/* Background Glow */}
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-purple-600/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-fuchsia-600/10 blur-[160px] rounded-full pointer-events-none" />

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
        {/* Header */}
        <div className="max-w-4xl mb-20">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(255,255,255,0.03)] mb-8">
            <span className="text-pink-500 text-lg">✦</span>

            <span className="text-[11px] md:text-xs font-semibold tracking-[0.3em] text-gray-300 uppercase">
              Features
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-white mb-8">
            Designed for
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-pink-400 to-indigo-500">
              meaningful interaction.
            </span>
          </h2>

          <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-3xl font-light">
            Ontlo combines intelligent social discovery, immersive real-time
            communication, and privacy-first experiences to create a more human
            way to connect online.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresData.map((feature, index) => (
            <div
              key={index}
              className="
                group
                relative
                p-[1px]
                rounded-3xl
                overflow-hidden
                bg-gradient-to-br
                from-white/10
                to-white/5
                hover:from-fuchsia-500/40
                hover:to-indigo-500/40
                transition-all
                duration-500
                hover:-translate-y-2
              "
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-fuchsia-500/10 to-indigo-500/10 blur-2xl" />

              <div className="relative h-full rounded-[23px] bg-[#05010E]/95 backdrop-blur-2xl p-8 flex flex-col">
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-[1px] mb-8`}
                >
                  <div className="w-full h-full rounded-[15px] bg-[#070311] flex items-center justify-center">
                    <div className={feature.iconColor}>
                      {feature.icon}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-semibold text-white mb-4 leading-snug tracking-tight">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed text-[15px] md:text-base font-light">
                  {feature.description}
                </p>

                {/* Bottom Line */}
                <div className="mt-10 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-fuchsia-500/40 transition-all duration-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection

