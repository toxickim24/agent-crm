import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import API_BASE_URL from '../config/api';

const Logo = ({ className = "h-8", showText = false, variant = "default", customLogoUrlLight = null, customLogoUrlDark = null }) => {
  const { isDark } = useTheme();
  const { user } = useAuth();

  // Helper function to get full URL for uploaded logos
  const getFullUrl = (url) => {
    if (!url) return null;
    // If it's already a full URL or a default logo, return as is
    if (url.startsWith('http') || url.startsWith('/label')) return url;
    // Otherwise, prepend the API base URL (without /api suffix)
    return `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  // Determine which logo to display based on theme
  const defaultLogo = isDark ? "/label white logo.svg" : "/label logo.svg";

  let logoUrl;
  if (isDark) {
    // Dark mode: use dark mode logo, fallback to light mode logo, then default
    logoUrl = getFullUrl(customLogoUrlDark || user?.logo_url_dark) ||
              getFullUrl(customLogoUrlLight || user?.logo_url_light) ||
              defaultLogo;
  } else {
    // Light mode: use light mode logo, fallback to dark mode logo, then default
    logoUrl = getFullUrl(customLogoUrlLight || user?.logo_url_light) ||
              getFullUrl(customLogoUrlDark || user?.logo_url_dark) ||
              defaultLogo;
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
