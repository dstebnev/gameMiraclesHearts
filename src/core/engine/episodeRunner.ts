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

export function runEpisode(ep: Episode): void {
  let current = ep.start;
  while (current) {
    const node = ep.nodes[current];
    if (!node) {
      throw new Error(`Node ${current} not found`);
    }
    switch (node.type) {
      case 'bg':
        console.log(`Background: ${node.bg}`);
        current = node.next;
        break;
      case 'say':
        console.log(`${node.who}: ${node.text}`);
        current = node.next;
        break;
      case 'end':
        console.log('The End');
        return;
    }
  }
}
