import {
  ExtensionContext,
  window,
  tasks,
  Task,
  WorkspaceFolder,
  workspace,
  ProviderResult,
  LogOutputChannel,
  ShellExecution,
} from "vscode";
import { exec } from "node:child_process";

interface MiseTaskJson {
  name: string;
  source: string;
  description: string;
}

function pexec(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(args.join(" "), { cwd }, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

function binary(folder: WorkspaceFolder): string {
  let config = workspace.getConfiguration("mise", folder);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return config.get<string>("path") || "mise";
}

function mise(folder: WorkspaceFolder, ...args: string[]): Promise<string> {
  return pexec([binary(folder), ...args], folder.uri.fsPath);
}

async function provideFolderTasks(
  channel: LogOutputChannel,
  folder: WorkspaceFolder
): Promise<Task[]> {
  channel.info("Providing tasks");

  try {
    let tasks = JSON.parse(
      await mise(folder, "tasks", "ls", "-J")
    ) as unknown as MiseTaskJson[];

    return tasks.map(
      (t) =>
        new Task(
          { type: "mise", task: t.name },
          folder,
          t.name,
          "mise",
          new ShellExecution(`${binary(folder)} run ${t.name}`, {
            cwd: folder.uri.fsPath,
          })
        )
    );
  } catch (e) {
    channel.error(`Failed to find tasks from folder ${folder.uri}`, e);
    return [];
  }
}

export function activate(context: ExtensionContext) {
  let channel = window.createOutputChannel("Mise Tasks", { log: true });
  channel.info("Activated");

  let disposable = tasks.registerTaskProvider("mise", {
    async provideTasks(): Promise<Task[]> {
      let tasks: Task[] = [];
      for (let folder of workspace.workspaceFolders ?? []) {
        let folderTasks = await provideFolderTasks(channel, folder);
        tasks = [...tasks, ...folderTasks];
      }

      channel.info(`Found ${tasks.length} tasks`);
      return tasks;
    },

    resolveTask(_task: Task): ProviderResult<Task> {
      channel.info("Resolve task");
      return undefined;
    },
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Nothing to do.
}
