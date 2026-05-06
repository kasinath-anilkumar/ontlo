const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Report = require('../models/Report');
const User = require('../models/User');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const {
  submitReportSchema,
  updateReportSchema,
  reportIdParamSchema
} = require('../validators/report.validator');

const {
  logActivity
} = require('../utils/logger');

const {
  checkUserBehavior
} = require('../utils/abuseDetector');



// ======================================================
// SUBMIT REPORT
// ======================================================

router.post(
  '/',

  auth,

  validate({
    body: submitReportSchema
  }),

  async (req, res) => {

    try {

      const {
        reportedUserId,
        reason,
        roomId,
        severity
      } = req.body;

      // ======================================================
      // VALIDATE USER ID
      // ======================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          reportedUserId
        )
      ) {

        return res.status(400).json({
          error: 'Invalid user ID'
        });
      }

      // ======================================================
      // PREVENT SELF REPORT
      // ======================================================

      if (
        req.userId.toString() ===
        reportedUserId.toString()
      ) {

        return res.status(400).json({
          error:
            'Cannot report yourself'
        });
      }

      // ======================================================
      // CHECK USER EXISTS
      // ======================================================

      const reportedUser =
        await User.findById(
          reportedUserId,
          '_id'
        ).lean();

      if (!reportedUser) {

        return res.status(404).json({
          error:
            'Reported user not found'
        });
      }

      // ======================================================
      // PREVENT DUPLICATE SPAM REPORTS
      // ======================================================

      const existingRecentReport =
        await Report.findOne({

          reporter: req.userId,

          reportedUser: reportedUserId,

          createdAt: {
            $gte: new Date(
              Date.now() -
                1000 * 60 * 5
            )
          }
        }).lean();

      if (existingRecentReport) {

        return res.status(429).json({
          error:
            'Please wait before submitting another report'
        });
      }

      // ======================================================
      // CREATE REPORT
      // ======================================================

      const report = await Report.create({

        reporter: req.userId,

        reportedUser: reportedUserId,

        reason: reason.trim(),

        severity:
          severity || 'low',

        roomId:
          roomId || null
      });

      // ======================================================
      // LOG ACTIVITY
      // ======================================================

      await logActivity({

        userId: req.userId,

        action: 'report_filed',

        req,

        metadata: {

          reportedUserId,

          reportId: report._id,

          severity:
            report.severity
        }
      });

      // ======================================================
      // REALTIME ADMIN ALERT
      // ======================================================

      if (req.io) {

        req.io.emit(
          'support-update-admin',
          {
            type: 'report'
          }
        );

        checkUserBehavior(
          reportedUserId,
          req.io
        );
      }

      res.status(201).json({

        success: true,

        message:
          'Report submitted successfully'
      });

    } catch (error) {

      console.error(
        '[REPORT CREATE ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// GET MY REPORTS
// ======================================================

router.get(
  '/my-reports',

  auth,

  async (req, res) => {

    try {

      const reports = await Report.find(

        {
          reporter: req.userId
        },

        `
        reportedUser
        reason
        status
        severity
        moderatorAction
        createdAt
        `
      )
        .populate(
          'reportedUser',
          `
          username
          profilePic
          fullName
          `
        )
        .sort({
          createdAt: -1
        })
        .limit(50)
        .lean();

      res.json(reports);

    } catch (error) {

      console.error(
        '[MY REPORTS ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// UPDATE REPORT
// ======================================================

router.put(
  '/:id',

  auth,

  validate({
    params: reportIdParamSchema,
    body: updateReportSchema
  }),

  async (req, res) => {

    try {

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {

        return res.status(400).json({
          error:
            'Invalid report ID'
        });
      }

      const report =
        await Report.findOne({

          _id: req.params.id,

          reporter: req.userId,

          status: 'pending'
        });

      if (!report) {

        return res.status(404).json({
          error:
            'Report not found'
        });
      }

      if (req.body.reason) {

        report.reason =
          req.body.reason.trim();
      }

      await report.save();

      res.json({

        success: true,

        message:
          'Report updated successfully',

        report
      });

    } catch (error) {

      console.error(
        '[UPDATE REPORT ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



module.exports = router;