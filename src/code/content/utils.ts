/* fix Firefox bug (https://stackoverflow.com/questions/78761215/eventtarget-doesnt-work-in-firefox-content-script-does-work-in-chrome). Using `new window["EventTarget"]()` directly does not work, as it appears to be overridden at runtime by `globalThis["EventTarget"]` */
export function compensateForFirefoxBugs() {
  globalThis["EventTarget"] = window["EventTarget"];
}
