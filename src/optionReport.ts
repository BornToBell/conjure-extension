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
import { NONAME } from "dns";

export async function detailReportOption(dir: string, solPath: string,mode:string) {
  return new Promise((resolve, reject) => {
    try {
      var data = JSON.parse(fs.readFileSync(solPath, "utf-8"));
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
        const paramFile = findParams(model);
        const nonEmptySol = findNonEmptySolutions(model);
        const EmptySol = paramFile.filter(param => !nonEmptySol.includes(param));

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
          solInfo.push({
            Model: model.title,
            Not_Solved:EmptySol,
          });
          noSol++;
        } else {
          pModels.push(model.title);
          solInfo.push({
            Model: model.title,
            Not_Solved:EmptySol,
          });
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
      
      const jsonData = JSON.stringify(output);
      const diffPath = path.join(dir, "detailed_report.json");

      resolve(fs.writeFileSync(diffPath, jsonData));
    } catch (error) {
      reject(error);
    }
  });
}
