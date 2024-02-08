import { time } from "console";
import * as fs from "fs";
import path from "path";


interface time {
  label: string;
  time: number;
}

interface nodes {
  label: string;
  nodes: number;
}

interface Report {
  Mode: string;
  Difference: any[];
}

interface Model {
  Model: string;
  Average_Nodes: number;
  Average_Time: number;
}

interface Solutions {
    Solutions: {
        All_solved: {
            Number: number,
            Models: string[]
        },
        Partial_solved: {
            Number: number,
            Models: string[]
        },
        No_solution: {
            Number: number,
            Models: string[]
        }
    }
}

export async function createChart(
  reportUri: string,
  dir: string
): Promise<string[]> {
  return new Promise((resolve, rejects) => {
    try {
      console.log("Create chart");
      const data = JSON.parse(fs.readFileSync(reportUri, "utf-8"));
      const report: Report = {
        Mode: data.Mode,
        Difference: data.Difference,
      };

      const array: Model[] = report.Difference.slice(1);
      
      const timeData: time[] = array.map((model: Model) => {
        return {
          label: model.Model,
          time: model.Average_Time,
        };
      });
      const nodeData: nodes[] = array.map((model: Model) => {
        return {
          label: model.Model,
          nodes: model.Average_Nodes,
        };
      });
      const txt = createTxt(report.Difference[0]);

      const combinedData: string[] = [
        txt,
        JSON.stringify(nodesConfig(nodeData)),
        JSON.stringify(timeConfig(timeData))
      ];
      const solPath = path.join(dir,'solutions.txt');
      fs.writeFileSync(solPath, txt);

      resolve(combinedData);
    } catch (error) {
      console.log(error);
      rejects(null);
    }
  });
}

function timeConfig(data: time[]) {
  if (data.length > 1) {
    const chart = {
      type: "bar",
      data: {
        labels: data.map((row) => row.label),
        datasets: [
          {
            label: "Average time",
            data: data.map((row) => row.time),
          },
        ],
      },
    };
    return chart;
  } else {
    return [];
  }
}

function nodesConfig(data: nodes[]) {
  if (data.length > 1) {
    const chart = {
      type: "bar",
      data: {
        labels: data.map((row) => row.label),
        datasets: [
          {
            label: "Average Nodes",
            data: data.map((row) => row.nodes),
          },
        ],
      },
    };
    return chart;
  } else {
    return [];
  }
}

function createTxt(solutions:Solutions){

    const aSolved = solutions.Solutions.All_solved.Number;
    const pSolved = solutions.Solutions.Partial_solved.Number;
    const nSolved = solutions.Solutions.No_solution.Number;
    const total = aSolved+pSolved+nSolved;

    const allResolvedText = `All resolved models: ${solutions.Solutions.All_solved.Models.join(', ')}\n`;
    const partiallyResolvedText = `Partially resolved models: ${solutions.Solutions.Partial_solved.Models.join(', ')}\n`;
    const notResolvedText = `Models not resolved at all: ${solutions.Solutions.No_solution.Models.join(', ')}\n\n`;
    
    const allResolvedCountText = `The number of all resolved models is ${aSolved} out of ${total}.\n`;
    const partiallyResolvedCountText = `The number of partially solved models is ${pSolved} out of ${total}.\n`;
    const notResolvedCountText = `The number of models not solved at all is ${nSolved} out of ${total}.\n`;

    
    return allResolvedText + partiallyResolvedText + notResolvedText + allResolvedCountText + partiallyResolvedCountText + notResolvedCountText;
}

