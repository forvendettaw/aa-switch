interface Status {
  active_agent: string;
  active_persona: string;
  running: boolean;
}

interface HeaderProps {
  status: Status;
}

function Header({ status }: HeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-5 bg-[hsl(215,20%,10%)] border-b border-[hsl(215,20%,15%)]">
      <div className="flex items-center gap-3 drag-region flex-1">
        {/* App Icon */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[hsl(210,11%,96%)] tracking-tight">aa-switch</h1>
          <p className="text-xs text-[hsl(215,8%,45%)]">Context Gateway</p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 no-drag">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(215,20%,12%)] border border-[hsl(215,20%,18%)]">
          <div className={`w-1.5 h-1.5 rounded-full ${status.running ? 'bg-emerald-400' : 'bg-red-400'} ${status.running ? 'shadow-sm shadow-emerald-400/50' : ''}`} />
          <span className={`text-xs font-medium ${status.running ? 'text-emerald-400' : 'text-red-400'}`}>
            {status.running ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;