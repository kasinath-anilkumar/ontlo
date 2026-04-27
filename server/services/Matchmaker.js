const { v4: uuidv4 } = require('uuid');

class Matchmaker {
  constructor() {
    this.queue = [];
    this.activeMatches = new Map(); // roomId -> { user1, user2 }
  }

  // Add a user to the matchmaking queue
  joinQueue(socket) {
    // Prevent duplicate entries
    if (this.queue.find(s => s.id === socket.id)) return;
    
    // Check if user is already in a match
    if (this.getUserMatch(socket.id)) return;

    this.queue.push(socket);
    this.tryMatch();
  }

  // Remove a user from the queue (e.g., on disconnect)
  leaveQueue(socketId) {
    this.queue = this.queue.filter(s => s.id !== socketId);
  }

  // Attempt to match two users in the queue
  async tryMatch() {
    if (this.queue.length >= 2) {
      // Find two users who haven't blocked each other
      const User = require('../models/User');
      
      let user1Index = -1;
      let user2Index = -1;

      for (let i = 0; i < this.queue.length; i++) {
        for (let j = i + 1; j < this.queue.length; j++) {
          const u1 = this.queue[i];
          const u2 = this.queue[j];
          
          if (u1.userId && u2.userId) {
            const dbUser1 = await User.findById(u1.userId).select('blockedUsers');
            const dbUser2 = await User.findById(u2.userId).select('blockedUsers');
            
            const u1Blocked = dbUser1?.blockedUsers?.includes(u2.userId) || false;
            const u2Blocked = dbUser2?.blockedUsers?.includes(u1.userId) || false;
            
            if (!u1Blocked && !u2Blocked) {
              user1Index = i;
              user2Index = j;
              break;
            }
          }
        }
        if (user1Index !== -1) break;
      }

      if (user1Index === -1 || user2Index === -1) return; // No compatible pair found yet

      // Remove the matched users from the queue
      const user2 = this.queue.splice(user2Index, 1)[0];
      const user1 = this.queue.splice(user1Index, 1)[0];

      const roomId = uuidv4();
      
      this.activeMatches.set(roomId, {
        user1: user1.id,
        user2: user2.id,
        status: 'active'
      });

      // Join both users to the Socket.io room
      user1.join(roomId);
      user2.join(roomId);

      // Notify users of the match
      user1.emit('match-found', { roomId, role: 'caller', remoteUserId: user2.userId });
      user2.emit('match-found', { roomId, role: 'receiver', remoteUserId: user1.userId });
      
      console.log(`Match created: ${roomId} between ${user1.id} and ${user2.id}`);
    }
  }

  // Handle a user skipping a match
  skipMatch(socketId, io) {
    const roomId = this.getUserMatch(socketId);
    if (!roomId) return;

    const match = this.activeMatches.get(roomId);
    
    // Notify the other user that the match ended
    io.to(roomId).emit('match-ended', { reason: 'skipped' });

    // Find the sockets and remove them from the room
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (clients) {
      for (const clientId of clients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket) {
          clientSocket.leave(roomId);
        }
      }
    }

    this.activeMatches.delete(roomId);
  }

  // Helper to find which room a user is currently in
  getUserMatch(socketId) {
    for (const [roomId, match] of this.activeMatches.entries()) {
      if (match.user1 === socketId || match.user2 === socketId) {
        return roomId;
      }
    }
    return null;
  }

  // Register mutual connection
  async registerConnection(roomId, socketId, userId, io) {
    const match = this.activeMatches.get(roomId);
    if (!match) return;

    if (match.user1 === socketId) match.user1Id = userId;
    if (match.user2 === socketId) match.user2Id = userId;

    if (match.user1 === socketId) match.user1Connected = true;
    if (match.user2 === socketId) match.user2Connected = true;

    // If both clicked connect
    if (match.user1Connected && match.user2Connected && match.user1Id && match.user2Id) {
      try {
        const Connection = require('../models/Connection');
        
        // Check if connection already exists
        let existing = await Connection.findOne({
          users: { $all: [match.user1Id, match.user2Id] }
        });

        if (!existing) {
          const newConnection = new Connection({
            users: [match.user1Id, match.user2Id]
          });
          await newConnection.save();
        }

        io.to(roomId).emit('connection-established');
        return [match.user1Id, match.user2Id];
      } catch (err) {
        console.error('Error saving connection:', err);
      }
    }
    return null;
  }
}

module.exports = new Matchmaker();
