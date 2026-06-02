import { AUDIO_BITRATE_HIGH, AUDIO_BITRATE_LOW, VIDEO_BITRATE_TIERS } from './webrtcConfig';

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Acquire or update local MediaStream without tearing down on unrelated state changes.
 */
export async function syncLocalMedia({
  stream,
  audioOnly,
  facingMode,
  buildVideoConstraints,
}) {
  if (!stream) {
    return navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: audioOnly ? false : buildVideoConstraints(facingMode),
    });
  }

  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();

  if (audioOnly && videoTracks.length > 0) {
    videoTracks.forEach((t) => {
      t.stop();
      stream.removeTrack(t);
    });
    return stream;
  }

  if (!audioOnly && videoTracks.length === 0) {
    const videoOnly = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: buildVideoConstraints(facingMode),
    });
    const track = videoOnly.getVideoTracks()[0];
    if (track) stream.addTrack(track);
    videoOnly.getTracks().forEach((t) => {
      if (t !== track) t.stop();
    });
    return stream;
  }

  if (!audioOnly && videoTracks.length > 0) {
    const fresh = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: buildVideoConstraints(facingMode),
    });
    const newTrack = fresh.getVideoTracks()[0];
    if (newTrack) {
      const old = videoTracks[0];
      const wasEnabled = old?.enabled ?? true;
      if (old) {
        stream.removeTrack(old);
        old.stop();
      }
      stream.addTrack(newTrack);
      newTrack.enabled = wasEnabled;
    }
    fresh.getTracks().forEach((t) => {
      if (t !== newTrack) t.stop();
    });
  }

  if (audioTracks.length === 0) {
    const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: false,
    });
    const a = audioOnlyStream.getAudioTracks()[0];
    if (a) stream.addTrack(a);
    audioOnlyStream.getTracks().forEach((t) => {
      if (t !== a) t.stop();
    });
  }

  return stream;
}

export function stopMediaStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}

export function applyEncoderBitrates(pc, { lowBandwidth, videoTier = 1 }) {
  if (!pc || pc.signalingState === 'closed') return;

  const tierIndex = lowBandwidth
    ? 0
    : Math.min(Math.max(videoTier, 0), VIDEO_BITRATE_TIERS.length - 1);
  const videoMax = VIDEO_BITRATE_TIERS[tierIndex];
  const audioMax = lowBandwidth ? AUDIO_BITRATE_LOW : AUDIO_BITRATE_HIGH;

  pc.getSenders().forEach((sender) => {
    if (!sender.track) return;
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];

    if (sender.track.kind === 'video') {
      params.encodings[0].maxBitrate = videoMax;
    } else if (sender.track.kind === 'audio') {
      params.encodings[0].maxBitrate = audioMax;
    }

    sender.setParameters(params).catch(() => {});
  });
}

/**
 * Adjust video tier from outbound-rtp packet loss and RTT (when not in manual low-bandwidth mode).
 * Returns new tier index or null if unchanged.
 */
export async function suggestVideoTier(pc, currentTier, { lowBandwidth }) {
  if (lowBandwidth || !pc) return null;

  const stats = await pc.getStats();
  let packetsLost = 0;
  let packetsSent = 0;
  let rttMs = 0;

  stats.forEach((report) => {
    if (report.type === 'outbound-rtp' && report.kind === 'video') {
      packetsLost += report.packetsLost || 0;
      packetsSent += report.packetsSent || 0;
    }
    if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime) {
      rttMs = Math.max(rttMs, report.currentRoundTripTime * 1000);
    }
  });

  const lossRatio = packetsSent > 10 ? packetsLost / packetsSent : 0;
  let next = currentTier;

  if (lossRatio > 0.08 || rttMs > 450) {
    next = Math.max(0, currentTier - 1);
  } else if (lossRatio < 0.02 && rttMs > 0 && rttMs < 180 && currentTier < VIDEO_BITRATE_TIERS.length - 1) {
    next = currentTier + 1;
  } else {
    return null;
  }

  return next !== currentTier ? next : null;
}

/** @returns {boolean} true if network suggests data-saver */
export function detectSlowNetwork() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return false;
  if (conn.saveData) return true;
  const slow = ['slow-2g', '2g', '3g'];
  return slow.includes(conn.effectiveType);
}

export const webrtcLog = (...args) => {
  if (import.meta.env.DEV) console.log('[WebRTC]', ...args);
};
