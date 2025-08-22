export type Node =
  | { type: 'bg'; bg: string; next: string }
  | { type: 'say'; who: string; text: string; next: string }
  | { type: 'set'; vars: Record<string, string | number>; next: string }
  | { type: 'sprite'; who: string; sprite: string; pos: string; next: string }
  | {
      type: 'choice';
      text: string;
      options: Array<{
        id: string;
        label: string;
        next: string;
        gain?: Record<string, number>;
        req?: Record<string, number>;
        meta?: string;
      }>;
    }
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

export function runEpisode(ep: Episode, container: HTMLElement): void {
  let current = ep.start;
  container.innerHTML = '';
  const state: Record<string, any> = {};
  while (current) {
    const node = ep.nodes[current];
    if (!node) {
      throw new Error(`Node ${current} not found`);
    }
    switch (node.type) {
      case 'bg':
        appendLine(container, `Background: ${node.bg}`);
        current = node.next;
        break;
      case 'say':
        appendLine(container, `${node.who}: ${node.text}`);
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
      case 'sprite':
        appendLine(
          container,
          `Sprite: ${node.who} -> ${node.sprite} (${node.pos})`
        );
        current = node.next;
        break;
      case 'choice':
        appendLine(container, node.text);
        node.options.forEach((opt, i) => {
          appendLine(container, `${i + 1}. ${opt.label}`);
        });
        const option = node.options[0];
        if (option.gain) {
          for (const [key, val] of Object.entries(option.gain)) {
            state[key] = (state[key] ?? 0) + val;
          }
        }
        current = option.next;
        break;
      case 'check':
        let passed = true;
        for (const [key, val] of Object.entries(node.req)) {
          if ((state[key] ?? 0) < val) {
            passed = false;
            break;
          }
        }
        current = passed ? node.onPass : node.onFail;
        break;
      case 'sfx':
        appendLine(container, `SFX: ${node.sfx}`);
        current = node.next;
        break;
      case 'minigame':
        appendLine(container, `Minigame: ${node.id} - ${node.rules}`);
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
          appendLine(container, summary);
        }
        appendLine(container, 'The End');
        return;
      default:
        const _exhaustive: never = node;
        throw new Error(`Unknown node type: ${(_exhaustive as any).type}`);
    }
  }
}
