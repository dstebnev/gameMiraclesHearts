import { autoSave } from '../save.js';

export interface ChoiceOption {
  id: string;
  label: string;
  next: string;
  gain?: Record<string, number>;
  req?: Record<string, number>;
  meta?: string;
}

export type Node =
  | { type: 'bg'; bg: string; next: string }
  | { type: 'say'; who: string; text: string; next: string }
  | { type: 'set'; vars: Record<string, string | number>; next: string }
  | { type: 'sprite'; who: string; sprite: string; pos: string; next: string }
  | { type: 'music'; music: string; next: string }
  | { type: 'choice'; text: string; options: ChoiceOption[] }
  | { type: 'check'; req: Record<string, number>; onPass: string; onFail: string }
  | { type: 'sfx'; sfx: string; next: string }
  | { type: 'minigame'; id: string; rules: string; onWin: string; onLose: string }
  | { type: 'jump'; to: string }
  | { type: 'end'; save?: boolean; summary?: string };

export interface Episode {
  episodeId: string;
  title: string;
  start: string;
  nodes: Record<string, Node>;
}

function appendLine(container: HTMLElement, text: string): void {
  const p = document.createElement('p');
  p.textContent = text;
  container.appendChild(p);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function checkReq(req: Record<string, number> | undefined, state: Record<string, any>): boolean {
  if (!req) return true;
  for (const [key, val] of Object.entries(req)) {
    if ((state[key] ?? 0) < val) return false;
  }
  return true;
}

function applyGain(gain: Record<string, number> | undefined, state: Record<string, any>): void {
  if (!gain) return;
  for (const [key, val] of Object.entries(gain)) {
    state[key] = (state[key] ?? 0) + val;
  }
}

function describeCost(gain?: Record<string, number>, meta?: string): string {
  const parts: string[] = [];
  if (gain) {
    if (typeof gain.energy === 'number' && gain.energy < 0) {
      parts.push(`${-gain.energy} energy`);
    }
    if (typeof gain.runes === 'number' && gain.runes < 0) {
      parts.push(`${-gain.runes} runes`);
    }
  }
  if (meta && /premium|iap/i.test(meta)) {
    parts.push('premium');
  }
  return parts.length ? ` (${parts.join(', ')})` : '';
}

async function presentChoices(
  options: ChoiceOption[],
  state: Record<string, any>,
  container: HTMLElement
): Promise<ChoiceOption> {
  container.innerHTML = '';
  return new Promise((resolve) => {
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.textContent = opt.label + describeCost(opt.gain, opt.meta);
      const ok = checkReq(opt.req, state);
      if (!ok) btn.disabled = true;
      btn.addEventListener('click', () => {
        if (!checkReq(opt.req, state)) return;
        container.innerHTML = '';
        resolve(opt);
      });
      container.appendChild(btn);
    });
  });
}

export async function runEpisode(
  ep: Episode,
  container: HTMLElement,
  startNode: string = ep.start,
  initialState: Record<string, any> = {}
): Promise<void> {
  let current = startNode;
  container.innerHTML = '';

  const bg = document.createElement('div');
  bg.className = 'bg';
  const spriteLayer = document.createElement('div');
  spriteLayer.className = 'sprites';
  const log = document.createElement('div');
  log.className = 'log';
  const choiceLayer = document.createElement('div');
  choiceLayer.className = 'choices';
  container.append(bg, spriteLayer, log, choiceLayer);

  const sprites = new Map<string, HTMLImageElement>();
  const musicAudio = new Audio();
  musicAudio.loop = true;
  const sfxAudio = new Audio();

  const state: Record<string, any> = { ...initialState };
  while (current) {
    const node = ep.nodes[current];
    if (!node) {
      throw new Error(`Node ${current} not found`);
    }
    switch (node.type) {
      case 'bg': {
        const url = new URL(`../../assets/bg/${node.bg}.png`, import.meta.url).href;
        bg.style.backgroundImage = `url(${url})`;
        current = node.next;
        break;
      }
      case 'music': {
        const url = new URL(`../../assets/music/${node.music}.mp3`, import.meta.url).href;
        musicAudio.src = url;
        musicAudio.play().catch(() => {});
        current = node.next;
        break;
      }
      case 'say':
        appendLine(log, `${node.who}: ${node.text}`);
        current = node.next;
        break;
      case 'set':
        for (const [key, value] of Object.entries(node.vars)) {
          if (typeof value === 'string' && /^[-+]?\d+$/.test(value)) {
            const delta = Number(value);
            state[key] = (state[key] ?? 0) + delta;
          } else {
            state[key] = value;
          }
        }
        current = node.next;
        break;
      case 'sprite': {
        const url = new URL(
          `../../assets/characters/${node.sprite}.png`,
          import.meta.url
        ).href;
        let img = sprites.get(node.who);
        if (!img) {
          img = document.createElement('img');
          sprites.set(node.who, img);
          spriteLayer.appendChild(img);
        }
        img.src = url;
        img.style.position = 'absolute';
        img.style.bottom = '0';
        img.style.maxHeight = '100%';
        img.style.left = '';
        img.style.right = '';
        img.style.transform = '';
        if (node.pos === 'left') img.style.left = '0';
        else if (node.pos === 'right') img.style.right = '0';
        else {
          img.style.left = '50%';
          img.style.transform = 'translateX(-50%)';
        }
        current = node.next;
        break;
      }
      case 'choice': {
        appendLine(log, node.text);
        const opt = await presentChoices(node.options, state, choiceLayer);
        applyGain(opt.gain, state);
        current = opt.next;
        break;
      }
      case 'check': {
        const passed = checkReq(node.req, state);
        current = passed ? node.onPass : node.onFail;
        break;
      }
      case 'sfx': {
        const url = new URL(`../../assets/sfx/${node.sfx}.mp3`, import.meta.url).href;
        sfxAudio.src = url;
        sfxAudio.play().catch(() => {});
        current = node.next;
        break;
      }
      case 'minigame':
        appendLine(log, `Minigame: ${node.id} - ${node.rules}`);
        current = node.onWin;
        break;
      case 'jump':
        current = node.to;
        break;
      case 'end':
        if (node.summary) {
          const summary = node.summary.replace(/\{(.*?)\}/g, (_, k) => {
            return String(state[k] ?? 0);
          });
          appendLine(log, summary);
        }
        appendLine(log, 'The End');
        current = '';
        break;
      default: {
        const _exhaustive: never = node;
        throw new Error(`Unknown node type: ${(_exhaustive as any).type}`);
      }
    }
    autoSave({
      episodeId: ep.episodeId,
      nodeId: current,
      resources: state,
      version: 1,
    });
    if (!current) {
      return;
    }
    await nextFrame();
  }
}
