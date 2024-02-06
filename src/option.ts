import * as fs from "fs";
import * as vscode from "vscode";
import * as path from "path";
import { makeJSON, solveModel } from "./solve";
import { collectSol } from "./collectSols";
import { cleanConjure } from "./clean";
import { start } from "repl";

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
        Constraints: constraints.map((constraint) => (

          {
            Name: constraint.Name,
            Group: constraint.Group,
            Index: constraint.Index

          })),
      };

      const jsonString = JSON.stringify(jsonOutput, null, 2);
      if (vscode.workspace.workspaceFolders !== undefined) {
        let wf = vscode.workspace.workspaceFolders[0].uri.path;
        const filePath = path.join(wf, "Options.json");
        fs.writeFileSync(filePath, jsonString);

        const paramFiles: string[] = params.map(file => path.join(paramPath, file));

        makeJSON(modelFile).then((model: any) => {
          buildModel({ model, stPos, constraints }).then((models) => {
            if (models !== null) {
              solveAll(models[0], paramFiles, wf, params).then((result) => {
                const solutions = {
                  Models: result
                }
                const jsonData = JSON.stringify(solutions);
                const solPath = path.join(wf, 'options_all_solutions.json');
                fs.writeFileSync(solPath, jsonData);
              })
            }
          })
        });
      }

    }
  });
}

async function solveAll(models: string[], paramsPathes: string[], modelPath: string, params: string[]) {
  const promises: any[] = [];
  console.log("Models",models);
  // const jsons = models.map((model) => { return model + ".json" });
  models.forEach((model: string) => {
    // console.log(modelPath, model)
    const promise = new Promise((resolve, reject) => {
      const jsonPath = model+'.json';
      cleanConjure();
      const outPutPath = path.join(modelPath,'conjure-output');
      solveModel(path.join(modelPath, jsonPath), paramsPathes, modelPath).then(() => {
        resolve(collectSol(model, outPutPath, params));
      })
    })
    promises.push(promise);
  })



  return Promise.all(promises).then((s1) => {
    console.log(s1);
    return s1;
  })
}


async function buildModel({ model, stPos, constraints }: { model: string; stPos: STPos; constraints: Constraint[]; }) {
  try {
    console.log("Create models");
    var inputData = JSON.parse(model);
    var models: any[] = [];
    const statements = inputData.mStatements;
    // Find the index of the last "SuchThat" key
    const suchThatKeys = inputData.mStatements
      .map((stmt: { SuchThat: any }, index: any) =>
        stmt.SuchThat ? index : null
      )
      .filter((val: null) => val !== null);
    const estimatedST = stPos.afterEndOption + stPos.beforeStartOption + stPos.betweenStartAndEnd;
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

    const promises: any[] = [];
    combinations.forEach((combi) => {
      promises.push(writeModel(constraints, inputData, baseCos, statements, combi, startOp))
    })

    return Promise.all(promises).then((result) => {
      models.push(result);
      return models;
    })
  } catch (error) {
    console.error(error);
    return null;
  }

  async function writeModel(constraints: Constraint[], inputData: any, baseCos: any[], statements: any[], combi: number[], startOp: number) {
    const state = baseCos;
    for (let j = 0; j++; j < combi.length) {
      state.push(statements[startOp + combi[j]])
    }
    const model = {
      ...inputData,
      mStatements: state,
    }
    const json = JSON.stringify(model);
    var fileName: string = constraints[combi[0]].Name;
    if (vscode.workspace.workspaceFolders !== undefined) {
      let wf = vscode.workspace.workspaceFolders[0].uri.path;

      for (let i = 1; i < combi.length; i++) {
        fileName = fileName + "_" + constraints[combi[i]].Name;
      }
      const filePath = fileName + '.json';
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
    const afterSuchThat = essence.slice(endOptionIndex).match(/such that/g) || [];

    const result = {
      beforeStartOption: startSuchThat.length,
      betweenStartAndEnd: betweenSuchThat.length,
      afterEndOption: afterSuchThat.length,
    };
    console.log("such that ", result);
    return result;
  } catch (error: any) {
    console.error(error.message);
    return null;
  }
}

interface Constraint {
  Name: string;
  Group: string;
  Index: number
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
        currentConstraint = { Name: name, Group: "", Description: null, Index: -1 };
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
      group.set(options[i].Group, member)
    } else {
      const member: number[] = [options[i].Index]
      group.set(options[i].Group, member)
    }
  };
  return group;

}