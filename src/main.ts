import { runEpisode, Episode } from './core/engine/episodeRunner.js';
import { load, autoSave, lastSave } from './core/save.js';

(async () => {
  // resolve JSON relative to this compiled module (works when files находятся в public/)
  const epUrl = new URL('../../content/episodes/ep1.json', import.meta.url).href;
  const res = await fetch(epUrl);
  if (!res.ok) {
    throw new Error(`Failed to load episode: ${res.status} ${res.statusText}`);
  }
  const ep = await res.json();
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Game container element not found');
  }

  const menu = document.createElement('div');
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    if (lastSave) autoSave(lastSave);
  });
  const loadBtn = document.createElement('button');
  loadBtn.textContent = 'Load';
  loadBtn.addEventListener('click', () => {
    const data = load(0);
    if (data && data.episodeId === (ep as Episode).episodeId) {
      runEpisode(ep as Episode, container, data.nodeId, data.resources);
    }
  });
  menu.append(saveBtn, loadBtn);
  document.body.prepend(menu);

  await runEpisode(ep as Episode, container);
})();
