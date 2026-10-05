/** npm run media:reindex — rebuild rich-text media usage (safe on production; never deletes media). */
import "dotenv/config";
import { reindexMediaUsage } from "../src/services/media-reindex";

const result = await reindexMediaUsage();
console.log(`Media usage reindexed: ${result.links} references across ${result.owners} items.`);
process.exit(0);
