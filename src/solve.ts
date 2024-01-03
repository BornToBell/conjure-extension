
import * as vscode from "vscode";
import * as path from 'path';
import * as fs from 'fs';

export async function solve(modelFile: string, paramPath: string, paramFiles: string[]) {
    // Get the arguments passed to the "Compare" command
    // const fileNames = vscode.window.activeTextEditor?.document.fileName.split(' ') || [];
    // const modelFile = await vscode.window.showInputBox({
    //     title: "Enter essence file name",
    // });
    // const paramFiles = await vscode.window.showInputBox({
    //     title: "Enter param file name(s)",
    // });

    const params: string[] = paramFiles.map(file => `${paramPath}/${file}`);

    makeJSON(modelFile)
        .then((model) => extractFile(model)
            .then((mod_model) => {
                runConjureSolve(model, mod_model, params).then((comparison) => {
                    if (comparison) {
                        vscode.window.showInformationMessage("Same solutions");
                    } else {
                        vscode.window.showInformationMessage("Different solutions");
                    }

                })
            }))


}

/**
 * Remove last constraint
 * @param s json model
 * @returns json model which exclude last constraint
 */
export async function extractFile(s: any) {
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

    const output = JSON.stringify(outputData);
    return output;
}


/**
 * Convert essence file to json format
 * @param fileName essence file name (full path)
 * @returns json model
 */
export async function makeJSON(fileName: string) {
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

/**
 * Compare the solutions
 * @param essence model json
 * @param mod_essence modified model json
 * @param fileNames path to param files
 * @returns solutions are equal
 */
export async function runConjureSolve(essence: any, mod_essence: any, fileNames: string[]) {
    //cite from https://stackoverflow.com/questions/39569993/vs-code-extension-get-full-path
    const JSONPromise = new Promise((resolve, reject) => {
        if (vscode.workspace.workspaceFolders !== undefined) {
            let wf = vscode.workspace.workspaceFolders[0].uri.path;

            //Get workspace path
            const message = `YOUR-EXTENSION: folder: ${wf}`;

            //create two model json files in work space
            const filePath = path.join(wf, 'original.json');
            const mod_filePath = path.join(wf, 'removed.json');
            fs.writeFileSync(filePath, essence);
            fs.writeFileSync(mod_filePath, mod_essence);
            console.log(`file created at ${wf}`);

            //solve models

            solveModel(filePath, fileNames, wf)
                .then((s1) => solveModel(mod_filePath, fileNames, wf)
                    // .then((s2) => {
                    //     //compare two solutions file
                    //     const path1 = path.join(wf, 'model.solutions');
                    //     const path2 = path.join(wf, 'mod_model.solutions');
                    //     const sol1 = fs.readFileSync(path1, 'utf-8')
                    //     const sol2 = fs.readFileSync(path2, 'utf-8')
                    //     const same = sol1 === sol2
                    //     resolve(same);
                    // }))
                ).then(() => { vscode.window.showInformationMessage('Finished') })


        } else {
            const message = "YOUR-EXTENSION: Working folder not found, open a folder an try again";
            console.log(message);
            vscode.window.showErrorMessage(message);
            reject(message);
        }
    })
    return JSONPromise;
}


/**
 * solve CSP and save solutions in workspace
 * @param essencePath path to essence file
 * @param paramsPath path to param file
 * @param solPath workspace path
 * @returns console
 */
export async function solveModel(essencePath: string, paramsPath: string[], solPath: string) {
    const { exec } = require("node:child_process");
    const joined = paramsPath.join(' ');
    const outDir = solPath + '/conjure-output';
    const command = `conjure solve --output-format=json --output-directory=${outDir} ${essencePath} ${joined}`;
    console.log(`Running conjure solve: ${command}`);
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

/**
 * whether param files existed
 * @param fileNames path to param files
 * @returns if param file existed
 */
export function checkParam(fileNames: any) {
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