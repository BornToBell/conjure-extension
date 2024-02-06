
import * as vscode from "vscode";
import * as path from 'path';
import * as fs from 'fs';
import { collectSol } from "./collectSols";
import { detailReport, simpleReport } from "./report";
import { cleanConjure } from "./clean";
import * as child_process from 'child_process';

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
                runConjureSolve(model, mod_model, params, paramFiles).then((comparison) => {
                    if (comparison) {
                        vscode.window.showInformationMessage("Same solutions");
                    } else {
                        vscode.window.showInformationMessage("Different solutions");
                    }

                });
            }));


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
export async function runConjureSolve(essence: any, mod_essence: any, fileNames: string[], params: string[]) {
    //cite from https://stackoverflow.com/questions/39569993/vs-code-extension-get-full-path
    const JSONPromise = new Promise((resolve, reject) => {
        if (vscode.workspace.workspaceFolders !== undefined) {
            let wf = vscode.workspace.workspaceFolders[0].uri.path;

            //Get workspace path
            const message = `YOUR-EXTENSION: folder: ${wf}`;

            //create two model json files in work space
            const filePath = path.join(wf, 'original.json');
            const mod_filePath = path.join(wf, 'removed.json');
            const outputPath = path.join(wf, 'conjure-output');
            fs.writeFileSync(filePath, essence);
            fs.writeFileSync(mod_filePath, mod_essence);
            console.log(`file created at ${wf}`);

            //solve models
            cleanConjure()
                .then(() => {
                    solveModel(filePath, fileNames, wf)
                        .then((s1) => {
                            console.log("After solved Model", s1);
                            return collectSol('original', outputPath, params);
                        })
                        .then((data1) => {
                            cleanConjure();
                            solveModel(mod_filePath, fileNames, wf)
                                .then(() => {
                                    return collectSol('removed', outputPath, params);
                                }).then((data2) => {
                                    const data = [data1, data2];
                                    const solutions = {
                                        Models: data
                                    };
                                    const jsonData = JSON.stringify(solutions);
                                    const solPath = path.join(wf, 'all_solutions.json');
                                    fs.writeFile(solPath, jsonData, (error) => {
                                        if (error) {
                                            console.error(`Error writing file ${solPath} : `, error);
                                        } else {
                                            console.log(`File ${solPath} written succcesfully.`);
                                        }
                                        simpleReport(wf, solPath);
                                        detailReport(wf, solPath);
                                    });

                                });
                        });
                })
                .then(() => { vscode.window.showInformationMessage('Finished'); });


        } else {
            const message = "YOUR-EXTENSION: Working folder not found, open a folder an try again";
            console.log(message);
            vscode.window.showErrorMessage(message);
            reject(message);
        }
    });
    return JSONPromise;
}


/**
 * solve CSP and save solutions in workspace
 * @param essencePath path to essence file
 * @param paramsPath path to param file
 * @param solPath workspace path
 * @returns console
 */
export function solveModel(essencePath: string, paramsPath: string[], solPath: string) {
    return new Promise((resolve, reject) => {
        try {
            const { exec } = require("node:child_process");
            const joined = paramsPath.join(' ');
            const outDir = path.join(solPath, 'conjure-output');
            // fs.mkdirSync(outDir);
            const command = `conjure solve --output-format=json --output-directory=${outDir} ${essencePath} ${joined}`;
            // console.log(`Running conjure solve: ${command}`);
            const result = child_process.execSync(command);
            resolve(result.toString());
            // exec(command, (output:any) => {
            //     // // once the command has completed, the callback function is called
            //     // if (err) {
            //     //     // log and return if we encounter an error
            //     //     console.error("could not execute command: ", err);
            //     //     reject(err);
            //     // }
            //     // // log the output received from the command
            //     // // console.log("SolveModel ",output.toString());

            //     resolve(output.toString());
            // });
        } catch (error) {
            reject(error);
        }

    });
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
function collectInfo(path: string, paramsPath: string[]) {
    var fullPath: string[] = [];
    const removedParams = paramsPath.map(p => p.replace('.param', ''));
    for (let i = 0; i < paramsPath.length; i++) {
        fullPath[i] = `${path}/conjure-output/model000001-${removedParams[i]}.eprime-info`;
    }

}
