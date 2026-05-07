require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Connection = require('./models/Connection');
  const connectionId = '69fc6c05998b43b4afd3b4c7';
  const userIdStr = '69f86c9bd6a86ec2617ec585';
  
  const conn = await Connection.findById(connectionId).lean();
  console.log('Connection users:', conn.users);
  console.log('User 1 is equal to userIdStr:', conn.users[0].toString() === userIdStr);
  console.log('User 2 is equal to userIdStr:', conn.users[1].toString() === userIdStr);
  console.log('Status:', conn.status);
  
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
