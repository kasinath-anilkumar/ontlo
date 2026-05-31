import React from 'react'
import HeroContent from './HeroContent'
import WaterInteraction from '../ui/WaterInteraction'
import WaterWave from 'react-water-wave'

const HeroSection = () => {
    return (
        <section className="relative w-full min-h-screen bg-[#04010D]">

            {/* WATER INTERACTION */}
            <WaterInteraction />

            {/* NOISE TEXTURE */}
            <div
                className="
                    absolute
                    inset-0
                    opacity-[0.03]
                    mix-blend-soft-light
                    z-[2]
                    pointer-events-none
                    sm:hidden
                    md:block
                "
                style={{
                    backgroundImage:
                        "url('https://grainy-gradients.vercel.app/noise.svg')",
                }}
            />

            {/* ANIMATED AURORA */}
            <div className="absolute inset-0 overflow-hidden z-[3] pointer-events-none">

                <div
                    className="
                        absolute
                        top-[-20%]
                        left-[-10%]
                        w-[700px]
                        h-[700px]
                        bg-fuchsia-500/20
                        blur-[180px]
                        rounded-full
                        animate-pulse
                    "
                />

                <div
                    className="
                        absolute
                        bottom-[-30%]
                        right-[-10%]
                        w-[800px]
                        h-[800px]
                        bg-blue-500/20
                        blur-[200px]
                        rounded-full
                        animate-pulse
                    "
                />

                <div
                    className="
                        absolute
                        top-[20%]
                        right-[20%]
                        w-[400px]
                        h-[400px]
                        bg-purple-500/10
                        blur-[140px]
                        rounded-full
                    "
                />
            </div>

            {/* FLOATING PARTICLES */}
            <div className="absolute inset-0 overflow-hidden z-[4] pointer-events-none">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="
                            absolute
                            w-[2px]
                            h-[2px]
                            bg-white/40
                            rounded-full
                            animate-pulse
                        "
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDuration: `${2 + Math.random() * 4}s`,
                            animationDelay: `${Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>

            {/* DESKTOP BACKGROUND IMAGE (WITH WEBGL WATER RIPPLES) */}
            <div className="hidden lg:block absolute inset-0 w-full h-full z-[1]">
                <WaterWave
                    imageUrl="/hero1.webp"
                    dropRadius={35}
                    perturbance={0.04}
                    resolution={600}
                    className="w-full h-full"
                    style={{ backgroundSize: 'cover', backgroundPosition: 'right' }}
                >
                    {() => <div className="w-full h-full pointer-events-none" />}
                </WaterWave>
            </div>

            {/* DESKTOP OVERLAY */}
            <div
                className="
                    hidden lg:block
                    absolute inset-0
                    z-[5]
                    pointer-events-none
                    bg-gradient-to-r
                    from-[#04010D]
                    via-[#04010D]
                    via-30%
                    to-transparent
                    to-55%
                "
            />

            {/* RADIAL LIGHT OVERLAY */}
            <div
                className="
                    absolute
                    inset-0
                    z-[6]
                    pointer-events-none
                "
                style={{
                    background:
                        "radial-gradient(circle at 20% 30%, rgba(168,85,247,0.12), transparent 30%), radial-gradient(circle at 80% 60%, rgba(59,130,246,0.10), transparent 35%)"
                }}
            />

            {/* PURPLE GLOW */}
            <div className="absolute top-[-20%] right-0 w-[600px] h-[600px] bg-fuchsia-600/20 blur-[160px] rounded-full z-[7] pointer-events-none" />

            {/* BLUE GLOW */}
            <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-blue-600/20 blur-[140px] rounded-full z-[7] pointer-events-none" />

            {/* MAIN CONTENT */}
            <div
                className="
                    relative
                    z-20
                    max-w-8xl
                    mx-auto
                    px-3
                    md:px-16
                    lg:px-18
                    flex
                    flex-col
                    lg:flex-row
                    items-center
                    justify-between
                    sm:pt-12
                    md:pt-32
                    pb-20
                    pointer-events-none
                "
            >

                {/* LEFT SIDE CONTENT */}
                <div className="pointer-events-auto w-full lg:w-auto">
                    <HeroContent />
                </div>

            </div>
            {/* CINEMATIC VIGNETTE */}
            <div
                className="
                    absolute
                    inset-0
                    z-[8]
                    pointer-events-none
                "
                style={{
                    background:
                        "radial-gradient(circle, transparent 45%, rgba(0,0,0,0.3) 100%)"
                }}
            />

            {/* GLOBAL BOTTOM FADE */}
            <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#04010D] to-transparent z-30" />
        </section>
    )
}

export default HeroSection