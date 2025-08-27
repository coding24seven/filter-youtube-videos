import Tab = browser.tabs.Tab;
import { YouTubePageTypes } from "../content/types";

export interface MessagePayload {
  extensionIsEnabled: boolean;
  currentPageType: YouTubePageTypes;
}

export interface UpdateIconProperties {
  extensionIsEnabled?: boolean;
  tabUrl?: string;
}

export interface UpdateStateProperties {
  extensionIsEnabled?: boolean;
  activeTab?: Tab;
}
