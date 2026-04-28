# Ontlo Project Documentation

Last reviewed: 2026-04-28

This document describes the Ontlo codebase, operational model, data handling, security controls, and legal/compliance procedures. It is intended for project owners, developers, administrators, security reviewers, and legal/compliance stakeholders.

Important: this document is operational and technical documentation, not legal advice. Have qualified counsel review user-facing Terms of Service, Privacy Policy, age requirements, lawful basis, data retention, safety obligations, and jurisdiction-specific compliance before production launch.

## 1. Executive Summary

Ontlo is a real-time social/video matching platform with three main applications:

- `ontlo`: public user-facing React/Vite application.
- `admin`: administrator React/Vite application.
- `server`: Node.js/Express backend with MongoDB, Socket.IO, JWT authentication, WebRTC signaling, Cloudinary uploads, moderation, support, notifications, and admin APIs.

Core product capabilities:

- User registration, login, onboarding, and profile editing.
- Realtime random video matching using Socket.IO signaling and browser WebRTC.
- Persistent connections after mutual connect action.
- Realtime and stored chat messages.
- Profile image and chat image uploads through Cloudinary.
- User blocking, reporting, support tickets, and moderation workflows.
- Admin dashboard, user management, reports, broadcasts, configuration, analytics, logs, and system health.

## 2. Repository Structure

```text
D:\Ontlo
|-- admin/                 Admin React/Vite application
|-- ontlo/                 Public React/Vite application
|-- server/                Backend API and realtime server
|-- render.yaml            Render deployment blueprint
|-- PROJECT_DOCUMENTATION.md
|-- production_documentation.md.resolved
```

Key backend folders:

```text
server/
|-- config/                JWT and Cloudinary configuration
|-- middleware/            Auth, admin auth, maintenance middleware
|-- models/                Mongoose data models
|-- routes/                REST API route modules
|-- scripts/               Admin, seed, keep-alive, and database scripts
|-- services/              Matchmaking service
|-- utils/                 Moderation helper
|-- server.js              Express, Socket.IO, MongoDB bootstrap
|-- socket.js              Realtime events and WebRTC signaling
```

## 3. Technology Stack

Frontend:

- React 19
- Vite
- React Router
- Socket.IO client
- Lucide React icons
- Tailwind/PostCSS tooling
- Recharts in the admin app
- Axios in the admin app

Backend:

- Node.js
- Express 5
- Socket.IO
- MongoDB with Mongoose
- JWT authentication with `jsonwebtoken`
- Password hashing with `bcrypt`
- Cloudinary image storage
- Multer in-memory upload handling
- Helmet security headers
- CORS
- Express rate limiting

Infrastructure:

- Render blueprint for backend web service and public frontend static site.
- Vercel rewrite config exists in both frontend apps.
- MongoDB is expected through `MONGO_URI`.
- Cloudinary is expected for image hosting.

## 4. Application Architecture

### 4.1 Public User App

Directory: `ontlo/`

Routes:

- `/auth`: registration and login.
- `/setup-profile`: onboarding/profile completion.
- `/`: home.
- `/video`: video matching.
- `/connections`: connection list.
- `/messages`: messaging.
- `/who-liked-you`: likes placeholder/page.
- `/favorites`: favorites placeholder/page.
- `/notifications`: notifications.
- `/profile`: profile, support, settings, blocked users.

The public app stores the user JWT in browser `localStorage` under `token` and user profile data under `user`.

### 4.2 Admin App

Directory: `admin/`

Routes:

- `/login`: admin login.
- `/`: dashboard.
- `/users`: users and staff creation.
- `/banned`: banned users.
- `/suspended`: suspended users.
- `/moderation`: reports/moderation.
- `/broadcast`: announcements.
- `/support`: support tickets.
- `/config`: platform configuration.
- `/analytics`: analytics.
- `/system`: system health/audit.
- `/logs`: activity logs.

The admin app stores the admin JWT in browser `localStorage` under `admin_token`.

### 4.3 Backend API and Realtime Server

Directory: `server/`

`server.js` performs:

- Environment loading through `dotenv`.
- Production environment validation.
- Express and HTTP server creation.
- Socket.IO server creation with matching CORS policy.
- Helmet security middleware.
- CORS middleware.
- Maintenance middleware.
- JSON body parsing.
- Auth route rate limiting for login/register.
- MongoDB connection.
- REST route registration.
- Socket.IO event registration.
- Graceful shutdown for `SIGTERM` and `SIGINT`.
- Render keep-alive startup if `RENDER_EXTERNAL_URL` exists.

## 5. Environment Variables

Do not commit real secrets. Current repository `.env` files exist locally; document and rotate values through deployment dashboards or secret managers.

### 5.1 Backend: `server/.env`

Required in production:

```text
PORT
MONGO_URI
JWT_SECRET
CORS_ORIGIN
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Meaning:

- `PORT`: backend HTTP port, defaults to `5000`.
- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: signing secret for user and admin JWTs.
- `CORS_ORIGIN`: comma-separated allowed frontend/admin origins.
- `CLOUDINARY_CLOUD_NAME`: Cloudinary account cloud name.
- `CLOUDINARY_API_KEY`: Cloudinary API key.
- `CLOUDINARY_API_SECRET`: Cloudinary API secret.

Optional:

- `NODE_ENV`: use `production` in production.
- `RENDER_EXTERNAL_URL`: enables keep-alive self-ping on Render.

### 5.2 Public Frontend: `ontlo/.env`

```text
VITE_API_URL
```

Should point to the backend base URL, for example `https://api.example.com`.

### 5.3 Admin Frontend: `admin/.env`

```text
VITE_API_URL
```

The admin API wrapper expects this to usually point to the admin API base, for example `https://api.example.com/api/admin`. It also derives `API_BASE_URL` by removing `/api/admin`.

## 6. Installation and Local Development

Prerequisites:

- Node.js compatible with the installed dependencies.
- npm.
- MongoDB local instance or hosted MongoDB URI.
- Cloudinary account for image upload features.

Install dependencies:

```bash
cd server
npm install

cd ../ontlo
npm install

cd ../admin
npm install
```

Run backend:

```bash
cd server
npm run dev
```

Run public frontend:

```bash
cd ontlo
npm run dev
```

Run admin frontend:

```bash
cd admin
npm run dev
```

Build:

```bash
cd ontlo
npm run build

cd ../admin
npm run build
```

Backend production start:

```bash
cd server
npm start
```

## 7. Deployment

### 7.1 Render

`render.yaml` defines:

- `ontlo-backend`: Node web service rooted at `server`.
- `ontlo-frontend`: static site rooted at `ontlo`.

Production backend variables are configured in the Render dashboard. `JWT_SECRET` is generated by Render in the blueprint; database, CORS, and Cloudinary values are marked as dashboard-managed.

### 7.2 Vercel

Both `ontlo/vercel.json` and `admin/vercel.json` rewrite all routes to `index.html`, supporting React Router single-page routing.

### 7.3 Production Deployment Checklist

- Set `NODE_ENV=production`.
- Set `MONGO_URI` to production database.
- Set a strong unique `JWT_SECRET`.
- Set `CORS_ORIGIN` to exact production frontend/admin domains.
- Set Cloudinary credentials.
- Confirm HTTPS is enabled on all public endpoints.
- Confirm admin frontend is deployed to a restricted/known domain.
- Remove default admin credentials and rotate any seeded password.
- Confirm database backups and restoration process.
- Confirm privacy policy, terms, community guidelines, and support/contact pages are published.
- Confirm data deletion/export workflows are operational.

## 8. Data Model and Data Inventory

### 8.1 User

Collection: `users`

Stores:

- Authentication data: `username`, `password` hash.
- Optional contact data: `email`.
- Profile data: `fullName`, `age`, `dob`, `gender`, `location`, `interests`, `bio`, `profilePic`.
- Account state: `role`, `status`, `isVerified`, `isProfileComplete`, `onlineStatus`, `isShadowBanned`.
- Safety data: `blockedUsers`.
- Referral data: `referralCode`, `referredBy`.
- Device/security metadata: `lastIp`.
- Settings: email notifications, discovery mode, stealth mode, language.
- Timestamps: `createdAt`, `updatedAt`.

Sensitive fields:

- Password hashes.
- Date of birth and age.
- Location.
- IP address.
- User-generated profile data.

### 8.2 Connection

Collection: `connections`

Stores:

- Pair of user IDs in `users`.
- `status`: active or blocked.
- Timestamps.

### 8.3 Message

Collection: `messages`

Stores:

- `connectionId`.
- `sender`.
- `text` or `imageUrl`.
- `timestamp`.
- `isRead`.

Sensitive fields:

- Private user communications.
- Images uploaded in chat.

### 8.4 Notification

Collection: `notifications`

Stores:

- Recipient user.
- Type: like, message, announcement, system, match, alert, info.
- Content.
- Optional `fromUser`.
- Optional `relatedId`.
- Read state.
- Timestamps.

### 8.5 Report

Collection: `reports`

Stores:

- Reporter.
- Reported user.
- Reason.
- Room ID.
- Status.
- AI/moderation confidence and summary fields.
- Moderator note.
- Timestamps.

### 8.6 SupportTicket

Collection: `supporttickets`

Stores:

- User.
- Subject.
- Message.
- Status.
- Admin responses.
- Timestamps.

### 8.7 ActivityLog

Collection: `activitylogs`

Stores:

- User ID.
- Action.
- IP.
- User agent.
- Device type.
- Optional location.
- Metadata.
- Timestamps.

### 8.8 AppConfig

Collection: `appconfigs`

Stores:

- Matchmaking settings: radius, age gap, premium boost.
- Safety settings: banned keywords, auto-moderation, safety blur duration.
- Platform limits: daily message limit, bio max length.
- System settings: maintenance mode, maintenance message.
- Updated-by user.
- Timestamps.

## 9. REST API Reference

All authenticated routes use bearer JWT tokens:

```text
Authorization: Bearer <token>
```

### 9.1 Health

- `GET /`: returns API running message.
- `GET /health`: returns server/database status.

### 9.2 Auth: `/api/auth`

- `POST /register`: create user, validate password strength, hash password, return JWT.
- `POST /login`: login user/admin, compare password hash, return JWT.
- `POST /complete-profile`: update profile/onboarding data.

### 9.3 Users: `/api/users`

- `GET /discover`: get potential matches based on config and online status.
- `GET /online`: get online connected users for home page.
- `GET /:id`: get public profile details for a user.
- `POST /block`: block another user and remove existing connection.
- `GET /blocked/list`: list blocked users.
- `POST /unblock`: unblock a user.
- `PATCH /settings`: update user settings.

Note: `GET /:id` is declared before `/blocked/list` in `routes/users.js`, so `/blocked/list` can be incorrectly treated as an ID route. Move `/blocked/list` above `/:id`.

### 9.4 Connections: `/api/connections`

- `GET /`: list current user's connections with last message.
- `DELETE /:id`: remove a connection.
- `GET /online`: list online connections.

Note: `/online` is declared after `/:id`, but only `DELETE /:id` exists, so the current ordering does not conflict for GET.

### 9.5 Messages: `/api/messages`

- `GET /:connectionId`: fetch up to 100 messages for a connection.
- `POST /:connectionId/read`: mark messages in a connection as read.

Security note: the route currently fetches messages by `connectionId` after JWT auth, but should also verify the authenticated user belongs to that connection.

### 9.6 Notifications: `/api/notifications`

- `GET /`: list up to 50 notifications for current user.
- `PATCH /:id/read`: mark a notification as read.
- `POST /read-all`: mark all current user's notifications as read.
- `GET /counts`: get message/notification/connection counts.

Note: `GET /counts` is declared after `PATCH /:id/read`; method difference avoids that specific collision, but route ordering should still keep static routes before dynamic ones as a convention.

### 9.7 Upload: `/api/upload`

- `POST /profile-pic`: upload profile image to Cloudinary.
- `POST /chat-image`: upload chat image to Cloudinary.

Controls:

- Requires JWT.
- Accepts JPG, PNG, and WEBP only.
- Uses memory storage.
- Enforces 5 MB file size limit.
- Uploads transformed image with width/height limit of 500.

### 9.8 Reports: `/api/report`

- `POST /`: submit report.
- `GET /my-reports`: list current user's reports.
- `PUT /:id`: update current user's own report reason.

### 9.9 Stats: `/api/stats`

- `GET /`: returns connection/message/like counts for authenticated user.

Note: this route appears to query old `requester`/`recipient` fields that are not in the current `Connection` schema. It should be updated to use `users`.

### 9.10 Support: `/api/support`

- `POST /create`: create support ticket.
- `GET /my-tickets`: list current user's tickets.
- `GET /all`: list all tickets.
- `POST /reply/:id`: reply to ticket.
- `PATCH /status/:id`: update ticket status.

Security note: `/all`, `/reply/:id`, and `/status/:id` use general auth rather than admin role auth. They should use `adminAuth` or be mounted only behind admin middleware.

### 9.11 Admin: `/api/admin`

- `GET /stats`: dashboard metrics.
- `GET /logs`: activity logs.
- `GET /users`: users with search/pagination.
- `POST /users/create-staff`: create staff user, superadmin only.
- `POST /users/:id/action`: ban/suspend/verify/update status.
- `GET /reports`: list reports.
- `POST /moderation/reports/:id/resolve`: resolve report.
- `GET /broadcasts`: broadcast history.
- `POST /broadcast`: create global announcement and notifications.
- `POST /config/keywords`: update banned keyword list.
- `GET /support`: list support tickets.
- `POST /support/:id/resolve`: resolve support ticket.
- `GET /matchmaking/config`: get matchmaking configuration.
- `POST /matchmaking/config`: update matchmaking configuration.
- `GET /export/users`: export users CSV, superadmin only.
- `GET /system/health`: system health, superadmin only.
- `GET /notifications`: admin notification alerts.
- `POST /audit`: run system audit, superadmin only.
- `POST /users/:id/update`: update selected profile fields.
- `GET /config`: get global config.
- `POST /config/update`: update global config.

## 10. Realtime Events and WebRTC

Socket.IO is mounted on the backend HTTP server and uses the same CORS policy as REST.

### 10.1 Connection Authentication

The client sends JWT in the Socket.IO handshake auth object. On valid token:

- `socket.userId` is set.
- The socket joins `user_<userId>`.
- User profile fields are loaded for matching.
- User is marked online.
- Online count is broadcast for normal users.

### 10.2 Matchmaking Events

Client emits:

- `join-queue`: join matchmaking queue.
- `leave-queue`: leave matchmaking queue.
- `action-skip`: skip active match.
- `action-connect`: request/persist connection for matched room.

Server emits:

- `match-found`: room ID, caller/receiver role, remote user ID.
- `match-ended`: match ended due to skip/disconnect.
- `peer-wants-connection`: peer clicked connect.
- `connection-established`: persistent connection created.
- `online-count`: current online count.

### 10.3 WebRTC Signaling Events

Client emits and receives:

- `webrtc-offer`
- `webrtc-answer`
- `webrtc-ice-candidate`

The backend relays signaling data to the Socket.IO room. Media streams are intended to be peer-to-peer between browsers; the backend does not store video/audio content.

### 10.4 Chat Events

Client emits:

- `join-chat`
- `chat-message`
- `typing`
- `stop-typing`

Server handles:

- `join-chat`
- `chat-message`

Server currently does not explicitly handle `typing`, `stop-typing`, or `leave-chat`, although the client emits/listens for them. Add server handlers if typing indicators are required.

### 10.5 Notification Events

Server emits:

- `notification-update`
- `support-update`
- `support-update-admin`

## 11. Authentication and Authorization

### 11.1 Passwords

- Passwords are hashed using `bcrypt`.
- Registration and staff creation enforce a strong password format:
  - At least 8 characters.
  - At least one lowercase letter.
  - At least one uppercase letter.
  - At least one number.
  - At least one special character from `@$!%*?&#`.

### 11.2 JWT

- JWTs are signed with `JWT_SECRET`.
- Auth tokens contain user ID and username.
- Tokens expire in 7 days.
- Frontends store JWTs in browser `localStorage`.

Risk note: `localStorage` is vulnerable to token theft if XSS occurs. Consider HTTP-only secure cookies or hardened CSP if risk level requires stronger browser token protection.

### 11.3 Roles

Supported user roles:

- `user`
- `moderator`
- `admin`
- `superadmin`

`adminAuth` verifies:

- Bearer token exists.
- Token is valid.
- User exists.
- User status is active.
- User role is in allowed roles.

Known role issue:

- Some support admin operations use general `auth`, not `adminAuth`. This should be remediated before production.
- `support` is used in some admin role checks, but `User.role` enum does not include `support`.

## 12. Security Controls

Implemented controls:

- Bcrypt password hashing.
- JWT authentication.
- Admin role-based middleware.
- Login/register rate limiting: 10 attempts per 15 minutes per IP.
- Helmet security headers.
- CORS allowlist in production through `CORS_ORIGIN`.
- Production startup fails if required environment variables are missing.
- File upload type and size restrictions.
- Cloudinary hosted image storage.
- Maintenance mode support in config/socket layer.
- User blocklists integrated into matchmaking.
- Moderation keyword filtering for chat messages when enabled.
- Account status checks for admin routes.
- Graceful shutdown.

Recommended security improvements:

- Verify resource ownership on all message and connection routes.
- Use `adminAuth` for all admin support routes.
- Add request validation schemas for all routes.
- Escape banned keywords before constructing moderation regex.
- Add MongoDB injection protection consistently.
- Add account lockout or CAPTCHA after repeated failed logins.
- Add refresh token/session revocation strategy.
- Add audit logs for login, logout, profile update, support actions, export actions, and role changes.
- Do not seed production admin with default `admin123`.
- Add strict Content Security Policy.
- Add security monitoring and alerting.
- Add dependency vulnerability scanning.
- Add automated tests for auth, RBAC, uploads, and data access boundaries.

## 13. Data Protection and Privacy

### 13.1 Personal Data Categories

Ontlo processes:

- Account identifiers: username, optional email.
- Authentication secret derivatives: password hashes.
- Profile attributes: name, age, date of birth, gender, location, bio, interests, profile image.
- Communications: chat messages, chat images, support tickets.
- Safety/moderation data: reports, blocked users, account statuses, moderator notes.
- Technical data: IP, user agent, online status, timestamps.
- Admin activity data: activity logs and audit metadata.

### 13.2 Special Considerations

The platform includes video matching and social discovery. Depending on jurisdiction and actual usage, age, date of birth, location, profile photos, video interactions, and moderation records may require heightened handling.

### 13.3 Data Storage Locations

- MongoDB: primary application data.
- Cloudinary: uploaded profile and chat images.
- Browser localStorage: JWT and selected user/admin session data.
- Hosting provider logs: request/runtime logs may include IPs and error context.

### 13.4 Data Transmission

Production must use HTTPS/WSS. WebRTC media is peer-to-peer after signaling; the backend relays only signaling data and chat events.

### 13.5 Data Retention Policy

Define and approve retention periods before production. Suggested baseline:

- User account data: retain while account is active.
- Deleted account data: delete or anonymize within 30 days unless legal hold applies.
- Chat messages: retain while connection/account exists, with deletion process available.
- Reports and moderation data: retain 1-3 years depending on legal/safety requirements.
- Support tickets: retain 1-3 years depending on business/legal needs.
- Activity/security logs: retain 90-365 days depending on security policy.
- Cloudinary images: delete when user deletes image/account or when chat deletion policy applies.

Current implementation does not include complete automated retention/deletion jobs.

### 13.6 Data Subject/User Rights Procedures

Depending on jurisdiction, support processes should cover:

- Access request: export user's profile, messages, reports submitted by them, support tickets, notifications, and relevant logs.
- Correction request: allow profile updates and support-assisted correction.
- Deletion request: delete or anonymize account, messages where legally possible, images, tickets, and notifications.
- Objection/restriction: suspend discovery/matching or deactivate account.
- Portability: provide machine-readable export, such as JSON/CSV.

Current implementation includes a superadmin CSV user export but does not include full per-user export or deletion automation.

## 14. Legal and Compliance Procedures

### 14.1 Required Public Legal Documents

Before production, publish and maintain:

- Privacy Policy.
- Terms of Service.
- Community Guidelines.
- Cookie/Tracking Notice if analytics or tracking tools are added.
- Child safety/age policy.
- Content reporting and moderation policy.
- Data deletion/account deletion instructions.
- Contact email/address for privacy and legal notices.

### 14.2 Age and Safety

The profile update route validates age between 13 and 120. Registration can accept profile age but does not enforce the same 13+ validation during initial registration. Decide the minimum age policy and enforce it consistently.

Recommended:

- Block users below the legal minimum age for target jurisdictions.
- Add date-of-birth based age calculation.
- Add parental consent or age-gating requirements if legally required.
- Provide clear reporting, blocking, and support access.

### 14.3 User Consent and Notice

Users should be informed:

- What data is collected.
- Why it is collected.
- How chat/video matching works.
- Whether video/audio is stored. Current code does not store video/audio streams.
- That chat messages/images may be stored and moderated.
- That reports and support requests are reviewed by admins/moderators.
- Which third-party processors are used, including MongoDB hosting, Cloudinary, Render/Vercel, and any analytics tools if added.

### 14.4 Law Enforcement and Legal Requests

Create a written procedure:

- Verify request authenticity.
- Log request receipt and reviewer.
- Preserve relevant records only when legally valid.
- Produce minimum necessary data.
- Notify user unless prohibited.
- Keep a legal request register.

### 14.5 Content Moderation Procedure

Current mechanisms:

- User report submission.
- Admin report list and resolution.
- User block.
- Banned keyword replacement in chat if enabled.
- Admin account suspension/ban/verification controls.

Recommended moderation workflow:

- Triage new reports by severity.
- Prioritize imminent harm, minors, threats, sexual exploitation, harassment, and illegal content.
- Review report context and account history.
- Apply action: dismiss, warn, suspend, ban, escalate, or legal preservation.
- Record moderator note and action.
- Notify affected users when appropriate.
- Track repeat offenders.

### 14.6 Incident Response Procedure

Severity levels:

- Critical: data breach, secret leak, unauthorized admin access, active abuse at scale.
- High: privilege escalation, exposed private messages, upload abuse.
- Medium: service outage, broken moderation queue, abnormal login attempts.
- Low: minor bug with limited impact.

Response steps:

1. Identify and scope incident.
2. Contain affected systems or credentials.
3. Preserve logs and evidence.
4. Rotate secrets if exposure is possible.
5. Patch vulnerability or disable affected feature.
6. Assess user/data impact.
7. Notify users/regulators when legally required.
8. Document root cause and corrective actions.

## 15. Admin Operations

### 15.1 Create Superadmin

Scripts:

```bash
cd server
node scripts/seedAdmin.js
node scripts/ensureAdmin.js
node scripts/makeAdmin.js <username>
```

Security warning:

- `seedAdmin.js` and `ensureAdmin.js` use default password `admin123`.
- Never use default credentials in production.
- After running either script, immediately login and rotate the password or replace the script for secure credential input.

### 15.2 User Management

Admins can:

- Search/list users.
- Suspend, ban, verify, and update selected profile fields.
- Create staff users as superadmin.
- Export users CSV as superadmin.

### 15.3 Broadcasts

Admins can create announcements. The backend:

- Creates an `Announcement` record.
- Creates notifications for all users.
- Emits realtime notification updates.

### 15.4 Config Management

Admins can update:

- Matchmaking settings.
- Banned keywords.
- Auto moderation.
- Platform limits.
- Maintenance mode.

Known issue:

- Some routes use older `AppConfig` key/value patterns while the schema stores direct fields. Standardize config access before relying on all admin settings.

## 16. Backup and Recovery

Required backup policy:

- Enable automated MongoDB backups.
- Retain daily backups for a defined period.
- Test restoration at least quarterly.
- Store backup credentials separately from app credentials.
- Include Cloudinary asset backup/export policy if required by business needs.

Recovery procedure:

1. Declare incident and stop writes if data corruption is suspected.
2. Snapshot current state for forensic review.
3. Restore database to a staging environment first.
4. Validate user, connection, message, report, and config collections.
5. Promote restored data or apply targeted fix.
6. Record incident timeline.

## 17. Observability and Monitoring

Current:

- Console logging.
- `/health` endpoint.
- Admin `/api/admin/system/health`.
- Admin `/api/admin/audit`.

Recommended:

- Centralized structured logs.
- Error tracking.
- Uptime checks for `/health`.
- Database connection alerts.
- Rate-limit and failed-login monitoring.
- Admin action monitoring.
- Cloudinary upload error monitoring.
- Socket connection and queue depth metrics.

## 18. Testing and Quality

Current package scripts:

- Frontend/admin: `npm run lint`, `npm run build`.
- Backend: no real test suite; `npm test` exits with error placeholder.

Recommended tests:

- Auth registration/login/profile tests.
- JWT and role authorization tests.
- Admin RBAC tests.
- Message access control tests.
- Support ticket admin authorization tests.
- Upload validation tests.
- Matchmaking blocklist and age-gap tests.
- Report submission and resolution tests.
- Frontend route smoke tests.

## 19. Known Risks and Remediation Backlog

High priority:

- Add ownership checks for `GET /api/messages/:connectionId` and read receipt routes.
- Protect admin support routes with `adminAuth`.
- Fix `GET /api/users/blocked/list` route order.
- Replace default admin password scripts with secure onboarding.
- Add account deletion/export workflows.
- Add consistent age enforcement during registration and onboarding.
- Standardize `AppConfig` schema usage.

Medium priority:

- Add validation middleware for request bodies.
- Add centralized auth middleware instead of duplicated JWT code in routes.
- Add automated test coverage.
- Add centralized audit logging for sensitive admin and user actions.
- Escape banned keyword regex input.
- Add retention/deletion jobs.
- Add CSRF/XSS-hardening strategy for token storage.

Low priority:

- Add server handlers for typing and leave-chat events.
- Improve CSV escaping for exports.
- Add pagination to reports/support endpoints.
- Add admin search support in logs route if UI expects it.

## 20. Third-Party Services and Processors

Current/expected third parties:

- MongoDB hosting provider: database storage.
- Cloudinary: image storage and transformation.
- Render: backend and possibly frontend hosting.
- Vercel: possible frontend/admin hosting.

For legal/compliance:

- Maintain data processing agreements where applicable.
- Document regions used for storage/processing.
- Document subprocessors in Privacy Policy.
- Review each provider's retention, breach notification, and deletion behavior.

## 21. Secure Coding Guidelines for Future Changes

- Never log passwords, JWTs, secrets, or full Authorization headers.
- Never commit `.env` files or production credentials.
- Validate and sanitize all route inputs.
- Check authenticated user ownership before returning private records.
- Use `adminAuth` for admin-only actions.
- Keep static Express routes before dynamic `/:id` routes.
- Add tests for any route that exposes private data.
- Prefer least-privilege roles.
- Use exact CORS origins in production.
- Rotate secrets after suspected exposure.

## 22. Glossary

- JWT: JSON Web Token used for stateless authentication.
- WebRTC: browser technology for peer-to-peer audio/video streams.
- Socket.IO: realtime event layer used for chat, notifications, matchmaking, and WebRTC signaling.
- Connection: persistent relationship between two users after mutual connect.
- Report: user-submitted safety/moderation complaint.
- Support ticket: user support request handled by admins/support staff.
- AppConfig: database-backed platform settings.
