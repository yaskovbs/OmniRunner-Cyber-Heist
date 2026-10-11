// Directions as bitmask: N=1, E=2, S=4, W=8
export const N = 1, E = 2, S = 4, W = 8;
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const BITS = [N, E, S, W];
const OPP = (b: number) => ((b << 2) | (b >> 2)) & 15;

export interface Board {
  size: number;
  tiles: number[]; // row-major bitmasks
}

export const rotate = (m: number) => ((m << 1) | (m >> 3)) & 15;

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random self-avoiding path from top-left to bottom-right via randomized DFS. */
function carvePath(size: number, rnd: () => number): number[] {
  const target = size * size - 1;
  const seen = new Set<number>([0]);
  const path = [0];
  const dfs = (cur: number): boolean => {
    if (cur === target) return true;
    const r = Math.floor(cur / size), c = cur % size;
    const order = [0, 1, 2, 3].sort(() => rnd() - 0.5);
    for (const d of order) {
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const n = nr * size + nc;
      if (seen.has(n)) continue;
      seen.add(n);
      path.push(n);
      if (dfs(n)) return true;
      path.pop();
    }
    return false;
  };
  dfs(0);
  return path;
}

export function powered(board: Board): Set<number> {
  const { size, tiles } = board;
  const lit = new Set<number>();
  if (!(tiles[0] & W)) return lit;
  const stack = [0];
  lit.add(0);
  while (stack.length) {
    const cur = stack.pop()!;
    const r = Math.floor(cur / size), c = cur % size;
    for (let d = 0; d < 4; d++) {
      if (!(tiles[cur] & BITS[d])) continue;
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const n = nr * size + nc;
      if (!lit.has(n) && tiles[n] & OPP(BITS[d])) {
        lit.add(n);
        stack.push(n);
      }
    }
  }
  return lit;
}

export const isSolved = (board: Board) => {
  const last = board.size * board.size - 1;
  return powered(board).has(last) && !!(board.tiles[last] & E);
};

export function generateBoard(size: number, seed: number): Board {
  const rnd = rng(seed);
  const path = carvePath(size, rnd);
  const tiles = new Array(size * size).fill(0);
  path.forEach((cell, i) => {
    let m = 0;
    const r = Math.floor(cell / size), c = cell % size;
    const link = (other: number) => {
      const orr = Math.floor(other / size), oc = other % size;
      for (let d = 0; d < 4; d++) if (r + DR[d] === orr && c + DC[d] === oc) m |= BITS[d];
    };
    if (i === 0) m |= W;
    else link(path[i - 1]);
    if (i === path.length - 1) m |= E;
    else link(path[i + 1]);
    tiles[cell] = m;
  });
  const onPath = new Set(path);
  for (let i = 0; i < tiles.length; i++) {
    if (!onPath.has(i)) {
      const kinds = [N | S, N | E, N | E | S, 0, E | W];
      tiles[i] = kinds[Math.floor(rnd() * kinds.length)];
    }
  }
  let board: Board = { size, tiles };
  do {
    board = { size, tiles: tiles.map((m) => { let x = m; for (let k = Math.floor(rnd() * 4); k > 0; k--) x = rotate(x); return x; }) };
  } while (isSolved(board));
  return board;
}
