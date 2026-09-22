import { findCameraMovement } from './cinematography.mjs';

export const RUNWAY_MOTION_KNOWLEDGE_VERSION = '1.1.0';

const CAMERA_PHRASES = {
  locked: 'remains entirely locked off on a tripod',
  'push-in': 'slowly dollies forward along the optical axis toward the subject',
  'extreme-push': 'makes a nearly imperceptible, steady push toward the subject',
  'pull-back': 'smoothly dollies backward along the optical axis to reveal the surrounding space',
  pan: 'pans once from the starting subject to the ending subject while remaining fixed in place',
  tilt: 'tilts once from the starting detail toward the ending subject while remaining fixed in place',
  truck: 'tracks sideways parallel to the subject at a constant distance',
  follow: 'follows the subject at a constant height and distance with stabilized movement',
  'side-follow': 'tracks beside the subject at matching speed while keeping the subject on the same third',
  orbit: 'moves in one controlled 20-to-45-degree arc around the subject at a constant radius',
  'crane-up': 'rises vertically at a steady speed while preserving its horizontal position and angle',
  'crane-down': 'descends vertically at a steady speed toward the subject and settles at the final height',
  drone: 'glides forward from a stable aerial viewpoint with a level horizon',
  fpv: 'flies forward along one continuous path through the established space toward the final target',
  pov: 'moves from the character eye line with subtle, natural body motion',
  'over-shoulder': 'holds the foreground shoulder line and follows the eyeline toward the facing subject',
  handheld: 'stays close to the subject with restrained natural handheld breathing',
  'whip-pan': 'performs one fast directional pan from the starting target and locks onto the ending target',
  'focus-pull': 'remains locked off while focus shifts smoothly from the established foreground to the background subject',
  'dolly-zoom': 'dollies forward while the lens zooms back, preserving subject size as the background perspective stretches',
  zoom: 'remains fixed while the lens makes one smooth optical zoom toward the target detail',
  'crash-zoom': 'remains fixed and performs one rapid optical zoom to the target detail, then locks',
  'dutch-orbit': 'keeps the subject centered while making one small, even roll around the optical axis',
  'top-down': 'tracks parallel to the ground from a stable top-down viewpoint',
  'low-follow': 'tracks along the subject path from a constant low angle close to the ground',
  'high-follow': 'follows the subject from a constant elevated angle while keeping the route visible',
  'through-window': 'moves along one straight path through the established opening and settles inside the new space',
  'mask-transition': 'continues in one direction as the foreground object fills the frame and reveals the matching next view',
  snake: 'moves forward along one gentle S-shaped path with two smooth direction changes',
  'spiral-up': 'moves in one small arc around the subject while rising slowly at a constant radius',
  'spiral-down': 'moves in one small arc around the subject while descending slowly to the final framing',
  'bullet-time': 'moves through one short arc around the nearly frozen action, then returns to normal timing'
};

const sentence = value => String(value || '').trim().replace(/[。.!！?？]+$/u, '');

function paceFor(intensity) {
  const parsed = Number(intensity);
  const value = Number.isFinite(parsed) ? parsed : 35;
  if (value < 25) return 'Movement is very slow and nearly imperceptible';
  if (value < 55) return 'Movement is smooth and measured';
  return 'Movement is decisive with controlled acceleration and a stable finish';
}

/**
 * Compile an image-to-video prompt that leaves identity, composition, lighting and
 * style to the reference image and describes only observable motion and timing.
 */
export function compileRunwayMotionPrompt(payload = {}) {
  const camera = payload.camera || {};
  const movement = findCameraMovement(camera.move || payload.move || '固定镜头');
  const cameraPhrase = CAMERA_PHRASES[movement.id] || 'moves in one smooth, controlled path toward the established target';
  const subjectAction = sentence(payload.subjectAction || payload.prompt || 'performs one clear, physically observable action');
  const environmentAction = sentence(payload.environmentAction);
  const endFrame = sentence(payload.endFrame);
  const parts = [
    `The camera ${cameraPhrase}.`,
    `The subject ${subjectAction}.`,
    environmentAction ? `${environmentAction}.` : '',
    `${paceFor(camera.intensity ?? payload.intensity)}.`,
    'Continuous, seamless shot with stable timing.',
    endFrame ? `The shot settles on ${endFrame}.` : 'The shot settles into a stable final frame.'
  ];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function publicRunwayMotionKnowledge() {
  return {
    version: RUNWAY_MOTION_KNOWLEDGE_VERSION,
    updatedAt: '2026-09-04',
    principles: ['reference-image-defines-appearance', 'motion-only', 'one-primary-camera-move', 'positive-phrasing', 'continuous-shot', 'stable-end-frame'],
    cameraPhrases: { ...CAMERA_PHRASES }
  };
}
