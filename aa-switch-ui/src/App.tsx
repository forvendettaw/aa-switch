import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Header from './components/Header';
import AgentSelector from './components/AgentSelector';
import PersonaSelector from './components/PersonaSelector';
import StatusBar from './components/StatusBar';
import './index.css';

interface Status {
  active_persona: string;
  active_agent: string;
  running: boolean;
}

interface Agent {
  name: string;
  provider: string;
  active: boolean;
}

interface Persona {
  name: string;
  active: boolean;
}

function App() {
  const [status, setStatus] = useState<Status>({ active_persona: 'loading...', active_agent: '...', running: false });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const s = await invoke<Status>('get_status');
      setStatus(s);
      if (!selectedAgent) {
        setSelectedAgent(s.active_agent);
      }
    } catch (e) {
      console.error('Failed to get status:', e);
    }
  };

  const fetchAgents = async () => {
    try {
      const a = await invoke<Agent[]>('get_agents');
      setAgents(a);
    } catch (e) {
      console.error('Failed to get agents:', e);
    }
  };

  const fetchPersonas = async () => {
    try {
      const p = await invoke<Persona[]>('get_personas');
      setPersonas(p);
    } catch (e) {
      console.error('Failed to get personas:', e);
    }
  };

  const switchAgent = async (name: string) => {
    try {
      await invoke('switch_agent', { name });
      setSelectedAgent(name);
      await fetchStatus();
    } catch (e) {
      console.error('Failed to switch agent:', e);
    }
  };

  const switchPersona = async (name: string) => {
    try {
      await invoke('switch_persona', { name });
      await fetchStatus();
      await fetchPersonas();
    } catch (e) {
      console.error('Failed to switch persona:', e);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchStatus();
      await fetchAgents();
      await fetchPersonas();
      setLoading(false);
    };
    load();

    const interval = setInterval(() => {
      fetchStatus();
      fetchAgents();
      fetchPersonas();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[hsl(220,20%,6%)]">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[hsl(220,20%,6%)]">
      <Header status={status} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-6">
          {/* Agent Selection */}
          <section>
            <h2 className="section-title">Select Agent</h2>
            <AgentSelector
              agents={agents}
              selectedAgent={selectedAgent || status.active_agent}
              onSelect={switchAgent}
            />
          </section>

          {/* Persona Selection */}
          <section>
            <h2 className="section-title">Select Persona</h2>
            <PersonaSelector
              personas={personas}
              activePersona={status.active_persona}
              onSelect={switchPersona}
            />
          </section>
        </div>
      </main>
      <StatusBar status={status} />
    </div>
  );
}

export default App;