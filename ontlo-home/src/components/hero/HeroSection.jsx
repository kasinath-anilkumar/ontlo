import React, { useState, useEffect, lazy, Suspense } from 'react'
import HeroContent from './HeroContent'
import WaterInteraction from '../ui/WaterInteraction'

const WaterWave = lazy(() => {
    // Check if we are on a mobile/tablet or touch device
    const isMobileOrTablet = typeof window !== 'undefined' && (
        window.innerWidth < 1024 ||
        /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0)
    )

    // Check if WebGL is supported
    const hasWebGL = typeof window !== 'undefined' && (() => {
        try {
            const canvas = document.createElement('canvas')
            return !!(
                window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            )
        } catch (_error) {
            return false
        }
    })()

    // Only load react-water-wave on desktop browsers with WebGL support
    if (!isMobileOrTablet && hasWebGL) {
        return import('react-water-wave').catch((error) => {
            console.warn('Failed to load react-water-wave, falling back to static background:', error)
            return {
                default: ({ imageUrl, children, className, style }) => (
                    <div 
                        className={className} 
                        style={{ 
                            ...style, 
                            backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'right'
                        }}
                    >
                        {typeof children === 'function' ? children({}) : children}
                    </div>
                )
            }
        })
    }

    // Fallback: A component that simply renders a standard div with a static background image
    return Promise.resolve({
        default: ({ imageUrl, children, className, style }) => (
            <div 
                className={className} 
                style={{ 
                    ...style, 
                    backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'right'
                }}
            >
                {typeof children === 'function' ? children({}) : children}
            </div>
        )
    })
})

const HeroSection = () => {
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        const checkIsDesktop = () => {
            setIsDesktop(window.innerWidth >= 1024)
        }
        checkIsDesktop()
        window.addEventListener('resize', checkIsDesktop)
        return () => window.removeEventListener('resize', checkIsDesktop)
    }, [])

    return (
        <section className="relative w-full min-h-screen bg-[#04010D]">

            {/* WATER INTERACTION */}
            {isDesktop && <WaterInteraction />}

            {/* NOISE TEXTURE */}
            {/* <div
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
            /> */}

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

            {/* BACKGROUND IMAGE (WITH WEBGL WATER RIPPLES ON DESKTOP, STATIC FALLBACK ON MOBILE/IOS) */}
            <div className="absolute inset-0 w-full h-full z-[1]">
                <Suspense fallback={<div className="w-full h-full bg-[#04010D]" />}>
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
                </Suspense>
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

            {/* MOBILE OVERLAY (FALLBACK FOR READABILITY ON SMARTPHONES) */}
            <div
                className="
                    block lg:hidden
                    absolute inset-0
                    z-[5]
                    pointer-events-none
                    bg-gradient-to-b
                    from-[#04010D]/95
                    via-[#04010D]/80
                    to-[#04010D]
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
                    md:pt-28
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