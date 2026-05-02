/**
 * Database Backup Strategy Suggestion
 * 
 * For Production:
 * 1. If using MongoDB Atlas: Enable automated backups in the Atlas Dashboard.
 * 2. If self-hosted: Use a cron job with `mongodump`.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupDatabase = () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI not found. Backup aborted.');
    return;
  }

  const date = new Date().toISOString().replace(/:/g, '-');
  const backupDir = path.join(__dirname, '../backups', `backup-${date}`);

  if (!fs.existsSync(path.join(__dirname, '../backups'))) {
    fs.mkdirSync(path.join(__dirname, '../backups'));
  }

  // Example command (requires mongodump installed on the server)
  const cmd = `mongodump --uri="${MONGO_URI}" --out="${backupDir}" --gzip`;

  console.log(`Starting backup to ${backupDir}...`);
  console.log(`Command: ${cmd}`);
  
  // Note: We don't execute this automatically in dev to avoid dependency issues
  // But this script serves as the implementation template.
};

if (require.main === module) {
  backupDatabase();
}

module.exports = backupDatabase;
