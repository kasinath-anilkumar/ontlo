const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { checkUserBehavior } = require('../utils/abuseDetector');
const cacheUtil = require('../utils/cache');
const { logger } = require('../utils/logger');
const Connection = require('../models/Connection');

const DEFAULT_ICEBREAKERS = [
  "What is one thing you are grateful for today?",
  "If you could learn any skill instantly, what would it be?",
  "What is a small thing that made your week better?"
];

const ICEBREAKER_PROMPTS = {
  "Tech": ["What app could you not live without?", "What's your take on AI taking over the world?"],
  "Music": ["What's your current repeat song?", "Best concert you've ever been to?"],
  "Gaming": ["What game are you currently grinding?", "All-time favorite game?", "PC or Console?"],
  "Travel": ["Where is your dream vacation destination?", "Best trip you've ever taken?"],
  "Movies": ["Top 3 favorite movies?", "What's a movie you can watch over and over?"],
  "Art": ["Who is your favorite artist?", "What medium do you like working with the most?"],
  "Fitness": ["What's your workout routine looking like these days?", "Favorite way to stay active?"],
  "Cooking": ["What is your signature dish?", "If you could only eat one cuisine forever, what is it?"],
};

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

class Matchmaker {
  constructor() {
    this.queue = [];
    this.activeMatches = new Map(); // roomId -> { user1, user2, ... }
    this.userToMatch = new Map();   // socketId -> roomId (O(1) reverse lookup)
    this.pendingDisconnects = new Map(); // userId -> timeoutId
    this.isMatching = false;       // Mutex lock
    this.lastMatchTime = 0;        // Throttle tracking

    // Poll for matches every 2.5 seconds (reduced for Render Free Tier)
    setInterval(() => this.tryMatch(), 2500);
  }

  async getConfig() {
    return cacheUtil.getOrSet('app_config', async () => {
      const AppConfig = require('../models/AppConfig');
      const config = await AppConfig.findOne();
      return config || { radius: 50, ageGap: 5, boostPremium: true };
    }, 60); // Cache for 1 minute
  }

  async joinQueue(socket) {
    if (this.queue.find(s => s.id === socket.id)) return;
    
    // Prevent duplicate entries for the same user with different socket IDs
    if (socket.userId) {
      const existingIdx = this.queue.findIndex(s => s.userId?.toString() === socket.userId.toString());
      if (existingIdx !== -1) {
        // Update the existing entry's socket instead of adding a new one
        this.queue[existingIdx] = socket;
        return;
      }
    }

    if (this.getUserMatch(socket.id)) return;

    logger.info(`[Matchmaker] User joining queue: ${socket.userId} (Socket: ${socket.id})`);
    
    // RESTORED 3-second delay
    socket.eligibleAt = Date.now() + 3000;

    this.queue.push(socket);
    logger.info(`[Matchmaker] Queue joined by ${socket.userId}. Total in queue: ${this.queue.length}`);
    
    // Trigger match check immediately, but it will respect eligibleAt
    this.tryMatch();
  }

  leaveQueue(socketId) {
    this.queue = this.queue.filter(s => s.id !== socketId);
  }

  async tryMatch() {
    const now = Date.now();
    
    // Lock and Throttle: Ensure only one match loop runs at a time and not more than once every 500ms
    if (this.isMatching || now - this.lastMatchTime < 500) return;
    if (this.queue.length < 2) return;

    this.isMatching = true;
    this.lastMatchTime = now;

    try {
      const settings = await this.getConfig();
      
      // Sort queue only if premium/boosted features are enabled to save CPU
      if (settings.boostPremium) {
        this.queue.sort((a, b) => {
          const hour = 60 * 60 * 1000;
          const aBoosted = a.lastBoostedAt && (now - new Date(a.lastBoostedAt).getTime() < hour);
          const bBoosted = b.lastBoostedAt && (now - new Date(b.lastBoostedAt).getTime() < hour);
          const aPriority = (a.isPremium ? 2 : 0) + (aBoosted ? 3 : 0);
          const bPriority = (b.isPremium ? 2 : 0) + (bBoosted ? 3 : 0);
          return bPriority - aPriority;
        });
      }

      let bestMatch = { user1Index: -1, user2Index: -1, score: -Infinity };

      // Limit search to the first 50 users to prevent O(N^2) CPU spikes on free tier
      const maxSearch = Math.min(this.queue.length, 50);

      for (let i = 0; i < maxSearch; i++) {
        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }

        for (let j = i + 1; j < this.queue.length; j++) {
          const u1 = this.queue[i];
          const u2 = this.queue[j];
          
          if (u1.eligibleAt > now || u2.eligibleAt > now) continue;

          if (u1.userId && u2.userId) {
            // RESTORED: Don't allow matching with self
            if (u1.userId.toString() === u2.userId.toString()) continue;
            
            // REMOVED for testing
            // if (u1.isShadowBanned || u2.isShadowBanned) continue;
            // const u1Blocked = u1.blockedUsers?.includes(u2.userId.toString());
            // const u2Blocked = u2.blockedUsers?.includes(u1.userId.toString());
            // if (u1Blocked || u2Blocked) continue;

            if (u1.age && u2.age) {
              const gap = Math.abs(u1.age - u2.age);
              if (gap > settings.ageGap) {
                logger.info(`[Matchmaker] Skipping ${u1.userId} & ${u2.userId} - Age Gap: ${gap}`);
              }
            }

            const isWildcard = Math.random() < 0.10;
            let distance = null;

            if (u1.coordinates && u2.coordinates) {
              distance = getDistance(u1.coordinates.lat, u1.coordinates.lng, u2.coordinates.lat, u2.coordinates.lng);
            }

            if (!isWildcard && u1.matchPreferences && u2.matchPreferences) {
              if (u1.matchPreferences.gender !== 'All' && u1.matchPreferences.gender !== u2.gender) {
                 logger.info(`[Matchmaker] Gender Mismatch: ${u1.userId} wants ${u1.matchPreferences.gender}, got ${u2.gender}`);
                 // continue; // Temporarily disable continue for testing
              }
              if (u2.matchPreferences.gender !== 'All' && u2.matchPreferences.gender !== u1.gender) {
                 logger.info(`[Matchmaker] Gender Mismatch: ${u2.userId} wants ${u2.matchPreferences.gender}, got ${u1.gender}`);
                 // continue; // Temporarily disable continue for testing
              }
            }

            let currentScore = 0;
            if (u1.interests && u2.interests) {
              const commonInterests = u1.interests.filter(it => u2.interests.includes(it));
              currentScore += commonInterests.length * 10;
            }

            if (u1.matchPreferences?.interests?.length > 0 && u2.interests) {
              const preferredMatches = u2.interests.filter(it => u1.matchPreferences.interests.includes(it));
              currentScore += preferredMatches.length * 20;
            }
            if (u2.matchPreferences?.interests?.length > 0 && u1.interests) {
              const preferredMatches = u1.interests.filter(it => u2.matchPreferences.interests.includes(it));
              currentScore += preferredMatches.length * 20;
            }

            if (u1.location && u2.location && u1.location === u2.location) currentScore += 15;
            
            if (distance !== null) {
              if (distance < 50) currentScore += 40;
              else if (distance < 200) currentScore += 20;
            }

            if (isWildcard) currentScore += 5;

            if (currentScore > bestMatch.score) {
              bestMatch = { user1Index: i, user2Index: j, score: currentScore, isWildcard };
            }

            if (currentScore >= 25) break;
          }
        }
        if (bestMatch.user1Index !== -1 && bestMatch.score >= 25) break;
      }

      // Relaxed score for testing (was 10/15)
      const minScore = 0;
      if (bestMatch.user1Index !== -1 && bestMatch.score >= minScore) {
        logger.info(`[Matchmaker] Match decided! Score: ${bestMatch.score}`);
        const user2 = this.queue.splice(bestMatch.user2Index, 1)[0];
        const user1 = this.queue.splice(bestMatch.user1Index, 1)[0];
        const roomId = uuidv4();
        
        let commonInterests = [];
        if (user1.interests && user2.interests) {
          commonInterests = user1.interests.filter(it => user2.interests.includes(it));
        }

        let icebreaker =
          DEFAULT_ICEBREAKERS[Math.floor(Math.random() * DEFAULT_ICEBREAKERS.length)];
        if (commonInterests.length > 0) {
          const selectedInterest = commonInterests[Math.floor(Math.random() * commonInterests.length)];
          const interestPrompts = ICEBREAKER_PROMPTS[selectedInterest] || DEFAULT_ICEBREAKERS;
          icebreaker = `You both like ${selectedInterest}! Question: ${interestPrompts[Math.floor(Math.random() * interestPrompts.length)]}`;
        }

        this.activeMatches.set(roomId, {
          user1: user1.id,
          user2: user2.id,
          user1Id: user1.userId,
          user2Id: user2.userId,
          status: 'active'
        });

        // Update reverse lookup map
        this.userToMatch.set(user1.id, roomId);
        this.userToMatch.set(user2.id, roomId);

        user1.join(roomId);
        user2.join(roomId);
        user1.emit('match-found', { roomId, role: 'caller', remoteUserId: user2.userId, icebreaker, isWildcard: bestMatch.isWildcard });
        user2.emit('match-found', { roomId, role: 'receiver', remoteUserId: user1.userId, icebreaker, isWildcard: bestMatch.isWildcard });
        
        // After making a match, try to match more users in the queue if any are left
        if (this.queue.length >= 2) {
          setTimeout(() => this.tryMatch(), 100);
        }
      }
    } catch (err) {
      logger.error(`[Matchmaker] tryMatch error: ${err.message}`);
    } finally {
      this.isMatching = false;
    }
  }

  handleDisconnect(socket, io) {
    const socketId = socket.id;
    const userId = socket.userId;
    
    this.leaveQueue(socketId);
    
    const roomId = this.getUserMatch(socketId);
    if (!roomId) return;

    if (userId) {
      // Set a grace period of 5 seconds for reconnection (as per Section 2.3 of Documentation)
      const timeoutId = setTimeout(() => {
        this.skipMatch(socketId, io, 'disconnected', userId);
        this.pendingDisconnects.delete(userId.toString());
      }, 5000);
      
      this.pendingDisconnects.set(userId.toString(), { timeoutId, roomId, oldSocketId: socketId });
      
      // Notify the other user
      io.to(roomId).emit('peer-disconnected', { userId, gracePeriod: 5 });
    } else {
      // No userId (unauthenticated), end immediately
      this.skipMatch(socketId, io);
    }
  }

  handleReconnect(socket, io) {
    const userId = socket.userId;
    if (!userId) return false;

    const pending = this.pendingDisconnects.get(userId.toString());
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingDisconnects.delete(userId.toString());

      const match = this.activeMatches.get(pending.roomId);
      if (match) {
        // Update socket ID in active match
        if (match.user1 === pending.oldSocketId) {
          this.userToMatch.delete(pending.oldSocketId);
          match.user1 = socket.id;
          this.userToMatch.set(socket.id, pending.roomId);
        }
        if (match.user2 === pending.oldSocketId) {
          this.userToMatch.delete(pending.oldSocketId);
          match.user2 = socket.id;
          this.userToMatch.set(socket.id, pending.roomId);
        }
        
        socket.join(pending.roomId);
        io.to(pending.roomId).emit('peer-reconnected', { userId });
        
        // Let the reconnected user know their current match state
        socket.emit('match-found', { 
          roomId: pending.roomId, 
          role: match.user1 === socket.id ? 'caller' : 'receiver',
          remoteUserId: match.user1 === socket.id ? match.user2Id : match.user1Id,
          isReconnect: true
        });
        
        return true;
      }
    }
    return false;
  }

  async skipMatch(socketId, io, reason = 'skipped', userId = null) {
    const roomId = this.getUserMatch(socketId);
    if (!roomId) return;

    const targetUserId = userId || io.sockets.sockets.get(socketId)?.userId;
    if (targetUserId) {
      try {
        // Trigger abuse detection (remains for other behaviors like reports)
        checkUserBehavior(targetUserId, io);
      } catch (err) {
        console.error("Abuse check error:", err);
      }
    }

    io.to(roomId).emit('match-ended', { reason: 'skipped' });
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (clients) {
      for (const clientId of clients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket) clientSocket.leave(roomId);
      }
    }
    
    const match = this.activeMatches.get(roomId);
    if (match) {
      this.userToMatch.delete(match.user1);
      this.userToMatch.delete(match.user2);
      this.activeMatches.delete(roomId);
    }
  }

  getUserMatch(socketId) {
    return this.userToMatch.get(socketId) || null;
  }

  async registerConnection(roomId, socketId, userId, io) {
    const match = this.activeMatches.get(roomId);
    if (!match) return;

    // Use userId for comparison as it's more stable than socketId
    if (match.user1Id && match.user1Id.toString() === userId.toString()) {
      if (match.user1 !== socketId) {
        this.userToMatch.delete(match.user1);
        match.user1 = socketId;
        this.userToMatch.set(socketId, roomId);
      }
      match.user1Connected = true;
    } else if (match.user2Id && match.user2Id.toString() === userId.toString()) {
      if (match.user2 !== socketId) {
        this.userToMatch.delete(match.user2);
        match.user2 = socketId;
        this.userToMatch.set(socketId, roomId);
      }
      match.user2Connected = true;
    }

    if (match.user1Connected && match.user2Connected) {
      try {
        const sortedUsers = [match.user1Id.toString(), match.user2Id.toString()].sort();
        
        let existing = await Connection.findOne({ users: { $all: sortedUsers } });
        if (!existing) {
          const newConnection = new Connection({ users: sortedUsers });
          await newConnection.save();
        }
        io.to(roomId).emit('connection-established');
        return sortedUsers;
      } catch (err) { 
        console.error('[Matchmaker Register Connection Error]:', err); 
      }
    }
    return null;
  }
}

const matchmakerSingleton = new Matchmaker();
/** Exposed for tests / scripts that need an isolated queue (e.g. `node server/testMatching.js`). */
matchmakerSingleton.Matchmaker = Matchmaker;
module.exports = matchmakerSingleton;
