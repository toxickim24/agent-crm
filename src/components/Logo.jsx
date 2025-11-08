const Logo = ({ className = "h-8", showText = true, variant = "default" }) => {
  const colors = {
    default: {
      primary: "#2563eb",
      secondary: "#3b82f6",
      text: "#1e40af"
    },
    light: {
      primary: "#2563eb",
      secondary: "#3b82f6",
      text: "#1e40af"
    },
    dark: {
      primary: "#60a5fa",
      secondary: "#93c5fd",
      text: "#93c5fd"
    },
    white: {
      primary: "#ffffff",
      secondary: "#f0f9ff",
      text: "#ffffff"
    }
  };

  const colorScheme = colors[variant] || colors.default;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon: Funnel with upward trend line */}
      <svg
        viewBox="0 0 48 48"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Funnel shape */}
        <path
          d="M8 10 C8 8 9 7 11 7 L37 7 C39 7 40 8 40 10 L40 14 L32 26 L32 38 C32 39 31 40 30 40 L18 40 C17 40 16 39 16 38 L16 26 L8 14 L8 10 Z"
          fill={colorScheme.primary}
          opacity="0.2"
        />
        <path
          d="M8 10 C8 8 9 7 11 7 L37 7 C39 7 40 8 40 10 L40 14 L32 26 L32 34"
          stroke={colorScheme.primary}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 26 L16 34"
          stroke={colorScheme.primary}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Upward trend line inside funnel */}
        <path
          d="M14 30 L18 26 L22 28 L26 22"
          stroke={colorScheme.secondary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow tip */}
        <path
          d="M23 22 L26 22 L26 25"
          stroke={colorScheme.secondary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: colorScheme.text }}
          >
            Agent
          </span>
          <span
            className="text-sm font-medium tracking-wider"
            style={{ color: colorScheme.secondary }}
          >
            CRM
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
