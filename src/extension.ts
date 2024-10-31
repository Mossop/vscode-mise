import {
  ExtensionContext,
  window,
  tasks,
  Task,
  WorkspaceFolder,
  workspace,
  ProviderResult,
  LogOutputChannel,
  TaskProvider,
  Disposable,
  ProcessExecution,
  CancellationToken,
} from "vscode";
import { promises as fs } from "node:fs";
import { exec, execFile } from "node:child_process";
import { shellQuote } from "shell-args";

interface MiseTaskJson {
  name: string;
  source: string;
  description: string;
}

async function isFile(path: string) {
  try {
    let stat = await fs.stat(path);
    return stat.isFile();
  } catch (_e) {
    return false;
  }
}

function shellExec(
  args: string[],
  cwd: string,
  cancel?: CancellationToken
): Promise<string> {
  let abortController = new AbortController();
  let disposable = cancel
    ? cancel.onCancellationRequested(() => abortController.abort())
    : null;

  return new Promise<string>((resolve, reject) => {
    exec(
      shellQuote(args),
      { cwd, windowsHide: true, signal: abortController.signal },
      (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout);
        }
      }
    );
  }).finally(() => {
    if (disposable) {
      disposable.dispose();
    }
  });
}

function processExec(
  binary: string,
  args: string[],
  cwd: string,
  cancel?: CancellationToken
): Promise<string> {
  let abortController = new AbortController();
  let disposable = cancel
    ? cancel.onCancellationRequested(() => abortController.abort())
    : null;

  return new Promise<string>((resolve, reject) => {
    execFile(
      binary,
      args,
      { cwd, windowsHide: true, signal: abortController.signal },
      (err, stdout) => {
        if (err) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(err);
        } else {
          resolve(stdout);
        }
      }
    );
  }).finally(() => {
    if (disposable) {
      disposable.dispose();
    }
  });
}

class MiseBinary {
  #folder: WorkspaceFolder;
  #binary: string;

  static minVersion = [2024, 10, 13];

  private constructor(folder: WorkspaceFolder, binary: string) {
    this.#folder = folder;
    this.#binary = binary;
  }

  get binary(): string {
    return this.#binary;
  }

  async exec<T>(args: string[], cancel?: CancellationToken) {
    let output = await processExec(
      this.#binary,
      args,
      this.#folder.uri.fsPath,
      cancel
    );
    return JSON.parse(output.trim()) as unknown as T;
  }

  static async init(
    channel: LogOutputChannel,
    folder: WorkspaceFolder
  ): Promise<MiseBinary> {
    let config = workspace.getConfiguration("mise", folder);

    let binary = config.get<string>("path");
    if (binary) {
      if (!(await isFile(binary))) {
        channel.warn(`${binary} is not an executable file, ignoring setting`);
        binary = undefined;
      }
    }

    if (!binary) {
      try {
        let output = await shellExec(["which", "mise"], folder.uri.fsPath);
        binary = output.trim();

        if (!binary || !(await isFile(binary))) {
          binary = undefined;
        }
      } catch (e) {
        channel.warn("Unable to call shell to find mise", e);
      }
    }

    if (!binary) {
      throw new Error("Unable to find the mise binary.");
    }

    let output = await processExec(binary, ["--version"], folder.uri.fsPath);
    let match = /(\d+)\.(\d+)\.(\d+)/.exec(output.trim());
    if (!match) {
      throw new Error(`Unexpected output from mise: ${output.trim()}`);
    }

    let miseVersion = match.slice(1);
    channel.info(`Found mise version ${miseVersion.join(".")}`);
    for (let i = 0; i < MiseBinary.minVersion.length; i++) {
      let part = parseInt(miseVersion[i]);
      if (part < MiseBinary.minVersion[i]) {
        throw new Error(
          `Mise binary is version ${miseVersion.join(".")} but this extension requires at least ${MiseBinary.minVersion.join(".")}`
        );
      } else if (part > MiseBinary.minVersion[i]) {
        break;
      }
    }

    return new MiseBinary(folder, binary);
  }
}

class Mise extends Disposable implements TaskProvider {
  #channel: LogOutputChannel;
  #miseBinary = new Map<string, MiseBinary>();
  #taskDisposable: Disposable;

  constructor() {
    super(() => this.#onDispose());

    this.#channel = window.createOutputChannel("Mise Tasks", { log: true });
    this.#channel.info("Activated");

    this.#taskDisposable = tasks.registerTaskProvider("mise", this);
  }

  #onDispose() {
    this.#taskDisposable.dispose();
  }

  async miseBinary(folder: WorkspaceFolder): Promise<MiseBinary> {
    let binary = this.#miseBinary.get(folder.uri.toString());
    if (binary) {
      return binary;
    }

    try {
      binary = await MiseBinary.init(this.#channel, folder);
      this.#miseBinary.set(folder.uri.toString(), binary);
      return binary;
    } catch (e) {
      window.showErrorMessage(String(e));
      throw e;
    }
  }

  async provideFolderTasks(
    folder: WorkspaceFolder,
    cancel?: CancellationToken
  ): Promise<Task[]> {
    let mise = await this.miseBinary(folder);

    try {
      let tasks = await mise.exec<MiseTaskJson[]>(
        ["tasks", "ls", "-J"],
        cancel
      );

      return tasks.map(
        (t) =>
          new Task(
            { type: "mise", task: t.name },
            folder,
            t.name,
            "mise",
            new ProcessExecution(mise.binary, ["run", t.name], {
              cwd: folder.uri.fsPath,
            })
          )
      );
    } catch (e) {
      this.#channel.error(`Failed to find tasks from folder ${folder.uri}`, e);
      return [];
    }
  }

  async provideTasks(cancel?: CancellationToken): Promise<Task[]> {
    let tasks: Task[] = [];
    for (let folder of workspace.workspaceFolders ?? []) {
      let folderTasks = await this.provideFolderTasks(folder, cancel);
      tasks.push(...folderTasks);
    }

    return tasks;
  }

  resolveTask(_task: Task): ProviderResult<Task> {
    return undefined;
  }
}

export function activate(context: ExtensionContext) {
  context.subscriptions.push(new Mise());
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Nothing to do.
}
