export interface Dungeon {
  id: string;
  name: string;
  difficulty: 'NOVICE' | 'ADEPT' | 'EXPERT' | 'LEGENDARY';
  apy: number;
  liquidity: number;
  whalePercent: number;
  stability: number;
  difficultyScore: number;
  xpReward: number;
  artifact?: string;
  lore: string;
}

export interface DungeonResult {
  success: boolean;
  xpGained: number;
  artifact?: string;
  message: string;
  damageDealt: number;
  bossHP: number;
}

const ARTIFACTS = [
  'Sigil of Eternal Yield',
  'Rune of Whale Warning',
  'Crystal of Liquidity',
  'Tome of Risk Mastery',
  'Amulet of Signal Truth',
  'Staff of APY Alchemy',
  'Crown of the Nexus',
  'Shield of Stability',
];

const DUNGEON_LORE = [
  'Ancient vaults sealed since the first epoch of DeFi.',
  'Where shadow liquidity flows and whale spirits roam.',
  'A labyrinth of yield curves and unstable runes.',
  'The deepest treasury, guarded by protocol demons.',
  'Whispers of 1000x echo through these stone corridors.',
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateDungeons(): Dungeon[] {
  const dungeonNames = [
    'Vault of Forgotten Yields',
    'Crypt of the Whale Lords',
    'Abyss of Impermanent Loss',
    'Citadel of 1000x Promises',
    'Tomb of Rug Protocol',
    'Sanctum of Liquid Shadows',
    'Tower of Infinite APY',
    'Cave of the Oracle',
  ];

  return dungeonNames.map((name, i) => {
    const seed = `dungeon_${i}`;
    const h = hash(seed);

    const apy = 10 + (h % 190);
    const liquidity = 0.5 + (h % 50);
    const whalePercent = 10 + (h % 70);
    const stability = 20 + (h % 70);

    const difficultyScore = Math.floor(
      (apy / 2) * 0.3 + whalePercent * 0.4 + (100 - stability) * 0.3
    );

    let difficulty: Dungeon['difficulty'];
    if (difficultyScore < 25) difficulty = 'NOVICE';
    else if (difficultyScore < 50) difficulty = 'ADEPT';
    else if (difficultyScore < 75) difficulty = 'EXPERT';
    else difficulty = 'LEGENDARY';

    const xpReward = 30 + difficultyScore * 3;

    return {
      id: `dungeon_${i}`,
      name,
      difficulty,
      apy,
      liquidity,
      whalePercent,
      stability,
      difficultyScore,
      xpReward,
      artifact: h % 3 === 0 ? ARTIFACTS[h % ARTIFACTS.length] : undefined,
      lore: DUNGEON_LORE[h % DUNGEON_LORE.length],
    };
  });
}

export function enterDungeon(dungeon: Dungeon, playerLevel: number): DungeonResult {
  const seed = `${dungeon.id}_${playerLevel}_${Date.now().toString().slice(0, -4)}`;
  const h = hash(seed);
  const roll = (h % 1000) / 1000;

  const levelAdvantage = Math.min(playerLevel * 0.05, 0.4);
  const successChance = Math.max(0.2, 1 - (dungeon.difficultyScore / 100) + levelAdvantage);

  const success = roll < successChance;
  const damageDealt = Math.floor(roll * 100 + playerLevel * 10);
  const bossHP = 100 + dungeon.difficultyScore * 5;

  const xpGained = success ? dungeon.xpReward : Math.floor(dungeon.xpReward * 0.2);
  const artifact = success && dungeon.artifact ? dungeon.artifact : undefined;

  const winMessages = [
    `The dungeon yields its secrets. ${dungeon.name} conquered!`,
    `Runes shattered — victory carved into the blockchain!`,
    `The oracle's blessing guided you through ${dungeon.name}.`,
  ];

  const loseMessages = [
    `The vault's guardians proved too powerful. Retreat!`,
    `Dark energies overwhelmed your signal runes. Try again.`,
    `${dungeon.name} resists your intrusion. Level up first.`,
  ];

  const messages = success ? winMessages : loseMessages;
  const msg = messages[h % messages.length];

  return { success, xpGained, artifact, message: msg, damageDealt, bossHP };
}
