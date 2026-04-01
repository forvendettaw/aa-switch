import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Define the persona interface
interface Persona {
  name: string;
  active: boolean;
}

// Get the current status and persona list
async function loadStatus() {
  try {
    const status = await invoke<{ active_persona: string; running: boolean }>('get_status');
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = status.running
        ? `Active: ${status.active_persona || 'none'}`
        : 'Gateway not running';
    }
    return status;
  } catch (e) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = 'Error loading status';
    }
    throw e;
  }
}

// Load available personas
async function loadPersonas(): Promise<Persona[]> {
  try {
    return await invoke<Persona[]>('get_personas');
  } catch (e) {
    console.error('Failed to load personas:', e);
    return [
      { name: 'coder', active: false },
      { name: 'monica', active: false },
    ];
  }
}

// Switch persona
async function switchPersona(name: string) {
  try {
    await invoke('switch_persona', { name });
    await loadStatus();
    await renderPersonaList();
  } catch (e) {
    console.error('Failed to switch persona:', e);
    alert(`Failed to switch to ${name}: ${e}`);
  }
}

// Render persona list
async function renderPersonaList() {
  const personas = await loadPersonas();
  const status = await loadStatus();
  const listEl = document.getElementById('persona-list');

  if (listEl) {
    listEl.innerHTML = personas
      .map(
        (p) => `
      <button class="persona-btn ${p.active ? 'active' : ''}" data-name="${p.name}">
        ${p.name}
      </button>
    `
      )
      .join('');

    listEl.querySelectorAll('.persona-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).dataset.name;
        if (name) switchPersona(name);
      });
    });
  }
}

// Listen for tray events
async function setupTrayListener() {
  await listen<{ persona: string }>('tray-persona-clicked', (event) => {
    console.log('Tray persona clicked:', event.payload);
    switchPersona(event.payload.persona);
  });
}

// Initialize
async function init() {
  await renderPersonaList();
  await setupTrayListener();

  // Refresh status periodically
  setInterval(loadStatus, 5000);
}

init();
