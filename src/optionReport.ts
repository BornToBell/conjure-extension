/* eslint-disable eqeqeq */
import * as fs from "fs";
import * as path from "path";
import {
  findParams,
  findNonEmptySolutions,
  countNodes,
  countTime,
  Model,
} from "./report";
import { rejects } from "assert";

export async function detailReportOption(dir: string, solPath: string,mode:string) {
  return new Promise((resolve, reject) => {
    try {
      var data = JSON.parse(fs.readFileSync(solPath, "utf-8"));
      // console.log(data);
      // // const count = data.Models.reduce((total, model) => {
      // //     const solutionsWithParameter = model.solutions.filter(solution => solution.parameter);
      // //     return total + solutionsWithParameter.length;
      // //   }, 0);

      var fullSol = 0;
      var parSol = 0;
      var noSol = 0;

      const fModels: string[] = [];
      const pModels: string[] = [];
      const nModels: string[] = [];

      var solInfo: any[] = [];
      var diff: any[] = [];

      const models: Model[] = data.Models;
      models.forEach((model: Model) => {
        // console.log(model);

        const paramFile = findParams(model);
        const nonEmptySol = findNonEmptySolutions(model);

        const nodes = countNodes(model);
        const time = countTime(model);
        if (paramFile.length === nonEmptySol.length) {
          const sum = paramFile.length;
          fullSol++;
          fModels.push(model.title);
          solInfo.push({
            Model: model.title,
            Average_Nodes: nodes / sum,
            Average_Time: time / sum,
          });
        } else if (nonEmptySol.length === 0) {
          nModels.push(model.title);
          noSol++;
        } else {
          pModels.push(model.title);
          parSol++;
        }
      });

      diff.push({
        Solutions: {
          All_solved: { Number: fullSol, Models: fModels },
          Partial_solved: { Number: parSol, Models: pModels },
          No_solution: { Number: noSol, Models: nModels },
        },
      });

      const output = {
        Mode: mode,
        Difference: diff.concat(solInfo),
      };
      // const jsonData = JSON.stringify(diff)
      // const paramFile = findParams(data.Models[0]);
      // const originalParam = findNonEmptySolutions(data.Models[0]);
      // const removedCount = findNonEmptySolutions(data.Models[1]);

      // const originalNodes = countNodes(data.Models[0]);
      // const removedNodes = countNodes(data.Models[1]);

      // const originalTime = countTime(data.Models[0]);
      // const removedTime = countTime(data.Models[1]);
      // const uniqueToOriginal = removedCount.filter((file) => !originalParam.includes(file));
      // var array = [];
      // const addtional: any[] = [{ Original: [{ Average_Nodes: originalNodes / paramFile.length }, { Average_Time: originalTime / paramFile.length }] },
      // { Removed: [{ Average_Nodes: removedNodes / paramFile.length }, { Average_Time: removedTime / paramFile.length }] }]
      // const diff: any[] = [
      //     { Both: removedCount.length - uniqueToOriginal.length },
      //     { Neither: paramFile.length - removedCount.length },
      //     { Either: [{ Count: uniqueToOriginal.length }, { Name: uniqueToOriginal }] }
      // ]
      // if (uniqueToOriginal.length === 0) {
      //     array = diff.concat(addtional);
      // }
      // const result = {
      //     Difference: array
      // };

      const jsonData = JSON.stringify(output);
      const diffPath = path.join(dir, "detailed_report.json");
      resolve(fs.writeFileSync(diffPath, jsonData));
    } catch (error) {
      reject(error);
    }
  });
}
