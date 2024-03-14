import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { collectSol } from "./collectSols";
import { cleanConjure } from "./clean";
import * as child_process from "child_process";
import { detailReportOption } from "./optionReport";
import { Progress } from "./extension";


export async function solve(
  workPath: string,
  modelFile: string,
  paramPath: string,
  paramFiles: string[],
) {
  return new Promise(async (resolve, reject) => {
    try {
      const params: string[] = paramFiles.map((file) => path.join(paramPath,file));
      const model = await makeJSON(modelFile);
      const mod_model = await extractFile(model);
      const jsonData = await runConjureSolve(workPath, model, mod_model, params, paramFiles);
      const solPath = path.join(workPath, "all_solutions.json");
      fs.writeFileSync(solPath, jsonData);
      resolve(await detailReportOption(workPath, solPath, "Compare"))
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Remove last constraint
 * @param s json model
 * @returns json model which exclude last constraint
 */
export async function extractFile(s: any) {
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
  const JSONPromise = new Promise<string>((resolve, reject) => {
    const command = `conjure pretty --output-format=astjson ${fileName}`;
    exec(command, (err: any, output: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(output.toString());
      }
    });
  });
  return JSONPromise;
}

/**
 * Compare the solutions
 * @param essence model json
 * @param mod_essence modified model json
 * @param fileNames path to param files
 * @returns solutions are equal
 */
export async function runConjureSolve(
  workPath: string,
  essence: any,
  mod_essence: any,
  fileNames: string[],
  params: string[],
) {
  //cite from https://stackoverflow.com/questions/39569993/vs-code-extension-get-full-path
  const JSONPromise = new Promise<string>(async (resolve, reject) => {
    try {
      const filePath = path.join(workPath, "original.json");
      const mod_filePath = path.join(workPath, "removed.json");
      const outputPath = path.join(workPath, "conjure-output");
      fs.writeFileSync(filePath, essence);
      fs.writeFileSync(mod_filePath, mod_essence);

      Progress.appendLine(await solveModel(filePath, fileNames, workPath));
      const data1 = await collectSol("original", outputPath, params);
      await cleanConjure();
      Progress.appendLine(await solveModel(mod_filePath, fileNames, workPath));
      const data2 = await collectSol("removed", outputPath, params);
      const data = [data1, data2];
      const solutions = {
        Models: data,
      };
      resolve(JSON.stringify(solutions));
    } catch (error) {
      reject(error);
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
export function solveModel(
  essencePath: string,
  paramsPath: string[],
  solPath: string
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const { exec } = require("node:child_process");
      const joined = paramsPath.join(" ");
      const outDir = path.join(solPath, "conjure-output");
      const command = `conjure solve --output-format=json --output-directory=${outDir} ${essencePath} ${joined}`;
      const log = child_process.execSync(command).toString();
      // console.log(log)
      resolve(log);
      // exec(command, (err: any, output: any) => {
      //   if (err) {
      //     reject(err);
      //   } else {
      //     resolve('\n'+output.toString());
      //   }
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

