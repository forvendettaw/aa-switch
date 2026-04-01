interface Status {
  active_agent: string;
  active_persona: string;
  running: boolean;
}

interface StatusBarProps {
  status: Status;
}

function StatusBar({ status }: StatusBarProps) {
  return (
    <footer className="h-10 flex items-center justify-between px-5 bg-[hsl(215,20%,10%)] border-t border-[hsl(215,20%,15%)] text-xs">
      <div className="flex items-center gap-4">
        {/* Server */}
        <div className="flex items-center gap-1.5">
          <span className="text-[hsl(215,8%,45%)]">Server:</span>
          <span className="text-[hsl(210,11%,80%)] font-medium">127.0.0.1:8080</span>
        </div>

        {/* Agent */}
        <div className="flex items-center gap-1.5">
          <span className="text-[hsl(215,8%,45%)]">Agent:</span>
          <span className="text-[hsl(210,11%,80%)] font-medium capitalize">{status.active_agent}</span>
        </div>
      </div>

      {/* Active Persona */}
      <div className="flex items-center gap-1.5">
        <span className="text-[hsl(215,8%,45%)]">Persona:</span>
        <span className="text-blue-400 font-medium">{status.active_persona}</span>
      </div>
    </footer>
  );
}

export default StatusBar;