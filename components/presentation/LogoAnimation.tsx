'use client'

export function LogoAnimation({ size = '72vh' }: { size?: string }) {
  return (
    <>
      <style>{`
        @keyframes spcBreath {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.022); }
        }
        @keyframes spcFadeIn {
          from { opacity: 0; transform: scale(0.90); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes doveFloat {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          40%      { transform: translateY(-9px) translateX(3px); }
          70%      { transform: translateY(-5px) translateX(1px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 0.80; }
        }
        @keyframes rimGlow {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        .spc-root  { animation: spcFadeIn 2s cubic-bezier(.22,1,.36,1) forwards,
                                spcBreath 5.5s ease-in-out infinite 2s; }
        .spc-dove  { animation: doveFloat 4.2s ease-in-out infinite 1.5s;
                     transform-origin: 248px 148px; }
        .spc-glow  { animation: glowPulse 4s ease-in-out infinite 1s; }
        .spc-rim   { animation: rimGlow 5s ease-in-out infinite; }
      `}</style>

      <svg
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size, maxWidth: '90vw', maxHeight: '90vh' }}
        aria-label="SPC Logo"
      >
        <defs>
          {/* Warm cream interior */}
          <radialGradient id="spcBg" cx="55%" cy="42%" r="60%">
            <stop offset="0%"   stopColor="#FFF7DC" />
            <stop offset="55%"  stopColor="#F5D98A" />
            <stop offset="100%" stopColor="#DDB550" />
          </radialGradient>

          {/* Golden sunburst — right-upper */}
          <radialGradient id="spcSun" cx="70%" cy="34%" r="46%">
            <stop offset="0%"   stopColor="#FFE040" stopOpacity="0.75" />
            <stop offset="45%"  stopColor="#FFA020" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#FF8000" stopOpacity="0" />
          </radialGradient>

          {/* Outer rim glow */}
          <radialGradient id="spcRim" cx="50%" cy="50%" r="50%">
            <stop offset="78%"  stopColor="#FFD060" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFD060" stopOpacity="0.5" />
          </radialGradient>

          {/* Dove: golden amber */}
          <linearGradient id="spcDove" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%"   stopColor="#FFB830" />
            <stop offset="100%" stopColor="#B86A00" />
          </linearGradient>

          {/* Hand: rich brown */}
          <linearGradient id="spcHand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#8B4A18" />
            <stop offset="100%" stopColor="#4E1E06" />
          </linearGradient>

          <clipPath id="spcClip">
            <circle cx="200" cy="200" r="175" />
          </clipPath>
        </defs>

        <g className="spc-root">

          {/* ── Background circle ── */}
          <circle cx="200" cy="200" r="175" fill="url(#spcBg)" />

          {/* Clipped interior art */}
          <g clipPath="url(#spcClip)">

            {/* Sunburst glow */}
            <circle cx="200" cy="200" r="175" fill="url(#spcSun)" className="spc-glow" />

            {/* ── Cross / K shape ──
                Vertical spine left-of-center, two diagonals forming K arms */}
            <line x1="148" y1="76"  x2="148" y2="324" stroke="#5C1800" strokeWidth="14" strokeLinecap="round" />
            <line x1="148" y1="200" x2="278" y2="84"  stroke="#5C1800" strokeWidth="14" strokeLinecap="round" />
            <line x1="148" y1="200" x2="282" y2="316" stroke="#5C1800" strokeWidth="14" strokeLinecap="round" />

            {/* ── Dove ── */}
            <g className="spc-dove">
              {/* Main body */}
              <ellipse cx="242" cy="152" rx="34" ry="20" fill="url(#spcDove)"
                transform="rotate(-28, 242, 152)" />
              {/* Upper wing */}
              <path d="M 228,136 Q 265,88 300,108 Q 272,132 238,140 Z"
                fill="url(#spcDove)" />
              {/* Wing shading crease */}
              <path d="M 228,136 Q 252,110 275,114 Q 255,132 238,140 Z"
                fill="#B87000" opacity="0.4" />
              {/* Tail feathers */}
              <path d="M 200,155 Q 182,143 177,163 Q 192,156 200,155 Z"
                fill="url(#spcDove)" />
              {/* Head */}
              <circle cx="263" cy="132" r="17" fill="url(#spcDove)" />
              {/* Beak */}
              <path d="M 277,128 L 293,122 L 278,136 Z" fill="#9A5800" />
              {/* Eye highlight */}
              <circle cx="269" cy="127" r="3.5" fill="#3A1800" />
              <circle cx="270" cy="126" r="1.2" fill="rgba(255,255,255,0.6)" />
            </g>

            {/* ── Hand ──
                Open palm reaching upward from lower center */}
            <g>
              {/* Thumb */}
              <path d="M 158,316 Q 152,298 156,282 Q 160,268 168,268 L 172,272
                        Q 165,280 162,298 Q 160,310 162,320 Z"
                fill="url(#spcHand)" />
              {/* Palm + fingers as a single path */}
              <path d="
                M 172,314
                Q 174,290 178,276
                Q 181,260 190,262
                Q 194,248 202,252
                Q 206,238 215,242
                Q 220,232 228,238
                L 232,262
                Q 228,270 222,268
                Q 216,266 212,258
                Q 208,266 202,265
                Q 196,262 194,255
                Q 190,263 185,264
                Q 178,265 177,278
                L 175,314
                Q 174,318 172,314 Z
              " fill="url(#spcHand)" />
              {/* Palm width base */}
              <path d="M 162,320 Q 168,330 200,330 Q 235,330 240,318 L 232,262
                        Q 228,270 222,268 L 220,316 Q 200,322 180,318 Z"
                fill="url(#spcHand)" opacity="0.85" />
            </g>
          </g>

          {/* ── Outer border circle ── */}
          <circle cx="200" cy="200" r="175" fill="none" stroke="#5C1800" strokeWidth="9" />

          {/* Rim glow ring */}
          <circle cx="200" cy="200" r="175" fill="url(#spcRim)" className="spc-rim" />

          {/* ── Circular text ──
              Arc from ~8 o'clock to ~4 o'clock going clockwise over the top */}
          <path
            id="spcTextArc"
            fill="none"
            d="M 60,281 A 162,162 0 1,1 340,281"
          />
          <text
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="12.2"
            fill="#5C1800"
            fontWeight="700"
            letterSpacing="1.5"
          >
            <textPath href="#spcTextArc" startOffset="4%" textLength="630" lengthAdjust="spacing">
              YOU SHALL KNOW THE TRUTH  &amp;  THE TRUTH SHALL SET YOU FREE
            </textPath>
          </text>

        </g>
      </svg>
    </>
  )
}
