

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

// interface Data {
//   Models: Model[];
// }

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
    (accumulator, current) => accumulator + findTime(current),
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
    (accumulator, current) => accumulator + findNodes(current),
    0
  );
}

export function findParams(model: Model): string[] {
  return model.solutions.map((sol) => {
    return sol.parameter;
  });
}
