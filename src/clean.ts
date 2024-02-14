import { workspace, Terminal } from "vscode";
import { unlink } from "fs";
import { readdir } from "fs/promises";
import * as fs from "fs";
import * as path from "path";



export async function cleanAll() {
    return new Promise((resolve, reject) => {
        const path: undefined | string = workspace.rootPath;
        if (path === undefined) {
            const message = 'Open the folder containing the essence file.';
            reject(message);
        } else {
            const promises: any[] = [];

            promises.push(deleteFilesExt('.json', path));
            promises.push(deleteFilesExt('.solution', path));
            promises.push(deleteDir('conjure-output', path));
            Promise.all(promises).then(result => {
                resolve(result.join(' '));
            }).catch((error) => {
               console.error(error);
            });

        }
    });
}

export function cleanConjure() {
    return new Promise<string>((resolve, reject) => {
        const path: undefined | string = workspace.rootPath;
        if (path === undefined) {
            const message = 'Open the folder containing the essence file.';
            reject(message);
        } else {
            const promises: any[] = [];
            promises.push(deleteDir('conjure-output', path));
            Promise.all(promises).then((result:string[]) => {
                // terminal.sendText(result.join(' '));
                resolve(result.join(' '));
            }).catch((error) => {
                reject(error)
                // terminal.sendText(error);
            });

        }
    });
}


function deleteDir(dir: string, dirPath: string) {

    return new Promise<string>((resolve, rejects) => {
        try {
            const fullPath = path.join(dirPath, dir);
            if (!fs.existsSync(fullPath)) {
                resolve("Already deleted");
            } else {
                fs.rmSync(fullPath, { recursive: true })
                resolve(`${fullPath} was deleted`);
            }

        } catch (error) {
            rejects(error);
        }
    });
}

async function deleteFilesExt(ext: string, dir: string) {
    const files = await findByExt(ext, dir);
    const deleted:string[] = [];
    if (files.length > 0) {
        files.forEach((file) => {
            unlink(file, (err) => {
                if (err) {
                    // File deletion failed 
                    console.error(err.message);
                    return;
                }
                deleted.push(`${file} was deleted`);
            });
        });

        return deleted;
    }

}

export const findByExt = async (ext: string, dir: string) => {
    /* This code is taken from https://www.webmound.com/nodejs-find-files-matching-name-pattern-extension/ (last accessed 03-01-2024)*/
    /* BEGIN Copied Code */
    const path = require('path');
    const matchedFiles = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        // Method 1:
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isFile() && path.extname(filePath) === ext) {
            matchedFiles.push(filePath);
        }
    }
    return matchedFiles;
    /* END  Copied Code*/
};
