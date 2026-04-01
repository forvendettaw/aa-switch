interface Persona {
  name: string;
  active: boolean;
}

interface PersonaSelectorProps {
  personas: Persona[];
  activePersona: string;
  onSelect: (name: string) => void;
}

const personaMeta: Record<string, { emoji: string; desc: string }> = {
  intj_architect: { emoji: '🏛️', desc: 'Architect' },
  entp_debater: { emoji: '⚡', desc: 'Debater' },
  machiavelli_exec: { emoji: '💼', desc: 'Executive' },
  isfj_guardian: { emoji: '🛡️', desc: 'Guardian' },
  istp_hacker: { emoji: '💻', desc: 'Hacker' },
  senior_oilcan: { emoji: '👴', desc: 'Senior' },
  venomous_critic: { emoji: '🔥', desc: 'Critic' },
  startup_crazy_founder: { emoji: '🚀', desc: 'Founder' },
  philosopher_coder: { emoji: '🤔', desc: 'Philosopher' },
  sre_night_watcher: { emoji: '🌙', desc: 'Night Watch' },
  otaku_helper: { emoji: '🌸', desc: 'Helper' },
  coder: { emoji: '👨‍💻', desc: 'Coder' },
};

function PersonaSelector({ personas, activePersona, onSelect }: PersonaSelectorProps) {
  if (personas.length === 0) {
    return (
      <div className="text-sm text-[hsl(215,8%,45%)] py-4 text-center">
        No personas found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {personas.map((persona) => {
        const isSelected = persona.name === activePersona;
        const meta = personaMeta[persona.name] || { emoji: '👤', desc: persona.name };

        return (
          <button
            key={persona.name}
            onClick={() => onSelect(persona.name)}
            className={`
              relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
              ${isSelected
                ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/5'
                : 'bg-[hsl(215,20%,10%)] border-[hsl(215,20%,18%)] hover:bg-[hsl(215,20%,12%)] hover:border-[hsl(215,20%,25%)]'
              }
            `}
          >
            {/* Emoji */}
            <span className="text-2xl mb-1">{meta.emoji}</span>

            {/* Name */}
            <span className={`text-xs font-medium truncate w-full text-center ${isSelected ? 'text-blue-400' : 'text-[hsl(210,11%,90%)]'}`}>
              {persona.name.replace(/_/g, ' ')}
            </span>

            {/* Description */}
            <span className="text-[10px] text-[hsl(215,8%,45%)]">
              {meta.desc}
            </span>

            {/* Active Indicator */}
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PersonaSelector;