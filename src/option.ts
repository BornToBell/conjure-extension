import * as fs from "fs";
import * as vscode from "vscode";
import * as path from 'path';
import { Cipher } from "crypto";

export function solveOptions(modelFile: string, paramPath: string, paramFiles: string[]) {
  fs.readFile(modelFile, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading file', err)
      return;
    }
    const stPos: STPos = countSuchThat(data);

    const constraints = parseEssence(data);
    if (constraints !== null) {
      const jsonOutput = {
        "Constraints": constraints.map((constraint, index) => ({
          [`Constraint${index + 1}`]: [
            { "Name": constraint.Name },
            { "Group": constraint.Group }
          ]
        }))
      };
      const jsonString = JSON.stringify(jsonOutput, null, 2);
      if (vscode.workspace.workspaceFolders !== undefined) {
        let wf = vscode.workspace.workspaceFolders[0].uri.path;
        const filePath = path.join(wf, 'Options.json');
        fs.writeFileSync(filePath, jsonString);
      }
    }


  })

}

function countSuchThat(essence: string): STPos {
  const startOptionIndex = essence.indexOf("$$$ START-OPTION");
  const endOptionIndex = essence.indexOf("$$$ END-OPTION");
  const startSuchThat = essence.slice(0, startOptionIndex).match(/such that/g) || [];
  const betweenSuchThat = essence.slice(startOptionIndex, endOptionIndex).match(/such that/g) || [];
  const afterSuchThat = essence.slice(endOptionIndex).match(/such that/g) || [];

  const result = {
    beforeStartOption: startSuchThat.length,
    betweenStartAndEnd: betweenSuchThat.length,
    afterEndOption: afterSuchThat.length,
  };
  console.log(result);
  return result;
}

interface Constraint {
  Name: string;
  Group: string;
}

interface STPos {
  afterEndOption: number;
  beforeStartOption: number;
  betweenStartAndEnd: number
}

// function parseEssence(essence: string): Constraint[] {
//   const constraints: Constraint[] = [];
//   let currentConstraint: Constraint | null = null;

//   const lines = essence.split('\n');
//   lines.forEach(line => {
//     const match = line.match(/\$\$\$ Name: (.+)/);
//     if (match) {
//       currentConstraint = { Name: match[1].trim(), Group: "" };
//     } else if (currentConstraint && line.includes("$$$ Group:")) {
//       const groupMatch = line.match(/\$\$\$ Group: (.+)/);
//       if (groupMatch) {
//         currentConstraint.Group = groupMatch[1].trim();
//         constraints.push({ ...currentConstraint });
//         currentConstraint = null;
//       }
//     }
//   });

//   return constraints;
// }

interface Constraint {
  Name: string;
  Group: string;
  Description: string | null;
}

function parseEssence(essence: string): Constraint[] | null {
  try {
    const constraints: Constraint[] = [];
    let currentConstraint: Constraint | null = null;

    const lines = essence.split('\n');
    lines.forEach(line => {
      const nameMatch = line.match(/\$\$\$ Name: (.*)/);
      const groupMatch = line.match(/\$\$\$ Group: (.*)/);
      const descMatch = line.match(/\$\$\$ Description: (.+)/);

      if (nameMatch) {
        const name = nameMatch[1].trim();
        console.log(name);
        if (!name) {
          throw new Error('Invalid format: Name is missing');
        }
        currentConstraint = { Name: name, Group: "", Description: null };
      } else if (groupMatch && currentConstraint) {
        const group = groupMatch[1].trim();
        if (!group) {
          throw new Error("Invalid format: Group is missing");
        }
        currentConstraint.Group = group;
        constraints.push({ ...currentConstraint });
        currentConstraint = null;
      }
    });
    return constraints;
  } catch (error: any) {
    console.error(error.message)
    return null;
  }

}


