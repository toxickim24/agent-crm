import { Link } from 'react-router-dom';
import { HelpCircle, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Agent CRM. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <button
              onClick={() => alert('FAQ page - To be implemented')}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <HelpCircle size={16} />
              FAQ
            </button>

            <button
              onClick={() => alert('Contact form - To be implemented')}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <MessageCircle size={16} />
              Ask Us Anything
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
