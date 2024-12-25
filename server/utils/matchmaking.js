export const findMatch = (userId, type, waitingUsers, interests = []) => {
  let bestMatch = null
  let highestScore = -1

  for (const [potentialMatchId, potentialMatch] of waitingUsers) {
    // Skip self
    if (potentialMatchId === userId) continue

    // Calculate match score
    const score = calculateMatchScore(interests, potentialMatch.interests)

    if (score > highestScore) {
      highestScore = score
      bestMatch = {
        userId: potentialMatchId,
        socketId: potentialMatch.socketId,
        interests: potentialMatch.interests,
      }
    }
  }

  return bestMatch
}

const calculateMatchScore = (interests1 = [], interests2 = []) => {
  if (interests1.length === 0 || interests2.length === 0) return 0

  const set1 = new Set(interests1.map(i => i.toLowerCase()))
  const set2 = new Set(interests2.map(i => i.toLowerCase()))

  let commonInterests = 0
  for (const interest of set1) {
    if (set2.has(interest)) commonInterests++
  }

  // Calculate Jaccard similarity coefficient
  const unionSize = new Set([...set1, ...set2]).size
  return commonInterests / unionSize
}
