import fs from "fs";
import * as path from "path";

export async function simpleReport(dir: string, solPath: string) {
  // const fullPath = path.join(dir, solName);
  fs.readFile(solPath, "utf-8", (error) => {
    if (error) {
      console.error(`Error reading file ${solPath} : `, error);
    } else {
      var data = JSON.parse(fs.readFileSync(solPath, "utf-8"));
      // console.log(data);

      const paramFile = findParams(data.Models[0]);
      const originalParam = findNonEmptySolutions(data.Models[0]);
      const removedCount = findNonEmptySolutions(data.Models[1]);
      // console.log(originalParam, removedCount);
      const uniqueToOriginal = removedCount.filter(
        (file) => !originalParam.includes(file)
      );
      // console.log(originalParam, removedCount);
      const diff = {
        Difference: [
          { Both: removedCount.length - uniqueToOriginal.length },
          { Neither: paramFile.length - removedCount.length },
          {
            Either: [
              { Count: uniqueToOriginal.length },
              { Name: uniqueToOriginal },
            ],
          },
        ],
      };

      const jsonData = JSON.stringify(diff);

      const diffPath = path.join(dir, "simple_report.json");
      fs.writeFileSync(diffPath, jsonData);
    }
  });
}

export async function detailReport(dir: string, solPath: string) {
  var data = JSON.parse(fs.readFileSync(solPath, "utf-8"));
  // console.log(data);
  // // const count = data.Models.reduce((total, model) => {
  // //     const solutionsWithParameter = model.solutions.filter(solution => solution.parameter);
  // //     return total + solutionsWithParameter.length;
  // //   }, 0);
  const paramFile = findParams(data.Models[0]);
  const originalParam = findNonEmptySolutions(data.Models[0]);
  const removedCount = findNonEmptySolutions(data.Models[1]);

  const originalNodes = countNodes(data.Models[0]);
  const removedNodes = countNodes(data.Models[1]);

  const originalTime = countTime(data.Models[0]);
  const removedTime = countTime(data.Models[1]);
  const uniqueToOriginal = removedCount.filter(
    (file) => !originalParam.includes(file)
  );
  var array = [{
    Both: removedCount.length - uniqueToOriginal.length,
    Neither: paramFile.length - removedCount.length,
    Either: [{ Count: uniqueToOriginal.length , Name: uniqueToOriginal }]
  }];

  const additional:any[] = [
    {
      Model: "Original",
      Average_Nodes: originalNodes / paramFile.length,
      Average_Time: originalTime / paramFile.length
    },
    {
        Model:"Removed",
        Average_Nodes: removedNodes / paramFile.length,
        Average_Time: removedTime / paramFile.length
    }
  ];

  if (uniqueToOriginal.length === 0) {
    array = array.concat(additional);
  }
  const result = {
    Mode:"Compare",
    Difference: array,
  };

  const jsonData = JSON.stringify(result);
  const diffPath = path.join(dir, "detailed_report.json");
  fs.writeFileSync(diffPath, jsonData);
}

function makeModel(model: string, params: number, sols: number) {
  return {
    model: [{ "having solution(s)": sols }, { "no solution": params - sols }],
  };
}

interface Information {
  solution?: Record<string, number> | string;
  SavileRowTotalTime?: number;
  SolverNodes?: number;
  SolverSolutionsFound?: number;
}

interface Solution {
  parameter: string;
  information: Information[];
}

export interface Model {
  title: string;
  solutions: Solution[];
}

interface Data {
  Models: Model[];
}

export function findNonEmptySolutions(model: Model): string[] {
  return model.solutions
    .filter((sol) => notEmpty(sol))
    .map((sol) => sol.parameter);
}

export function notEmpty(sol: Solution) {
  const allInfo: Information[] = sol.information;
  const numInfo: Information | undefined = allInfo.find(
    (info) => info.SolverSolutionsFound !== undefined
  );
  if (numInfo !== undefined && numInfo.SolverSolutionsFound !== undefined) {
    return numInfo.SolverSolutionsFound > 0;
  } else {return false;}
}

export function findNodes(sol: Solution): number {
  const allInfo: Information[] = sol.information;
  const numInfo: Information | undefined = allInfo.find(
    (info) => info.SolverNodes !== undefined
  );
  if (numInfo !== undefined && numInfo.SolverNodes !== undefined) {
    return numInfo.SolverNodes;
  } else {return 0;}
}
export function countTime(model: Model): number {
  return model.solutions.reduce(
    (accumlator, current) => accumlator + findTime(current),
    0
  );
}

function findTime(sol: Solution): number {
  const allInfo: Information[] = sol.information;
  const numInfo: Information | undefined = allInfo.find(
    (info) => info.SavileRowTotalTime !== undefined
  );
  if (numInfo !== undefined && numInfo.SavileRowTotalTime !== undefined) {
    return numInfo.SavileRowTotalTime;
  } else {return 0;}
}
export function countNodes(model: Model): number {
  return model.solutions.reduce(
    (accumlator, current) => accumlator + findNodes(current),
    0
  );
}

export function findParams(model: Model): string[] {
  return model.solutions.map((sol) => {
    return sol.parameter;
  });
}
