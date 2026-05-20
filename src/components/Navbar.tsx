interface NavbarProps {
  onHomeClick: () => void;
}

export function Navbar({ onHomeClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="mx-auto flex max-w-container-max items-center px-gutter py-md">
        <button
          onClick={onHomeClick}
          className="text-title-sm font-title-sm font-bold text-primary transition-opacity hover:opacity-80"
        >
          Analisador Contabil Pro
        </button>
      </div>
    </header>
  );
}
