import { compensateForFirefoxBugs } from "./utils";
import Filter from "./filter";

console.info("*** Content script running ***");

compensateForFirefoxBugs();

new Filter({ watchedFilterEnabled: true, membersOnlyFilterEnabled: false });
