export default function AnimatedShip({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-full h-full ${className}`}
      viewBox="0 0 800 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="sea" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#042f2e" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="400" fill="url(#sky)" />
      
      {/* Stars */}
      <g fill="#fff" opacity="0.6">
        <circle cx="100" cy="50" r="1" />
        <circle cx="250" cy="80" r="1.5" />
        <circle cx="400" cy="40" r="1" />
        <circle cx="550" cy="90" r="2" />
        <circle cx="700" cy="60" r="1" />
        <circle cx="150" cy="120" r="1.5" />
        <circle cx="600" cy="130" r="1" />
        <circle cx="300" cy="150" r="1" />
      </g>

      {/* Moon */}
      <circle cx="650" cy="100" r="30" fill="#fef08a" filter="url(#glow)" opacity="0.9" />

      {/* Sea */}
      <path
        d="M0 250 Q 100 240 200 250 T 400 250 T 600 250 T 800 250 L 800 400 L 0 400 Z"
        fill="url(#sea)"
      >
        <animate
          attributeName="d"
          dur="4s"
          repeatCount="indefinite"
          values="
            M0 250 Q 100 240 200 250 T 400 250 T 600 250 T 800 250 L 800 400 L 0 400 Z;
            M0 250 Q 100 260 200 250 T 400 250 T 600 250 T 800 250 L 800 400 L 0 400 Z;
            M0 250 Q 100 240 200 250 T 400 250 T 600 250 T 800 250 L 800 400 L 0 400 Z
          "
        />
      </path>

      {/* Ship Group */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          dur="20s"
          repeatCount="indefinite"
          values="-200 0; 900 0"
        />
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            dur="4s"
            repeatCount="indefinite"
            values="-2 150 230; 2 150 230; -2 150 230"
          />
          
          {/* Hull */}
          <path d="M 50 230 L 250 230 L 230 260 L 70 260 Z" fill="#334155" />
          <path d="M 50 230 L 250 230 L 240 240 L 60 240 Z" fill="#475569" />
          
          {/* Cabin */}
          <rect x="100" y="190" width="100" height="40" fill="#f8fafc" rx="4" />
          <rect x="110" y="170" width="80" height="20" fill="#e2e8f0" rx="2" />
          
          {/* Windows */}
          <rect x="110" y="200" width="15" height="15" fill="#38bdf8" rx="2" />
          <rect x="135" y="200" width="15" height="15" fill="#38bdf8" rx="2" />
          <rect x="160" y="200" width="15" height="15" fill="#38bdf8" rx="2" />
          <rect x="185" y="200" width="15" height="15" fill="#38bdf8" rx="2" />
          
          {/* Smokestack */}
          <rect x="140" y="140" width="20" height="30" fill="#ef4444" />
          <rect x="140" y="140" width="20" height="10" fill="#1e293b" />
          
          {/* Smoke */}
          <g fill="#94a3b8" opacity="0.6">
            <circle cx="150" cy="120" r="10">
              <animate attributeName="cy" values="120; 80" dur="2s" repeatCount="indefinite" />
              <animate attributeName="r" values="10; 20" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6; 0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="150" cy="100" r="15">
              <animate attributeName="cy" values="100; 60" dur="2s" repeatCount="indefinite" begin="1s" />
              <animate attributeName="r" values="15; 25" dur="2s" repeatCount="indefinite" begin="1s" />
              <animate attributeName="opacity" values="0.6; 0" dur="2s" repeatCount="indefinite" begin="1s" />
            </circle>
          </g>
        </g>
      </g>

      {/* Foreground Waves */}
      <path
        d="M0 270 Q 150 250 300 270 T 600 270 T 900 270 L 900 400 L 0 400 Z"
        fill="#0f766e"
        opacity="0.8"
      >
        <animate
          attributeName="d"
          dur="3s"
          repeatCount="indefinite"
          values="
            M0 270 Q 150 250 300 270 T 600 270 T 900 270 L 900 400 L 0 400 Z;
            M0 270 Q 150 290 300 270 T 600 270 T 900 270 L 900 400 L 0 400 Z;
            M0 270 Q 150 250 300 270 T 600 270 T 900 270 L 900 400 L 0 400 Z
          "
        />
      </path>
    </svg>
  );
}
