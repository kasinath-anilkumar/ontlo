const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { checkUserBehavior } = require('../utils/abuseDetector');
const cacheUtil = require('../utils/cache');

class Matchmaker {
  constructor() {
    this.queue = [];
    this.activeMatches = new Map(); // roomId -> { user1, user2 }
    this.pendingDisconnects = new Map(); // userId -> timeoutId
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
    if (this.getUserMatch(socket.id)) return;

    // SKIP PENALTY CHECK
    if (socket.userId) {
      try {
        const user = await User.findById(socket.userId).select('skipCount lastSkipAt');
        if (user && user.skipCount >= 10) {
          const now = Date.now();
          const lastSkip = new Date(user.lastSkipAt).getTime();
          const penaltyDuration = 5 * 60 * 1000; // 5 minutes

          if (now - lastSkip < penaltyDuration) {
            const remaining = Math.ceil((penaltyDuration - (now - lastSkip)) / 1000);
            return socket.emit('error', { 
              message: `Matchmaking restricted. Please wait ${remaining} seconds due to too many skips.` 
            });
          } else {
            // Penalty expired, reset count
            await User.findByIdAndUpdate(socket.userId, { skipCount: 0 });
          }
        }
      } catch (err) {
        console.error("Penalty check error:", err);
      }
    }

    this.queue.push(socket);
    this.tryMatch();
  }

  leaveQueue(socketId) {
    this.queue = this.queue.filter(s => s.id !== socketId);
  }

  async tryMatch() {
    if (this.queue.length < 2) return;

    const settings = await this.getConfig();
    
    // Sort queue: Premium or Boosted users first
    if (settings.boostPremium) {
      this.queue.sort((a, b) => {
        const now = Date.now();
        const hour = 60 * 60 * 1000;
        
        const aBoosted = a.lastBoostedAt && (now - new Date(a.lastBoostedAt).getTime() < hour);
        const bBoosted = b.lastBoostedAt && (now - new Date(b.lastBoostedAt).getTime() < hour);
        
        const aPriority = (a.isPremium ? 2 : 0) + (aBoosted ? 3 : 0);
        const bPriority = (b.isPremium ? 2 : 0) + (bBoosted ? 3 : 0);
        
        return bPriority - aPriority;
      });
    }

    let bestMatch = { user1Index: -1, user2Index: -1, score: -1 };

    for (let i = 0; i < this.queue.length; i++) {
      for (let j = i + 1; j < this.queue.length; j++) {
        const u1 = this.queue[i];
        const u2 = this.queue[j];
        
        if (u1.userId && u2.userId) {
          // 1. Check Blocks
          const u1Blocked = u1.blockedUsers?.includes(u2.userId.toString());
          const u2Blocked = u2.blockedUsers?.includes(u1.userId.toString());
          if (u1Blocked || u2Blocked) continue;

          // 2. Check Age Gap (Algorithm Setting)
          if (u1.age && u2.age) {
            const gap = Math.abs(u1.age - u2.age);
            if (gap > settings.ageGap) continue;
          }

          // 3. Dynamic Interest Filtering
          let currentScore = 0;
          if (u1.interests && u2.interests) {
            const commonInterests = u1.interests.filter(it => u2.interests.includes(it));
            currentScore += commonInterests.length * 10; // 10 points per common interest
          }

          // 4. Location Matching (Bonus points)
          if (u1.location && u2.location && u1.location === u2.location) {
            currentScore += 15;
          }

          // 5. Region Matching (Bonus points for low latency)
          if (u1.region && u2.region && u1.region !== 'Global' && u1.region === u2.region) {
            currentScore += 25;
          }

          // 6. Behavior Penalty (Skip Count) - Task 47
          // Penalize users who skip a lot. Subtract 2 points per skip, capped at -50.
          const u1SkipPenalty = Math.min((u1.skipCount || 0) * 2, 50);
          const u2SkipPenalty = Math.min((u2.skipCount || 0) * 2, 50);
          currentScore -= (u1SkipPenalty + u2SkipPenalty);

          // If this is the best match found so far, keep it
          if (currentScore > bestMatch.score) {
            bestMatch = { user1Index: i, user2Index: j, score: currentScore };
          }

          // If we found a very good match (e.g. score > 20), stop searching
          if (currentScore >= 30) break;
        }
      }
      if (bestMatch.user1Index !== -1 && bestMatch.score >= 30) break;
    }

    if (bestMatch.user1Index === -1) return;

    const user2 = this.queue.splice(bestMatch.user2Index, 1)[0];
    const user1 = this.queue.splice(bestMatch.user1Index, 1)[0];
    const roomId = uuidv4();
    
    this.activeMatches.set(roomId, {
      user1: user1.id,
      user2: user2.id,
      user1Id: user1.userId,
      user2Id: user2.userId,
      status: 'active'
    });

    user1.join(roomId);
    user2.join(roomId);
    user1.emit('match-found', { roomId, role: 'caller', remoteUserId: user2.userId });
    user2.emit('match-found', { roomId, role: 'receiver', remoteUserId: user1.userId });
  }

  handleDisconnect(socket, io) {
    const socketId = socket.id;
    const userId = socket.userId;
    
    this.leaveQueue(socketId);
    
    const roomId = this.getUserMatch(socketId);
    if (!roomId) return;

    if (userId) {
      // Set a grace period of 10 seconds for reconnection
      const timeoutId = setTimeout(() => {
        this.skipMatch(socketId, io, 'disconnected', userId);
        this.pendingDisconnects.delete(userId.toString());
      }, 10000);
      
      this.pendingDisconnects.set(userId.toString(), { timeoutId, roomId, oldSocketId: socketId });
      
      // Notify the other user
      io.to(roomId).emit('peer-disconnected', { userId, gracePeriod: 10 });
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

      // Update the match with the new socket ID
      const match = this.activeMatches.get(pending.roomId);
      if (match) {
        if (match.user1 === pending.oldSocketId) match.user1 = socket.id;
        if (match.user2 === pending.oldSocketId) match.user2 = socket.id;
        
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
        await User.findByIdAndUpdate(targetUserId, {
          $inc: { skipCount: 1 },
          $set: { lastSkipAt: new Date() }
        });
        
        // Trigger abuse detection
        checkUserBehavior(targetUserId, io);
      } catch (err) {
        console.error("Skip count increment error:", err);
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
    this.activeMatches.delete(roomId);
  }

  getUserMatch(socketId) {
    for (const [roomId, match] of this.activeMatches.entries()) {
      if (match.user1 === socketId || match.user2 === socketId) return roomId;
    }
    return null;
  }

  async registerConnection(roomId, socketId, userId, io) {
    const match = this.activeMatches.get(roomId);
    if (!match) return;

    if (match.user1 === socketId) { match.user1Id = userId; match.user1Connected = true; }
    if (match.user2 === socketId) { match.user2Id = userId; match.user2Connected = true; }

    if (match.user1Connected && match.user2Connected) {
      try {
        const Connection = require('../models/Connection');
        let existing = await Connection.findOne({ users: { $all: [match.user1Id, match.user2Id] } });
        if (!existing) {
          const newConnection = new Connection({ users: [match.user1Id, match.user2Id] });
          await newConnection.save();
        }
        io.to(roomId).emit('connection-established');
        return [match.user1Id, match.user2Id];
      } catch (err) { console.error(err); }
    }
    return null;
  }
}

module.exports = new Matchmaker();
