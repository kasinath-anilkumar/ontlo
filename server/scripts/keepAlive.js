const https = require('https');

/**
 * Keeps the Render service awake by pinging itself every 14 minutes.
 * Render free tier sleeps after 15 mins of inactivity.
 */
const startKeepAlive = () => {
  let url = process.env.RENDER_EXTERNAL_URL;
  
  // Fallback: If on Render but URL not set, we can't easily self-ping without the service name
  if (!url) {
    console.log('ℹ️  Keep-alive: RENDER_EXTERNAL_URL environment variable is missing.');
    console.log('💡 To prevent sleep on Render free tier, add RENDER_EXTERNAL_URL (e.g., https://your-app.onrender.com) to your Environment Variables.');
    return;
  }

  // Ensure URL has protocol
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  console.log(`📡 Keep-alive service active. Target: ${url}`);

  // Ping every 14 minutes (Render sleeps after 15)
  setInterval(() => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log(`⏱️  Self-ping success (${res.statusCode}) at ${new Date().toLocaleTimeString()}`);
      } else {
        console.warn(`⚠️  Self-ping returned status ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.error(`❌ Keep-alive ping failed: ${err.message}`);
    });
  }, 14 * 60 * 1000);
};

module.exports = startKeepAlive;
