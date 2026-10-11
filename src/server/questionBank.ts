// SERVER-SIDE ONLY. Answer keys and traps must never be bundled in a production client.
// (This demo ships it in-app because the backend is mocked; src/server/ is the part you move to Fastify.)
export interface BankQuestion {
  id: number;
  kind: 'emoji' | 'plot' | 'quote';
  prompt: string;
  options: [string, string, string, string];
  answer: number;
  honeypot?: { trap: number }; // the classic wrong answer an LLM / search engine returns
}

export const BANK: BankQuestion[] = [
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
  { id: 15, kind: 'emoji', prompt: '🎈🏠👴👦', options: ['Up', 'Coco', 'Big Fish', 'Soul'], answer: 0 },
  // Honeypots: phrased so the famous misquote is wrong. Real players read carefully; scripts pick the trap.
  { id: 101, kind: 'quote', prompt: 'Casablanca: which line is ACTUALLY spoken in the film?', options: ['"Play it again, Sam"', '"Play it, Sam"', '"Sing it again, Sam"', '"Play that song, Sam"'], answer: 1, honeypot: { trap: 0 } },
  { id: 102, kind: 'quote', prompt: 'The Empire Strikes Back: Vader’s actual reveal line is…', options: ['"Luke, I am your father"', '"No, I am your father"', '"Luke, I’m your dad"', '"Search your feelings, I am your father"'], answer: 1, honeypot: { trap: 0 } },
];
