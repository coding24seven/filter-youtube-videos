import { YouTubePageTypes } from './types';

const {
  HomePage,
  SubscriptionsPage,
  WatchPage,
  ChannelHomePage,
  ChannelFeaturedPage,
  ChannelVideosPage,
  ChannelStreamsPage,
} = YouTubePageTypes;

const contents = '#contents';

const watchPageVideo = 'yt-lockup-view-model';
const channelHomePageVideo = 'ytd-grid-video-renderer';
const otherPagesVideo =
  'ytd-rich-item-renderer:not([is-post]):not([is-slim-media])';

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
  video: {
    [HomePage]: otherPagesVideo,
    [SubscriptionsPage]: otherPagesVideo,
    [WatchPage]: watchPageVideo,
    [ChannelHomePage]: channelHomePageVideo,
    [ChannelFeaturedPage]: channelHomePageVideo,
    [ChannelVideosPage]: otherPagesVideo,
    [ChannelStreamsPage]: otherPagesVideo,
  },
};
