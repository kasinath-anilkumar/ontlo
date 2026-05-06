// utils/logger.js

const winston =
  require('winston');

const ActivityLog =
  require('../models/ActivityLog');



// ======================================================
// ENV
// ======================================================

const isProduction =
  process.env.NODE_ENV ===
  'production';



// ======================================================
// WINSTON LOGGER
// FREE TIER OPTIMIZED
// ======================================================

const logger =
  winston.createLogger({

    level:
      process.env.LOG_LEVEL ||
      'info',

    format:
      winston.format.combine(

        winston.format.timestamp(),

        winston.format.errors({
          stack: true
        }),

        winston.format.printf(
          ({
            level,
            message,
            timestamp,
            ...meta
          }) => {

            const metaString =
              Object.keys(meta)
                .length > 0

                ? JSON.stringify(meta)

                : '';

            return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
          }
        )
      ),

    defaultMeta: {
      service:
        'ontlo-backend'
    },

    transports: [

      // ======================================================
      // CONSOLE
      // ======================================================

      new winston.transports.Console({

        handleExceptions: true,

        handleRejections: true
      })
    ],

    exitOnError: false
  });



// ======================================================
// DEV LOG COLORS
// ======================================================

if (!isProduction) {

  logger.format =
    winston.format.combine(

      winston.format.colorize(),

      winston.format.timestamp(),

      winston.format.printf(
        ({
          level,
          message,
          timestamp,
          ...meta
        }) => {

          const metaString =
            Object.keys(meta)
              .length > 0

              ? JSON.stringify(meta)

              : '';

          return `[${timestamp}] ${level}: ${message} ${metaString}`;
        }
      )
    );
}



// ======================================================
// SAFE ACTIVITY LOGGER
// NON-BLOCKING
// ======================================================

const logActivity =
  async ({
    userId,
    action,
    req,
    metadata = {}
  }) => {

    try {

      // ======================================================
      // BASIC VALIDATION
      // ======================================================

      if (
        !userId ||
        !action
      ) {

        logger.warn(
          'Missing activity log fields',
          {
            userId,
            action
          }
        );

        return;
      }

      // ======================================================
      // LOG DATA
      // ======================================================

      const logData = {

        userId,

        action,

        metadata
      };

      // ======================================================
      // REQUEST INFO
      // ======================================================

      if (req) {

        logData.ip =

          req.headers[
            'x-forwarded-for'
          ]?.split(',')[0]
            ?.trim() ||

          req.ip ||

          req.socket
            ?.remoteAddress ||

          '';

        logData.userAgent =
          req.headers[
            'user-agent'
          ] || '';

        logData.method =
          req.method;

        logData.path =
          req.originalUrl;
      }

      // ======================================================
      // FIRE & FORGET DB LOG
      // ======================================================

      setImmediate(() => {

        ActivityLog.create(
          logData
        ).catch((error) => {

          logger.error(
            'Failed to save activity log',
            {
              error:
                error.message,

              action,

              userId
            }
          );
        });
      });

      // ======================================================
      // WINSTON LOG
      // ======================================================

      logger.info(
        `Activity: ${action}`,

        {

          userId,

          ip:
            logData.ip,

          method:
            logData.method,

          path:
            logData.path,

          ...metadata
        }
      );

    } catch (error) {

      logger.error(
        'Activity log failure',

        {
          error:
            error.message,

          action
        }
      );
    }
  };



// ======================================================
// EXPRESS ERROR LOGGER
// ======================================================

const errorLogger =
  (
    err,
    req,
    res,
    next
  ) => {

    logger.error(
      err.message,

      {

        stack:
          err.stack,

        method:
          req.method,

        path:
          req.originalUrl,

        ip:
          req.ip
      }
    );

    next(err);
  };



// ======================================================
// MEMORY MONITOR
// RENDER FREE TIER
// ======================================================

setInterval(() => {

  try {

    const memory =
      process.memoryUsage();

    const heapUsed =
      (
        memory.heapUsed /
        1024 /
        1024
      ).toFixed(2);

    const rss =
      (
        memory.rss /
        1024 /
        1024
      ).toFixed(2);

    // ======================================================
    // WARNINGS
    // ======================================================

    if (
      Number(heapUsed) > 350
    ) {

      logger.warn(
        'High heap usage',

        {
          heapMB:
            heapUsed
        }
      );
    }

    if (
      Number(rss) > 450
    ) {

      logger.warn(
        'High RSS memory',

        {
          rssMB: rss
        }
      );
    }

  } catch (error) {

    console.error(
      '[LOGGER MONITOR ERROR]:',
      error
    );
  }

}, 60000);



// ======================================================
// UNCAUGHT EXCEPTIONS
// ======================================================

process.on(
  'uncaughtException',

  (error) => {

    logger.error(
      'Uncaught Exception',

      {
        error:
          error.message,

        stack:
          error.stack
      }
    );
  }
);



// ======================================================
// UNHANDLED REJECTIONS
// ======================================================

process.on(
  'unhandledRejection',

  (reason) => {

    logger.error(
      'Unhandled Rejection',

      {
        reason
      }
    );
  }
);



// ======================================================
// EXPORTS
// ======================================================

module.exports = {

  logger,

  logActivity,

  errorLogger
};