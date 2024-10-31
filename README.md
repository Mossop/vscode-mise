# Mise Tasks

Implements [task auto-detection](https://code.visualstudio.com/docs/editor/tasks#_task-autodetection)
in Visual Studio Code for [mise tasks](https://mise.jdx.dev/tasks/).

Once installed and when you have a project open with some mise configuration you can open the
command palette, go to `Tasks: Run Task` and there will be an entry for `mise` that lists all of the
available tasks to run.

You can also manually enter tasks into your `.vscode/tasks.json` if you want to
[customise](https://code.visualstudio.com/docs/editor/tasks#_customizing-autodetected-tasks) some
aspect of how they are executed. In particular this allows
[binding keyboard shortcuts](https://code.visualstudio.com/docs/editor/tasks#_binding-keyboard-shortcuts-to-tasks),
setting [problem matchers](https://code.visualstudio.com/docs/editor/tasks#_processing-task-output-with-problem-matchers),
and running multiple tasks in parallel.

The format of a mise task in `tasks.json` is straightforward:

```json
{
  "type": "mise",
  "task": "compile",
  "watch": false,
  // Other common task properties.
}
```

The `task` property identifies the task to run and can be an array of strings to run multiple tasks
in parallel. The `watch` property is optional, if present and `true` then the task will be run with
`mise watch`.

## Details

Tasks are detected by running `mise ls` in the root of each folder in the workspace and currently
requires mise 2024.10.13. Any tasks that define their source file will be offered as either a normal
task or a watch task that is run with `mise watch`. Watch tasks require that `watchexec` is already
installed.

You can configure the location of the `mise` binary in the extension's settings. If unset `mise`
needs to be somewhere in your shell's `PATH`.
