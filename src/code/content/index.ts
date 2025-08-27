import { compensateForFirefoxBugs } from "./utils";
import Filter from "./filter";

compensateForFirefoxBugs();

new Filter({ watchedFilterEnabled: true, membersOnlyFilterEnabled: true });
