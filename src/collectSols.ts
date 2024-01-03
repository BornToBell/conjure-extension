import { readdir } from "fs/promises";
import { findByName } from "./clean";
import * as fs from 'fs';
import { resolve } from "path";

interface solFormat {
    title: string,
    solutions: string[]
}

export async function collectSol(name: string, path: string, params: string[]) {
    const files = await findSolsByName(name, path);
    // console.log(files);
    let trimmed = params.map((param) => {
        return param.replace('.param', '')
    });
    let solutions: any[] = [];
    const promises:any[] = [];
    let data: solFormat
    trimmed.forEach((param) => {
        promises.push(findSolByName(name, path, param))
    })

    return Promise.all(promises).then((result) => {
        const data:solFormat = {title:name, solutions:result}
        return data;
    })


}







export const findSolsByName = async (name: string, dir: string) => {
    /* This code is taken from https://www.webmound.com/nodejs-find-files-matching-name-pattern-extension/ (last accessed 03-01-2024)*/
    /* BEGIN Copied Code */
    const path = require('path');
    const matchedFiles = [];
    const files = await readdir(dir);
    for (const file of files) {
        // Method 1:
        const fileExt = path.extname(file);
        if (file.includes(name) && file.endsWith('.solution.json')) {
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
        const path = require('path');
        readdir(dir)
            .then((files) => {
                files.forEach((file) => {
                    const fileExt = path.extname(file);
                    if (file.includes(name) && file.endsWith('.solution.json') && file.includes(param)) {
                        const fullPath = dir + '/' + file;
                        let rawData = fs.readFileSync(fullPath, 'utf8');
                        const jsonData = JSON.parse(rawData);
                        // console.log('solution', jsonData)
                        const data = {
                            parameter: param + '.param',
                            solution: jsonData
                        }
                        resolve(data);
                    }
                })
            })
            .finally(() => {
                const data = {
                    title: param + '.param',
                    solutions: ''
                }
                resolve(data)
            })

    })

    /* END  Copied Code*/
}