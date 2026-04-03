import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { joinSession } from "@github/copilot-sdk/extension";

const PID_FILE = join(tmpdir(), "earnesty-dev-server.pid");

function getActivePid() {
    try {
        if (!existsSync(PID_FILE)) return null;
        const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim());
        if (isNaN(pid)) return null;
        process.kill(pid, 0); // throws if process is not running
        return pid;
    } catch {
        return null;
    }
}

function killDevServer() {
    const pid = getActivePid();
    if (pid) {
        try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }
    }
    try { unlinkSync(PID_FILE); } catch { /* already removed */ }
}

let shouldCleanupOnExit = false;

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            const existingPid = getActivePid();
            if (existingPid) {
                const url = "http://localhost:5173";
                await session.log(`Dev server already running (PID ${existingPid})`);
                return {
                    additionalContext: `The local dev server is already running at ${url}. Announce this URL to the user at the start of the session.`,
                };
            }

            const proc = spawn("npm", ["run", "dev"], {
                cwd: join(process.cwd(), "app"),
                stdio: ["ignore", "pipe", "pipe"],
            });

            writeFileSync(PID_FILE, String(proc.pid));

            proc.on("exit", () => {
                try { unlinkSync(PID_FILE); } catch { /* already removed */ }
            });

            const url = await new Promise((resolve) => {
                const timer = setTimeout(() => resolve("http://localhost:5173"), 10_000);
                const onData = (chunk) => {
                    const match = chunk.toString().match(/Local:\s+(https?:\/\/localhost:\d+)/);
                    if (match) {
                        clearTimeout(timer);
                        resolve(match[1]);
                    }
                };
                proc.stdout.on("data", onData);
                proc.stderr.on("data", onData);
                proc.on("error", () => { clearTimeout(timer); resolve("http://localhost:5173"); });
            });

            await session.log(`Dev server started at ${url}`);
            return {
                additionalContext: `The local dev server has just started at ${url}. Announce this URL to the user at the start of the session.`,
            };
        },

        onSessionEnd: async (input) => {
            if (input.reason === "user_exit") {
                shouldCleanupOnExit = true;
                killDevServer();
                await session.log("Dev server stopped.");
            }
        },
    },
});

// Belt-and-suspenders: also kill on SIGTERM (CLI exit sends this before SIGKILL)
process.on("SIGTERM", () => {
    if (shouldCleanupOnExit) killDevServer();
    process.exit(0);
});
