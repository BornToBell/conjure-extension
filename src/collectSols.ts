import { readdir } from "fs/promises";
// import { findByName } from "./clean";
import * as fs from "fs";
import * as path from "path";
import { rejects } from "assert";

export interface solFormat {
  title: string;
  solutions: string[];
}

export function collectSol(name: string, path: string, params: string[]) {

  return new Promise((resolve, rejects) => {
    try {
      let trimmed = params.map((param) => {
        return param.replace(".param", "");
      });
      // let solutions: any[] = [];
      const promises: any[] = [];
      // let data: solFormat;
      if (params.length > 0) {
        trimmed.forEach((param) => {
          promises.push(findSolByNameDetail(name, path, param));
        });
      } else {
        promises.push(findSolByNameDetail(name, path, ''));
      }

      resolve(Promise.all(promises).then((result) => {
        const data: solFormat = { title: name, solutions: result };
        return data;
      }));
    } catch (error) {
      rejects(error);
    }
  });

}

export const findSolsByName = async (name: string, dir: string) => {
  /* This code is taken from https://www.webmound.com/nodejs-find-files-matching-name-pattern-extension/ (last accessed 03-01-2024)*/
  /* BEGIN Copied Code */
  const path = require("path");
  const matchedFiles = [];
  const files = await readdir(dir);
  for (const file of files) {
    // Method 1:
    const fileExt = path.extname(file);
    if (file.includes(name) && file.endsWith(".solution.json")) {
      matchedFiles.push(file);
    }
  }
  return matchedFiles;
  /* END  Copied Code*/
};

export async function findSolByName(name: string, dir: string, param: string) {
  /* This code is taken from https://www.webmound.com/nodejs-find-files-matching-name-pattern-extension/ (last accessed 03-01-2024)*/
  /* BEGIN Copied Code */
  return await new Promise((resolve, reject) => {
    // const path = require("path");
    readdir(dir)
      .then((files) => {
        files.forEach((file) => {
          if (
            file.includes(name) &&
            file.endsWith(".solution.json") &&
            file.includes(param)
          ) {
            const fullPath = dir + "/" + file;
            let rawData = fs.readFileSync(fullPath, "utf8");
            const jsonData = JSON.parse(rawData);
            // console.log('solution', jsonData)
            const data = {
              parameter: param + ".param",
              information: [{ solution: jsonData }],
            };
            resolve(data);
          }
        });
      })
      .finally(() => {
        const data = {
          parameter: param + ".param",
          information: [{ solution: "" }],
        };
        resolve(data);
      });
  });

  /* END  Copied Code*/
}

export async function findSolByNameDetail(
  name: string,
  dir: string,
  param: string
) {
  /* This code is taken from https://www.webmound.com/nodejs-find-files-matching-name-pattern-extension/ (last accessed 03-01-2024)*/
  /* BEGIN Copied Code */
  return await new Promise((resolve, reject) => {
    var info: any[] = [];
    var sol: any[] = [{ solution: "" }];
    readdir(dir)
      .then((files) => {
        files.forEach((file) => {
          const filePath = path.join(dir, file);
          if (path.extname(filePath) === '.eprime-info' && file.includes(param)) {
            let rawData = fs.readFileSync(filePath, "utf8");
            const splitedData = rawData.split("\r\n");
            // console.log('solution', jsonData)

            // ファイルの各行を配列に分割
            const lines = rawData.split("\n");

            // フィルタリングとデータの抽出
            const filteredData = lines
              .filter(
                (line) =>
                  line.includes("SavileRowTotalTime") ||
                  line.includes("SolverNodes") ||
                  line.includes("SolverSolutionsFound")
              )
              .map((line) => {
                const [key, value] = line.split(":");
                return { [key.trim()]: parseFloat(value.trim()) };
              });
            info = filteredData;
          } else if (file.endsWith(".solution.json") && file.includes(param)) {
            let rawData = fs.readFileSync(filePath, "utf8");
            const jsonData = JSON.parse(rawData);
            sol = [{ solution: jsonData }];
          }
        });
      })
      .finally(() => {
        const data: any[] = sol.concat(info);
        var jsonData;
        if (param.length > 0) {
          jsonData = {
            parameter: param + ".param",
            information: data,
          };
        } else {
          jsonData = {
            parameter: '',
            information: data,
          };
        }

        resolve(jsonData);
      });
  });

  /* END  Copied Code*/
}
