type Player = {
  id: number;
  gender: string | null;
  category: string | null;
  isPaused: boolean;
  genderOverride?: string | null;
};

type MatchResult = {
  teamAPlayer1Id: number;
  teamAPlayer2Id: number | null;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number | null;
};

type GenerateOptions = {
  mode: "SOCIAL" | "COMPETITIVE";
  players: Player[];
  playersPerSide: 1 | 2;
  genderType: "MIXED" | "FEMALE" | "MALE";
  queueTarget: number;
  recentPairings: Map<string, number>;
  recentOpponents: Map<string, number>;
  playerMatchCounts: Map<number, number>;
  priorityPlayerIds?: number[];
};

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function getEffectiveGender(p: Player): string {
  return p.genderOverride || p.gender || "MALE";
}

function getCategoryRank(cat: string | null): number {
  switch (cat) {
    case "A": return 4;
    case "B": return 3;
    case "C": return 2;
    case "D": return 1;
    default: return 2;
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function scorePairing(
  team: number[],
  opponents: number[],
  recentPairings: Map<string, number>,
  recentOpponents: Map<string, number>,
  playerMatchCounts: Map<number, number>,
  priorityPlayerIds?: number[]
): number {
  let score = 0;
  
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      const key = pairKey(team[i], team[j]);
      score -= (recentPairings.get(key) || 0) * 10;
    }
  }
  
  for (let i = 0; i < opponents.length; i++) {
    for (let j = i + 1; j < opponents.length; j++) {
      const key = pairKey(opponents[i], opponents[j]);
      score -= (recentPairings.get(key) || 0) * 10;
    }
  }
  
  for (const a of team) {
    for (const b of opponents) {
      const key = pairKey(a, b);
      score -= (recentOpponents.get(key) || 0) * 8;
    }
  }
  
  const allPlayers = [...team, ...opponents];
  
  const globalMin = playerMatchCounts.size > 0 
    ? Math.min(...Array.from(playerMatchCounts.values())) 
    : 0;
  
  for (const p of allPlayers) {
    const played = playerMatchCounts.get(p) || 0;
    const deficit = played - globalMin;
    score -= deficit * 15;
    score -= played * 3;
  }
  
  const matchMin = Math.min(...allPlayers.map(p => playerMatchCounts.get(p) || 0));
  const matchMax = Math.max(...allPlayers.map(p => playerMatchCounts.get(p) || 0));
  const spread = matchMax - matchMin;
  if (spread > 1) {
    score -= spread * 20;
  }
  
  if (priorityPlayerIds && priorityPlayerIds.length > 0) {
    for (const p of allPlayers) {
      if (priorityPlayerIds.includes(p)) {
        score += 50;
      }
    }
  }
  
  return score;
}

function removeUsedPlayers(pool: Player[], match: MatchResult): Player[] {
  const usedIds = new Set([match.teamAPlayer1Id, match.teamAPlayer2Id, match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[]);
  return pool.filter(p => !usedIds.has(p.id));
}

function generateSocialDoubles(opts: GenerateOptions): MatchResult[] {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds } = opts;
  let eligible = filterByGender(players, genderType);
  
  if (eligible.length < 4) return [];
  
  const results: MatchResult[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  
  for (let q = 0; q < queueTarget; q++) {
    if (eligible.length < 4) break;
    
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    
    const females = eligible.filter(p => getEffectiveGender(p) === "FEMALE");
    const males = eligible.filter(p => getEffectiveGender(p) !== "FEMALE");
    const useFemaleMatch = females.length >= 2 && Math.random() < 0.5;
    
    const candidates = generateCandidateDoubles(eligible, females, males, useFemaleMatch);
    
    for (const candidate of candidates) {
      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      const s = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds);
      if (s > bestScore) {
        bestScore = s;
        bestMatch = candidate;
      }
    }
    
    if (bestMatch) {
      results.push(bestMatch);
      updateTrackingMaps(bestMatch, localPairings, localOpponents, localCounts);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      break;
    }
  }
  
  return results;
}

function generateSocialSingles(opts: GenerateOptions): MatchResult[] {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds } = opts;
  let eligible = filterByGender(players, genderType);
  
  if (eligible.length < 2) return [];
  
  const results: MatchResult[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;
  
  for (let q = 0; q < queueTarget; q++) {
    if (eligible.length < 2) break;
    
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    
    const shuffled = shuffleArray(eligible);
    
    for (let a = 0; a < shuffled.length; a++) {
      for (let b = a + 1; b < shuffled.length; b++) {
        const key = pairKey(shuffled[a].id, shuffled[b].id);
        const oppScore = -(localOpponents.get(key) || 0) * 10;
        const countA = localCounts.get(shuffled[a].id) || 0;
        const countB = localCounts.get(shuffled[b].id) || 0;
        const deficitA = countA - globalMin;
        const deficitB = countB - globalMin;
        const countScore = -(deficitA + deficitB) * 15 - (countA + countB) * 3;
        let total = oppScore + countScore;
        
        if (priorityPlayerIds && priorityPlayerIds.length > 0) {
          if (priorityPlayerIds.includes(shuffled[a].id)) total += 50;
          if (priorityPlayerIds.includes(shuffled[b].id)) total += 50;
        }
        
        if (total > bestScore) {
          bestScore = total;
          bestMatch = {
            teamAPlayer1Id: shuffled[a].id,
            teamAPlayer2Id: null,
            teamBPlayer1Id: shuffled[b].id,
            teamBPlayer2Id: null,
          };
        }
      }
    }
    
    if (bestMatch) {
      results.push(bestMatch);
      const key = pairKey(bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id);
      localOpponents.set(key, (localOpponents.get(key) || 0) + 1);
      localCounts.set(bestMatch.teamAPlayer1Id, (localCounts.get(bestMatch.teamAPlayer1Id) || 0) + 1);
      localCounts.set(bestMatch.teamBPlayer1Id, (localCounts.get(bestMatch.teamBPlayer1Id) || 0) + 1);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      break;
    }
  }
  
  return results;
}

function generateCompetitiveDoubles(opts: GenerateOptions): MatchResult[] {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds } = opts;
  let eligible = filterByGender(players, genderType);
  
  if (eligible.length < 4) return [];
  
  const results: MatchResult[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  
  for (let q = 0; q < queueTarget; q++) {
    if (eligible.length < 4) break;
    
    const females = eligible.filter(p => getEffectiveGender(p) === "FEMALE");
    const males = eligible.filter(p => getEffectiveGender(p) !== "FEMALE");
    const sorted = [...eligible].sort((a, b) => getCategoryRank(b.category) - getCategoryRank(a.category));
    
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    
    const useFemaleMatch = females.length >= 2 && Math.random() < 0.5;
    const useExtremePairing = Math.random() < 0.15;
    
    const candidates = useExtremePairing
      ? generateExtremePairings(sorted, females, males, useFemaleMatch)
      : generateCompetitiveCandidates(sorted, females, males, useFemaleMatch);
    
    for (const candidate of candidates) {
      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      let s = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds);
      
      const catA1 = getCategoryRank(eligible.find(p => p.id === candidate.teamAPlayer1Id)?.category || null);
      const catA2 = getCategoryRank(eligible.find(p => p.id === candidate.teamAPlayer2Id)?.category || null);
      const catB1 = getCategoryRank(eligible.find(p => p.id === candidate.teamBPlayer1Id)?.category || null);
      const catB2 = getCategoryRank(eligible.find(p => p.id === candidate.teamBPlayer2Id)?.category || null);
      const teamAAvg = (catA1 + catA2) / 2;
      const teamBAvg = (catB1 + catB2) / 2;
      const diff = Math.abs(teamAAvg - teamBAvg);
      s -= diff * 3;
      
      if (s > bestScore) {
        bestScore = s;
        bestMatch = candidate;
      }
    }
    
    if (bestMatch) {
      results.push(bestMatch);
      updateTrackingMaps(bestMatch, localPairings, localOpponents, localCounts);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      break;
    }
  }
  
  return results;
}

function generateCompetitiveSingles(opts: GenerateOptions): MatchResult[] {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds } = opts;
  let eligible = filterByGender(players, genderType);
  
  if (eligible.length < 2) return [];
  
  const results: MatchResult[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;
  
  for (let q = 0; q < queueTarget; q++) {
    if (eligible.length < 2) break;
    
    const sorted = [...eligible].sort((a, b) => getCategoryRank(b.category) - getCategoryRank(a.category));
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    
    for (let a = 0; a < sorted.length; a++) {
      for (let b = a + 1; b < sorted.length; b++) {
        const catDiff = Math.abs(getCategoryRank(sorted[a].category) - getCategoryRank(sorted[b].category));
        if (catDiff > 2 && Math.random() > 0.15) continue;
        
        const key = pairKey(sorted[a].id, sorted[b].id);
        const oppScore = -(localOpponents.get(key) || 0) * 10;
        const countA = localCounts.get(sorted[a].id) || 0;
        const countB = localCounts.get(sorted[b].id) || 0;
        const deficitA = countA - globalMin;
        const deficitB = countB - globalMin;
        const countScore = -(deficitA + deficitB) * 15 - (countA + countB) * 3;
        const catScore = -catDiff * 3;
        let total = oppScore + countScore + catScore;
        
        if (priorityPlayerIds && priorityPlayerIds.length > 0) {
          if (priorityPlayerIds.includes(sorted[a].id)) total += 50;
          if (priorityPlayerIds.includes(sorted[b].id)) total += 50;
        }
        
        if (total > bestScore) {
          bestScore = total;
          bestMatch = {
            teamAPlayer1Id: sorted[a].id,
            teamAPlayer2Id: null,
            teamBPlayer1Id: sorted[b].id,
            teamBPlayer2Id: null,
          };
        }
      }
    }
    
    if (bestMatch) {
      results.push(bestMatch);
      const key = pairKey(bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id);
      localOpponents.set(key, (localOpponents.get(key) || 0) + 1);
      localCounts.set(bestMatch.teamAPlayer1Id, (localCounts.get(bestMatch.teamAPlayer1Id) || 0) + 1);
      localCounts.set(bestMatch.teamBPlayer1Id, (localCounts.get(bestMatch.teamBPlayer1Id) || 0) + 1);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      break;
    }
  }
  
  return results;
}

function filterByGender(players: Player[], genderType: string): Player[] {
  if (genderType === "FEMALE") return players.filter(p => getEffectiveGender(p) === "FEMALE");
  if (genderType === "MALE") return players.filter(p => getEffectiveGender(p) !== "FEMALE");
  return players;
}

function generateCandidateDoubles(
  eligible: Player[],
  females: Player[],
  males: Player[],
  useFemaleMatch: boolean
): MatchResult[] {
  const candidates: MatchResult[] = [];
  const shuffled = shuffleArray(eligible);
  const maxCandidates = 40;
  
  if (useFemaleMatch && females.length >= 4) {
    const fShuffled = shuffleArray(females);
    for (let i = 0; i < Math.min(fShuffled.length - 3, 5); i++) {
      candidates.push({
        teamAPlayer1Id: fShuffled[i].id,
        teamAPlayer2Id: fShuffled[i + 1].id,
        teamBPlayer1Id: fShuffled[i + 2].id,
        teamBPlayer2Id: fShuffled[i + 3].id,
      });
    }
  } else if (useFemaleMatch && females.length >= 2 && males.length >= 2) {
    const fShuffled = shuffleArray(females);
    const strongMales = [...males].sort((a, b) => getCategoryRank(b.category) - getCategoryRank(a.category));
    const mShuffled = shuffleArray(strongMales.slice(0, Math.max(4, strongMales.length)));
    
    for (let i = 0; i < Math.min(fShuffled.length, 3); i++) {
      for (let j = 0; j < Math.min(mShuffled.length, 4); j++) {
        const f2 = fShuffled[(i + 1) % fShuffled.length];
        const m2 = mShuffled[(j + 1) % mShuffled.length];
        if (new Set([fShuffled[i].id, mShuffled[j].id, f2.id, m2.id]).size === 4) {
          candidates.push({
            teamAPlayer1Id: fShuffled[i].id,
            teamAPlayer2Id: mShuffled[j].id,
            teamBPlayer1Id: f2.id,
            teamBPlayer2Id: m2.id,
          });
        }
      }
    }
  }
  
  for (let attempt = 0; attempt < maxCandidates && candidates.length < maxCandidates; attempt++) {
    const s = shuffleArray(shuffled);
    if (s.length >= 4 && new Set([s[0].id, s[1].id, s[2].id, s[3].id]).size === 4) {
      candidates.push({
        teamAPlayer1Id: s[0].id,
        teamAPlayer2Id: s[1].id,
        teamBPlayer1Id: s[2].id,
        teamBPlayer2Id: s[3].id,
      });
    }
  }
  
  return candidates;
}

function generateCompetitiveCandidates(
  sorted: Player[],
  females: Player[],
  males: Player[],
  useFemaleMatch: boolean
): MatchResult[] {
  const candidates: MatchResult[] = [];
  
  if (useFemaleMatch && females.length >= 2) {
    const femCandidates = generateCandidateDoubles(sorted, females, males, true);
    candidates.push(...femCandidates);
  }
  
  for (let attempt = 0; attempt < 40; attempt++) {
    const groupSize = Math.min(sorted.length, 6);
    const startIdx = Math.floor(Math.random() * Math.max(1, sorted.length - groupSize + 1));
    const group = shuffleArray(sorted.slice(startIdx, startIdx + groupSize));
    
    if (group.length >= 4 && new Set([group[0].id, group[1].id, group[2].id, group[3].id]).size === 4) {
      candidates.push({
        teamAPlayer1Id: group[0].id,
        teamAPlayer2Id: group[1].id,
        teamBPlayer1Id: group[2].id,
        teamBPlayer2Id: group[3].id,
      });
    }
  }
  
  return candidates;
}

function generateExtremePairings(
  sorted: Player[],
  females: Player[],
  males: Player[],
  useFemaleMatch: boolean
): MatchResult[] {
  const candidates: MatchResult[] = [];
  
  if (sorted.length < 4) return candidates;
  
  const top = sorted.slice(0, Math.ceil(sorted.length / 2));
  const bottom = sorted.slice(Math.ceil(sorted.length / 2));
  
  for (let i = 0; i < 20; i++) {
    const tShuf = shuffleArray(top);
    const bShuf = shuffleArray(bottom.length >= 2 ? bottom : sorted);
    
    if (tShuf.length >= 2 && bShuf.length >= 2) {
      const ids = new Set([tShuf[0].id, bShuf[0].id, tShuf[1].id, bShuf[1].id]);
      if (ids.size === 4) {
        candidates.push({
          teamAPlayer1Id: tShuf[0].id,
          teamAPlayer2Id: bShuf[0].id,
          teamBPlayer1Id: tShuf[1].id,
          teamBPlayer2Id: bShuf[1].id,
        });
      }
    }
  }
  
  return candidates;
}

function updateTrackingMaps(
  match: MatchResult,
  pairings: Map<string, number>,
  opponents: Map<string, number>,
  counts: Map<number, number>
) {
  if (match.teamAPlayer2Id) {
    const teamAKey = pairKey(match.teamAPlayer1Id, match.teamAPlayer2Id);
    pairings.set(teamAKey, (pairings.get(teamAKey) || 0) + 1);
  }
  if (match.teamBPlayer2Id) {
    const teamBKey = pairKey(match.teamBPlayer1Id, match.teamBPlayer2Id);
    pairings.set(teamBKey, (pairings.get(teamBKey) || 0) + 1);
  }
  
  const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[];
  const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
  for (const a of teamA) {
    for (const b of teamB) {
      const key = pairKey(a, b);
      opponents.set(key, (opponents.get(key) || 0) + 1);
    }
  }
  
  for (const pid of [...teamA, ...teamB]) {
    counts.set(pid, (counts.get(pid) || 0) + 1);
  }
}

export function replacePlayerInQueuedMatches(
  queuedMatches: { id: number; teamAPlayer1Id: number; teamAPlayer2Id: number | null; teamBPlayer1Id: number; teamBPlayer2Id: number | null }[],
  pausedPlayerId: number,
  availablePlayers: Player[]
): { matchId: number; position: string; newPlayerId: number }[] {
  const replacements: { matchId: number; position: string; newPlayerId: number }[] = [];
  const usedReplacements = new Set<number>();
  
  for (const match of queuedMatches) {
    const positions = [
      { field: "teamAPlayer1Id" as const, id: match.teamAPlayer1Id },
      { field: "teamAPlayer2Id" as const, id: match.teamAPlayer2Id },
      { field: "teamBPlayer1Id" as const, id: match.teamBPlayer1Id },
      { field: "teamBPlayer2Id" as const, id: match.teamBPlayer2Id },
    ];
    
    for (const pos of positions) {
      if (pos.id === pausedPlayerId) {
        const matchPlayerIds = new Set(positions.map(p => p.id).filter(Boolean));
        const replacement = availablePlayers.find(p => 
          !p.isPaused && 
          p.id !== pausedPlayerId && 
          !matchPlayerIds.has(p.id) && 
          !usedReplacements.has(p.id)
        );
        
        if (replacement) {
          replacements.push({ matchId: match.id, position: pos.field, newPlayerId: replacement.id });
          usedReplacements.add(replacement.id);
        }
      }
    }
  }
  
  return replacements;
}

export function buildPairingHistory(
  matches: { teamAPlayer1Id: number; teamAPlayer2Id: number | null; teamBPlayer1Id: number; teamBPlayer2Id: number | null; status: string }[]
): { recentPairings: Map<string, number>; recentOpponents: Map<string, number>; playerMatchCounts: Map<number, number> } {
  const recentPairings = new Map<string, number>();
  const recentOpponents = new Map<string, number>();
  const playerMatchCounts = new Map<number, number>();
  
  for (const match of matches) {
    const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[];
    const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
    
    if (teamA.length === 2) {
      const key = pairKey(teamA[0], teamA[1]);
      recentPairings.set(key, (recentPairings.get(key) || 0) + 1);
    }
    if (teamB.length === 2) {
      const key = pairKey(teamB[0], teamB[1]);
      recentPairings.set(key, (recentPairings.get(key) || 0) + 1);
    }
    
    for (const a of teamA) {
      for (const b of teamB) {
        const key = pairKey(a, b);
        recentOpponents.set(key, (recentOpponents.get(key) || 0) + 1);
      }
    }
    
    for (const pid of [...teamA, ...teamB]) {
      playerMatchCounts.set(pid, (playerMatchCounts.get(pid) || 0) + 1);
    }
  }
  
  return { recentPairings, recentOpponents, playerMatchCounts };
}

export function generateSmartMatches(opts: GenerateOptions): MatchResult[] {
  const { mode, playersPerSide } = opts;
  
  if (mode === "SOCIAL") {
    return playersPerSide === 1 ? generateSocialSingles(opts) : generateSocialDoubles(opts);
  } else {
    return playersPerSide === 1 ? generateCompetitiveSingles(opts) : generateCompetitiveDoubles(opts);
  }
}
