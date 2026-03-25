import { Church, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({ searchQuery, onSearchChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="container flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 px-4 md:px-8">
        {/* Logo + Titre */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg">
            <Church className="h-6 w-6 text-primary-foreground" />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-md -z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">GodsPlan</h1>
            <p className="text-sm text-muted-foreground">Trouvez votre église à Paris</p>
          </div>
        </div>

        {/* Search Bar - Centrée et grande */}
        <div className="flex-1 max-w-2xl mx-auto w-full">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher une église à Paris..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-12 text-base bg-background border shadow-lg focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
              aria-label="Rechercher une église"
            />
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-end md:justify-start">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
