import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Logo = ({ className = "h-8", showText = false, variant = "default", customLogoUrlLight = null, customLogoUrlDark = null }) => {
  const { isDark } = useTheme();
  const { user } = useAuth();

  // Determine which logo to display based on theme
  const defaultLogo = isDark ? "/label white logo.svg" : "/label logo.svg";

  let logoUrl;
  if (isDark) {
    // Dark mode: use dark mode logo, fallback to light mode logo, then default
    logoUrl = customLogoUrlDark || user?.logo_url_dark || customLogoUrlLight || user?.logo_url_light || defaultLogo;
  } else {
    // Light mode: use light mode logo, fallback to dark mode logo, then default
    logoUrl = customLogoUrlLight || user?.logo_url_light || customLogoUrlDark || user?.logo_url_dark || defaultLogo;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={logoUrl}
        alt="Agent CRM Logo"
        className="h-full w-auto"
      />
    </div>
  );
};

export default Logo;
