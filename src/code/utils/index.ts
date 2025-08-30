import { YouTubePageTypes } from "../content/types";

const { HomePage, WatchPage, VideosPage, StreamsPage } = YouTubePageTypes;

const youTubePageTypesRegex: Record<YouTubePageTypes, RegExp> = {
  [HomePage]: /youtube\.com\/?$/,
  [WatchPage]: /youtube\.com\/watch/,
  [VideosPage]: /youtube\.com\/@.+\/videos/,
  [StreamsPage]: /youtube\.com\/@.+\/streams/,
};

export function getCurrentYouTubePageType(url: string | undefined) {
  if (!url) {
    console.error(`Can't get current page type for missing url: ${url}`);

    return null;
  }

  const found = Object.entries(youTubePageTypesRegex).find(
    ([_pageType, regExp]) => regExp.test(url),
  );

  return found ? (found[0] as YouTubePageTypes) : null;
}
