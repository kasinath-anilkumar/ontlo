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
**Purpose**: Core identity, profile metadata, matching preferences, and system flags.
*   `_id`: ObjectId (Auto-generated)
*   `username`: String (Unique, Indexed, lowercase)
*   `password`: String (Bcrypt hashed)
*   `email`: String (Unique, Sparse)
*   `fullName`: String
*   `dob`: Date
*   `age`: Number
*   `gender`: Enum `['Male', 'Female', 'Other', 'Prefer not to say']`
*   `location`: String
*   `locationCoordinates`: Geospatial coordinate object:
    *   `type`: String (enum: `['Point']`, default: `'Point'`)
    *   `coordinates`: Array of Numbers `[longitude, latitude]` (default: `[0, 0]`)
*   `interests`: Array of Strings (Indexed for matchmaking)
*   `bio`: String (Max 150 characters)
*   `profilePic`: String (Cloudinary URL)
*   `isProfileComplete`: Boolean (Default: false)
*   `onlineStatus`: Enum `['online', 'offline', 'away']` (Default: `'offline'`)
*   `role`: Enum `['user', 'moderator', 'admin', 'superadmin']` (Indexed)
*   `status`: Enum `['active', 'suspended', 'banned']` (Default: `'active'`)
*   `isShadowBanned`: Boolean (Default: false)
*   `isVerified`: Boolean (Default: false)
*   `isPremium`: Boolean (Default: false)
*   `premiumExpiresAt`: Date
*   `boosts`: Number (Default: 0)
*   `lastBoostedAt`: Date
*   `profileViews`: Number (Default: 0)
*   `favorites`: Array of ObjectIds (ref `User`)
*   `blockedUsers`: Array of ObjectIds (ref `User`)
*   `notificationCount`: Number (Default: 0)
*   `matchPreferences`: Advanced filters configuration:
    *   `gender`: Enum `['Male', 'Female', 'Other', 'Prefer not to say', 'All']` (Default: `'All'`)
    *   `ageRange`: Object `{ min: 18, max: 100 }`
    *   `interests`: Array of Strings
    *   `distance`: Number (in km)
*   `settings`: Object (Nested configuration like `emailNotifications`, `stealthMode`)
*   `refreshTokens`: Array of Strings (For multi-device session invalidation)
*   `loginAttempts`: Number (Default: 0)
*   `lockUntil`: Number (Epoch timestamp for brute-force lockout)
*   `lastSeen`: Date

### 5.2 Connection Collection (`connections`)
**Purpose**: Stores active connections, conversation metadata, and user snapshots.
*   `_id`: ObjectId (Auto-generated)
*   `users`: Array of exactly 2 ObjectIds (ref `User`, pre-validate hook sorts these to maintain stable ordering)
*   `pairKey`: String (Stable unique pair identifier: `userA_userB`, unique index)
*   `status`: Enum `['active', 'blocked']` (Default: `'active'`)
*   `blockedBy`: ObjectId (ref `User`, default: null)
*   `userDetails`: Array of embedded user snapshots (avoids populate joins):
    *   `_id`, `username`, `profilePic`, `onlineStatus`
*   `lastMessage`: Snapshot object of the last message activity:
    *   `text`: String (Max 1000 characters)
    *   `sender`: ObjectId (ref `User`)
    *   `createdAt`: Date
*   `messageCount`: Number (Default: 0)

### 5.3 Message Collection (`messages`)
**Purpose**: Stores all chat history within connection instances.
*   `_id`: ObjectId (Auto-generated)
*   `connectionId`: ObjectId (ref `Connection`, indexed)
*   `sender`: ObjectId (ref `User`, indexed)
*   `senderInfo`: Embedded sender snapshot `{ _id, username, profilePic }`
*   `text`: String (Max 5000 characters, required unless `imageUrl` is present)
*   `imageUrl`: String (Cloudinary URL, optional)
*   `isRead`: Boolean (Default: false)
*   `readAt`: Date
*   `deletedFor`: Array of ObjectIds (ref `User`, for soft delete per user)

### 5.4 Post Collection (`posts`)
**Purpose**: Social media post feed items.
*   `_id`: ObjectId (Auto-generated)
*   `user`: ObjectId (ref `User`, required, indexed)
*   `imageUrl`: String (Required, Cloudinary URL)
*   `width`: Number
*   `height`: Number
*   `caption`: String (Max 500 characters, auto-moderated)
*   `likes`: Array of ObjectIds (ref `User`)
*   `comments`: Array of nested comment objects:
    *   `_id`: ObjectId
    *   `user`: ObjectId (ref `User`, required)
    *   `text`: String (Required, Max 200 characters)
    *   `createdAt`: Date
    *   `replies`: Array of nested replies `{ user (ref User), text (Max 200), createdAt }`
*   `visibility`: Enum `['connections', 'public', 'private']` (Default: `'connections'`)

### 5.5 Like Collection (`likes`)
**Purpose**: Tracks sent connection requests / likes for mutual matchmaking.
*   `_id`: ObjectId (Auto-generated)
*   `fromUser`: ObjectId (ref `User`, required, indexed)
*   `toUser`: ObjectId (ref `User`, required, indexed)
*   `isRead`: Boolean (Default: false)
*   `readAt`: Date
*   `isMatch`: Boolean (Default: false)

### 5.6 Notification Collection (`notifications`)
**Purpose**: Stores user-directed notifications with automated cleanup.
*   `_id`: ObjectId (Auto-generated)
*   `user`: ObjectId (ref `User`, required, indexed)
*   `type`: Enum `['like', 'message', 'announcement', 'system', 'match', 'ping', 'alert', 'info']`
*   `content`: String (Required, Max 500 characters)
*   `fromUser`: Embedded snapshot `{ _id, username, profilePic }`
*   `relatedId`: ObjectId (Related connection/message/announcement id)
*   `isRead`: Boolean (Default: false)
*   `readAt`: Date
*   `expiresAt`: Date (TTL index, defaults to 30 days from creation)

### 5.7 ActivityLog Collection (`activitylogs`)
**Purpose**: Audit logs for security, operations, and governance.
*   `_id`: ObjectId (Auto-generated)
*   `userId`: ObjectId (ref `User`, required, indexed)
*   `action`: Enum `['login', 'logout', 'profile_update', 'password_change', 'report_filed', 'suspicious_activity', 'admin_action', 'config_update', 'broadcast_sent', 'registration', 'export_data', 'account_deletion', 'role_change', 'status_change', 'user_block', 'user_unblock', 'ticket_created', 'ticket_replied', 'ticket_status_change']` (Required)
*   `ip`: String
*   `userAgent`: String
*   `deviceType`: String
*   `location`: Object `{ city, country }`
*   `metadata`: Mixed type (dynamic details)

### 5.8 AppConfig Collection (`appconfigs`)
**Purpose**: Singleton document storing application settings and safety thresholds.
*   `radius`: Number (Default: 50 km)
*   `ageGap`: Number (Default: 10 years)
*   `boostPremium`: Boolean (Default: true)
*   `bannedKeywords`: Array of Strings
*   `autoModerate`: Boolean (Default: true)
*   `toxicityThreshold`: Number (Default: 0.7)
*   `safetyBlurDuration`: Number (Default: 3 seconds)
*   `allowedAdminIPs`: Array of Strings
*   `dailyMessageLimit`: Number (Default: 50)
*   `bioMaxLength`: Number (Default: 150)
*   `maintenanceMode`: Boolean (Default: false)
*   `maintenanceMessage`: String
*   `updatedBy`: ObjectId (ref `User`)

### 5.9 Subscription Collection (`subscriptions`)
**Purpose**: Purchase records for billing and premium memberships.
*   `_id`: ObjectId (Auto-generated)
*   `user`: ObjectId (ref `User`, required)
*   `plan`: Enum `['premium_monthly', 'premium_yearly', 'boost_pack_5', 'boost_pack_10']` (Required)
*   `status`: Enum `['active', 'expired', 'cancelled', 'pending']` (Default: `'pending'`)
*   `amount`: Number
*   `currency`: String (Default: `'USD'`)
*   `paymentId`: String
*   `startDate`: Date
*   `endDate`: Date

### 5.10 SupportTicket Collection (`supporttickets`)
**Purpose**: Support requests and compliance grievances.
*   `_id`: ObjectId (Auto-generated)
*   `user`: ObjectId (ref `User`, required, indexed)
*   `subject`: String (Required, Max 150 characters)
*   `message`: String (Required, Max 5000 characters)
*   `status`: Enum `['pending', 'in-progress', 'resolved']` (Default: `'pending'`)
*   `priority`: Enum `['low', 'medium', 'high', 'critical']` (Default: `'low'`)
*   `responses`: Array of nested moderator response objects:
    *   `admin`: ObjectId (ref `User`)
    *   `message`: String
    *   `createdAt`: Date
*   `lastResponseAt`: Date
*   `assignedTo`: ObjectId (ref `User`, moderator/admin)
*   `closedAt`: Date

### 5.11 Announcement Collection (`announcements`)
**Purpose**: Global system broadcast announcements.
*   `_id`: ObjectId (Auto-generated)
*   `title`: String (Required, Max 120 characters)
*   `content`: String (Required, Max 5000 characters)
*   `type`: Enum `['announcement', 'alert', 'info']` (Default: `'announcement'`)
*   `targetCriteria`: Demographic targeting filters:
    *   `role`, `gender`, `minAge`, `maxAge`, `location`
*   `sentBy`: ObjectId (ref `User`, required)
*   `stats`: Object `{ deliveredCount, clickedCount }`
*   `isActive`: Boolean (Default: true)
*   `expiresAt`: Date

### 5.12 Report Collection (`reports`)
**Purpose**: Safety, content violation, and user abuse reports.
*   `_id`: ObjectId (Auto-generated)
*   `reporter`: ObjectId (ref `User`, required, indexed)
*   `reportedUser`: ObjectId (ref `User`, required, indexed)
*   `reason`: String (Required, Max 1000 characters)
*   `roomId`: String (Active call session ID if applicable)
*   `status`: Enum `['pending', 'resolved', 'dismissed']` (Default: `'pending'`)
*   `severity`: Enum `['low', 'medium', 'high', 'critical']` (Default: `'low'`)
*   `moderatorAction`: Enum `['none', 'warning', 'suspended', 'banned']` (Default: `'none'`)
*   `aiConfidence`: Number (0-100, default: 0)
*   `aiSummary`: String
*   `moderatorNote`: String
*   `resolvedAt`: Date
*   `resolvedBy`: ObjectId (ref `User`)

### 5.13 Indexing Strategy
1.  **Unique Compound Keys**:
    *   `Connection.pairKey` (unique) prevents duplicate connection records.
    *   `Like.{fromUser, toUser}` (unique) prevents duplicate likes.
2.  **Geospatial Indexing**:
    *   `User.locationCoordinates` has a `2dsphere` index to support efficient geospatial queries (e.g. `$geoWithin` / `$centerSphere` for discovering nearby users).
3.  **Time-To-Live (TTL) Index**:
    *   `Notification.expiresAt` has a TTL index (`expireAfterSeconds: 0`) to automatically delete notifications after 30 days, managing data footprint.
4.  **Optimized Sorting & History Indexes**:
    *   `Message.{connectionId: 1, createdAt: -1}` optimizes paginated chat retrieval.
    *   `Message.{connectionId: 1, sender: 1, isRead: 1}` optimizes mark-as-read updates.
    *   `Notification.{user: 1, createdAt: -1}` optimizes dashboard activity feeds.

---

## 6. COMPLETE API Documentation

### 6.1 Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/check-username`
*   **Description**: Validates if a requested username is available during Phase 1 of onboarding.
*   **Auth Requirement**: Public
*   **Request Body**: `{ "username": "new_user123" }`
*   **Response (200 OK)**: `{ "available": true }`
*   **Errors**: 400 (Username is required)

#### `POST /api/auth/register`
*   **Description**: Atomic creation of a user profile. Uploads profile photo to Cloudinary, hashes password, and issues JWT tokens.
*   **Auth Requirement**: Public
*   **Request Body**:
    ```json
    {
      "username": "...", "password": "...", "fullName": "...",
      "age": 24, "dob": "...", "gender": "Male", "location": "...",
      "interests": ["..."], "bio": "...", "profilePic": "data:image/jpeg;base64,..."
    }
    ```
*   **Response (201 Created)**: Sets `token` and `refreshToken` cookies. Returns `{ "token": "...", "user": { ... } }`
*   **Errors**: 400 (Username already exists), 500 (Cloudinary upload failed)

#### `POST /api/auth/login`
*   **Description**: Authenticates a user. Increments failed attempts and locks accounts after 5 failures for 2 hours.
*   **Auth Requirement**: Public
*   **Request Body**: `{ "username": "...", "password": "..." }`
*   **Response (200 OK)**: Sets secure cookies. Returns `{ "token": "...", "user": { ... } }`
*   **Errors**: 401 (Invalid credentials), 403 (Account temporarily locked)

#### `POST /api/auth/refresh-token`
*   **Description**: Issues a new short-lived access token using a valid HTTP-Only refresh token.
*   **Auth Requirement**: Requires valid `refreshToken` cookie.
*   **Response (200 OK)**: `{ "token": "new_jwt" }`
*   **Errors**: 401 (No refresh token provided), 403 (Invalid refresh token)

### 6.2 User Management Endpoints (`/api/users`)

#### `GET /api/users/discover`
*   **Description**: Fetches compatible users for social discovery matching gender, age, interests, and geospatial proximity preferences.
*   **Auth Requirement**: Private (JWT Access Token)
*   **Response (200 OK)**: Array of matching user profiles, sorted with premium users prioritized.

#### `GET /api/users/me`
*   **Description**: Retrieves cached profile metadata of the currently logged-in user.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Current user document (excluding credentials).

#### `GET /api/users/blocked/list`
*   **Description**: Retrieves the list of users blocked by the current user.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of blocked user details.

#### `GET /api/users/:id`
*   **Description**: Looks up a single user profile. Increments `profileViews` if viewed by another user.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Selected user's profile metadata and their connection count.

#### `PATCH /api/users/profile/update`
*   **Description**: Updates user profile. Re-evaluates profile completeness and propagates username/profile picture updates to active connections, messages, and notifications snapshots.
*   **Auth Requirement**: Private
*   **Request Body**: Fields to update (e.g. `fullName`, `bio`, `matchPreferences`, `locationCoordinates`).
*   **Response (200 OK)**: Updated user document.

#### `POST /api/users/presence/update`
*   **Description**: Manually updates presence status.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "status": "online" }` (online, offline, or away)
*   **Response (200 OK)**: `{ "success": true }`

#### `POST /api/users/block/:id`
*   **Description**: Blocks a user. Automatically cascades deletion to any connections, messages, and notifications between the two users.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "success": true }`

#### `POST /api/users/unblock/:id`
*   **Description**: Unblocks a previously blocked user.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "success": true }`

#### `DELETE /api/users/account`
*   **Description**: Irreversibly purges the user profile, connections, likes, messages, notifications, support tickets, and triggers forced socket disconnection (DPDP Act Compliance).
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "success": true, "message": "Account permanently deleted" }`

#### `GET /api/users/export`
*   **Description**: Exports all PII and user history into a downloadable JSON file (DPDP Act Compliance).
*   **Auth Requirement**: Private
*   **Response (200 OK)**: JSON data file representation.

### 6.3 Connections Endpoints (`/api/connections`)

#### `GET /api/connections`
*   **Description**: Returns active connections formatted with live online status indicators, and list of pending inbound matching requests (likes).
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of active connections and pending matching requests.

#### `DELETE /api/connections/:id`
*   **Description**: Deletes a connection or pending connection request, cleaning up associated messages and notifications.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "message": "Connection removed" }`

#### `GET /api/connections/online`
*   **Description**: Fetches the subset of connections that are currently online.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of online connections.

#### `POST /api/connections/:id/ping`
*   **Description**: Sends a friendly ping/wave notification to a connected connection.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "message": "Ping sent successfully" }`

### 6.5 Posts & Feed Endpoints (`/api/posts`)

#### `GET /api/posts/feed`
*   **Description**: Returns the user's home feed consisting of posts from active connections and public visibility scopes.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of populated post documents.

#### `GET /api/posts/my-posts`
*   **Description**: Retrieves all posts created by the current user.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of posts.

#### `GET /api/posts/user/:userId`
*   **Description**: Retrieves posts created by a specific user (restricted by visibility).
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of posts.

#### `POST /api/posts`
*   **Description**: Creates a new post. Captions are run through text moderation.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "imageUrl": "...", "caption": "...", "visibility": "...", "width": X, "height": Y }`
*   **Response (201 Created)**: Created post document.

#### `POST /api/posts/:id/like`
*   **Description**: Likes or unlikes a post.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "likes": X, "isLiked": boolean }`

#### `POST /api/posts/:id/comment`
*   **Description**: Adds a comment to a post.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "text": "..." }`
*   **Response (200 OK)**: Populated comment object.

#### `POST /api/posts/:postId/comment/:commentId/reply`
*   **Description**: Replies to a specific comment.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "text": "..." }`
*   **Response (200 OK)**: Created reply object.

#### `DELETE /api/posts/:id`
*   **Description**: Deletes a post (must be owner).
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "message": "Post deleted successfully" }`

#### `DELETE /api/posts/:postId/comment/:commentId`
*   **Description**: Deletes a comment (must be post owner or comment author).
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "message": "Comment deleted successfully" }`

### 6.6 Interactions Endpoints (`/api/interactions`)

#### `GET /api/interactions/received`
*   **Description**: Fetches up to 50 inbound connection likes/requests.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of likes with populated sender details.

#### `POST /api/interactions/:userId`
*   **Description**: Sends a connection like request to a target user. If a mutual like exists, instantly accepts and establishes a `Connection`, notifies both parties, and triggers WebRTC matching events.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "success": true, "isMatch": boolean }`

#### `POST /api/interactions/accept/:userId`
*   **Description**: Accepts a pending connection request from a user, creating the Connection and notifications.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "success": true, "message": "Match accepted" }`

#### `GET /api/interactions/favorites`
*   **Description**: Retrieves the list of favorite users.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of favorite users.

#### `POST /api/interactions/favorites/:userId`
*   **Description**: Toggles user favorite status.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Updated favorites array.

### 6.7 Notifications Endpoints (`/api/notifications`)

#### `GET /api/notifications`
*   **Description**: Fetches notifications for the user. Supports `limit`, `explain`, and `benchmark` parameters.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of notification documents.

#### `PATCH /api/notifications/:id/read`
*   **Description**: Marks a specific notification as read, decrementing the user's unread counter.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "message": "Marked as read" }`

#### `POST /api/notifications/read-all`
*   **Description**: Marks all notifications as read and resets the user's unread badge count to 0.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "message": "All marked as read" }`

#### `GET /api/notifications/counts`
*   **Description**: Returns current unread notification and pending request counters (cached for 15s).
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "notifications": X, "connections": Y }`

#### `DELETE /api/notifications/:id`
*   **Description**: Deletes a specific notification.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "success": true }`

#### `POST /api/notifications/bulk-delete`
*   **Description**: Deletes an array of notifications.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "ids": ["...", "..."] }`
*   **Response (200 OK)**: `{ "success": true, "deletedCount": X }`

### 6.8 Support & Grievance Endpoints (`/api/support`)

#### `POST /api/support/create`
*   **Description**: Creates a user support ticket. Enforces a 2-minute spam throttle.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "subject": "...", "message": "...", "priority": "low" }`
*   **Response (201 Created)**: SupportTicket document.

#### `GET /api/support/my-tickets`
*   **Description**: Fetches all support tickets opened by the current user.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of support tickets.

#### `GET /api/support/all`
*   **Description**: Admins/Moderators read all system tickets.
*   **Auth Requirement**: Private (Admin/Moderator role required)
*   **Response (200 OK)**: Array of tickets with populated user info.

#### `POST /api/support/reply/:id`
*   **Description**: Admin replies to a ticket.
*   **Auth Requirement**: Private (Admin/Moderator role required)
*   **Request Body**: `{ "message": "..." }`
*   **Response (200 OK)**: Updated ticket document.

#### `PATCH /api/support/status/:id`
*   **Description**: Updates ticket status (pending, in-progress, resolved).
*   **Auth Requirement**: Private (Admin/Moderator role required)
*   **Request Body**: `{ "status": "resolved" }`
*   **Response (200 OK)**: Updated ticket document.

### 6.9 Billing & Monetization Endpoints (`/api/billing`)

#### `GET /api/billing/status`
*   **Description**: Retrieves current billing parameters for a user.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "isPremium": boolean, "premiumExpiresAt": "...", "boosts": X }`

#### `POST /api/billing/upgrade`
*   **Description**: Mock subscription purchase. Extends premium status by 30 (monthly) or 365 (yearly) days.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "plan": "premium_monthly" }`
*   **Response (200 OK)**: Upgraded user profile.

#### `POST /api/billing/buy-boosts`
*   **Description**: Mock boost package purchase. Increments the user's available boosts.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "pack": "boost_pack_10" }`
*   **Response (200 OK)**: Upgraded user profile.

#### `POST /api/billing/boost`
*   **Description**: Consumes 1 boost to prioritize the user in matchmaking queues for 1 hour.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: `{ "message": "Profile boosted! ...", "user": { ... } }`

### 6.10 Safety & Report Endpoints (`/api/report`)

#### `POST /api/report`
*   **Description**: Submits an abuse report against another user. Enforces a 5-minute spam cooldown between reports.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "reportedUserId": "...", "reason": "...", "roomId": "...", "severity": "medium" }`
*   **Response (201 Created)**: `{ "success": true, "message": "Report submitted successfully" }`

#### `GET /api/report/my-reports`
*   **Description**: Fetches a list of reports submitted by the current user.
*   **Auth Requirement**: Private
*   **Response (200 OK)**: Array of reports.

#### `PUT /api/report/:id`
*   **Description**: Updates a pending report's reason description.
*   **Auth Requirement**: Private
*   **Request Body**: `{ "reason": "..." }`
*   **Response (200 OK)**: Updated report details.

### 6.11 System Administration Endpoints (`/api/admin`)

#### `GET /api/admin/stats`
*   **Description**: Compiles dashboard overview stats, growth rates, and 7-day registration history charts.
*   **Auth Requirement**: Private (Admin/Moderator required)
*   **Response (200 OK)**: Overview metrics and historical data objects.

#### `GET /api/admin/logs`
*   **Description**: Retrieves system audit and user activity logs.
*   **Auth Requirement**: Private (Admin/Moderator required)
*   **Query Params**: `userId`, `action` (optional filters)
*   **Response (200 OK)**: Array of activity logs.

#### `GET /api/admin/users`
*   **Description**: Lists users with search, role, status filters, and pagination.
*   **Auth Requirement**: Private (Admin/Moderator required)
*   **Response (200 OK)**: `{ "users": [...], "totalPages": X, "currentPage": Y, "totalUsers": Z }`

#### `POST /api/admin/users/create-staff`
*   **Description**: Creates a new administrator or moderator account.
*   **Auth Requirement**: Private (SuperAdmin only)
*   **Request Body**: `{ "username": "...", "password": "...", "email": "...", "role": "moderator" }`
*   **Response (200 OK)**: Success confirmation.

#### `POST /api/admin/users/:id/action`
*   **Description**: Performs administrative status actions (ban, suspend, verify).
*   **Auth Requirement**: Private (Admin/SuperAdmin required)
*   **Request Body**: `{ "action": "...", "status": "suspended", "isVerified": true }`
*   **Response (200 OK)**: Updated user document.

#### `GET /api/admin/reports`
*   **Description**: Lists all reports in the system populated with repeat offender statistics.
*   **Auth Requirement**: Private (Admin/Moderator required)
*   **Response (200 OK)**: Array of reports with historical stats.

#### `POST /api/admin/moderation/reports/:id/resolve`
*   **Description**: Resolves a report, recording moderator actions, and closing the feedback trust loop by notifying the reporter.
*   **Auth Requirement**: Private (Admin/Moderator required)
*   **Request Body**: `{ "action": "suspended" }`
*   **Response (200 OK)**: `{ "message": "Report resolved" }`

#### `GET /api/admin/broadcasts`
*   **Description**: Retrieves announcement history and delivery counts.
*   **Auth Requirement**: Private (Admin/SuperAdmin required)
*   **Response (200 OK)**: Array of announcement history records.

#### `POST /api/admin/broadcast`
*   **Description**: Sends a system-wide broadcast notification to all users and inserts a persistent notification.
*   **Auth Requirement**: Private (Admin/SuperAdmin required)
*   **Request Body**: `{ "text": "...", "type": "announcement" }`
*   **Response (200 OK)**: Broadcast details.

#### `POST /api/admin/config/keywords`
*   **Description**: Updates banned word moderation lists and clears configuration cache.
*   **Auth Requirement**: Private (Admin/SuperAdmin required)
*   **Request Body**: `{ "keywords": ["...", "..."] }`
*   **Response (200 OK)**: Success confirmation.

#### `GET /api/admin/matchmaking/config`
*   **Description**: Fetches global matchmaking algorithm preferences (ageGap, radius, premium prioritisation).
*   **Auth Requirement**: Private (Admin/SuperAdmin required)
*   **Response (200 OK)**: Algorithm preferences.

#### `POST /api/admin/matchmaking/config`
*   **Description**: Updates global matchmaking algorithm preferences.
*   **Auth Requirement**: Private (Admin/SuperAdmin required)
*   **Request Body**: `{ "settings": { "radius": 100, "ageGap": 5, "boostPremium": true } }`
*   **Response (200 OK)**: `{ "message": "Algorithm settings updated" }`

#### `GET /api/admin/export/users`
*   **Description**: Exports complete user records list in CSV format.
*   **Auth Requirement**: Private (SuperAdmin required)
*   **Response (200 OK)**: CSV attachment download.

#### `GET /api/admin/system/health`
*   **Description**: Infrastructure metrics (uptime, memory, DB readiness status, count stats).
*   **Auth Requirement**: Private (SuperAdmin required)
*   **Response (200 OK)**: Health summary payload.

#### `POST /api/admin/audit`
*   **Description**: Triggers a database latency test, memory audit, and suspicious account activity security audit.
*   **Auth Requirement**: Private (SuperAdmin required)
*   **Response (200 OK)**: Audit metrics object.

#### `GET /api/admin/config`
*   **Description**: Returns full AppConfig document.
*   **Auth Requirement**: Private (Admin/SuperAdmin required)
*   **Response (200 OK)**: Configuration details.

#### `POST /api/admin/config/update`
*   **Description**: Updates any global configuration settings.
*   **Auth Requirement**: Private (Admin/SuperAdmin required)
*   **Request Body**: Configuration settings keys and values.
*   **Response (200 OK)**: Updated configuration document.

#### `GET /api/admin/metrics`
*   **Description**: Custom runtime system metric profiles.
*   **Auth Requirement**: Private (SuperAdmin required)
*   **Response (200 OK)**: Performance metrics JSON payload.

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

### 16.1 Phase 1: MVP Real-time Foundations (COMPLETED)
*   Establishment of the low-latency hybrid signaling protocol with Socket.io and WebRTC PeerConnections.
*   Implementation of the core matchmaking engine featuring criteria sorting and age-gate bounds.
*   Creation of verification checks and DPDP compliance-first data models.

### 16.2 Phase 2: Privacy Social Media Discovery & Monetization (COMPLETED)
*   Transitioned database models to support full social discovery, feed posting, and text messages (User, Post, Like, Message, Connection, Notification models).
*   Introduced a post feed system with multi-format image attachments, auto-moderated captions, comments, and replies.
*   Implemented full direct messaging (DM) layers with soft deletes, unread counters, and instant matching workflows.
*   Delivered premium tiers (monthly/yearly subscriptions) and profile boost token actions allowing users to prioritize discovery listings.
*   Launched complete system-wide moderator control panels including AppConfig adjustments, user suspension/banning status controls, in-app safety reports resolution, and direct grievance support tickets.

### 16.3 Phase 3: Scaling & Mobile Port (PLANNED)
*   **Mobile Clients**: Porting web components to React Native / Expo to launch native applications in the App Store and Google Play Store.
*   **Real-time Filters**: Implementing client-side WebGL filter nodes (AR mask filters, real-time audio tuning) to enhance visual/audio user adventure during live calls.
*   **Global Architecture**: Incorporating a Redis pub/sub backplane socket adapter and distributed DB replica sets to scale matchmaking operations across regions.

---

## 17. Retention & Growth Engineering

The Ontlo platform utilizes a series of **Value-Driven Habituation** loops designed to drive high Daily Active User (DAU) and Long-Term Value (LTV) without resorting to predatory or manipulative "dark patterns."

### 17.1 Serendipity & Unpredictability (Variable Reward)
*   **Wildcard Matching**: The matchmaking algorithm (`Matchmaker.js`) includes a 10% "Wildcard" probability that intentionally bypasses user-defined filters (Region/Gender) to create serendipitous human connections.
*   **Visual Reinforcement**: Wildcard matches are visually flagged with a unique UI badge to frame the encounter as a "rare event," increasing psychological engagement.

### 17.2 Information Gap & Intrigue (Curiosity Loop)
*   **Progressive Exposure**: Connections begin with a 30-second heavy video blur (`curiosityBlurTimer`).
*   **Psychological Hook**: By withholding the visual reveal while maintaining the audio/interest context, users are incentivized to initiate conversation to "earn" the visual reveal, reducing instant "looks-based" skipping.

### 17.3 Friction Reduction (Conversation Starter)
*   **Contextual Icebreakers**: Upon `match-found`, the system calculates the intersection of shared interests and emits a tailored prompt (e.g., *"You both like Music! Best concert you've ever been to?"*).
*   **Impact**: This reduces the cognitive load of the first 10 seconds, which is the highest churn point in video social apps.

### 17.4 Social Reciprocity (Social Return Loop)
*   **Ping/Wave Mechanism**: Implemented a notification-based re-engagement system where users can "Ping" past connections.
*   **Hook**: This leverages social obligation, bringing dormant users back into the application via contextual, user-generated triggers rather than generic system spam.

### 17.5 Investment & Validation (Fast Feedback Loop)
*   **Profile Boosts**: Updating profile bios or media grants a temporary 1-hour priority boost (`lastBoostedAt`) in the matchmaking queue.
*   **Reward**: This ensures users receive immediate positive reinforcement (more matches/conversations) immediately after investing effort into their digital identity.

---

**End of Document.**  
*Drafted by the Office of the Principal Architecture Review Board.*
