import React, { useState } from 'react';
import { useVaultStore, selectFilteredCredentials } from '@/store/vault.store';
import { Sidebar } from '@/components/Sidebar';
import { CredentialRow, CredentialDetail } from '@/components/CredentialList';
import { SaveFromExtensionModal } from '@/components/modals/SaveFromExtensionModal';

export const VaultPage: React.FC = () => {
  const credentials = useVaultStore((s) => s.credentials);
  const sidebarFilter = useVaultStore((s) => s.sidebarFilter);
  const selectedCategory = useVaultStore((s) => s.selectedCategory);
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const selectedId = useVaultStore((s) => s.selectedId);
  const selectCredential = useVaultStore((s) => s.selectCredential);

  const [showAddModal, setShowAddModal] = useState(false);
  const [AddModalComponent, setAddModalComponent] = useState<React.ComponentType<{
    open: boolean;
    onClose: () => void;
  }> | null>(null);

  const pendingCredential = useVaultStore((s) => s.pendingCredential);

  const filtered = selectFilteredCredentials(credentials, sidebarFilter, searchQuery, selectedCategory);
  const selected = filtered.find((c) => c.id === selectedId) ?? null;

  const openAdd = async () => {
    if (!AddModalComponent) {
      const m = await import('@/components/modals/AddEditCredentialModal');
      setAddModalComponent(() => m.AddEditCredentialModal);
    }
    setShowAddModal(true);
  };

  const filterLabel: Record<string, string> = {
    all: selectedCategory ? selectedCategory : 'All Items',
    favorites: 'Favorites',
    trash: 'Trash',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      <Sidebar />

      {/* List pane */}
      <main className="flex-1 flex flex-col min-w-0 border-r border-slate-200 dark:border-slate-800">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 gap-4 shrink-0">
          <div className="flex-1 max-w-xl relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
              search
            </span>
            <input
              className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary transition-all outline-none"
              placeholder="Search passwords..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {sidebarFilter !== 'trash' && (
            <button
              onClick={openAdd}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              New Item
            </button>
          )}
        </header>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <span className="material-symbols-outlined text-5xl">lock</span>
              <p className="text-sm font-medium">
                {searchQuery
                  ? 'No results found.'
                  : `No items in ${filterLabel[sidebarFilter]}.`}
              </p>
              {sidebarFilter === 'all' && !searchQuery && (
                <button
                  onClick={openAdd}
                  className="mt-2 text-primary text-sm hover:underline"
                >
                  Add your first password →
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => (
                <CredentialRow
                  key={c.id}
                  credential={c}
                  selected={c.id === selectedId}
                  onSelect={() => selectCredential(c.id === selectedId ? null : c.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail pane */}
      {selected ? (
        <CredentialDetail credential={selected} />
      ) : (
        <section className="w-[400px] shrink-0 bg-white dark:bg-[#1a1330] hidden lg:flex flex-col items-center justify-center text-slate-400 border-l border-slate-200 dark:border-slate-800">
          <span className="material-symbols-outlined text-5xl mb-3">touch_app</span>
          <p className="text-sm font-medium">Select an item to view details</p>
        </section>
      )}

      {/* Add modal */}
      {showAddModal && AddModalComponent && (
        <AddModalComponent open={showAddModal} onClose={() => setShowAddModal(false)} />
      )}

      {/* Save-from-extension modal — shown when extension sends a credential */}
      {pendingCredential && (
        <SaveFromExtensionModal
          pending={pendingCredential}
          onClose={() => {/* clearPendingCredential is called inside the modal */}}
        />
      )}
    </div>
  );
};
