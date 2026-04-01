interface Agent {
  name: string;
  provider: string;
  active: boolean;
}

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: string;
  onSelect: (name: string) => void;
}

const agentIcons: Record<string, { icon: string; color: string }> = {
  anthropic: { icon: 'A', color: 'from-amber-500 to-orange-600' },
  openai: { icon: 'O', color: 'from-emerald-500 to-teal-600' },
  claude: { icon: 'C', color: 'from-purple-500 to-indigo-600' },
};

function AgentSelector({ agents, selectedAgent, onSelect }: AgentSelectorProps) {
  if (agents.length === 0) {
    return (
      <div className="text-sm text-[hsl(215,8%,45%)] py-4 text-center">
        No agents configured
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {agents.map((agent) => {
        const isSelected = agent.name === selectedAgent;
        const iconData = agentIcons[agent.name] || { icon: agent.name[0].toUpperCase(), color: 'from-blue-500 to-blue-600' };

        return (
          <button
            key={agent.name}
            onClick={() => onSelect(agent.name)}
            className={`
              relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200
              ${isSelected
                ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                : 'bg-[hsl(215,20%,10%)] border-[hsl(215,20%,18%)] hover:bg-[hsl(215,20%,12%)] hover:border-[hsl(215,20%,25%)]'
              }
            `}
          >
            {/* Agent Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconData.color} flex items-center justify-center mb-3 shadow-lg ${isSelected ? 'shadow-blue-500/30' : ''}`}>
              <span className="text-lg font-bold text-white">{iconData.icon}</span>
            </div>

            {/* Agent Name */}
            <span className={`text-sm font-medium capitalize ${isSelected ? 'text-blue-400' : 'text-[hsl(210,11%,96%)]'}`}>
              {agent.name}
            </span>

            {/* Provider */}
            <span className="text-xs text-[hsl(215,8%,45%)] mt-0.5">
              {agent.provider}
            </span>

            {/* Active Indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default AgentSelector;