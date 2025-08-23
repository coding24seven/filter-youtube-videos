import { YouTubePageTypes } from "../content/types";

const { HomePage, WatchPage, VideosPage, StreamsPage } = YouTubePageTypes;

const youTubePageTypesRegex: Record<YouTubePageTypes, RegExp> = {
  [HomePage]: /youtube\.com\/?$/,
  [WatchPage]: /youtube\.com\/watch/,
  [VideosPage]: /youtube\.com\/@.+\/videos/,
  [StreamsPage]: /youtube\.com\/@.+\/streams/,
};

export function getCurrentPageType(url: string) {
  const found = Object.entries(youTubePageTypesRegex).find(
    ([_pageType, regExp]) => regExp.test(url),
  );

  return found ? (found[0] as YouTubePageTypes) : null;
}
