const contents = '#contents';

const videoRenderers = [
  'ytd-grid-video-renderer',
  'ytd-rich-item-renderer',
  'yt-lockup-view-model',
].join(', ');

const progressBarSegment = '*[class*="ProgressBarSegment" i][style*="width"]';
const progressId = '#progress[style*="width"]';
const progressBar = [progressBarSegment, progressId].join(', ');

const membersOnlyBadgeSupportedRenderer = 'p.ytd-badge-supported-renderer';
const membersOnlyBadgeSupportedRendererElement = 'ytd-badge-supported-renderer';
const commerceBadge = 'badge-shape.yt-badge-shape.yt-badge-shape--commerce';
const membersOnlyBadge2026Ui = 'badge-shape.ytBadgeShapeCommerce';

const membersOnlyBadge = [
  membersOnlyBadgeSupportedRenderer,
  commerceBadge,
  membersOnlyBadgeSupportedRendererElement,
  membersOnlyBadge2026Ui,
].join(', ');

const chipsContainer = 'iron-selector#chips';

const numberedVideoClass = 'numbered-video';
const videoNumberClass = 'video-number';

export const selectors = {
  numberedVideoClass,
  videoNumberClass,
  contents,
  progressBar,
  membersOnlyBadge,
  chips: chipsContainer,
  video: videoRenderers,
};
