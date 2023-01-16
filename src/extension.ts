import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let timeout: NodeJS.Timer | undefined = undefined;

  const imgLinkDecorationType = vscode.window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    overviewRulerColor: "blue",
    overviewRulerLane: vscode.OverviewRulerLane.Full,
    light: {
      borderColor: "darkblue",
    },
    dark: {
      borderColor: "lightblue",
    },
  });

  let activeEditor = vscode.window.activeTextEditor;

  function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    // get the list of other sites to check links for
    const config = vscode.workspace.getConfiguration("render-image-links");
    const otherSites = config.get("otherSites") as string[];

    // get disruptive mode setting
    const disruptiveMode = config.get("enableDisruptive") as boolean;

    // matching all links
    const matchAllEndingWithExtension =
      "((http(s?):)([/|.|\\w|\\s|-])*\\.(?:jpg|gif|png))";
    const regexpString = otherSites.reduce((acc, site) => {
      return acc + `|((http(s?):)(\\/\\/${site}\\/)([?=&.\\w-])*)`;
    }, matchAllEndingWithExtension);

    const regexp = new RegExp(regexpString, "g");
    const text = activeEditor.document.getText();
    const imgLinks: vscode.DecorationOptions[] = [];
    let match;

    while ((match = regexp.exec(text))) {
      const startPos = activeEditor.document.positionAt(match.index);
      const endPos = activeEditor.document.positionAt(
        match.index + match[0].length
      );
      const decoration = {
        range: new vscode.Range(startPos, endPos),
        hoverMessage: `![decoration](${match[0]})`,
        renderOptions: {},
      };

      if (disruptiveMode) {
        // add as contentIconPath, the size cant really be controlled (height and width wont do anything)
        decoration["renderOptions"] = {
          after: {
            contentIconPath: vscode.Uri.parse(match[0], true),
            height: "20px",
            width: "20px",
          },
        };

        decoration["hoverMessage"] = "";
      }

      imgLinks.push(decoration);
    }

    activeEditor.setDecorations(imgLinkDecorationType, imgLinks);
  }

  function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    if (throttle) {
      timeout = setTimeout(updateDecorations, 500);
    } else {
      updateDecorations();
    }
  }

  if (activeEditor) {
    triggerUpdateDecorations();
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );
}
