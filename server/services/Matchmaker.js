const { v4: uuidv4 } = require('uuid');
const AppConfig = require('../models/AppConfig');

class Matchmaker {
  constructor() {
    this.queue = [];
    this.activeMatches = new Map(); // roomId -> { user1, user2 }
    this.lastConfigFetch = 0;
    this.cachedConfig = null;
  }

  async getConfig() {
    const now = Date.now();
    if (now - this.lastConfigFetch > 60000 || !this.cachedConfig) {
      try {
        const config = await AppConfig.findOne();
        this.cachedConfig = config || { radius: 50, ageGap: 5, boostPremium: true };
        this.lastConfigFetch = now;
      } catch (err) {
        return { radius: 50, ageGap: 5, boostPremium: true };
      }
    }
    return this.cachedConfig;
  }

  joinQueue(socket) {
    if (this.queue.find(s => s.id === socket.id)) return;
    if (this.getUserMatch(socket.id)) return;
    this.queue.push(socket);
    this.tryMatch();
  }

  leaveQueue(socketId) {
    this.queue = this.queue.filter(s => s.id !== socketId);
  }

  async tryMatch() {
    if (this.queue.length < 2) return;

    const settings = await this.getConfig();
    
    // Sort queue: Premium users first if enabled
    if (settings.boostPremium) {
      this.queue.sort((a, b) => {
        const aP = a.isPremium ? 1 : 0;
        const bP = b.isPremium ? 1 : 0;
        return bP - aP;
      });
    }

    let user1Index = -1;
    let user2Index = -1;

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

          // Match Found!
          user1Index = i;
          user2Index = j;
          break;
        }
      }
      if (user1Index !== -1) break;
    }

    if (user1Index === -1 || user2Index === -1) return;

    const user2 = this.queue.splice(user2Index, 1)[0];
    const user1 = this.queue.splice(user1Index, 1)[0];
    const roomId = uuidv4();
    
    this.activeMatches.set(roomId, {
      user1: user1.id,
      user2: user2.id,
      status: 'active'
    });

    user1.join(roomId);
    user2.join(roomId);
    user1.emit('match-found', { roomId, role: 'caller', remoteUserId: user2.userId });
    user2.emit('match-found', { roomId, role: 'receiver', remoteUserId: user1.userId });
  }

  skipMatch(socketId, io) {
    const roomId = this.getUserMatch(socketId);
    if (!roomId) return;

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
