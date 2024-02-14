import * as fs from "fs";
import * as vscode from "vscode";
import * as path from "path";
import { makeJSON, solveModel } from "./solve";
import { collectSol} from "./collectSols";
import { cleanConjure } from "./clean";
import { detailReportOption } from "./optionReport";
import { Progress } from "./extension";

export async function solveOptions(
  workPath: string,
  modelFile: string,
  paramPath: string,
  params: string[]
) {
  return new Promise(async (resolve, rejects) => {
    try {
      const data = fs.readFileSync(modelFile, "utf-8");
      const stPos: STPos = await countSuchThat(data);
      const constraints: Constraint[] = await parseEssence(data);
      const jsonOutput = {
        Constraints: constraints.map((constraint) => ({
          Name: constraint.Name,
          Group: constraint.Group,
          Index: constraint.Index,
        })),
      };
      const jsonString = JSON.stringify(jsonOutput, null, 2);
      const filePath = path.join(workPath, "Options.json");
      fs.appendFileSync(filePath, jsonString);

      const paramFiles: string[] = params.map((file) =>
        path.join(paramPath, file)
      );
      const solPath = path.join(workPath, "all_solutions.json");
      const model = await makeJSON(modelFile);
      const modelPath = path.join(workPath, "Model.json");
      fs.writeFileSync(modelPath, model);
      const models = await buildModel(model, stPos, constraints);
      const results = await solveAll(models[0], paramFiles, workPath, params);
      const outputData = {
        Models: results,
      };
      const jsonData = JSON.stringify(outputData);
      fs.writeFileSync(solPath, jsonData);
      resolve(await detailReportOption(workPath, solPath, "Option"))

    } catch (error) {
      rejects(error);
    }
  });
}

async function solveAll(
  models: string[],
  paramsFiles: string[],
  modelPath: string,
  params: string[]
): Promise<any[]> {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const results: any[] = [];
      for (const model of models) {
        const result = await solveOne(model, paramsFiles, modelPath, params);
        results.push(result);
      }
      resolve(results);
    } catch (error) {
      reject(error);
    }
  })
}


async function solveOne(
  model: string,
  paramsPaths: string[],
  modelPath: string,
  params: string[]
) {
  return new Promise(async (resolve, reject) => {
    try {
      const jsonPath = model + ".json";
      const outPutPath = path.join(modelPath, "conjure-output");

      await cleanConjure();
      const solveResult = await solveModel(
        path.join(modelPath, jsonPath),
        paramsPaths,
        modelPath
      );
      Progress.appendLine(`\n`+solveResult);
      const collectResult = await collectSol(model, outPutPath, params);
      resolve(collectResult);
    } catch (error) {
      reject(error);
    }
  });
}

async function buildModel(
  model: string,
  stPos: STPos,
  constraints: Constraint[]
) {

  return new Promise<string[][]>((resolve, reject) => {
    try {
      var inputData = JSON.parse(model);
      var models: any[] = [];
      const statements = inputData.mStatements;
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
      const promises: any[] = [];
      combinations.forEach((combi) => {
        promises.push(
          writeModel(constraints, inputData, baseCos, statements, combi, startOp)
        );
      });

      Promise.all(promises).then((result) => {
        models.push(result);
        resolve(models);
      });
    } catch (error) {
      reject(error);
    }
  })
}

async function writeModel(
  constraints: Constraint[],
  inputData: any,
  baseCos: any[],
  statements: any[],
  combi: number[],
  startOp: number
) {
  const state = baseCos.concat(
    combi.map((st) => {
      return statements[startOp + st];
    })
  );
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

function countSuchThat(essence: string) {
  return new Promise<STPos>((resolve, reject) => {
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
      resolve(result);
    } catch (error: any) {
      console.error(error.message);
      reject(error);
    }
  })

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

interface Constraint {
  Name: string;
  Group: string;
  Description: string | null;
}

function parseEssence(essence: string) {
  return new Promise<Constraint[]>((resolve, reject) => {
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
      resolve(constraints);
    } catch (error: any) {
      reject(error);
    }
  })

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
