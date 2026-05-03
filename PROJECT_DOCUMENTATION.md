# Ontlo Platform: Master Engineering Technical Specification
**Document Classification**: strictly-confidential // internal-engineering-only
**Version**: 3.0.0-final (Production Release candidate)
**Target Audience**: Staff Engineers, SREs, Security Operations, and Architecture Review Boards.

---

## 1. Executive Summary

### 1.1 Business Objective
Ontlo is engineered to capture the highly competitive "Instant Social Discovery" market segment within South Asia, specifically focusing on India. The primary objective is to offer synchronous, low-latency (< 200ms round-trip) video communication that bridges spontaneous interactions with robust, scalable infrastructure. 

### 1.2 Problem Statement
The current ecosystem of random video chat platforms (e.g., Omegle equivalents) fails on three major vectors:
1.  **Safety & Moderation**: Complete lack of identity verification and real-time moderation leading to high toxicity.
2.  **Latency & Reliability**: Poor WebRTC signaling implementations resulting in high drop rates and connection failures.
3.  **Compliance**: Zero adherence to modern data protection laws (such as India's DPDP Act 2023), exposing operators to severe legal liabilities.

### 1.3 Target Audience
*   **Primary Demographic**: Gen-Z and younger Millennials (18-35).
*   **Behavioral Segment**: Users seeking high-fidelity, synchronous engagement based on mutual interests rather than asynchronous, curated profile swiping.

### 1.4 Key Differentiators
*   **"Complete-Then-Create" Authentication Protocol**: Eliminates database pollution of incomplete profiles by holding registration state in memory until the 5-phase onboarding is finalized.
*   **Compliance-First Data Governance**: Native, hard-coded workflows for "Right to Erasure" (account and media purge) and "Right to Data Portability" (JSON payload generation).
*   **Hybrid Signaling Architecture**: Utilizes Socket.io for reliable state management and WebRTC for decentralized, low-latency media streams, augmented by Cloudinary for static media AI moderation.

---

## 2. Detailed System Architecture

### 2.1 Component-Level Breakdown

The Ontlo platform operates on a decoupled, micro-monolithic architecture, segregated into four primary operational domains:

1.  **Client-Side SPA (Single Page Application)**
    *   **Runtime**: Browser-based React 18 application.
    *   **Responsibility**: DOM management, local media stream capture (`getUserMedia`), WebRTC PeerConnection management, and UI rendering.
2.  **API Gateway & Business Logic (Node.js/Express)**
    *   **Runtime**: Node.js v20.x running Express.js.
    *   **Responsibility**: Stateless HTTP request processing, JWT validation, database CRUD operations, and interface with third-party APIs (Cloudinary).
3.  **Signaling & State Server (Socket.io)**
    *   **Runtime**: Attached to the primary Node.js HTTP server.
    *   **Responsibility**: Stateful management of connected clients, maintaining the matchmaking queue, broadcasting presence, and facilitating SDP (Session Description Protocol) and ICE candidate exchanges.
4.  **Persistence Layer (MongoDB)**
    *   **Runtime**: MongoDB Atlas (Cloud-hosted).
    *   **Responsibility**: Persistent storage of user schemas, cryptographic materials, interaction logs, and system configurations.

### 2.2 Data Flow (Step-by-Step Matchmaking & Call)

1.  **Connection Handshake**: The Client opens a WebSocket connection to the Server, transmitting its valid JWT in the `auth` object. The Server verifies the JWT, extracting the `userId`.
2.  **Presence Update**: The Server queries MongoDB, updates `onlineStatus: true`, and broadcasts the new online count to all connected clients (throttled).
3.  **Queue Entry**: The Client emits `join-queue`. The Server places the Socket ID into an in-memory matching pool, along with cached user metadata (age, gender, interests, region).
4.  **Match Evaluation**: The `Matchmaker` service runs a continuous evaluation loop. When two compatible users are identified (based on admin-configured `ageGap` and `radius`), they are removed from the queue.
5.  **Signaling Initiation**: The Server emits a `match-found` event containing a UUID `roomId` to both peers.
6.  **Offer/Answer Exchange**: 
    *   Peer A (Offeror) creates an SDP Offer and emits `webrtc-offer` via Socket.
    *   Server routes the offer to Peer B.
    *   Peer B generates an SDP Answer and emits `webrtc-answer` via Socket.
    *   Server routes the answer back to Peer A.
7.  **ICE Negotiation**: Both peers independently gather ICE candidates (network routes) from STUN servers and exchange them via `webrtc-ice-candidate` socket events.
8.  **P2P Streaming**: The `RTCPeerConnection` on both clients establishes a direct UDP connection, and video/audio tracks are played.
9.  **Teardown**: Upon a `skip` or disconnect, the Socket server handles cleanup, nullifies the active match, and re-inserts users into the queue if requested.

### 2.3 Failure Scenarios & Mitigation per Component

*   **API Server Crash**:
    *   *Scenario*: Node process exits due to unhandled promise rejection or memory leak.
    *   *Mitigation*: PM2/Docker restart policy automatically revives the process. Load balancer routes traffic to healthy nodes.
*   **Database Partition/Timeout**:
    *   *Scenario*: MongoDB Atlas becomes unreachable.
    *   *Mitigation*: Express error handler intercepts Mongoose timeouts. API returns HTTP 503. The `/health` endpoint reports degraded status, alerting SREs.
*   **Signaling Server Disconnect**:
    *   *Scenario*: Client loses websocket connection during a call.
    *   *Mitigation*: Socket.io client automatically attempts reconnection. The `Matchmaker` service implements a 5-second grace period (`handleDisconnect`) before permanently removing the user from the active match. If the user reconnects within 5 seconds, the match state is restored (`handleReconnect`).
*   **WebRTC ICE Failure**:
    *   *Scenario*: Symmetric NAT on both ends prevents direct P2P connection.
    *   *Mitigation*: Fallback to TURN server relay (requires configuration of Coturn or Twilio Network Traversal in production).

---

## 3. Technology Decisions

### 3.1 Backend: Node.js with Express
*   **Why**: Node.js provides a single-threaded, event-driven architecture that is exceptionally efficient for high-concurrency, I/O-bound workloads—specifically WebSocket signaling. Express is mature, battle-tested, and has an massive middleware ecosystem.
*   **Trade-offs**: Node is unsuitable for heavy CPU computations (e.g., video transcoding).
*   **Alternatives Rejected**: Django/Python (Synchronous nature requires heavy WSGI tweaking for WebSockets), Go (Higher learning curve for the current team size, though superior in raw concurrency).

### 3.2 Real-time: Socket.io
*   **Why**: Abstracts over raw WebSockets, providing automatic reconnections, multiplexing (namespaces/rooms), and broadcasting capabilities out of the box. Essential for reliable WebRTC signaling.
*   **Trade-offs**: Adds slightly more overhead than raw `ws`.
*   **Alternatives Rejected**: Raw WebSockets (Lacks reconnection logic and rooms), Pusher/PubNub (Vendor lock-in and high cost at scale).

### 3.3 Database: MongoDB (Mongoose ODM)
*   **Why**: The data model for user profiles (specifically `interests` arrays and nested `settings` objects) requires a flexible, document-based schema. Mongoose provides robust validation and lifecycle hooks.
*   **Trade-offs**: Lack of strict ACID compliance across multiple documents (though improved in newer versions).
*   **Alternatives Rejected**: PostgreSQL (Schema rigidity would slow down the rapid iteration of user profile features during the MVP phase).

### 3.4 Media Storage: Cloudinary
*   **Why**: Offers highly available edge CDN for image delivery, but crucially, provides on-the-fly transformations (cropping, face detection) and AI-driven moderation APIs to block NSFW content at the point of upload.

---

## 4. Application Structure

### 4.1 Backend Folder Structure
```text
server/
├── config/             # Environment variable validation, DB connection logic, JWT secrets
├── middleware/         # Reusable Express middleware (auth.js, validate.js, maintenance.js)
├── models/             # Mongoose schemas representing the data layer
├── routes/             # Express Routers, separated by domain (users, admin, auth, messages)
├── scripts/            # Scheduled CRON jobs (cleanup.js, keepAlive.js)
├── services/           # Complex business logic abstracted from controllers (Matchmaker.js)
├── utils/              # Helper functions (logger.js, monitor.js, api.js)
├── validators/         # Zod schemas for strict request payload validation
├── socket.js           # Socket.io connection and event mapping
└── server.js           # Application entry point, Express setup, global error handling
```

### 4.2 Frontend Folder Structure
```text
ontlo/
├── src/
│   ├── assets/         # Static images, icons
│   ├── components/
│   │   ├── admin/      # Governance UI components
│   │   ├── layout/     # Structural wrappers (AppLayout, Navbar)
│   │   ├── navigation/ # Sidebar, Routing logic
│   │   ├── ui/         # Reusable atomic UI elements (Buttons, Modals)
│   │   └── video/      # Complex WebRTC UI (VideoContainer, ChatPanel)
│   ├── context/        # React Context Providers (SocketContext)
│   ├── pages/          # Top-level route components (Auth, Home, Profile, AdminDashboard)
│   ├── utils/          # API fetch wrappers, WebRTC utilities, date formatters
│   ├── App.jsx         # React Router configuration
│   └── main.jsx        # React DOM rendering
```

### 4.3 Design Patterns Used
*   **Singleton Pattern**: The `Matchmaker.js` service is instantiated once to maintain the global state of user queues and active matches across all socket connections.
*   **Dependency Injection**: `socket.js` expects the `io` instance to be injected, allowing for easier mocking during testing.
*   **Strategy Pattern**: Used implicitly in authentication, where strategies (JWT Access vs Refresh) dictate middleware behavior.
*   **Container/Presentational Component Pattern**: In React, components like `VideoContainer.jsx` handle the complex WebRTC logic (Container), while rendering simpler, dumb UI elements for the actual video tags.

### 4.4 Coding Standards
*   **Strict Mode**: Enabled across React and Node.
*   **ES Modules**: Frontend uses ES Modules via Vite; Backend uses CommonJS (historical constraint, planned migration).
*   **Validation First**: All incoming API requests MUST pass through a Zod schema validation middleware before hitting business logic.
*   **Fat Models, Skinny Controllers**: Mongoose models handle their own data-integrity methods (e.g., `user.incLoginAttempts()`).

---

## 5. Database Design (VERY DETAILED)

### 5.1 User Collection (`users`)
**Purpose**: Core identity, profile metadata, and system flags.
*   `_id`: ObjectId (Auto-generated)
*   `username`: String (Unique, Indexed, lowercase)
*   `password`: String (Bcrypt hashed)
*   `email`: String (Unique, Sparse)
*   `profilePic`: String (Cloudinary URL)
*   `age`: Number
*   `dob`: Date
*   `gender`: Enum ['Male', 'Female', 'Other', 'Prefer not to say']
*   `location`: String
*   `interests`: Array of Strings (Indexed for matchmaking)
*   `bio`: String
*   `isProfileComplete`: Boolean (Default: false)
*   `onlineStatus`: Boolean (Indexed for queue filtering)
*   `role`: Enum ['user', 'moderator', 'admin', 'superadmin'] (Indexed)
*   `status`: Enum ['active', 'suspended', 'banned']
*   `isShadowBanned`: Boolean
*   `settings`: Object (Nested configuration like `emailNotifications`, `stealthMode`)
*   `refreshTokens`: Array of Strings (For multi-device session invalidation)
*   `loginAttempts`: Number
*   `lockUntil`: Number (Epoch timestamp for brute-force lockout)

**Sample Document**:
```json
{
  "_id": {"$oid": "60d5ec49e4b0a3c2b8c9d1a1"},
  "username": "cyber_punk",
  "password": "$2b$10$...",
  "profilePic": "https://res.cloudinary.com/.../image.jpg",
  "age": 24,
  "dob": {"$date": "2002-01-01T00:00:00.000Z"},
  "gender": "Male",
  "location": "Mumbai, India",
  "interests": ["Gaming", "Tech", "Music"],
  "onlineStatus": true,
  "role": "user",
  "status": "active",
  "settings": { "emailNotifications": true, "stealthMode": false },
  "refreshTokens": ["eyJhbG..."],
  "loginAttempts": 0
}
```

### 5.2 Connection Collection (`connections`)
**Purpose**: Audit log of established matches.
*   `_id`: ObjectId
*   `users`: Array of exactly two ObjectIds referencing `User`.
*   `status`: Enum ['active', 'blocked', 'removed']
*   `startedAt`: Date
*   `endedAt`: Date

### 5.3 Report Collection (`reports`)
**Purpose**: Moderation tracking.
*   `_id`: ObjectId
*   `reporter`: ObjectId (ref `User`)
*   `reportedUser`: ObjectId (ref `User`)
*   `reason`: String (e.g., "Inappropriate content", "Harassment")
*   `status`: Enum ['pending', 'reviewed', 'resolved', 'dismissed']
*   `severity`: Enum ['low', 'medium', 'high', 'critical']
*   `aiConfidence`: Number (0-100, populated if auto-generated by NLP filters)

### 5.4 Indexing Strategy
1.  **Unique Indexes**: `User.username`, `User.email` (Ensures data integrity).
2.  **Matchmaking Indexes**: Compound index on `{ onlineStatus: 1, isShadowBanned: 1, role: 1 }` to heavily optimize the discovery query.
3.  **Audit Indexes**: `Report.status` and `Report.createdAt` for sorting in the Admin Dashboard.

---

## 6. COMPLETE API Documentation

### 6.1 Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/check-username`
*   **Description**: Validates if a requested username is available during Phase 1 of onboarding.
*   **Auth Requirement**: Public
*   **Request Body**: `{ "username": "new_user123" }`
*   **Response (200 OK)**: `{ "available": true }`
*   **Error Cases**: 
    *   400: `{"error": "Username is required"}`

#### `POST /api/auth/register`
*   **Description**: Atomic creation of a user profile. Parses base64 images, uploads to Cloudinary, hashes password, and issues JWT tokens.
*   **Auth Requirement**: Public
*   **Request Body**: 
    ```json
    {
      "username": "...", "password": "...", "fullName": "...",
      "age": 24, "dob": "...", "gender": "Male", "location": "...",
      "interests": ["..."], "bio": "...", "profilePic": "data:image/jpeg;base64,..."
    }
    ```
*   **Response (201 Created)**: Sets `token` and `refreshToken` cookies. Returns: `{ "token": "...", "user": { ... } }`
*   **Error Cases**:
    *   400: `{"error": "Username already exists"}`
    *   500: `{"error": "Cloudinary upload failed"}`

#### `POST /api/auth/login`
*   **Description**: Authenticates a user. Increments `loginAttempts` on failure. Locks account after 5 failures for 2 hours.
*   **Auth Requirement**: Public
*   **Request Body**: `{ "username": "...", "password": "..." }`
*   **Response (200 OK)**: Sets secure cookies. Returns `{ "token": "...", "user": { ... } }`
*   **Error Cases**:
    *   401: `{"error": "Invalid credentials"}`
    *   403: `{"error": "Account is temporarily locked due to repeated failed login attempts..."}`

#### `POST /api/auth/refresh-token`
*   **Description**: Issues a new short-lived access token using a valid HTTP-Only refresh token.
*   **Auth Requirement**: Requires valid `refreshToken` cookie.
*   **Response (200 OK)**: `{ "token": "new_jwt" }`
*   **Error Cases**:
    *   401: `{"error": "No refresh token provided"}`
    *   403: `{"error": "Invalid refresh token"}`

### 6.2 Data Management Endpoints (`/api/users`)

#### `GET /api/users/export`
*   **Description**: Aggregates all user PII, connection history, messages, and reports into a downloadable JSON file (DPDP Act Compliance).
*   **Auth Requirement**: Valid JWT Access Token
*   **Response (200 OK)**: `application/json` payload containing full structured export.

#### `DELETE /api/users/account`
*   **Description**: Triggers the "Right to Erasure" workflow.
*   **Auth Requirement**: Valid JWT Access Token
*   **Action Flow**:
    1. Verify password.
    2. Extract Cloudinary public IDs from `profilePic` and message attachments, and execute `destroy()`.
    3. Delete all `Message` documents where user is sender.
    4. Nullify user reference in `Connection` documents.
    5. Delete `User` document.
*   **Response (200 OK)**: `{"message": "Account deleted successfully"}`

---

## 7. Authentication & Authorization

### 7.1 Full Login/Register Flow
Ontlo utilizes a **"Complete-Then-Create"** registration flow to prevent ghost accounts.
1.  User enters credentials. Client calls `POST /check-username`.
2.  If available, credentials are temporarily held in browser `localStorage`.
3.  User navigates through 4 profile configuration phases (Upload Photo, Demographics, Location/Bio, Interests).
4.  On final submission, all data (including Base64 image) is assembled and POSTed to `/register`.
5.  Server executes image upload, hashes password, saves DB record, generates tokens, and sets secure cookies.

### 7.2 Token Lifecycle
*   **Access Token (JWT)**: Payload contains `{ id, username }`. Signed with `JWT_SECRET`. Expires in **15 Minutes**. Passed via `Authorization: Bearer` header.
*   **Refresh Token (JWT)**: Payload contains `{ id }`. Signed with `JWT_REFRESH_SECRET`. Expires in **7 Days**. Passed via `HTTP-Only, Secure, SameSite` cookie.
*   **Session Invalidation**: Stored as an array (`refreshTokens`) in the User document. Logging out removes the specific token from the array. Changing password or triggering a security event flushes the entire array, forcing logouts on all devices.

---

## 8. Security Engineering

### 8.1 Threat Model
*   **XSS (Cross-Site Scripting)**: Mitigated by `xss-clean` middleware which sanitizes req.body, req.query, and req.params. React's JSX natively escapes string variables. Helmet implements a strict `Content-Security-Policy`.
*   **CSRF (Cross-Site Request Forgery)**: Mitigated by utilizing `SameSite=lax` (development) and `SameSite=none; Secure` (production) for the refresh token cookie, combined with requiring the Access Token in the Authorization header for state-changing operations.
*   **Brute Force Attacks**: Mitigated by `express-rate-limit` on the `/login` route (max 10 attempts / 15 minutes per IP) AND application-level locking (5 failed attempts per username locks the account for 2 hours).
*   **NoSQL Injection**: Mitigated by `express-mongo-sanitize`, which strips out keys containing `$` or `.` from requests.

### 8.2 Fraud Prevention & Abuse Strategy
*   **Auto-Moderator**: All Socket.io chat messages pass through `moderateText()`. High toxicity scores automatically generate a `Report` document with severity "high" and flag the message.
*   **Shadow Banning**: Admins can toggle `isShadowBanned`. A shadow-banned user can log in and join the queue, but the `Matchmaker` service will silently ignore them, preventing them from connecting with legitimate users without alerting the bad actor.

---

## 9. DevOps & Deployment

### 9.1 CI/CD Pipeline
*   **Source Control**: GitHub.
*   **Deployment Target (Backend)**: Render Web Services.
*   **Deployment Target (Frontend)**: Vercel.
*   **Trigger**: Pushes to the `main` branch trigger automated builds. Vercel automatically creates preview deployments for PRs.

### 9.2 Environments
*   **Local Development**: Run via `npm run dev` with local MongoDB instance or Atlas free tier. `.env` loaded via `dotenv`.
*   **Production**: Stricter environment variable enforcement. `NODE_ENV=production` triggers specific middleware logic (e.g., trusting proxies, enforcing HTTPS redirection).

### 9.3 Deployment Architecture
*   Render provisions a containerized Node environment. The `server.js` startup sequence validates the presence of critical ENV vars (`MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_API_KEY`) before attempting to bind to the port. If validation fails, process exits with code 1.

### 9.4 Rollback Strategy
*   Since the database schema is dynamic (NoSQL), code rollbacks do not require complex SQL migration rollbacks. Reverting the git commit and pushing will redeploy the previous stable container image on Render within 60 seconds.

---

## 10. Performance Optimization

### 10.1 Express / Node Optimization
*   **Body Parsing Limits**: `express.json` is strictly limited to `10mb` to allow for profile picture uploads via Base64 while preventing memory exhaustion attacks via massive payloads.
*   **Throttling**: The global `online-count` broadcast via Socket.io is throttled to execute a maximum of once every 5000ms, drastically reducing CPU cycles when thousands of users are connecting/disconnecting.

### 10.2 Database Optimization
*   `mongoose.connect` utilizes connection pooling to prevent socket exhaustion.
*   Discovery queries (`/api/users/discover`) limit results to `20` and heavily select only required fields (`.select('username profilePic age ...')`) to reduce memory footprint and network transfer.

### 10.3 Frontend Optimization
*   React Router implements Lazy Loading (`React.lazy`) for non-critical paths to minimize the initial Javascript bundle size.
*   WebRTC stream processing avoids state updates (re-renders) based on media tracks, relying instead on direct DOM node manipulation (`videoRef.current.srcObject`) to prevent UI stutter.

---

## 11. Scalability Architecture

### 11.1 Horizontal Scaling Strategy
*   The Node.js API is completely stateless (JWT auth). Scaling involves increasing instance count behind Render's load balancer.
*   **Database Scaling**: MongoDB Atlas allows zero-downtime vertical scaling (larger RAM/CPU instances) and horizontal scaling via Sharding (distributing collections across multiple replica sets based on a shard key, e.g., `region`).

### 11.2 WebSocket Scaling (The Hard Problem)
*   Currently, Socket.io connections map to a single memory space. 
*   **The Blueprint**: To scale beyond one Node process, we must implement the `@socket.io/redis-adapter`. This will allow multiple Node servers to communicate via a Redis Pub/Sub backplane. The `Matchmaker` logic must be refactored to utilize Redis for queue management to ensure users connected to Node A can match with users connected to Node B.

---

## 12. Monitoring & Logging

### 12.1 Logging Structure
*   A custom Winston logger (`utils/logger.js`) outputs structured JSON logs.
*   The global error handler intercepts all unhandled exceptions, formatting them into `{ error, stack, path, method }` payloads for easy indexing by log aggregators.
*   Business activity logging (`logActivity()`) writes security events (Logins, Registration, Profile Updates, Bans) to an `ActivityLog` collection for auditing.

### 12.2 Metrics & Alerting
*   The system exposes a robust `/health` endpoint that validates MongoDB connectivity and returns `200 OK` or `503 Degraded`.
*   The Admin Panel dashboard pulls aggregate statistics from `/api/stats`, providing real-time visualization of User Growth, Active Connections, and Pending Reports.

---

## 13. Testing Strategy

### 13.1 Expectations
*   **Unit Tests**: All pure functions (e.g., `calculateAge`, `validateAgeGate`) require 90%+ coverage.
*   **Integration Tests**: Essential for API routes. Mocking the MongoDB connection using `mongodb-memory-server` to validate the Registration -> Login -> Token Refresh lifecycle.
*   **E2E Tests**: WebRTC logic is notoriously difficult to test in unit frameworks. Playwright must be configured with simulated webcams (`--use-fake-device-for-media-stream`) to validate the entire matching and negotiation flow.

---

## 14. Failure Handling & Recovery

### 14.1 System Failures
*   **Database Outage**: The `server.js` startup script implements a fallback logic. If MongoDB fails to connect, the server attempts to start in "Offline Mode" (serving 503s gracefully rather than crashing in a loop).
*   **Graceful Shutdown**: Listening for `SIGTERM` and `SIGINT`. The server stops accepting new connections, gracefully closes all active Socket.io connections, closes the Mongoose pool, and exits with code 0 within a 10-second timeout window to prevent data corruption during deployments.

### 14.2 Degradation Strategy
*   If the Cloudinary API goes down, image uploads fail gracefully with explicit errors, but the core text-chat and WebRTC video signaling remain fully functional.

---

## 15. Legal & Compliance (India-Focused)

### 15.1 DPDP Act 2023 Implementation
The Digital Personal Data Protection Act requires explicit consent, purpose limitation, and data autonomy.
*   **Verifiable Consent**: Registration halts if the "18+ and Privacy Policy" explicit consent checkbox is unticked.
*   **Right to Access**: Implemented via the "Export My Data" profile button. Compiles all nested PII and interaction metadata into a downloadable JSON artifact.
*   **Right to Correction/Erasure**: Implemented via Profile Updates and the "Delete Account" button. Account deletion is an irreversible cascade delete of the user record, clearing out associated cloud media.

### 15.2 IT Rules 2021 (Intermediary Guidelines)
*   **Grievance Officer**: Details hardcoded and prominently displayed in the `PrivacyPolicy.jsx` and `TermsOfService.jsx`.
*   **Safe Harbor Maintenance**: In-app reporting mechanisms mapped directly to a dedicated Admin Panel queue for rapid 24-hour acknowledgment and 15-day resolution.

---

## 16. Product Roadmap

### 16.1 Phase 1 (Current Release)
*   Stabilization of WebRTC signaling.
*   Implementation of compliance architecture.
*   Delivery of Admin moderation tools.

### 16.2 Phase 2 (Monetization & Expansion)
*   **Premium Tiers**: Implementation of a subscription model (`isPremium: true`) granting UI badges and priority matchmaking queue routing.
*   **Virtual Currency/Gifts**: Integrating a payment gateway (e.g., Razorpay/Stripe) to allow users to purchase "Boosts".

### 16.3 Phase 3 (Infrastructure Evolution)
*   **Mobile Nativity**: Porting the React WebRTC implementation to React Native / Capacitor for distribution on Google Play and Apple App Store.
*   **Global Sharding**: Deploying the stack to Edge infrastructure and utilizing MongoDB Global Clusters to ensure video latency remains low for cross-continental matches.

---
**End of Document.**  
*Drafted by the Office of the Principal Architecture Review Board.*
