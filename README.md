# Terminal Links

A Visual Studio Code extension to allow configuring regular expression patterns to identify useful links in
terminals.

Once installed you have to add the link replacements you want in the settings JSON file manually under the `terminalLinks.matchers`
setting key. Visual Studio Code doesn't support a UI for this kind of setting unfortunately.

For example, I built this extension because I was annoyed at constantly having to copy bug numbers
out of the terminal into my browser, so I have this configuration which automatically links bug references
to Mozilla's bug tracker and patch references to Mozilla's Phabricator:

```json
"terminalLinks.matchers": [
    {
      "regex": "\\b[Bb]ug\\s*(\\d+)\\b",
      "uri": "https://bugzilla.mozilla.org/show_bug.cgi?id=$1"
    },
    {
      "regex": "\\b(D\\d+)\\b",
      "uri": "https://phabricator.services.mozilla.com/$1"
    }
],
```

The format is fairly straightforward. Each item of the array is an object with the properties
`regex` (a [regular expression pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions)),
and `uri` (the link to generate).
[String.replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)
is used to generate the replacement so the documentation there should help. In particular you can use
`$n` to reference captured groups from the regular expression.

Due to how Visual Studio Code's APIs work the text to link cannot span multiple lines.

This extension is an early version that seems to work but may well contain bugs. Please
[file an issue](https://github.com/Mossop/terminal-links/issues) if you run into a problem or have a
suggestion for improvements.
