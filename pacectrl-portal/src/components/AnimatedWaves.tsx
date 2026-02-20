export default function AnimatedWaves({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-full h-full ${className}`}
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z"
        fill="currentColor"
        opacity="0.5"
      >
        <animate
          attributeName="d"
          dur="3s"
          repeatCount="indefinite"
          values="
            M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z;
            M0 10 Q 12.5 20 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z;
            M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z
          "
        />
      </path>
      <path
        d="M0 10 Q 12.5 20 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z"
        fill="currentColor"
        opacity="0.3"
      >
        <animate
          attributeName="d"
          dur="4s"
          repeatCount="indefinite"
          values="
            M0 10 Q 12.5 20 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z;
            M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z;
            M0 10 Q 12.5 20 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z
          "
        />
      </path>
    </svg>
  );
}
