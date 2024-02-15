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



export const Progress = window.createOutputChannel("Progress");

/**
 * This method is called when your extension is activated
 *
 * @param context
 */

export async function activate(context: vscode.ExtensionContext) {
  Progress.clear();
  Progress.show();
  window.showInformationMessage('Congratulations, your extension "conjure-model" is now active!');
  let disposable1 = vscode.commands.registerCommand(
    "conjure-model.helloWorld",
    async () => {
      try {
        if (undefined !== vscode.workspace.workspaceFolders) {
          await cleanAll();
          const wf = vscode.workspace.workspaceFolders[0].uri.path;
          const inputs = await multiStepInput(context);
          await solve(wf, inputs.essence, inputs.directory, inputs.params);
          const panel = vscode.window.createWebviewPanel(
            "ReportOption",
            "Comparison report",
            vscode.ViewColumn.One,
            {
              enableScripts: true,
            }
          );
          const reportPath = path.join(wf, "detailed_report.json");
          const data = await createChart(reportPath, wf);

          const updateWebview = () => {
            panel.title = "Comparison report";
            panel.webview.html = graphicalReport(data);
          };

          updateWebview();
        } else {
          throw new Error("Working Space: Working folder not found, open a folder an try again")
        }
      } catch (error) {
        Progress.appendLine(`${error}`)
      }
    })


  let disposable2 = vscode.commands.registerCommand(
    "conjure-model.option",
    async () => {
      try {
        if (undefined !== vscode.workspace.workspaceFolders) {
          const wf = vscode.workspace.workspaceFolders[0].uri.path;
          await cleanAll();
          const inputs = await multiStepInput(context);
          await solveOptions(wf, inputs.essence, inputs.directory, inputs.params);
          const panel = vscode.window.createWebviewPanel(
            "ReportOption",
            "Options report",
            vscode.ViewColumn.One,
            {
              enableScripts: true,
            }
          );
          const reportPath = path.join(wf, "detailed_report.json");
          const data = await createChart(reportPath, wf);

          const updateWebview = () => {
            panel.title = "Options comparison report";
            panel.webview.html = graphicalReport(data);
          };

          updateWebview();
        } else {
          throw new Error("Working Space: Working folder not found, open a folder an try again")
        }
      } catch (error) {
        Progress.appendLine(`${error}`)
      }

    }
  );

  context.subscriptions.push(disposable1);
  context.subscriptions.push(disposable2);
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() { }
