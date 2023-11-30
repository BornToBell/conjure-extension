// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ReadableStreamDefaultController } from "node:stream/web";
import { resolve } from "path";
import * as vscode from "vscode";
import * as path from 'path';
import * as fs from 'fs';

/**
 * create new model json file
 */
async function extractFile(s: any) {
  console.log("Modify essence file");
  const fs = require("fs");
  var inputData = JSON.parse(s);

  // Find the index of the last "SuchThat" key
  const suchThatKeys = inputData.mStatements
    .map((stmt: { SuchThat: any }, index: any) =>
      stmt.SuchThat ? index : null
    )
    .filter((val: null) => val !== null);
  const lastIndex = suchThatKeys[suchThatKeys.length - 1];

  // Create a new JSON excluding the last "SuchThat" key and value
  const outputData = {
    ...inputData,
    mStatements: inputData.mStatements
      .slice(0, lastIndex)
      .concat(inputData.mStatements.slice(lastIndex + 1)),
  };

  // Output the new JSON
  //console.log(JSON.stringify(outputData, null, 2));
  //fs.writeFileSync(name2, JSON.stringify(outputData));
  const output = JSON.stringify(outputData);
  return output;
}



async function makeJSON(fileName: string) {
  const { exec } = require("node:child_process");

  console.log(`Convert ${fileName} to JSON format`);
  const JSONPromise = new Promise((resolve, reject) => {
    const command = `conjure pretty --output-format=astjson ${fileName}`;
    exec(command, (err: any, output: any) => {

      // once the command has completed, the callback function is called
      if (err) {
        // log and return if we encounter an error
        console.error("could not execute command: ", command, err);
        reject(err);
      } else {
        // log the output received from the command
        resolve(output.toString());
      }

    });
  });
  console.log(`Finished conversion: ${fileName} to JSON format`);
  return JSONPromise;
}
// async function extractFiles(fileName: string) {
//   return new Promise((resolve, reject) => {
//     // Logic to create file1.json and newFile.json using extract.js
//     // This could involve executing a command, running a separate script, etc.
//     const { exec } = require("node:child_process");

//     // run the `ls` command using exec

//     const fs = require("fs");
/**
 * https://byby.dev/node-check-if-file-exists
 * https://www.sohamkamani.com/nodejs/executing-shell-commands/
 */
// function cleanModel() {
//   console.log("clean file");
//   const promiseClean = new Promise((resolve, reject) => {
//     if (fs.existsSync("model.json")) {
//       exec("rm model.json", (err: any, output: any) => {
//         // once the command has completed, the callback function is called
//         if (err) {
//           // log and return if we encounter an error
//           console.error("could not execute command: ", err);
//           reject("Error");
//         }
//         // log the output received from the command
//         console.log("delete old model file");
//         console.log("Output clean: \n", output);
//         resolve("Cleaned model");
//       });
//     }
//     if (fs.existsSync("removedModel.json")) {
//       exec("rm removedModel.json", (err: any, output: any) => {
//         // once the command has completed, the callback function is called
//         if (err) {
//           // log and return if we encounter an error
//           console.error("could not execute command: ", err);
//           reject("Error");
//         }
//         // log the output received from the command
//         console.log("delete old modified model file");
//         console.log("Output clean: \n", output);
//         resolve("Cleaned model");
//       });
//     }
//     resolve("no model file");
//   });
//   console.log("Checked model file");
//   return promiseClean;
// }



//     cleanModel()
//       .then(() => makeJSON())
//       .then((s) => extractFile(s))
//       .then((s) => resolve(s));
//   });
// }
/**
 * 
 * @param essence essence file name
 * @param fileNames param file names
 */
async function runConjureSolve(essence: any, mod_essence: any, fileNames: any) {


  //cite from https://stackoverflow.com/questions/39569993/vs-code-extension-get-full-path
  const JSONPromise = new Promise((resolve, reject) => {
    if (vscode.workspace.workspaceFolders !== undefined) {
      let wf = vscode.workspace.workspaceFolders[0].uri.path;

      const message = `YOUR-EXTENSION: folder: ${wf}`;
      const filePath = path.join(wf, 'model.json');
      const mod_filePath = path.join(wf, 'mod_model.json');
      fs.writeFileSync(filePath, essence);
      fs.writeFileSync(mod_filePath, mod_essence);
      console.log(`file created at ${wf}`);

      solveModel(filePath, fileNames, wf)
        .then((s1) => solveModel(mod_filePath, fileNames, wf)
          .then((s2) => {
            const path1 = path.join(wf, 'model.solutions');
            const path2 = path.join(wf, 'mod_model.solutions');
            const sol1 = fs.readFileSync(path1, 'utf-8')
            const sol2 = fs.readFileSync(path2, 'utf-8')
            const same = sol1 === sol2
            resolve(same);
          }))

    } else {
      const message = "YOUR-EXTENSION: Working folder not found, open a folder an try again";
      console.log(message);
      vscode.window.showErrorMessage(message);
      reject(message);
    }
  })

  return JSONPromise;

}

async function solveModel(essencePath: string, paramsPath: any, solPath: string) {
  const { exec } = require("node:child_process");
  const command = `conjure solve --solutions-in-one-file --output-format=astjson --output-directory=${solPath} ${essencePath} ${paramsPath}`;
  console.log(`Running conjure solve: ${essencePath},${paramsPath}`);
  const JSONPromise = new Promise((resolve, reject) => {
    exec(command, (err: any, output: any) => {
      // once the command has completed, the callback function is called
      if (err) {
        // log and return if we encounter an error
        console.error("could not execute command: ", err);
        reject(err);
      }
      // log the output received from the command
      resolve(output.toString());
    });
  })

  return JSONPromise;
}





function checkParam(fileNames: any) {
  const paramPromise = new Promise((resolve, reject) => {
    const fs = require("fs");
    if (fileNames === undefined || fileNames.length <= 0) {
      resolve("");
    } else {
      const array = fileNames.split(" ");
      for (let i = 0; i < array.length; i++) {
        //console.log(array[0]);
        if (!fs.existsSync(array[i])) {
          vscode.window.showInformationMessage("Enter valid param file name");
          reject("Invalid file name");
        }
      }
      resolve(array);
    }
  });
  return paramPromise;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
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
      // Get the arguments passed to the "Compare" command
      // const fileNames = vscode.window.activeTextEditor?.document.fileName.split(' ') || [];
      const modelFile = await vscode.window.showInputBox({
        title: "Enter essence file name",
      });
      const paramFiles = await vscode.window.showInputBox({
        title: "Enter param file name(s)",
      });

      const fs = require("fs");
      if (modelFile === undefined) {
        vscode.window.showInformationMessage("Enter essence file name");
      } else {
        if (fs.existsSync(modelFile)) {
          makeJSON(modelFile)
            .then((model) => extractFile(model)
              .then((mod_model) => checkParam(paramFiles)
                .then((params) => {
                  runConjureSolve(model, mod_model, params).then((comparison) => {
                    vscode.window.showInformationMessage(`The result of comparison ${comparison}`);
                  })
                })))
        } else {
          console.log(modelFile);
          vscode.window.showInformationMessage("Enter valid essence file name");
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
