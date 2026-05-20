import packageJson from '../../package.json';

interface FooterProps {
  onNavigate: (view: 'privacy' | 'security' | 'docs') => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="mt-auto w-full border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-md px-gutter py-lg md:flex-row">
        <div className="font-label-caps text-label-caps uppercase text-secondary">
          &copy; 2026 Analisador Contabil Pro v{packageJson.version}
        </div>
        <nav className="flex gap-lg">
          <button
            onClick={() => onNavigate('privacy')}
            className="font-body-sm text-body-sm text-on-surface-variant transition-all duration-300 hover:text-primary"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => onNavigate('security')}
            className="font-body-sm text-body-sm text-on-surface-variant transition-all duration-300 hover:text-primary"
          >
            Data Security
          </button>
          <button
            onClick={() => onNavigate('docs')}
            className="font-body-sm text-body-sm text-on-surface-variant transition-all duration-300 hover:text-primary"
          >
            Local Processing Documentation
          </button>
        </nav>
      </div>
    </footer>
  );
}
