import Tab = browser.tabs.Tab;
import { YouTubePageTypes } from "../content/types";
import { BrowserEvents } from "../content/events";

export interface State {
  extensionIsEnabled: boolean | undefined;
  hiddenVideosCount: number | undefined;
}

export interface MessagePayload {
  browserEvent: BrowserEvents;
  tabId: number | undefined;
  extensionIsEnabled: boolean;
  currentYouTubePageType: YouTubePageTypes;
}

export interface UpdateIconProperties {
  extensionIsEnabled?: boolean;
  tabUrl?: string;
}

export interface UpdateStateProperties {
  browserEvent: BrowserEvents;
  extensionIsEnabled?: boolean;
  activeTab?: Tab;
}
