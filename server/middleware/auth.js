// middleware/auth.js

const jwt = require('jsonwebtoken');

const {
  JWT_SECRET
} = require('../config/jwt');

const User =
  require('../models/User');



// ======================================================
// TOKEN EXTRACTOR
// ======================================================

const getToken =
  (req) => {

    // ======================================================
    // COOKIE
    // ======================================================

    let token =
      req.cookies?.token;

    // ======================================================
    // AUTH HEADER
    // ======================================================

    if (!token) {

      const authHeader =
        req.headers.authorization;

      if (
        authHeader &&
        authHeader.startsWith(
          'Bearer '
        )
      ) {

        token =
          authHeader.split(
            ' '
          )[1];
      }
    }

    return token;
  };



// ======================================================
// MAIN AUTH
// ======================================================

const auth = (
  rolesOrReq,
  res,
  next
) => {

  // ======================================================
  // DIRECT USAGE
  // auth(req,res,next)
  // ======================================================

  if (
    rolesOrReq &&
    rolesOrReq.headers
  ) {

    return handleAuth(

      rolesOrReq,
      res,
      next,
      []
    );
  }

  // ======================================================
  // FACTORY
  // auth(['admin'])
  // ======================================================

  const roles =
    Array.isArray(
      rolesOrReq
    )

      ? rolesOrReq

      : [];

  return (
    req,
    response,
    nextFunction
  ) => {

    return handleAuth(

      req,
      response,
      nextFunction,
      roles
    );
  };
};



// ======================================================
// AUTH HANDLER
// ======================================================

const handleAuth =
  async (
    req,
    res,
    next,
    roles = []
  ) => {

    const start =
      Date.now();

    try {

      // ======================================================
      // TOKEN
      // ======================================================

      const token =
        getToken(req);

      if (!token) {
        console.warn(`[AUTH] Missing token for ${req.method} ${req.path}`);
        return res.status(401).json({

          error:
            'Authentication required'
        });
      }

      // ======================================================
      // VERIFY JWT
      // ======================================================

      let decoded;

      try {

        decoded =
          jwt.verify(

            token,

            JWT_SECRET
          );

      } catch (error) {

        return res.status(401).json({

          error:
            'Invalid or expired token'
        });
      }

      // ======================================================
      // BASIC USER
      // ======================================================

      req.userId =
        decoded.id;

      req.user = {

        id:
          decoded.id,

        username:
          decoded.username
      };

      // ======================================================
      // ROLE CHECK
      // ======================================================

      if (
        roles.length > 0
      ) {

        const user =
          await User.findById(

            decoded.id,

            `
            _id
            username
            role
            status
            isShadowBanned
            `
          ).lean();

        if (!user) {

          return res.status(401).json({

            error:
              'User not found'
          });
        }

        // ======================================================
        // STATUS CHECK
        // ======================================================

        if (
          user.status !==
          'active'
        ) {

          return res.status(403).json({

            error:
              `Account ${user.status}`
          });
        }

        // ======================================================
        // ROLE CHECK
        // ======================================================

        if (
          !roles.includes(
            user.role
          )
        ) {

          return res.status(403).json({

            error:
              'Insufficient permissions'
          });
        }

        req.user =
          user;
      }

      // ======================================================
      // PERF LOG
      // ======================================================

      const duration =
        Date.now() - start;

      if (
        duration > 100
      ) {

        console.log(

          `[AUTH SLOW] ${req.method} ${req.path} → ${duration}ms`
        );
      }

      next();

    } catch (error) {

      console.error(

        '[AUTH ERROR]:',

        error.message
      );

      res.status(401).json({

        error:
          'Authentication failed'
      });
    }
  };



// ======================================================
// OPTIONAL AUTH
// ======================================================

auth.optional =
  (
    req,
    res,
    next
  ) => {

    try {

      const token =
        getToken(req);

      if (!token) {

        return next();
      }

      const decoded =
        jwt.verify(

          token,

          JWT_SECRET
        );

      req.userId =
        decoded.id;

      req.user = {

        id:
          decoded.id,

        username:
          decoded.username
      };

    } catch (error) {

      // Silent fail
    }

    next();
  };



// ======================================================
// EXPORT
// ======================================================

module.exports =
  auth;