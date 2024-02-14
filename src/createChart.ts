import { time } from "console";
import * as fs from "fs";
import { utils } from "mocha";
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

interface solModels {
  Model: solModel[]
}
interface solModel {
  title: string,
  solutions: Parameter[]
}

interface Parameter {
  parameter: string
  information: [
    { solution: string | string[] },
    { SavileRowTotalTime: number },
    { SolverNodes: number },
    { SolverSolutionsFound: number }
  ]
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
      const allSolUri = path.join(dir, 'all_solutions.json');
      // const data2 = JSON.parse(fs.readFileSync(reportUri, "utf-8"));
      // var params = [];
      // if (data2.Models[0].solutions.length == 1) {
      //   params.push("No parameter")
      // } else {
      //   data2.Models[0].solutions.forEach((param: Parameter) => params.push(param.parameter));
      // }
      const indivi = createInddiviChart(allSolUri, report.Difference[0].Solutions.All_solved.Models);
      const txt = createTxt(report.Difference[0]);

      const combinedData: string[] = [
        txt,
        JSON.stringify(scatterTimeConfig(indivi[0], indivi[2])),
        JSON.stringify(scatterNodeConfig(indivi[1], indivi[2])),
        JSON.stringify(nodesConfig(nodeData)),
        JSON.stringify(timeConfig(timeData))
      ];
      const solPath = path.join(dir, 'solutions.txt');
      fs.writeFileSync(solPath, txt);

      resolve(combinedData);
    } catch (error) {
      console.log(error);
      rejects(null);
    }
  });
}
interface Data {
  x: string,
  y: number
}

//cited from https://www.chartjs.org/docs/latest/samples/utils.html
const CHART_COLORS = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
};

const NAMED_COLORS = [
  CHART_COLORS.red,
  CHART_COLORS.orange,
  CHART_COLORS.yellow,
  CHART_COLORS.green,
  CHART_COLORS.blue,
  CHART_COLORS.purple,
  CHART_COLORS.grey,
];

export function namedColor(index: number) {
  return NAMED_COLORS[index % NAMED_COLORS.length];
}
//end of citation

export function createInddiviChart(allSolUri: string, models: string[]) {
  const data = JSON.parse(fs.readFileSync(allSolUri, "utf-8"));
  const modelData: solModel[] = data.Models.map((model: any, index: number) => { return { title: model.title, solutions: model.solutions } });
  const params:string[] = [];
  if(modelData[0].solutions.length == 1){
    params.push("No parameter")
  } else{
    modelData[0].solutions.forEach((model) => params.push(model.parameter));
  }

  params.unshift("");
  params.push(" ");
  const timeSets: any[] = []
  modelData.forEach((model, index) => {
    if (models.includes(model.title)) {
      timeSets.push({
        label: model.title,
        backgroundColor: namedColor(index),
        data: createData(model.solutions, true)
      })
    }
  });

  const nodeSets: any[] = [];
  modelData.forEach((model, index) => {
    if (models.includes(model.title)) {
      nodeSets.push({
        label: model.title,
        backgroundColor: namedColor(index),
        data: createData(model.solutions, false)
      })
    }
  });

  const scatters = [nodeSets, timeSets, params];
  return scatters;
}

function createData(params: Parameter[], time: boolean) {
  // return params.map((param:Parameter) => {
  //   if(time) return  {x:param.parameter,y:param.information[1].SavileRowTotalTime}
  //   else return {x:param.parameter,y:params[0].information[2].SolverNodes}
  // });
  var data = [];
  if (params.length === 1) {
    var y = 0;
    if (time) y = params[0].information[1].SavileRowTotalTime;
    else y = params[0].information[2].SolverNodes;
    data.push({ x: "No parameter", y: y })
  } else {
    params.forEach((param: Parameter, index: number) => {

      var y = 0;
      if (time) {
        y = param.information[1].SavileRowTotalTime;
      } else { y = param.information[2].SolverNodes; }
      data.push({ x: param.parameter, y: y })

    })
  }
  return data;

}

function scatterNodeConfig(data: any[], params: string[]) {
  return {
    type: 'scatter',
    data: { datasets: data },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Savile Row Total Time for each parameter(s)'
        }
      },
      scales: {
        x: {
          type: 'category',
          labels: params
        }
      },
      elements:{
        point:{
          radius:5
        }
      }

      
    },
  };
}

function scatterTimeConfig(data: any[], params: string[]) {
  return {
    type: 'scatter',
    data: { datasets: data },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Solver Nodes for each parameter(s)'
        }
      },
      scales: {
        x: {
          type: 'category',
          labels: params
        }
      },
      elements:{
        point:{
          radius:5
        }
      }
    },
  };
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

function createTxt(solutions: Solutions) {

  const aSolved = solutions.Solutions.All_solved.Number;
  const pSolved = solutions.Solutions.Partial_solved.Number;
  const nSolved = solutions.Solutions.No_solution.Number;
  const total = aSolved + pSolved + nSolved;

  const allResolvedText = `All resolved models: ${solutions.Solutions.All_solved.Models.join(', ')}\n`;
  const partiallyResolvedText = `Partially resolved models: ${solutions.Solutions.Partial_solved.Models.join(', ')}\n`;
  const notResolvedText = `Models not resolved at all: ${solutions.Solutions.No_solution.Models.join(', ')}\n\n`;

  const allResolvedCountText = `The number of all resolved models is ${aSolved} out of ${total}.\n`;
  const partiallyResolvedCountText = `The number of partially solved models is ${pSolved} out of ${total}.\n`;
  const notResolvedCountText = `The number of models not solved at all is ${nSolved} out of ${total}.\n\n`;


  return allResolvedText + partiallyResolvedText + notResolvedText + allResolvedCountText + partiallyResolvedCountText + notResolvedCountText;
}

