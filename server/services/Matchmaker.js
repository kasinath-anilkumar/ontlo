// services/Matchmaker.js

const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('../models/User');
const Connection = require('../models/Connection');

const cacheUtil = require('../utils/cache');
const { logger } = require('../utils/logger');

class Matchmaker {

  constructor() {

    this.queue = [];

    this.activeMatches = new Map();

    this.userToMatch = new Map();

    this.pendingDisconnects = new Map();

    this.isMatching = false;

    this.lastMatchTime = 0;

    if (process.env.NODE_ENV !== 'test') {

      setInterval(() => {

        this.tryMatch();

      }, 2500);
    }
  }

  // ======================================================
  // APP CONFIG
  // ======================================================

  async getConfig() {

    return cacheUtil.getOrSet(

      'matchmaker_config',

      async () => {

        const AppConfig =
          require('../models/AppConfig');

        const config =
          await AppConfig.findOne().lean();

        return config || {

          radius: 50,

          ageGap: 5,

          boostPremium: true
        };
      },

      60
    );
  }

  // ======================================================
  // JOIN QUEUE
  // ======================================================

  async joinQueue(socket) {

    try {

      if (!socket?.id) {
        return;
      }

      // Prevent duplicates
      const exists =
        this.queue.find(
          s => s.id === socket.id
        );

      if (exists) {
        return;
      }

      // Prevent same user duplicates
      const existingUser =
        this.queue.find(
          s =>
            s.userId?.toString() ===
            socket.userId?.toString()
        );

      if (existingUser) {
        return;
      }

      // Already matched
      if (
        this.getUserMatch(socket.id)
      ) {

        return;
      }

      // Small delay
      socket.eligibleAt =
        Date.now() + 3000;

      this.queue.push(socket);

      logger.info(
        '[MATCHMAKER] User joined queue',
        {
          userId: socket.userId,
          queueSize: this.queue.length
        }
      );

      this.tryMatch();

    } catch (error) {

      logger.error(
        '[MATCHMAKER JOIN ERROR]',
        {
          error: error.message
        }
      );
    }
  }

  // ======================================================
  // LEAVE QUEUE
  // ======================================================

  leaveQueue(socketId) {

    this.queue =
      this.queue.filter(
        s => s.id !== socketId
      );
  }

  // ======================================================
  // DISTANCE
  // ======================================================

  getDistance(
    lat1,
    lon1,
    lat2,
    lon2
  ) {

    if (
      lat1 == null ||
      lon1 == null ||
      lat2 == null ||
      lon2 == null
    ) {

      return Infinity;
    }

    const R = 6371;

    const dLat =
      (lat2 - lat1) *
      Math.PI /
      180;

    const dLon =
      (lon2 - lon1) *
      Math.PI /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *

      Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  }

  // ======================================================
  // MATCH LOOP
  // ======================================================

  async tryMatch() {

    const now = Date.now();

    if (
      this.isMatching ||
      now - this.lastMatchTime < 500
    ) {

      return;
    }

    if (this.queue.length < 2) {
      return;
    }

    this.isMatching = true;

    this.lastMatchTime = now;

    try {

      const config =
        await this.getConfig();

      let bestMatch = {

        score: -Infinity,

        user1Index: -1,

        user2Index: -1
      };

      const maxSearch =
        Math.min(
          this.queue.length,
          50
        );

      for (
        let i = 0;
        i < maxSearch;
        i++
      ) {

        if (
          i > 0 &&
          i % 10 === 0
        ) {

          await new Promise(
            resolve =>
              setImmediate(resolve)
          );
        }

        for (
          let j = i + 1;
          j < this.queue.length;
          j++
        ) {

          const u1 =
            this.queue[i];

          const u2 =
            this.queue[j];

          if (!u1 || !u2) {
            continue;
          }

          // Wait window
          if (
            u1.eligibleAt > now ||
            u2.eligibleAt > now
          ) {

            continue;
          }

          // Same user
          if (
            u1.userId?.toString() ===
            u2.userId?.toString()
          ) {

            continue;
          }

          // Shadow ban
          if (
            u1.isShadowBanned ||
            u2.isShadowBanned
          ) {

            continue;
          }

          // Blocked
          const blocked1 =
            u1.blockedUsers?.includes(
              u2.userId.toString()
            );

          const blocked2 =
            u2.blockedUsers?.includes(
              u1.userId.toString()
            );

          if (
            blocked1 ||
            blocked2
          ) {

            continue;
          }

          // ======================================================
          // WILDCARD MATCHING (10% PROBABILITY)
          // Bypasses Region/Gender filters (Doc Section 17.1.1)
          // ======================================================

          const isWildcard =
            Math.random() < 0.1;

          let score = 0;

          if (isWildcard) {

            score += 100; // Force match

          } else {

            // Same location
            if (
              u1.location &&
              u2.location &&
              u1.location === u2.location
            ) {

              score += 15;
            }

            // Distance
            const distance =
              this.getDistance(

                u1.coordinates?.[1],
                u1.coordinates?.[0],

                u2.coordinates?.[1],
                u2.coordinates?.[0]
              );

            if (distance < 50) {

              score += 40;

            } else if (
              distance < 200
            ) {

              score += 20;
            }
          }

          // Interests
          const commonInterests =
            (u1.interests || []).filter(
              interest =>
                (u2.interests || []).includes(
                  interest
                )
            );

          score +=
            commonInterests.length * 10;

          // Age gap
          if (
            u1.age &&
            u2.age
          ) {

            const ageGap =
              Math.abs(
                u1.age - u2.age
              );

            if (
              ageGap <= config.ageGap
            ) {

              score += 15;
            }
          }

          // Premium boost
          if (
            config.boostPremium
          ) {

            if (u1.isPremium) {
              score += 10;
            }

            if (u2.isPremium) {
              score += 10;
            }
          }

          // Randomness
          score += 5;

          if (
            score >
            bestMatch.score
          ) {

            bestMatch = {

              user1Index: i,

              user2Index: j,

              score
            };
          }
        }
      }

      // No match
      if (
        bestMatch.user1Index === -1
      ) {

        return;
      }

      // Extract users
      const user2 =
        this.queue.splice(
          bestMatch.user2Index,
          1
        )[0];

      const user1 =
        this.queue.splice(
          bestMatch.user1Index,
          1
        )[0];

      if (!user1 || !user2) {
        return;
      }

      // Room
      const roomId =
        crypto.randomUUID();

      // Store match
      this.activeMatches.set(

        roomId,

        {

          user1: user1.id,
          user2: user2.id,

          user1Id:
            user1.userId,

          user2Id:
            user2.userId,

          status: 'active'
        }
      );

      // Reverse lookup
      this.userToMatch.set(
        user1.id,
        roomId
      );

      this.userToMatch.set(
        user2.id,
        roomId
      );

      // Join room
      user1.join(roomId);
      user2.join(roomId);

      // ======================================================
      // CONTEXTUAL ICEBREAKERS (Doc Section 17.3)
      // ======================================================

      const commonInterests = (user1.interests || []).filter(
        interest => (user2.interests || []).includes(interest)
      );

      let icebreaker = "Say hi and start the conversation!";

      if (commonInterests.length > 0) {

        const topic =
          commonInterests[
            Math.floor(Math.random() * commonInterests.length)
          ];

        icebreaker =
          `You both like ${topic}! What's your favorite thing about it?`;
      }

      // Emit
      user1.emit(
        'match-found',
        {
          roomId,
          role: 'caller',
          icebreaker,
          remoteUserId:
            user2.userId
        }
      );

      user2.emit(
        'match-found',
        {
          roomId,
          role: 'receiver',
          icebreaker,
          remoteUserId:
            user1.userId
        }
      );

      logger.info(
        '[MATCH CREATED]',
        {
          roomId,
          score:
            bestMatch.score
        }
      );

      // Recursive match
      if (
        this.queue.length >= 2
      ) {

        setTimeout(() => {

          this.tryMatch();

        }, 100);
      }

    } catch (error) {

      logger.error(
        '[MATCHMAKER ERROR]',
        {
          error: error.message
        }
      );

    } finally {

      this.isMatching = false;
    }
  }

  // ======================================================
  // DISCONNECT
  // ======================================================

  handleDisconnect(
    socket,
    io
  ) {

    try {

      const socketId =
        socket.id;

      this.leaveQueue(
        socketId
      );

      const roomId =
        this.getUserMatch(
          socketId
        );

      if (!roomId) {
        return;
      }

      const timeoutId =
        setTimeout(() => {

          this.skipMatch(
            socketId,
            io,
            'disconnected'
          );

        }, 5000);

      this.pendingDisconnects.set(

        socket.userId.toString(),

        {

          timeoutId,
          roomId,
          oldSocketId: socketId
        }
      );

      io.to(roomId).emit(
        'peer-disconnected',
        {
          userId:
            socket.userId,
          gracePeriod: 5
        }
      );

    } catch (error) {

      logger.error(
        '[DISCONNECT ERROR]',
        {
          error: error.message
        }
      );
    }
  }

  // ======================================================
  // RECONNECT
  // ======================================================

  handleReconnect(
    socket,
    io
  ) {

    try {

      const pending =
        this.pendingDisconnects.get(
          socket.userId.toString()
        );

      if (!pending) {
        return false;
      }

      clearTimeout(
        pending.timeoutId
      );

      this.pendingDisconnects.delete(
        socket.userId.toString()
      );

      const match =
        this.activeMatches.get(
          pending.roomId
        );

      if (!match) {
        return false;
      }

      // Replace socket id
      if (
        match.user1 ===
        pending.oldSocketId
      ) {

        this.userToMatch.delete(
          match.user1
        );

        match.user1 =
          socket.id;

        this.userToMatch.set(
          socket.id,
          pending.roomId
        );
      }

      if (
        match.user2 ===
        pending.oldSocketId
      ) {

        this.userToMatch.delete(
          match.user2
        );

        match.user2 =
          socket.id;

        this.userToMatch.set(
          socket.id,
          pending.roomId
        );
      }

      socket.join(
        pending.roomId
      );

      io.to(
        pending.roomId
      ).emit(
        'peer-reconnected',
        {
          userId:
            socket.userId
        }
      );

      return true;

    } catch (error) {

      logger.error(
        '[RECONNECT ERROR]',
        {
          error: error.message
        }
      );

      return false;
    }
  }

  // ======================================================
  // SKIP MATCH
  // ======================================================

  async skipMatch(
    socketId,
    io,
    reason = 'skipped'
  ) {

    try {

      const roomId =
        this.getUserMatch(
          socketId
        );

      if (!roomId) {
        return;
      }

      io.to(roomId).emit(
        'match-ended',
        {
          reason
        }
      );

      const clients =
        io.sockets.adapter.rooms.get(
          roomId
        );

      if (clients) {

        for (const clientId of clients) {

          const socket =
            io.sockets.sockets.get(
              clientId
            );

          if (socket) {

            socket.leave(
              roomId
            );
          }
        }
      }

      const match =
        this.activeMatches.get(
          roomId
        );

      if (match) {

        this.userToMatch.delete(
          match.user1
        );

        this.userToMatch.delete(
          match.user2
        );

        this.activeMatches.delete(
          roomId
        );
      }

    } catch (error) {

      logger.error(
        '[SKIP MATCH ERROR]',
        {
          error: error.message
        }
      );
    }
  }

  // ======================================================
  // GET USER MATCH
  // ======================================================

  getUserMatch(socketId) {

    return (
      this.userToMatch.get(socketId) ||
      null
    );
  }
}

module.exports =
  new Matchmaker();