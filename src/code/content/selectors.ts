import { YouTubePageTypes } from "./types";

const { HomePage, WatchPage, VideosPage, StreamsPage } = YouTubePageTypes;

const progressBarSegmentSelector =
  '*[class*="ProgressBarSegment" i][style*="width"]';
const progressIdSelector = '#progress[style*="width"]';

export const selectors = {
  videosContainer: "contents",
  progressBarSelectors: {
    [HomePage]: progressBarSegmentSelector,
    [WatchPage]: progressBarSegmentSelector,
    [VideosPage]: progressIdSelector,
    [StreamsPage]: progressIdSelector,
  },
  membersOnlyBadge: "p.ytd-badge-supported-renderer",
};
