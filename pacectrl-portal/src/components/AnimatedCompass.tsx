export default function AnimatedCompass({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-full h-full ${className}`}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.2" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
      
      {/* Compass Needle */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="10s"
          repeatCount="indefinite"
          values="0 50 50; 15 50 50; -10 50 50; 5 50 50; 0 50 50"
        />
        <path d="M 50 15 L 60 50 L 50 85 L 40 50 Z" fill="currentColor" opacity="0.8" />
        <path d="M 50 15 L 60 50 L 50 50 Z" fill="currentColor" />
        <circle cx="50" cy="50" r="5" fill="currentColor" />
      </g>
      
      {/* N, S, E, W Markers */}
      <text x="50" y="12" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor">N</text>
      <text x="50" y="94" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor">S</text>
      <text x="92" y="53" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor">E</text>
      <text x="8" y="53" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor">W</text>
    </svg>
  );
}
