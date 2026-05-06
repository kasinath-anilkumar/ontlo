// scripts/keepAlive.js

const https = require('https');

const http = require('http');



// ======================================================
// FREE TIER KEEP ALIVE
// ======================================================

// NOTE:
// Render free tier eventually sleeps anyway.
// This only helps reduce cold starts,
// not fully prevent sleeping anymore.



const KEEP_ALIVE_INTERVAL =
  14 * 60 * 1000;



// ======================================================
// SAFE REQUEST
// ======================================================

const pingServer = (
  url
) => {

  try {

    const client =
      url.startsWith('https')

        ? https

        : http;

    const request =
      client.get(

        url,

        {

          timeout: 10000,

          headers: {

            'User-Agent':
              'Ontlo-KeepAlive'
          }
        },

        (res) => {

          // Consume response
          res.resume();

          if (
            res.statusCode >= 200 &&
            res.statusCode < 300
          ) {

            console.log(

              `⏱️ KeepAlive OK (${res.statusCode})`
            );

          } else {

            console.warn(

              `⚠️ KeepAlive Status ${res.statusCode}`
            );
          }
        }
      );

    request.on(
      'timeout',

      () => {

        console.warn(
          '⚠️ KeepAlive timeout'
        );

        request.destroy();
      }
    );

    request.on(
      'error',

      (error) => {

        console.error(

          '❌ KeepAlive failed:',

          error.message
        );
      }
    );

  } catch (error) {

    console.error(
      '[KEEPALIVE ERROR]',
      error
    );
  }
};



// ======================================================
// START
// ======================================================

const startKeepAlive =
  () => {

    try {

      let url =
        process.env
          .RENDER_EXTERNAL_URL ||

        process.env.APP_URL ||

        '';

      // ======================================================
      // NO URL
      // ======================================================

      if (!url) {

        console.log(

          'ℹ️ KeepAlive disabled (missing RENDER_EXTERNAL_URL)'
        );

        return;
      }

      // ======================================================
      // NORMALIZE URL
      // ======================================================

      if (
        !url.startsWith(
          'http'
        )
      ) {

        url =
          `https://${url}`;
      }

      // Remove trailing slash
      url =
        url.replace(/\/$/, '');

      // Health endpoint
      const pingUrl =
        `${url}/health`;

      console.log(

        `📡 KeepAlive active → ${pingUrl}`
      );

      // ======================================================
      // INITIAL PING
      // ======================================================

      setTimeout(() => {

        pingServer(
          pingUrl
        );

      }, 10000);

      // ======================================================
      // INTERVAL
      // ======================================================

      const interval =
        setInterval(() => {

          pingServer(
            pingUrl
          );

        }, KEEP_ALIVE_INTERVAL);

      // ======================================================
      // CLEANUP
      // ======================================================

      process.on(
        'SIGTERM',

        () => {

          clearInterval(
            interval
          );
        }
      );

      process.on(
        'SIGINT',

        () => {

          clearInterval(
            interval
          );
        }
      );

    } catch (error) {

      console.error(
        '[KEEPALIVE START ERROR]',
        error
      );
    }
  };



// ======================================================
// EXPORT
// ======================================================

module.exports =
  startKeepAlive;