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

type FixedPair = [number, number];

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
  fixedPairs?: FixedPair[];
};

type GenerateResult = {
  matches: MatchResult[];
  pairConstraintBlocked?: boolean;
  pairConstraintMessage?: string;
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

function isStrongPlayer(cat: string | null): boolean {
  const rank = getCategoryRank(cat);
  return rank >= 3;
}

function isWeakPlayer(cat: string | null): boolean {
  const rank = getCategoryRank(cat);
  return rank <= 1;
}

function getFixedPartner(playerId: number, fixedPairs: FixedPair[]): number | null {
  for (const [a, b] of fixedPairs) {
    if (a === playerId) return b;
    if (b === playerId) return a;
  }
  return null;
}

function isInFixedPair(playerId: number, fixedPairs: FixedPair[]): boolean {
  return getFixedPartner(playerId, fixedPairs) !== null;
}

function candidateRespectsFixedPairs(candidate: MatchResult, fixedPairs: FixedPair[]): boolean {
  if (!fixedPairs || fixedPairs.length === 0) return true;

  const teamA = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id].filter(Boolean) as number[];
  const teamB = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  const allPlayers = [...teamA, ...teamB];

  for (const [p1, p2] of fixedPairs) {
    const p1InMatch = allPlayers.includes(p1);
    const p2InMatch = allPlayers.includes(p2);

    if (p1InMatch && p2InMatch) {
      const p1InA = teamA.includes(p1);
      const p2InA = teamA.includes(p2);
      const p1InB = teamB.includes(p1);
      const p2InB = teamB.includes(p2);

      if (!((p1InA && p2InA) || (p1InB && p2InB))) {
        return false;
      }
    }

    if (p1InMatch !== p2InMatch) {
      return false;
    }
  }

  return true;
}

function opponentPairKey(teamA: number[], teamB: number[]): string {
  const sortedA = [...teamA].sort((a, b) => a - b);
  const sortedB = [...teamB].sort((a, b) => a - b);
  return `${sortedA.join(",")}_vs_${sortedB.join(",")}`;
}

function scorePairing(
  team: number[],
  opponents: number[],
  recentPairings: Map<string, number>,
  recentOpponents: Map<string, number>,
  playerMatchCounts: Map<number, number>,
  priorityPlayerIds?: number[],
  playerPool?: Player[],
  fixedPairs?: FixedPair[]
): number {
  let score = 0;
  
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      const key = pairKey(team[i], team[j]);
      const isFixed = fixedPairs?.some(([a, b]) => 
        (a === team[i] && b === team[j]) || (a === team[j] && b === team[i])
      );
      if (!isFixed) {
        score -= (recentPairings.get(key) || 0) * 10;
      }
    }
  }
  
  for (let i = 0; i < opponents.length; i++) {
    for (let j = i + 1; j < opponents.length; j++) {
      const key = pairKey(opponents[i], opponents[j]);
      const isFixed = fixedPairs?.some(([a, b]) => 
        (a === opponents[i] && b === opponents[j]) || (a === opponents[j] && b === opponents[i])
      );
      if (!isFixed) {
        score -= (recentPairings.get(key) || 0) * 10;
      }
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
  
  if (playerPool && playerPool.length > 0) {
    const getPlayer = (id: number) => playerPool.find(p => p.id === id);
    
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const p1 = getPlayer(team[i]);
        const p2 = getPlayer(team[j]);
        if (p1 && p2) {
          const p1Female = getEffectiveGender(p1) === "FEMALE";
          const p2Female = getEffectiveGender(p2) === "FEMALE";
          if (p1Female !== p2Female) {
            const female = p1Female ? p1 : p2;
            const male = p1Female ? p2 : p1;
            if (isStrongPlayer(male.category)) {
              score += 12;
            }
            if (isWeakPlayer(male.category) && !isWeakPlayer(female.category)) {
              score -= 8;
            }
          }
        }
      }
    }
    
    for (let i = 0; i < opponents.length; i++) {
      for (let j = i + 1; j < opponents.length; j++) {
        const p1 = getPlayer(opponents[i]);
        const p2 = getPlayer(opponents[j]);
        if (p1 && p2) {
          const p1Female = getEffectiveGender(p1) === "FEMALE";
          const p2Female = getEffectiveGender(p2) === "FEMALE";
          if (p1Female !== p2Female) {
            const female = p1Female ? p1 : p2;
            const male = p1Female ? p2 : p1;
            if (isStrongPlayer(male.category)) {
              score += 12;
            }
            if (isWeakPlayer(male.category) && !isWeakPlayer(female.category)) {
              score -= 8;
            }
          }
        }
      }
    }
    
    const teamPlayers = team.map(id => getPlayer(id)).filter(Boolean) as Player[];
    const oppPlayers = opponents.map(id => getPlayer(id)).filter(Boolean) as Player[];
    const teamFemales = teamPlayers.filter(p => getEffectiveGender(p) === "FEMALE").length;
    const oppFemales = oppPlayers.filter(p => getEffectiveGender(p) === "FEMALE").length;
    if (teamFemales >= 2 && oppFemales >= 2) {
      score += 15;
    } else if (teamFemales >= 1 && oppFemales >= 1) {
      score += 5;
    }
  }
  
  return score;
}

function removeUsedPlayers(pool: Player[], match: MatchResult): Player[] {
  const usedIds = new Set([match.teamAPlayer1Id, match.teamAPlayer2Id, match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[]);
  return pool.filter(p => !usedIds.has(p.id));
}

function generatePairAwareCandidateDoubles(
  eligible: Player[],
  fixedPairs: FixedPair[]
): MatchResult[] {
  const candidates: MatchResult[] = [];
  const maxCandidates = 80;

  const activePairs: FixedPair[] = fixedPairs.filter(([a, b]) =>
    eligible.some(p => p.id === a) && eligible.some(p => p.id === b)
  );

  const pairedPlayerIds = new Set<number>();
  for (const [a, b] of activePairs) {
    pairedPlayerIds.add(a);
    pairedPlayerIds.add(b);
  }
  const singles = eligible.filter(p => !pairedPlayerIds.has(p.id));

  type TeamUnit = { player1Id: number; player2Id: number };

  const pairUnits: TeamUnit[] = activePairs.map(([a, b]) => ({ player1Id: a, player2Id: b }));

  const singlePairUnits: TeamUnit[] = [];
  const shuffledSingles = shuffleArray(singles);
  for (let i = 0; i + 1 < shuffledSingles.length; i += 2) {
    singlePairUnits.push({ player1Id: shuffledSingles[i].id, player2Id: shuffledSingles[i + 1].id });
  }

  const allTeamUnits = [...pairUnits, ...singlePairUnits];

  for (let i = 0; i < allTeamUnits.length && candidates.length < maxCandidates; i++) {
    for (let j = i + 1; j < allTeamUnits.length && candidates.length < maxCandidates; j++) {
      const teamA = allTeamUnits[i];
      const teamB = allTeamUnits[j];
      const ids = new Set([teamA.player1Id, teamA.player2Id, teamB.player1Id, teamB.player2Id]);
      if (ids.size === 4) {
        candidates.push({
          teamAPlayer1Id: teamA.player1Id,
          teamAPlayer2Id: teamA.player2Id,
          teamBPlayer1Id: teamB.player1Id,
          teamBPlayer2Id: teamB.player2Id,
        });
      }
    }
  }

  if (activePairs.length > 0 && singles.length >= 2) {
    for (const [pairA, pairB] of activePairs) {
      const shuffled = shuffleArray(singles);
      for (let i = 0; i + 1 < shuffled.length && candidates.length < maxCandidates; i += 2) {
        candidates.push({
          teamAPlayer1Id: pairA,
          teamAPlayer2Id: pairB,
          teamBPlayer1Id: shuffled[i].id,
          teamBPlayer2Id: shuffled[i + 1].id,
        });
      }
      for (let a = 0; a < shuffled.length && candidates.length < maxCandidates; a++) {
        for (let b = a + 1; b < shuffled.length && candidates.length < maxCandidates; b++) {
          const ids = new Set([pairA, pairB, shuffled[a].id, shuffled[b].id]);
          if (ids.size === 4) {
            candidates.push({
              teamAPlayer1Id: pairA,
              teamAPlayer2Id: pairB,
              teamBPlayer1Id: shuffled[a].id,
              teamBPlayer2Id: shuffled[b].id,
            });
          }
        }
      }
    }
  }

  for (let attempt = 0; attempt < 30 && candidates.length < maxCandidates; attempt++) {
    const s = shuffleArray(eligible);
    if (s.length >= 4 && new Set([s[0].id, s[1].id, s[2].id, s[3].id]).size === 4) {
      const candidate: MatchResult = {
        teamAPlayer1Id: s[0].id,
        teamAPlayer2Id: s[1].id,
        teamBPlayer1Id: s[2].id,
        teamBPlayer2Id: s[3].id,
      };
      if (candidateRespectsFixedPairs(candidate, fixedPairs)) {
        candidates.push(candidate);
      }
    }
  }

  return candidates.filter(c => candidateRespectsFixedPairs(c, fixedPairs));
}

function generateSocialDoubles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, fixedPairs } = opts;
  let eligible = filterByGender(players, genderType);
  
  if (eligible.length < 4) return { matches: [] };
  
  const results: MatchResult[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  
  const hasFixedPairs = fixedPairs && fixedPairs.length > 0;
  
  for (let q = 0; q < queueTarget; q++) {
    if (eligible.length < 4) break;
    
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    
    let candidates: MatchResult[];
    if (hasFixedPairs) {
      candidates = generatePairAwareCandidateDoubles(eligible, fixedPairs!);
    } else {
      const females = eligible.filter(p => getEffectiveGender(p) === "FEMALE");
      const males = eligible.filter(p => getEffectiveGender(p) !== "FEMALE");
      const femaleProbability = females.length >= 4 ? 0.7 : females.length >= 2 ? 0.55 : 0.3;
      const useFemaleMatch = females.length >= 2 && Math.random() < femaleProbability;
      candidates = generateCandidateDoubles(eligible, females, males, useFemaleMatch);
    }
    
    for (const candidate of candidates) {
      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      const s = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);
      if (s > bestScore) {
        bestScore = s;
        bestMatch = candidate;
      }
    }
    
    if (bestMatch) {
      if (hasFixedPairs) {
        const teamA = [bestMatch.teamAPlayer1Id, bestMatch.teamAPlayer2Id!].sort((a, b) => a - b);
        const teamB = [bestMatch.teamBPlayer1Id, bestMatch.teamBPlayer2Id!].sort((a, b) => a - b);
        const matchupKey = opponentPairKey(teamA, teamB);
        const reverseKey = opponentPairKey(teamB, teamA);

        const lastMatchOpponentKeys: string[] = [];
        for (const prevMatch of results) {
          const prevA = [prevMatch.teamAPlayer1Id, prevMatch.teamAPlayer2Id!].sort((a, b) => a - b);
          const prevB = [prevMatch.teamBPlayer1Id, prevMatch.teamBPlayer2Id!].sort((a, b) => a - b);
          lastMatchOpponentKeys.push(opponentPairKey(prevA, prevB));
          lastMatchOpponentKeys.push(opponentPairKey(prevB, prevA));
        }

        if (lastMatchOpponentKeys.includes(matchupKey) || lastMatchOpponentKeys.includes(reverseKey)) {
          const alternativeCandidates = candidates.filter(c => {
            const cA = [c.teamAPlayer1Id, c.teamAPlayer2Id!].sort((a, b) => a - b);
            const cB = [c.teamBPlayer1Id, c.teamBPlayer2Id!].sort((a, b) => a - b);
            const cKey = opponentPairKey(cA, cB);
            const cRevKey = opponentPairKey(cB, cA);
            return !lastMatchOpponentKeys.includes(cKey) && !lastMatchOpponentKeys.includes(cRevKey) &&
                   cKey !== matchupKey && cRevKey !== reverseKey;
          });

          let altBest: MatchResult | null = null;
          let altBestScore = -Infinity;
          for (const alt of alternativeCandidates) {
            const team = [alt.teamAPlayer1Id, alt.teamAPlayer2Id!];
            const opp = [alt.teamBPlayer1Id, alt.teamBPlayer2Id!];
            const s = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);
            if (s > altBestScore) {
              altBestScore = s;
              altBest = alt;
            }
          }

          if (altBest) {
            bestMatch = altBest;
          } else {
            return {
              matches: results,
              pairConstraintBlocked: true,
              pairConstraintMessage: "Not enough available players to create a different opponent pairing. Waiting for a current match to finish to allow new combinations.",
            };
          }
        }
      }

      results.push(bestMatch);
      updateTrackingMaps(bestMatch, localPairings, localOpponents, localCounts);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      if (hasFixedPairs && results.length === 0) {
        return {
          matches: [],
          pairConstraintBlocked: true,
          pairConstraintMessage: "Not enough available players to create a different opponent pairing. Waiting for a current match to finish to allow new combinations.",
        };
      }
      break;
    }
  }
  
  return { matches: results };
}

function generateSocialSingles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds } = opts;
  let eligible = filterByGender(players, genderType);
  
  if (eligible.length < 2) return { matches: [] };
  
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
  
  return { matches: results };
}

function generateCompetitiveDoubles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, fixedPairs } = opts;
  let eligible = filterByGender(players, genderType);
  
  if (eligible.length < 4) return { matches: [] };
  
  const results: MatchResult[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  
  const hasFixedPairs = fixedPairs && fixedPairs.length > 0;
  
  for (let q = 0; q < queueTarget; q++) {
    if (eligible.length < 4) break;
    
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    
    let candidates: MatchResult[];
    if (hasFixedPairs) {
      candidates = generatePairAwareCandidateDoubles(eligible, fixedPairs!);
    } else {
      const females = eligible.filter(p => getEffectiveGender(p) === "FEMALE");
      const males = eligible.filter(p => getEffectiveGender(p) !== "FEMALE");
      const sorted = [...eligible].sort((a, b) => getCategoryRank(b.category) - getCategoryRank(a.category));
      const femaleProbability = females.length >= 4 ? 0.7 : females.length >= 2 ? 0.55 : 0.3;
      const useFemaleMatch = females.length >= 2 && Math.random() < femaleProbability;
      const useExtremePairing = Math.random() < 0.15;
      candidates = useExtremePairing
        ? generateExtremePairings(sorted, females, males, useFemaleMatch)
        : generateCompetitiveCandidates(sorted, females, males, useFemaleMatch);
    }
    
    for (const candidate of candidates) {
      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      let s = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);
      
      if (!hasFixedPairs) {
        const catA1 = getCategoryRank(eligible.find(p => p.id === candidate.teamAPlayer1Id)?.category || null);
        const catA2 = getCategoryRank(eligible.find(p => p.id === candidate.teamAPlayer2Id)?.category || null);
        const catB1 = getCategoryRank(eligible.find(p => p.id === candidate.teamBPlayer1Id)?.category || null);
        const catB2 = getCategoryRank(eligible.find(p => p.id === candidate.teamBPlayer2Id)?.category || null);
        const teamAAvg = (catA1 + catA2) / 2;
        const teamBAvg = (catB1 + catB2) / 2;
        const diff = Math.abs(teamAAvg - teamBAvg);
        s -= diff * 3;
      }
      
      if (s > bestScore) {
        bestScore = s;
        bestMatch = candidate;
      }
    }
    
    if (bestMatch) {
      if (hasFixedPairs) {
        const teamA = [bestMatch.teamAPlayer1Id, bestMatch.teamAPlayer2Id!].sort((a, b) => a - b);
        const teamB = [bestMatch.teamBPlayer1Id, bestMatch.teamBPlayer2Id!].sort((a, b) => a - b);
        const matchupKey = opponentPairKey(teamA, teamB);
        const reverseKey = opponentPairKey(teamB, teamA);

        const lastMatchOpponentKeys: string[] = [];
        for (const prevMatch of results) {
          const prevA = [prevMatch.teamAPlayer1Id, prevMatch.teamAPlayer2Id!].sort((a, b) => a - b);
          const prevB = [prevMatch.teamBPlayer1Id, prevMatch.teamBPlayer2Id!].sort((a, b) => a - b);
          lastMatchOpponentKeys.push(opponentPairKey(prevA, prevB));
          lastMatchOpponentKeys.push(opponentPairKey(prevB, prevA));
        }

        if (lastMatchOpponentKeys.includes(matchupKey) || lastMatchOpponentKeys.includes(reverseKey)) {
          const alternativeCandidates = candidates.filter(c => {
            const cA = [c.teamAPlayer1Id, c.teamAPlayer2Id!].sort((a, b) => a - b);
            const cB = [c.teamBPlayer1Id, c.teamBPlayer2Id!].sort((a, b) => a - b);
            const cKey = opponentPairKey(cA, cB);
            const cRevKey = opponentPairKey(cB, cA);
            return !lastMatchOpponentKeys.includes(cKey) && !lastMatchOpponentKeys.includes(cRevKey) &&
                   cKey !== matchupKey && cRevKey !== reverseKey;
          });

          let altBest: MatchResult | null = null;
          let altBestScore = -Infinity;
          for (const alt of alternativeCandidates) {
            const team = [alt.teamAPlayer1Id, alt.teamAPlayer2Id!];
            const opp = [alt.teamBPlayer1Id, alt.teamBPlayer2Id!];
            const s = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);
            if (s > altBestScore) {
              altBestScore = s;
              altBest = alt;
            }
          }

          if (altBest) {
            bestMatch = altBest;
          } else {
            return {
              matches: results,
              pairConstraintBlocked: true,
              pairConstraintMessage: "Not enough available players to create a different opponent pairing. Waiting for a current match to finish to allow new combinations.",
            };
          }
        }
      }

      results.push(bestMatch);
      updateTrackingMaps(bestMatch, localPairings, localOpponents, localCounts);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      if (hasFixedPairs && results.length === 0) {
        return {
          matches: [],
          pairConstraintBlocked: true,
          pairConstraintMessage: "Not enough available players to create a different opponent pairing. Waiting for a current match to finish to allow new combinations.",
        };
      }
      break;
    }
  }
  
  return { matches: results };
}

function generateCompetitiveSingles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds } = opts;
  let eligible = filterByGender(players, genderType);
  
  if (eligible.length < 2) return { matches: [] };
  
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
  
  return { matches: results };
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
  const maxCandidates = 50;
  
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
  }
  
  if (females.length >= 2 && males.length >= 2) {
    const fShuffled = shuffleArray(females);
    const strongMales = [...males].sort((a, b) => getCategoryRank(b.category) - getCategoryRank(a.category));
    const topMales = strongMales.slice(0, Math.max(4, Math.ceil(strongMales.length * 0.6)));
    const mShuffled = shuffleArray(topMales);
    
    for (let i = 0; i < Math.min(fShuffled.length, 4); i++) {
      for (let j = 0; j < Math.min(mShuffled.length, 5); j++) {
        const f2Idx = (i + 1) % fShuffled.length;
        const m2Idx = (j + 1) % mShuffled.length;
        const f2 = fShuffled[f2Idx];
        const m2 = mShuffled[m2Idx];
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
  availablePlayers: Player[],
  fixedPairs?: FixedPair[]
): { matchId: number; position: string; newPlayerId: number }[] {
  const replacements: { matchId: number; position: string; newPlayerId: number }[] = [];
  const usedReplacements = new Set<number>();

  const partnerId = fixedPairs ? getFixedPartner(pausedPlayerId, fixedPairs) : null;
  
  for (const match of queuedMatches) {
    const positions = [
      { field: "teamAPlayer1Id" as const, id: match.teamAPlayer1Id },
      { field: "teamAPlayer2Id" as const, id: match.teamAPlayer2Id },
      { field: "teamBPlayer1Id" as const, id: match.teamBPlayer1Id },
      { field: "teamBPlayer2Id" as const, id: match.teamBPlayer2Id },
    ];
    
    const playersToReplace = [pausedPlayerId];
    if (partnerId) playersToReplace.push(partnerId);

    for (const pos of positions) {
      if (pos.id !== null && playersToReplace.includes(pos.id)) {
        const matchPlayerIds = new Set(positions.map(p => p.id).filter(Boolean));
        const replacement = availablePlayers.find(p => 
          !p.isPaused && 
          p.id !== pausedPlayerId && 
          (partnerId === null || p.id !== partnerId) &&
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

export function generateSmartMatches(opts: GenerateOptions): GenerateResult {
  const { mode, playersPerSide } = opts;
  
  if (mode === "SOCIAL") {
    if (playersPerSide === 1) return generateSocialSingles(opts);
    return generateSocialDoubles(opts);
  } else {
    if (playersPerSide === 1) return generateCompetitiveSingles(opts);
    return generateCompetitiveDoubles(opts);
  }
}
