const https = require('https');

/**
 * Keeps the Render service awake by pinging itself every 14 minutes.
 * Render free tier sleeps after 15 mins of inactivity.
 */
const startKeepAlive = () => {
  const url = process.env.RENDER_EXTERNAL_URL;
  
  if (!url) {
    console.log('ℹ️  No RENDER_EXTERNAL_URL found, skipping keep-alive (Local Dev).');
    return;
  }

  console.log(`📡 Keep-alive service started. Pinging: ${url}`);

  // Ping every 14 minutes
  setInterval(() => {
    https.get(url, (res) => {
      console.log(`⏱️  Self-ping sent to ${url}. Status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`❌ Keep-alive ping failed: ${err.message}`);
    });
  }, 14 * 60 * 1000);
};

module.exports = startKeepAlive;
