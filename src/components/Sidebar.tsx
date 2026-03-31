import React from 'react';
import { useVaultStore } from '@/store/vault.store';
import { cn } from '@/lib/cn';
import type { SidebarFilter } from '@/types';

const NAV_ITEMS: { label: string; icon: string; filter: SidebarFilter }[] = [
  { label: 'All Items', icon: 'database', filter: 'all' },
  { label: 'Favorites', icon: 'star', filter: 'favorites' },
  { label: 'Trash', icon: 'delete', filter: 'trash' },
];

export const Sidebar: React.FC = () => {
  const sidebarFilter = useVaultStore((s) => s.sidebarFilter);
  const setSidebarFilter = useVaultStore((s) => s.setSidebarFilter);
  const selectedCategory = useVaultStore((s) => s.selectedCategory);
  const setSelectedCategory = useVaultStore((s) => s.setSelectedCategory);
  const setView = useVaultStore((s) => s.setView);
  const view = useVaultStore((s) => s.view);
  const lockVault = useVaultStore((s) => s.lockVault);
  const credentials = useVaultStore((s) => s.credentials);
  const categories = useVaultStore((s) => s.categories);

  // Count per category (non-deleted)
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of credentials) {
      if (!c.deleted) counts[c.category] = (counts[c.category] ?? 0) + 1;
    }
    return counts;
  }, [credentials]);

  const handleNavClick = (filter: SidebarFilter) => {
    setSidebarFilter(filter);
    setView('vault');
  };

  const handleCategoryClick = (name: string) => {
    setSelectedCategory(selectedCategory === name ? null : name);
    setView('vault');
  };

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-background-dark/50 shrink-0">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">shield</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">Vault</h1>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {/* Navigation */}
        <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.filter}
            onClick={() => handleNavClick(item.filter)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors text-left text-sm',
              sidebarFilter === item.filter && view === 'vault' && !selectedCategory
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            )}
          >
            <span className="material-symbols-outlined text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.filter === 'all' && (
              <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5">
                {credentials.filter((c) => !c.deleted).length}
              </span>
            )}
          </button>
        ))}

        {/* Categories */}
        <div className="pt-4 flex items-center justify-between px-3">
          <p className="py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</p>
          <button
            onClick={() => setView('settings')}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
            title="Manage categories in Settings"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
          </button>
        </div>
        {categories.map((cat) => {
          const count = categoryCounts[cat.name] ?? 0;
          const isActive = selectedCategory === cat.name && view === 'vault';
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.name)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors text-left text-sm',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              )}
            >
              <span className="material-symbols-outlined text-lg">{cat.icon}</span>
              <span className="flex-1">{cat.name}</span>
              {count > 0 && (
                <span className={cn(
                  'text-xs rounded-full px-2 py-0.5',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Account */}
        <p className="pt-4 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Account
        </p>
        <button
          onClick={() => setView('settings')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors text-left text-sm',
            view === 'settings'
              ? 'bg-primary/10 text-primary'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          )}
        >
          <span className="material-symbols-outlined text-lg">settings</span>
          <span>Settings</span>
        </button>
        <button
          onClick={() => setView('generator')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors text-left text-sm',
            view === 'generator'
              ? 'bg-primary/10 text-primary'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          )}
        >
          <span className="material-symbols-outlined text-lg">casino</span>
          <span>Generator</span>
        </button>
      </nav>

      {/* Lock */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={lockVault}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium text-sm"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span>Lock Vault</span>
        </button>
      </div>
    </aside>
  );
};
