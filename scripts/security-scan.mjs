import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const patterns = [ /\bsbp_[a-zA-Z0-9]{20,}\b/g, /\bsb_secret_[a-zA-Z0-9_-]{20,}\b/g, /\bgh[pousr]_[a-zA-Z0-9]{20,}\b/g, /\bgithub_pat_[a-zA-Z0-9_]{30,}\b/g, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g ];
const findings = [];
function scan(text, location) {
  if (patterns.some(p => { p.lastIndex = 0; return p.test(text); })) findings.push(location);
  for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try { if (JSON.parse(Buffer.from(token.split(".")[1], "base64url")).role === "service_role") findings.push(`${location} (privileged JWT)`); } catch { /* Not a JWT. */ }
  }
}
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\0").filter(Boolean);
for (const file of files) {
  if (/\.(png|jpe?g|webp|woff2?|ico|heic|pdf|zip)$/i.test(file)) continue;
  try { scan(readFileSync(file,"utf8"), file); } catch { /* Removed file. */ }
}
const history = execFileSync("git", ["log", "--all", "-p", "--format=commit %h"], { encoding: "utf8", maxBuffer: 32*1024*1024 });
scan(history,"reachable Git history (requires rotation review)");
console.log(JSON.stringify({ scannedFiles: files.length, secretFindings: [...new Set(findings)] }));
process.exitCode = findings.length ? 1 : 0;
