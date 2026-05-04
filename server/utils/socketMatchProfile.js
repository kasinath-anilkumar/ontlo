const User = require('../models/User');

/**
 * Loads matchmaking fields from DB onto the socket (Matchmaker reads these from queue sockets).
 */
async function attachMatchmakingProfile(socket) {
  if (!socket.userId) return null;
  const user = await User.findById(socket.userId)
    .select(
      'role age gender interests location matchPreferences coordinates blockedUsers isShadowBanned isPremium lastBoostedAt onlineStatus'
    )
    .lean();
  if (!user) return null;

  socket.role = user.role;
  socket.age = user.age;
  socket.gender = user.gender;
  socket.interests = user.interests || [];
  socket.location = user.location;
  socket.matchPreferences = user.matchPreferences;
  socket.coordinates = user.coordinates;
  socket.blockedUsers = (user.blockedUsers || []).map((id) => id.toString());
  socket.isShadowBanned = !!user.isShadowBanned;
  socket.isPremium = !!user.isPremium;
  socket.lastBoostedAt = user.lastBoostedAt;

  return user;
}

module.exports = { attachMatchmakingProfile };
