import { runEpisode, Episode } from './core/engine/episodeRunner.js';

(async () => {
  // resolve JSON relative to this compiled module (works when files находятся в public/)
  const epUrl = new URL('../../content/episodes/ep1.json', import.meta.url).href;
  const res = await fetch(epUrl);
  if (!res.ok) {
    throw new Error(`Failed to load episode: ${res.status} ${res.statusText}`);
  }
  const ep = await res.json();
  runEpisode(ep as Episode);
})();
