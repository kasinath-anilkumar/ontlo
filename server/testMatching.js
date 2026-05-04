const { Matchmaker } = require('./services/Matchmaker');

// Create a simple test
const testMatchmaker = () => {
  const matchmaker = new Matchmaker();

  // Mock sockets with user data
  const socket1 = {
    id: 'socket1',
    userId: 'user1',
    age: 25,
    gender: 'Male',
    interests: ['Music', 'Gaming'],
    location: 'New York',
    region: 'US',
    matchPreferences: { gender: 'All', ageRange: { min: 18, max: 30 }, region: 'Global' },
    blockedUsers: [],
    skipCount: 0
  };

  const socket2 = {
    id: 'socket2',
    userId: 'user2',
    age: 26,
    gender: 'Female',
    interests: ['Music', 'Movies'],
    location: 'New York',
    region: 'US',
    matchPreferences: { gender: 'All', ageRange: { min: 20, max: 35 }, region: 'Global' },
    blockedUsers: [],
    skipCount: 0
  };

  // Add to queue
  matchmaker.joinQueue(socket1);
  matchmaker.joinQueue(socket2);

  console.log('Queue length:', matchmaker.queue.length);
  console.log('Users in queue:', matchmaker.queue.map(s => s.userId));
};

testMatchmaker();