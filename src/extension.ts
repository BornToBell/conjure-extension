/**
 * @author Yui Nagasaka
 */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { solve } from "./solve";
import { multiStepInput } from "./multiStepInputs";
import { cleanAll } from "./clean";
import { window } from "vscode";
import { solveOptions } from "./option";
import { graphicalReport } from "./graphicalReport";
import * as path from "path";
import { createChart } from "./createChart";

const cats = {
  "Coding Cat": "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
  "Compiling Cat": "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
};

/**
 * This method is called when your extension is activated
 *
 * @param context
 */

export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "conjure-model" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable1 = vscode.commands.registerCommand(
    "conjure-model.helloWorld",
    async () => {
      await cleanAll();
      const inputs = await multiStepInput(context);
      solve(inputs.essence, inputs.directory, inputs.params).then(async(res) => {
        console.log(res);
          const panel = vscode.window.createWebviewPanel(
            "ReportOption",
            "Comparison report",
            vscode.ViewColumn.One,
            {
              enableScripts: true,
            }
          );

          if (undefined !== vscode.workspace.workspaceFolders) {
            const wf = vscode.workspace.workspaceFolders[0].uri.path;
            const reportPath = path.join(wf, "detailed_report.json");
            const data = await createChart(reportPath,wf);

            const updateWebview = () => {
              panel.title = "Comparison report";
              panel.webview.html = graphicalReport(data);
            };

            updateWebview();
            console.log("update");
          }
      })
        // .then((result) =>
        //   multiStepInput(context).then((inputs) => {
        //     console.log("Input", inputs);
            
        //   })
        // )
        .catch((error) => {
          console.log(error);
          window.showErrorMessage(error);
        });
    }
  );

  let disposable2 = vscode.commands.registerCommand(
    "conjure-model.option",
    async () => {
      await cleanAll();
      const inputs = await multiStepInput(context);
      solveOptions(inputs.essence, inputs.directory, inputs.params).then(
        async (res) => {
          console.log(res);
          const panel = vscode.window.createWebviewPanel(
            "ReportOption",
            "Options report",
            vscode.ViewColumn.One,
            {
              enableScripts: true,
            }
          );

          // const libPath = vscode.Uri.file(
          //   path.join(
          //     context.extensionPath,
          //     "node_modules",
          //     "chart.js",
          //     "dist",
          //     "chart.js"
          //   )
          // );

          // const scriptUri = panel.webview.asWebviewUri(libPath);
          if (undefined !== vscode.workspace.workspaceFolders) {
            const wf = vscode.workspace.workspaceFolders[0].uri.path;
            const reportPath = path.join(wf, "detailed_report.json");
            const data = await createChart(reportPath,wf);

            const updateWebview = () => {
              // const cat = iteration++ % 2 ? "Compiling Cat" : "Coding Cat";
              panel.title = "Options comparison report";
              panel.webview.html = graphicalReport(data);
            };

            updateWebview();
            console.log("update");
          }
        }
      );

      // cleanAll()
      //   .then((result) =>
      //     multiStepInput(context).then((inputs) => {

      //       // console.log(inputs);
      //     })
      //   )
      //   .then(() => {

      //     // let iteration = 0;

      //     // Set initial content
      //     // // And schedule updates to the content every second
      //     // setInterval(updateWebview, 1000);
      //   })
      //   .catch((error) => {
      //     console.log(error);
      //     window.showErrorMessage(error);
      //   });
    }
  );

  context.subscriptions.push(disposable1);
  context.subscriptions.push(disposable2);
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {}
