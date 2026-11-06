const ITEMS = [
  { items: [
    { id: 'dashboard', label: 'Дашборд', icon: '▦' },
    { id: 'analytics', label: 'Аналитика', icon: '◐' },
    { id: 'offers', label: 'Аккаунты', icon: '◆' },
    { id: 'settings', label: 'Настройки', icon: '⚙' },
  ]},
];

export default function Sidebar({ view, onNavigate, count }) {
  return (
    <aside className="hidden md:flex flex-col gap-1 text-side-text p-0 h-[calc(100vh-20px)] sticky top-1 overflow-hidden">
      <div className="flex items-center px-1 pb-1">
        <div>
          <div className="font-semibold text-[13px] text-foreground">Личный кабинет</div>
          <div className="text-[10px] text-side-dim font-mono">for partners @RubUP</div>
        </div>
      </div>

      <nav className="flex flex-col gap-3.5 overflow-y-auto flex-1">
        {ITEMS.map(g => (
          <div key={g.group} className="flex flex-col gap-0.5">
            {g.items.map(item => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[12.5px] font-medium transition-colors ${
                    active ? 'bg-side-active text-foreground' : 'text-side-text hover:bg-elevated'
                  }`}
                >
                  <span className="w-4 text-center opacity-80">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === 'dashboard' && count > 0 && (
                    <span className="ml-auto bg-brand text-[#04160a] font-mono text-[10px] font-bold px-1.5 py-px rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}