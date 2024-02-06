import * as fs from "fs";
import * as vscode from "vscode";
import * as path from "path";
import { makeJSON, solveModel } from "./solve";
import { collectSol, solFormat } from "./collectSols";
import { cleanConjure } from "./clean";
import { detailReportOption } from "./optionReport";
import { promises } from "dns";
import { rejects } from "assert";

export function solveOptions(
  modelFile: string,
  paramPath: string,
  params: string[]
) {
  fs.readFile(modelFile, "utf-8", (err, data) => {
    if (err) {
      console.error("Error reading file", err);
      return;
    }
    const stPos: STPos | null = countSuchThat(data);
    if (stPos === null) {
      return;
    }
    const constraints = parseEssence(data);
    if (constraints !== null) {
      const jsonOutput = {
        Constraints: constraints.map((constraint) => ({
          Name: constraint.Name,
          Group: constraint.Group,
          Index: constraint.Index,
        })),
      };

      const jsonString = JSON.stringify(jsonOutput, null, 2);
      if (vscode.workspace.workspaceFolders !== undefined) {
        let wf = vscode.workspace.workspaceFolders[0].uri.path;
        const filePath = path.join(wf, "Options.json");
        fs.appendFileSync(filePath, jsonString);

        const paramFiles: string[] = params.map((file) =>
          path.join(paramPath, file)
        );
        const solPath = path.join(wf, "options_all_solutions.json");
        makeJSON(modelFile).then((model: any) => {
          // const jsonName = modelFile.replace('.essence','')+'.json';
          const modelPath = path.join(wf, 'Model.json');
          fs.writeFileSync(modelPath, model);
          buildModel({ model, stPos, constraints }).then(async (models) => {
            if (models !== null) {
              solveAll(models[0], paramFiles, wf, params)
                .then((results) => {
                  const outputData = {
                    Models: results,
                  };
                  console.log("Results", results);
                  const jsonData = JSON.stringify(outputData);
                  // return fs.writeFileSync(solPath, jsonData);

                  fs.writeFileSync(solPath, jsonData);
                  // detailReportOption(wf, solPath);
                })
                .then(() => {
                  detailReportOption(wf, solPath);
                })
                .then(() => {
                  console.log("Finished");
                  vscode.window.showInformationMessage("Finished Options Command");
                });
            }
          });
        });
      }
    }
  });
}

async function solveAll(
  models: string[],
  paramsFiles: string[],
  modelPath: string,
  params: string[]
): Promise<any[]> {
  const results: any[] = [];
  for (const model of models) {
    const result = await solveOne(model, paramsFiles, modelPath, params);
    results.push(result);
  }
  return results;
  // const promises: Promise<any>[] = models.map((model) => {
  //   return
  // });

  // try {
  //   const results = await Promise.all(promises);
  //   return results;
  // } catch (error) {
  //   throw error;
  // }
}

// function solveAll(
//   models: string[],
//   paramFiles: string[],
//   modelPath: string,
//   params: string[]
// ) {
//   const promises: any[] = [];
//   return new Promise(async (resolve, rejects) => {
//     try {
//       models.map((model: any) => {
//         promises.push(solveOne(model, paramFiles, modelPath, params));
//         // const rs = await ;
//         // console.log("result", rs);
//         // return rs;
//       });
//       // console.log("results", results);

//       syncProcess(promises).then((results) => resolve(results));
//     } catch (error) {
//       rejects(error);
//     }
//   });
// }

async function syncProcess(promises: (() => Promise<any>)[]): Promise<any[]> {
  const results: any[] = [];
  for (const promiseFn of promises) {
    const result = await promiseFn();
    results.push(result);
  }
  return results;
}

async function solveOne(
  model: string,
  paramsPathes: string[],
  modelPath: string,
  params: string[]
) {
  return new Promise(async (resolve, reject) => {
    try {
      const jsonPath = model + ".json";
      const outPutPath = path.join(modelPath, "conjure-output");

      // cleanConjure 関数を実行して待機
      const cleanResult = await cleanConjure();
      console.log("Clean", model, cleanResult);

      // solveModel 関数を実行して待機
      const solveResult = await solveModel(
        path.join(modelPath, jsonPath),
        paramsPathes,
        modelPath
      );
      console.log("Solve", model, "\n", solveResult);

      // collectSol 関数を実行して待機し、その結果を変数に格納
      const collectResult = await collectSol(model, outPutPath, params);

      // collectSol の結果を resolve
      resolve(collectResult);
    } catch (error) {
      reject(error);
    }
  });
}

async function buildModel({
  model,
  stPos,
  constraints,
}: {
  model: string;
  stPos: STPos;
  constraints: Constraint[];
}) {
  try {
    // console.log("Create models");
    var inputData = JSON.parse(model);
    var models: any[] = [];
    const statements = inputData.mStatements;
    // Find the index of the last "SuchThat" key
    const suchThatKeys = inputData.mStatements
      .map((stmt: { SuchThat: any }, index: any) =>
        stmt.SuchThat ? index : null
      )
      .filter((val: null) => val !== null);
    const estimatedST =
      stPos.afterEndOption + stPos.beforeStartOption + stPos.betweenStartAndEnd;
    if (suchThatKeys.length !== estimatedST) {
      console.error(estimatedST, suchThatKeys, suchThatKeys.length);
      throw new Error("Invalid format: Invalid number of such that");
    }
    const startCos = suchThatKeys[0];
    const startOp: number = startCos + stPos.beforeStartOption;
    const endOp = startOp + stPos.betweenStartAndEnd - 1;

    const beforeOption: any[] = statements.slice(0, startOp);
    const afterOption = [];
    if (endOp + 1 < statements.length) {
      afterOption.push(statements.slice(endOp + 1));
    }

    const baseCos = beforeOption.concat(afterOption);
    const group: Map<string, number[]> = createMap(constraints);
    const combinations: number[][] = generateCombinations(group);
    console.log('combinations',combinations);
    const promises: any[] = [];
    combinations.forEach((combi) => {
      promises.push(
        writeModel(constraints, inputData, baseCos, statements, combi, startOp)
      );
    });

    return Promise.all(promises).then((result) => {
      models.push(result);
      return models;
    });
  } catch (error) {
    console.error(error);
    return null;
  }

  async function writeModel(
    constraints: Constraint[],
    inputData: any,
    baseCos: any[],
    statements: any[],
    combi: number[],
    startOp: number
  ) {
    const state = baseCos.concat(combi.map((st) => {
      return statements[startOp + st];
    }));
    const model = {
      ...inputData,
      mStatements: state,
    };
    const json = JSON.stringify(model);
    var fileName: string = constraints[combi[0]].Name;
    if (vscode.workspace.workspaceFolders !== undefined) {
      let wf = vscode.workspace.workspaceFolders[0].uri.path;

      for (let i = 1; i < combi.length; i++) {
        fileName = fileName + "_" + constraints[combi[i]].Name;
      }
      const filePath = fileName + ".json";
      const fullPath = path.join(wf, filePath);
      fs.writeFileSync(fullPath, json);
    }
    return fileName;
  }

  // // Create a new JSON excluding the last "SuchThat" key and value
  // const outputData = {
  //   ...inputData,
  //   mStatements: inputData.mStatements
  //     .slice(0, lastIndex)
  //     .concat(inputData.mStatements.slice(lastIndex + 1)),
  // };
}

function countSuchThat(essence: string): STPos | null {
  try {
    const startOptionIndex = essence.indexOf("$$$ START-OPTION");
    const endOptionIndex = essence.indexOf("$$$ END-OPTION");
    if (startOptionIndex < 0) {
      throw new Error("Invalid format: $$$ START-OPTION is missing");
    } else if (endOptionIndex < 0) {
      throw new Error("Invalid format: $$$ END-OPTION is missing");
    }
    const startSuchThat =
      essence.slice(0, startOptionIndex).match(/such that/g) || [];
    const betweenSuchThat =
      essence.slice(startOptionIndex, endOptionIndex).match(/such that/g) || [];
    const afterSuchThat =
      essence.slice(endOptionIndex).match(/such that/g) || [];

    const result = {
      beforeStartOption: startSuchThat.length,
      betweenStartAndEnd: betweenSuchThat.length,
      afterEndOption: afterSuchThat.length,
    };
    // console.log("such that ", result);
    return result;
  } catch (error: any) {
    console.error(error.message);
    return null;
  }
}

interface Constraint {
  Name: string;
  Group: string;
  Index: number;
}

interface STPos {
  afterEndOption: number;
  beforeStartOption: number;
  betweenStartAndEnd: number;
}

// function parseEssence(essence: string): Constraint[] {
//   const constraints: Constraint[] = [];
//   let currentConstraint: Constraint | null = null;

//   const lines = essence.split('\n');
//   lines.forEach(line => {
//     const match = line.match(/\$\$\$ Name: (.+)/);
//     if (match) {
//       currentConstraint = { Name: match[1].trim(), Group: "" };
//     } else if (currentConstraint && line.includes("$$$ Group:")) {
//       const groupMatch = line.match(/\$\$\$ Group: (.+)/);
//       if (groupMatch) {
//         currentConstraint.Group = groupMatch[1].trim();
//         constraints.push({ ...currentConstraint });
//         currentConstraint = null;
//       }
//     }
//   });

//   return constraints;
// }

interface Constraint {
  Name: string;
  Group: string;
  Description: string | null;
}

function parseEssence(essence: string): Constraint[] | null {
  try {
    const constraints: Constraint[] = [];
    let currentConstraint: Constraint | null = null;
    var index = 0;
    const lines = essence.split("\n");
    lines.forEach((line) => {
      const nameMatch = line.match(/\$\$\$ Name: (.*)/);
      const groupMatch = line.match(/\$\$\$ Group: (.*)/);
      const descMatch = line.match(/\$\$\$ Description: (.*)/);

      if (nameMatch) {
        const name = nameMatch[1].trim();
        if (!name) {
          throw new Error("Invalid format: Name is missing");
        }
        currentConstraint = {
          Name: name,
          Group: "",
          Description: null,
          Index: -1,
        };
      } else if (groupMatch && currentConstraint) {
        const group = groupMatch[1].trim();
        if (!group) {
          throw new Error("Invalid format: Group is missing");
        }
        currentConstraint.Group = group;
        currentConstraint.Index = index;
        constraints.push({ ...currentConstraint });
        index++;
        currentConstraint = null;
      }
    });
    return constraints;
  } catch (error: any) {
    console.error(error.message);
    return null;
  }
}
//This code is generated by chatGPT-3.5
function generateCombinations(map: Map<string, number[]>): number[][] {
  const keys = Array.from(map.keys());
  const values = Array.from(map.values());

  const combinations: number[][] = [];

  function generate(currentCombination: number[], currentIndex: number): void {
    if (currentIndex === keys.length) {
      combinations.push(currentCombination.slice());
      return;
    }

    const currentKey = keys[currentIndex];
    const currentValues = values[currentIndex];

    for (const value of currentValues) {
      currentCombination[currentIndex] = value;
      generate(currentCombination, currentIndex + 1);
    }
  }

  generate([], 0);
  return combinations;
}
//end of citation

function createMap(options: Constraint[]) {
  const group = new Map();
  for (let i = 0; i < options.length; i++) {
    if (group.has(options[i].Group)) {
      const member = group.get(options[i].Group);
      member.push(options[i].Index);
      group.set(options[i].Group, member);
    } else {
      const member: number[] = [options[i].Index];
      group.set(options[i].Group, member);
    }
  }
  return group;
}
