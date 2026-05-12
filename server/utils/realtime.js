const { getUserCounts } = require('./stats');

const toId = (value) => value?._id || value;

const toIdString = (value) => {
  const id = toId(value);
  return id ? id.toString() : '';
};

const formatConnectionForUser = (connection, viewerId) => {
  if (!connection || !viewerId) return null;

  const viewerIdStr = toIdString(viewerId);
  const otherUser = (connection.userDetails || []).find(
    (user) => toIdString(user) !== viewerIdStr
  );

  if (!otherUser) return null;

  return {
    id: toId(connection).toString(),
    user: {
      _id: toId(otherUser),
      username: otherUser.username || 'User',
      profilePic: otherUser.profilePic || '',
      onlineStatus: otherUser.onlineStatus || 'offline'
    },
    status: connection.status,
    lastMessage: connection.lastMessage || null,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt
  };
};

const formatNotification = (notification) => {
  if (!notification) return null;

  const plain = typeof notification.toObject === 'function'
    ? notification.toObject()
    : notification;

  return {
    ...plain,
    _id: toId(plain).toString(),
    relatedId: plain.relatedId || null,
    isRead: Boolean(plain.isRead),
    createdAt: plain.createdAt || new Date()
  };
};

const emitCountsUpdate = async (io, userId) => {
  if (!io || !userId) return;

  try {
    const userIdStr = toIdString(userId);
    const counts = await getUserCounts(userIdStr, true);
    io.to(`user_${userIdStr}`).emit('counts-update', counts);
  } catch (error) {
    console.error('[REALTIME COUNTS ERROR]:', error);
  }
};

const emitConnectionUpdate = (io, connection, eventName = 'connection-updated') => {
  if (!io || !connection?.users) return;

  connection.users.forEach((userId) => {
    const payload = formatConnectionForUser(connection, userId);
    if (payload) {
      io.to(`user_${toIdString(userId)}`).emit(eventName, payload);
    }
  });
};

const emitConnectionDeleted = (io, connectionId, userIds = []) => {
  if (!io || !connectionId) return;

  userIds.forEach((userId) => {
    io.to(`user_${toIdString(userId)}`).emit('connection-deleted', {
      connectionId: connectionId.toString()
    });
  });
};

const emitNotification = (io, userId, notification) => {
  if (!io || !userId || !notification) return;

  io.to(`user_${toIdString(userId)}`).emit(
    'new-notification',
    formatNotification(notification)
  );
};

module.exports = {
  emitConnectionDeleted,
  emitConnectionUpdate,
  emitCountsUpdate,
  emitNotification,
  formatConnectionForUser,
  formatNotification,
  toIdString
};
