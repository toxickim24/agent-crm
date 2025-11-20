import { useTheme } from '../contexts/ThemeContext';

const Logo = ({ className = "h-8", showText = false, variant = "default" }) => {
  const { isDark } = useTheme();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={isDark ? "/label white logo.svg" : "/label logo.svg"}
        alt="Agent CRM Logo"
        className="h-full w-auto"
      />
    </div>
  );
};

export default Logo;
