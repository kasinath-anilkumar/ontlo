/**
 * WebRTC ICE configuration. Override via Vite env for production TURN.
 *
 * VITE_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
 * VITE_TURN_URLS=turn:your.turn.server:3478
 * VITE_TURN_USERNAME=...
 * VITE_TURN_CREDENTIAL=...
 */

const parseUrls = (raw, fallback) => {
  if (!raw || typeof raw !== 'string') return fallback;
  const urls = raw.split(',').map((u) => u.trim()).filter(Boolean);
  return urls.length ? urls : fallback;
};

const DEFAULT_STUN = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'];

const DEFAULT_TURN = [
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function getIceServers() {
  const stunUrls = parseUrls(import.meta.env.VITE_STUN_URLS, DEFAULT_STUN);
  const servers = stunUrls.map((urls) => ({ urls }));

  const turnUrls = parseUrls(import.meta.env.VITE_TURN_URLS, null);
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrls && turnUser && turnCred) {
    turnUrls.forEach((urls) => {
      servers.push({ urls, username: turnUser, credential: turnCred });
    });
  } else if (!import.meta.env.VITE_TURN_URLS) {
    servers.push(...DEFAULT_TURN);
  }

  return servers;
}

export function createPeerConnectionConfig() {
  return {
    iceServers: getIceServers(),
    iceCandidatePoolSize: 4,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}

export const VIDEO_BITRATE_TIERS = [150000, 400000, 750000];
export const AUDIO_BITRATE_LOW = 24000;
export const AUDIO_BITRATE_HIGH = 64000;
