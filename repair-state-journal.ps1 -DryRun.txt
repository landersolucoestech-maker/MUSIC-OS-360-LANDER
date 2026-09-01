param([switch]$DryRun, [switch]$Repair)

if (-not $DryRun -and -not $Repair) {
  Write-Host "Usage:  .\repair-state-journal.ps1 -DryRun    (or)    .\repair-state-journal.ps1 -Repair"
  exit 2
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "node.js not found on PATH."
  exit 3
}

$repoRoot = (Get-Location).Path
$corePath = Join-Path $repoRoot ".claude\runtime\lib\core.mjs"
if (-not (Test-Path $corePath)) {
  Write-Error "core.mjs not found at $corePath - run this from the MUSIC OS 360 repo root."
  exit 3
}

$nodeScript = @'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

var args = process.argv.slice(2);
var dryRun = args.indexOf("--dry-run") !== -1;
var doRepair = args.indexOf("--repair") !== -1;

var EXPECTED_STATE_REVISION = 2720;
var EXPECTED_JOURNAL_REVISION = 2719;

async function main() {
  if (!dryRun && !doRepair) { console.error("internal error: missing mode flag"); return 2; }

  var repoRoot = path.resolve(process.cwd());
  var corePath = path.join(repoRoot, ".claude", "runtime", "lib", "core.mjs");
  if (!fs.existsSync(corePath)) { console.error("FATAL: core.mjs not found at " + corePath); return 3; }

  var core = await import(pathToFileURL(corePath).href);
  var root = core.root;
  var stateFile = core.stateFile;
  var journalFile = core.journalFile;
  var opsLockFile = core.opsLockFile;
  var hash = core.hash;
  var verifyJournalChain = core.verifyJournalChain;
  var holdOpsLock = core.holdOpsLock;
  var now = core.now;
  var id = core.id;

  if (path.resolve(root) !== repoRoot) { console.error("FATAL: resolved project root does not match current directory. root=" + root + " cwd=" + repoRoot); return 3; }
  if (!fs.existsSync(stateFile)) { console.error("FATAL: state.json not found at " + stateFile); return 3; }
  if (!fs.existsSync(journalFile)) { console.error("FATAL: journal.ndjson not found at " + journalFile); return 3; }

  var releaseLock;
  try {
    releaseLock = holdOpsLock({ purpose: "external-manual-repair", timeoutMs: 15000 });
  } catch (e) {
    console.error("FATAL: could not acquire control plane lock. Another process may hold it. Detail: " + e.message);
    return 4;
  }

  var myLockRecordRaw = fs.existsSync(opsLockFile) ? fs.readFileSync(opsLockFile) : null;

  var verdictLabel = null;
  var verdictOk = false;

  try {
    var rawStateBefore = fs.readFileSync(stateFile);
    var rawJournalBefore = fs.readFileSync(journalFile);

    var parsedBefore;
    try {
      parsedBefore = JSON.parse(rawStateBefore.toString("utf8"));
    } catch (e) {
      console.error("FATAL: state.json is not valid JSON. Detail: " + e.message);
      verdictLabel = dryRun ? "SAFE_TO_REPAIR" : "REPAIR_RESULT";
      verdictOk = false;
      return 5;
    }
    var stateRevisionBefore = Number(parsedBefore.stateRevision);
    if (!Number.isInteger(stateRevisionBefore) || stateRevisionBefore < 1) {
      console.error("FATAL: state.json has no valid stateRevision. Got: " + parsedBefore.stateRevision);
      verdictLabel = dryRun ? "SAFE_TO_REPAIR" : "REPAIR_RESULT";
      verdictOk = false;
      return 5;
    }

    var journalCheck = verifyJournalChain();
    if (!journalCheck.pass) {
      console.error("FATAL: journal.ndjson fails its own integrity check at line " + journalCheck.line + ". Reason: " + journalCheck.reason + ". This script only repairs a missing final anchor, not a corrupted chain.");
      verdictLabel = dryRun ? "SAFE_TO_REPAIR" : "REPAIR_RESULT";
      verdictOk = false;
      return 6;
    }

    console.log("EXPECTED STATE REVISION = " + EXPECTED_STATE_REVISION);
    console.log("EXPECTED JOURNAL REVISION = " + EXPECTED_JOURNAL_REVISION);
    console.log("ACTUAL STATE REVISION = " + stateRevisionBefore);
    console.log("ACTUAL JOURNAL REVISION = " + (journalCheck.lastStateRevision === null ? "none" : journalCheck.lastStateRevision));
    console.log("journal committed stateHash = " + (journalCheck.lastStateHash === null ? "none" : journalCheck.lastStateHash));
    console.log("journal chain events = " + journalCheck.events);
    console.log("journal last eventHash = " + (journalCheck.lastHash === null ? "none, empty journal" : journalCheck.lastHash));

    if (stateRevisionBefore !== EXPECTED_STATE_REVISION || journalCheck.lastStateRevision !== EXPECTED_JOURNAL_REVISION) {
      console.error("This repair is authorized only for stateRevision 2720 and journalRevision 2719. The current pair does not match that authorization. Refusing to generalize.");
      verdictLabel = dryRun ? "SAFE_TO_REPAIR" : "REPAIR_RESULT";
      verdictOk = false;
      return 7;
    }

    var stateHash = hash(rawStateBefore);
    var prevHash = journalCheck.lastHash === undefined ? null : journalCheck.lastHash;
    var timestamp = now();
    var eventCore = {
      eventId: id("evt"),
      schemaVersion: 1,
      timestamp: timestamp,
      eventType: "state-commit",
      at: timestamp,
      type: "state-commit",
      prevHash: prevHash,
      stateRevision: stateRevisionBefore,
      stateHash: stateHash
    };
    var eventHash = hash(eventCore);
    var line = JSON.stringify(Object.assign({}, eventCore, { eventHash: eventHash })) + "\n";
    var lineBytes = Buffer.from(line, "utf8");

    console.log("precondition derived values, must match on repair if nothing changed:");
    console.log("revision = " + stateRevisionBefore);
    console.log("prevEventHash = " + prevHash);
    console.log("stateHash = " + stateHash);
    console.log("event identity values shown below are illustrative only for dry run, repair generates its own fresh values:");
    console.log("eventId dry run = " + eventCore.eventId);
    console.log("eventHash dry run = " + eventHash);

    var stamp = new Date().toISOString().replace(/[:.]/g, "-");
    var stateBackup = stateFile + ".backup-" + stamp;
    var journalBackup = journalFile + ".backup-" + stamp;
    console.log("state backup path if repair runs = " + stateBackup);
    console.log("journal backup path if repair runs = " + journalBackup);

    if (dryRun) {
      verdictLabel = "SAFE_TO_REPAIR";
      verdictOk = true;
      return 0;
    }

    var rawStateNow = fs.readFileSync(stateFile);
    if (Buffer.compare(rawStateNow, rawStateBefore) !== 0) {
      console.error("FATAL: state.json changed since inspection. Aborting without mutation.");
      verdictLabel = "REPAIR_RESULT";
      verdictOk = false;
      return 8;
    }
    var rawJournalNow = fs.readFileSync(journalFile);
    if (Buffer.compare(rawJournalNow, rawJournalBefore) !== 0) {
      console.error("FATAL: journal.ndjson changed since inspection. Aborting without mutation.");
      verdictLabel = "REPAIR_RESULT";
      verdictOk = false;
      return 8;
    }

    fs.copyFileSync(stateFile, stateBackup);
    fs.copyFileSync(journalFile, journalBackup);
    var stateBackupOk = Buffer.compare(fs.readFileSync(stateBackup), rawStateBefore) === 0;
    var journalBackupOk = Buffer.compare(fs.readFileSync(journalBackup), rawJournalBefore) === 0;
    console.log("BACKUPS VERIFIED = " + (stateBackupOk && journalBackupOk ? "PASS" : "FAIL"));
    if (!stateBackupOk || !journalBackupOk) {
      console.error("FATAL: backup verification failed. Aborting before any journal mutation.");
      verdictLabel = "REPAIR_RESULT";
      verdictOk = false;
      return 10;
    }
    console.log("backed up state.json to " + stateBackup);
    console.log("backed up journal.ndjson to " + journalBackup);

    var fd = fs.openSync(journalFile, "a", 0o600);
    try {
      fs.writeFileSync(fd, lineBytes);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    var rawStateAfter = fs.readFileSync(stateFile);
    var rawJournalAfter = fs.readFileSync(journalFile);

    var stateUnchanged = Buffer.compare(rawStateAfter, rawStateBefore) === 0;
    console.log("STATE UNCHANGED = " + (stateUnchanged ? "PASS" : "FAIL"));

    var expectedLength = rawJournalBefore.length + lineBytes.length;
    var lengthOk = rawJournalAfter.length === expectedLength;
    var prefixOk = lengthOk && Buffer.compare(rawJournalAfter.subarray(0, rawJournalBefore.length), rawJournalBefore) === 0;
    var suffixOk = lengthOk && Buffer.compare(rawJournalAfter.subarray(rawJournalBefore.length), lineBytes) === 0;
    console.log("OLD JOURNAL PRESERVED = " + (prefixOk ? "PASS" : "FAIL"));
    console.log("EXACTLY ONE LINE APPENDED = " + ((lengthOk && suffixOk) ? "PASS" : "FAIL"));

    var postCheck = verifyJournalChain();
    var chainOk = postCheck.pass;
    var revisionOk = postCheck.lastStateRevision === EXPECTED_STATE_REVISION;
    var hashOk = postCheck.lastStateHash === stateHash;
    console.log("JOURNAL CHAIN = " + (chainOk ? "PASS" : "FAIL"));
    console.log("STATE HASH MATCH = " + (hashOk ? "PASS" : "FAIL"));
    console.log("FINAL REVISION = " + postCheck.lastStateRevision);

    var allOk = stateUnchanged && prefixOk && lengthOk && suffixOk && chainOk && revisionOk && hashOk;
    if (!allOk) {
      console.error("Restore both backups. Copy " + stateBackup + " over " + stateFile + " and copy " + journalBackup + " over " + journalFile + ".");
    }
    verdictLabel = "REPAIR_RESULT";
    verdictOk = allOk;
    return allOk ? 0 : 9;
  } finally {
    var released = false;
    var releaseError = null;
    try {
      releaseLock();
    } catch (e) {
      releaseError = e;
    }
    try {
      var nowRaw = fs.existsSync(opsLockFile) ? fs.readFileSync(opsLockFile) : null;
      released = !releaseError && myLockRecordRaw !== null && (nowRaw === null || Buffer.compare(nowRaw, myLockRecordRaw) !== 0);
    } catch (e) {
      released = false;
    }
    var lockLine = "CONTROL PLANE LOCK RELEASED = " + (released ? "PASS" : "FAIL");
    if (releaseError) {
      lockLine = lockLine + " (release threw: " + releaseError.message + ")";
    }
    console.log(lockLine);

    if (verdictLabel) {
      var finalOk = verdictOk && released;
      var word;
      if (verdictLabel === "SAFE_TO_REPAIR") {
        word = finalOk ? "YES" : "NO";
      } else {
        word = finalOk ? "PASS" : "FAIL";
      }
      console.log(verdictLabel + " = " + word);
    }
  }
}

main().then(function (code) {
  process.exitCode = code;
}).catch(function (e) {
  console.error("FATAL: unexpected exception. " + (e.stack || e.message));
  process.exitCode = 1;
});
'@

$scriptPath = Join-Path $env:TEMP "musicos-repair-state-journal.mjs"
Set-Content -Path $scriptPath -Value $nodeScript -Encoding utf8

$flag = if ($DryRun) { "--dry-run" } else { "--repair" }
node $scriptPath $flag
exit $LASTEXITCODE