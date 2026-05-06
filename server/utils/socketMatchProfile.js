// utils/socketMatchProfile.js

const User =
  require('../models/User');



// ======================================================
// LOAD MATCHMAKING PROFILE
// FREE-TIER OPTIMIZED
// ======================================================

async function attachMatchmakingProfile(
  socket
) {

  try {

    if (!socket.userId) {
      return null;
    }

    // ======================================================
    // LOAD ONLY REQUIRED FIELDS
    // ======================================================

    const user = await User.findById(

      socket.userId,

      `
      username
      profilePic
      role
      age
      gender
      interests
      location
      locationCoordinates
      matchPreferences
      blockedUsers
      isShadowBanned
      isPremium
      lastBoostedAt
      onlineStatus
      status
      `
    ).lean();

    // ======================================================
    // USER NOT FOUND
    // ======================================================

    if (!user) {
      return null;
    }

    // ======================================================
    // BLOCK BANNED USERS
    // ======================================================

    if (
      user.status === 'banned'
    ) {

      return null;
    }

    // ======================================================
    // STORE ON SOCKET
    // ======================================================

    socket.user = {

      _id:
        user._id,

      username:
        user.username,

      profilePic:
        user.profilePic || ''
    };

    socket.role =
      user.role || 'user';

    socket.age =
      user.age || null;

    socket.gender =
      user.gender || null;

    socket.interests =
      Array.isArray(
        user.interests
      )
        ? user.interests
        : [];

    socket.location =
      user.location || '';

    // ======================================================
    // GEOJSON COORDINATES
    // ======================================================

    socket.coordinates =
      user.locationCoordinates
        ?.coordinates || [
        0,
        0
      ];

    // ======================================================
    // MATCH PREFERENCES
    // ======================================================

    socket.matchPreferences =
      user.matchPreferences || {

        gender: 'All',

        ageRange: {
          min: 18,
          max: 100
        },

        distance: 500,

        interests: []
      };

    // ======================================================
    // BLOCKED USERS
    // ======================================================

    socket.blockedUsers =
      (
        user.blockedUsers || []
      ).map((id) =>
        id.toString()
      );

    // ======================================================
    // FLAGS
    // ======================================================

    socket.isShadowBanned =
      !!user.isShadowBanned;

    socket.isPremium =
      !!user.isPremium;

    socket.lastBoostedAt =
      user.lastBoostedAt ||
      null;

    socket.onlineStatus =
      user.onlineStatus ||
      'offline';

    // ======================================================
    // MATCHMAKER PAYLOAD
    // ======================================================

    socket.matchProfile = {

      userId:
        user._id.toString(),

      age:
        socket.age,

      gender:
        socket.gender,

      interests:
        socket.interests,

      preferences:
        socket.matchPreferences,

      coordinates:
        socket.coordinates,

      blockedUsers:
        socket.blockedUsers,

      isPremium:
        socket.isPremium,

      boostTime:
        socket.lastBoostedAt
    };

    return user;

  } catch (error) {

    console.error(
      '[MATCH PROFILE ERROR]:',
      error
    );

    return null;
  }
}



module.exports = {

  attachMatchmakingProfile
};