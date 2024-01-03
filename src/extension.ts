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

/**
 * This method is called when your extension is activated
 * 
 * @param context 
 */

export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "conjure-model" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "conjure-model.helloWorld",
    async () => {
      cleanAll()
        .then((result) => multiStepInput(context)
          .then((inputs) => {
            console.log(inputs);
            solve(inputs.essence, inputs.directory, inputs.params);
          }))
        .catch((error) => {
          console.log(error);
          window.showErrorMessage(error);
        })
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() { }
