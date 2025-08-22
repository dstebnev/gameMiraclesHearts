import { autoSave } from '../save.js';
function appendLine(container, text) {
    const p = document.createElement('p');
    p.textContent = text;
    container.appendChild(p);
}
function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
function checkReq(req, state) {
    var _a;
    if (!req)
        return true;
    for (const [key, val] of Object.entries(req)) {
        if (((_a = state[key]) !== null && _a !== void 0 ? _a : 0) < val)
            return false;
    }
    return true;
}
function applyGain(gain, state) {
    var _a;
    if (!gain)
        return;
    for (const [key, val] of Object.entries(gain)) {
        state[key] = ((_a = state[key]) !== null && _a !== void 0 ? _a : 0) + val;
    }
}
function describeCost(gain, meta) {
    const parts = [];
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
async function presentChoices(options, state, container) {
    container.innerHTML = '';
    return new Promise((resolve) => {
        options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.textContent = opt.label + describeCost(opt.gain, opt.meta);
            const ok = checkReq(opt.req, state);
            if (!ok)
                btn.disabled = true;
            btn.addEventListener('click', () => {
                if (!checkReq(opt.req, state))
                    return;
                container.innerHTML = '';
                resolve(opt);
            });
            container.appendChild(btn);
        });
    });
}
export async function runEpisode(ep, container, startNode = ep.start, initialState = {}) {
    var _a;
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
    const sprites = new Map();
    const musicAudio = new Audio();
    musicAudio.loop = true;
    const sfxAudio = new Audio();
    const state = { ...initialState };
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
                musicAudio.play().catch(() => { });
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
                        state[key] = ((_a = state[key]) !== null && _a !== void 0 ? _a : 0) + delta;
                    }
                    else {
                        state[key] = value;
                    }
                }
                current = node.next;
                break;
            case 'sprite': {
                const url = new URL(`../../assets/characters/${node.sprite}.png`, import.meta.url).href;
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
                if (node.pos === 'left')
                    img.style.left = '0';
                else if (node.pos === 'right')
                    img.style.right = '0';
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
                sfxAudio.play().catch(() => { });
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
                        var _a;
                        return String((_a = state[k]) !== null && _a !== void 0 ? _a : 0);
                    });
                    appendLine(log, summary);
                }
                appendLine(log, 'The End');
                current = '';
                break;
            default: {
                const _exhaustive = node;
                throw new Error(`Unknown node type: ${_exhaustive.type}`);
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
