export interface Question {
  id: number;
  kind: 'emoji' | 'plot';
  prompt: string;
  options: [string, string, string, string];
  answer: number; // index into options
}

// Demo bank. In production the server serves questions per session and keeps the answer key private.
export const QUESTIONS: Question[] = [
  { id: 1, kind: 'emoji', prompt: '🦈🏖️🚤', options: ['Jaws', 'Finding Nemo', 'Deep Blue Sea', 'The Meg'], answer: 0 },
  { id: 2, kind: 'emoji', prompt: '🧙‍♂️💍🌋', options: ['Harry Potter', 'The Lord of the Rings', 'Willow', 'Eragon'], answer: 1 },
  { id: 3, kind: 'emoji', prompt: '🚢🧊❤️', options: ['Poseidon', 'Titanic', 'Cast Away', 'The Abyss'], answer: 1 },
  { id: 4, kind: 'emoji', prompt: '🤖🔫🕶️', options: ['I, Robot', 'The Matrix', 'Tron', 'Blade Runner'], answer: 1 },
  { id: 5, kind: 'emoji', prompt: '🦁👑🌅', options: ['Madagascar', 'The Lion King', 'Tarzan', 'Zootopia'], answer: 1 },
  { id: 6, kind: 'plot', prompt: 'A thief enters people’s dreams to plant an idea.', options: ['Inception', 'Paprika', 'The Cell', 'Dreamcatcher'], answer: 0 },
  { id: 7, kind: 'plot', prompt: 'A hacker learns reality is a simulation run by machines.', options: ['Ghost in the Shell', 'The Matrix', 'Hackers', 'Johnny Mnemonic'], answer: 1 },
  { id: 8, kind: 'plot', prompt: 'A toy cowboy fears being replaced by a space ranger.', options: ['Toy Story', 'Cars', 'Wall-E', 'Up'], answer: 0 },
  { id: 9, kind: 'plot', prompt: 'A replicant hunter chases synthetic humans in rainy Los Angeles, 2019.', options: ['Minority Report', 'Total Recall', 'Blade Runner', 'Robocop'], answer: 2 },
  { id: 10, kind: 'plot', prompt: 'A rat who loves cooking teams up with a clumsy kitchen worker in Paris.', options: ['Ratatouille', 'Flushed Away', 'Stuart Little', 'Chef'], answer: 0 },
  { id: 11, kind: 'emoji', prompt: '🕷️🕸️🏙️', options: ['Ant-Man', 'Spider-Man', 'Arachnophobia', 'Venom'], answer: 1 },
  { id: 12, kind: 'emoji', prompt: '🚀🌌🥔', options: ['Gravity', 'Interstellar', 'The Martian', 'Moon'], answer: 2 },
  { id: 13, kind: 'emoji', prompt: '🦇🌃🃏', options: ['Batman Begins', 'The Dark Knight', 'Joker', 'Catwoman'], answer: 1 },
  { id: 14, kind: 'plot', prompt: 'A cyberpunk animated classic where a biker gang leader gains psychic powers in Neo-Tokyo.', options: ['Akira', 'Perfect Blue', 'Ninja Scroll', 'Appleseed'], answer: 0 },
];

export function pickQuestions(seed: number, count = 5): Question[] {
  let t = seed >>> 0;
  const rnd = () => {
    t = (t + 0x9e3779b9) >>> 0;
    let r = Math.imul(t ^ (t >>> 16), 0x85ebca6b);
    r = Math.imul(r ^ (r >>> 13), 0xc2b2ae35);
    return ((r ^ (r >>> 16)) >>> 0) / 4294967296;
  };
  return QUESTIONS.map((q) => ({ q, k: rnd() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, count)
    .map((x) => x.q);
}
