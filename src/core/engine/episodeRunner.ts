export type Node =
  | { type: 'bg'; bg: string; next: string }
  | { type: 'say'; who: string; text: string; next: string }
  | { type: 'end' };

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
      case 'end':
        appendLine(container, 'The End');
        return;
    }
  }
}
