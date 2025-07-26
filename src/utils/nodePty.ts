import * as pty from "@lydell/node-pty";
import { io } from "../index";

const ptySessions: Record<string, ReturnType<typeof pty.spawn>> = {};
const ptySockets: Record<string, string> = {}; // Track socketId per session
function ptyExecuteCmd(containerId: string, command: string, socketId: string) {
  if (!ptySessions[containerId]) {
    const ptyProcess = pty.spawn(
      "docker",
      ["exec", "-it", containerId, "/bin/bash"],
      {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        env: process.env,
      },
    );

    ptySessions[containerId] = ptyProcess;
    ptySockets[containerId] = socketId;

    let isShellReady = false;
    let pendingCommand: string | null = command;

    ptyProcess.onData((data) => {
      const currentSocketId = ptySockets[containerId];
      io.to(currentSocketId).emit("terminal-output", {
        containerId,
        output: data,
      });

      if (!isShellReady) {
        isShellReady = true;
        if (pendingCommand) {
          ptyProcess.write(pendingCommand + "\n");
          pendingCommand = null;
        }
      }
    });

    ptyProcess.onExit(() => {
      delete ptySessions[containerId];
      delete ptySockets[containerId];
    });
  } else {
    // Always update socketId to latest
    ptySockets[containerId] = socketId;

    // Write command directly
    ptySessions[containerId].write(command + "\n");
  }
}
export default ptyExecuteCmd;
