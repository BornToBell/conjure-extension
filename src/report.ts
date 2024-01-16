import fs from 'fs';


export async function simpleReport(path: string) {
    const fullPath = path + '/all_solutions.json';
    var data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    console.log(data);
    // const count = data.Models.reduce((total, model) => {
    //     const solutionsWithParameter = model.solutions.filter(solution => solution.parameter);
    //     return total + solutionsWithParameter.length;
    //   }, 0);
    const paramFile = findParams(data.Models[0]);
    const originalParam = findNonEmptySolutions(data.Models[0]);
    const removedCount = findNonEmptySolutions(data.Models[1]);
    const uniqueToOriginal = removedCount.filter((file) => !originalParam.includes(file))
    console.log(originalParam, removedCount)
    const diff = {
        Difference: [
            { Both: removedCount.length - uniqueToOriginal.length },
            { Neither: paramFile.length - removedCount.length },
            { Either: [{ Count: uniqueToOriginal.length }, { Name: uniqueToOriginal }] }
        ]
    }

    const jsonData = JSON.stringify(diff);

    const diffPath = path + '/simple_report.json'
    fs.writeFileSync(diffPath, jsonData)
}

function makeModel(model: string, params: number, sols: number) {
    return {
        model: [
            { 'having solution(s)': sols },
            { 'no solution': params - sols }
        ]
    }
}

interface Information {
    solution: Record<string, number> | string;
}

interface Solution {
    parameter: string;
    information: Information[];
}

interface Model {
    title: string;
    solutions: Solution[];
}

interface Data {
    Models: Model[];
}


function findNonEmptySolutions(model: Model): string[] {
    return model.solutions.filter((sol) => sol.information.some(notEmpty)).map((sol) => sol.parameter)

}

function notEmpty(info: Information) {
    return typeof info.solution !== 'string';
}

function findParams(model: Model): string[] {
    return model.solutions.map((sol) => {
        return sol.parameter;
    })
}


