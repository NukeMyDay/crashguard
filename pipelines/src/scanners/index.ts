/**
 * Instrument Scanners — Module 4
 *
 * Runs all scanner types: penny, oversold, short, options.
 * Called daily at 6am UTC from the scheduler.
 */
export { runPennyScanner } from "./penny-scanner.js";
export { runOversoldScanner } from "./oversold-scanner.js";
export { runShortScanner } from "./short-scanner.js";
export { runOptionsScanner } from "./options-scanner.js";

import { runPennyScanner } from "./penny-scanner.js";
import { runOversoldScanner } from "./oversold-scanner.js";
import { runShortScanner } from "./short-scanner.js";
import { runOptionsScanner } from "./options-scanner.js";

export async function runAllScanners(): Promise<void> {
  console.log("[scanners] Running all instrument scanners...");
  await Promise.allSettled([
    runPennyScanner(),
    runOversoldScanner(),
    runShortScanner(),
    runOptionsScanner(),
  ]);
  console.log("[scanners] All scanners complete");
}
