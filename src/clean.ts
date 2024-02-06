import { workspace, window } from "vscode";
import { unlink } from "fs";
import { readdir } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import { machine } from "os";
import { resolve } from "path";
import { error } from "console";


export async function cleanAll() {
    return await new Promise((resolve, reject) => {
        const path: undefined | string = workspace.rootPath;
        if (path === undefined) {
            const message = 'Open the folder containing the essence file.';
            reject(message);
        } else {
            const promises: any[] = [];
            // const commands: string[] = [`rm ${path}/mode_model*`, `rm ${path}/model*`, `rm -rf ${path}/conjure-output`]
            // commands.forEach((command) => {
            //     promises.push(execCommand(command))
            // })
            // promises.push(deleteFiles('mod_model', path))
            // const dir = path + '/conjure-output';

            promises.push(deleteFilesExt('.json', path));
            promises.push(deleteFilesExt('.solution', path));
            promises.push(deleteDir('conjure-output',path));
            Promise.all(promises).then(result => {
                window.showInformationMessage('Cleaned workspace');
                resolve(new Error("Cleaned workspace"));
            }).catch((error) => {
                console.log(error);
            });

        }
    });
}

export async function cleanConjure() {
    return await new Promise((resolve, reject) => {
        const path: undefined | string = workspace.rootPath;
        if (path === undefined) {
            const message = 'Open the folder containing the essence file.';
            reject(message);
        } else {
            const promises: any[] = [];
            promises.push(deleteDir('conjure-output',path));
            Promise.all(promises).then(result => {
                window.showInformationMessage('Cleaned workspace');
                resolve(new Error("Cleaned workspace"));
            }).catch((error) => {
                console.log(error);
            });

        }
    });
}

async function execCommand(command: string) {
    const { exec } = require("node:child_process");
    return await new Promise((resolve, reject) => {
        exec(command, (err: any, output: any) => {
            // once the command has completed, the callback function is called
            if (err) {
                // log and return if we encounter an error
                console.error(err);
                reject(err);
            } else {
                // log the output received from the command
                console.log(`Success ${command}`);
                resolve(output.toString());
            }

        });
    });
}

async function deleteDir(dir: string, dirPath: string) {
    const fullPath = path.join(dirPath,dir);
    fs.rm(fullPath, { recursive: true, force: true }, (err:any) => {
        if (err) {
            // File deletion failed 
            console.error(err.message);
            return;
        }
        console.log(`${fullPath} was deleted`);
    });
}

async function deleteFilesExt(ext: string, dir: string) {
    const files = await findByExt(ext, dir);
    // console.log(files);
    if (files.length > 0) {
        files.forEach((file) => {
            // const fullPath = dir + '/' + file;
            unlink(file, (err) => {
                if (err) {
                    // File deletion failed 
                    console.error(err.message);
                    return;
                }
                console.log(`${file} was deleted`);
            });
        });
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
        const filePath = path.join(dir,file);
        if(fs.statSync(filePath).isFile()&& path.extname(filePath)=== ext){
            matchedFiles.push(filePath);
        }
    }
    return matchedFiles;
    /* END  Copied Code*/
};
