# Conjure Analyzer

 Enhance your modeling workflow by seamlessly integrating Conjure functionalities within Visual Studio Code. Easily compare model files with different parameters, generate reports, and visualize solver performance, all from within your workspace.

## Requirements

- Ensure that the `conjure` command is executable.
  - To verify if `conjure` is executable, install "conjure-vscode". This extension checks whether `conjure` is available in the PATH.
  - Execute the command `conjure --help` to check if the command works properly.

## Features

This extension offers two commands accessible from the command palette. To utilize the commands, ensure that the Essence file and the necessary parameter files, or a directory containing parameter files, are present within the VS Code workspace.

### `Compare`

The `Compare` command operates as follows:

1. Choose whether the model file being solved requires parameter files.
2. Select essence files in the workspace to solve.
3. Specify whether parameter files exist in the workspace or in a directory within the workspace.
4. Choose a directory if the parameter files exist within it.
5. Select parameter files.
6. The extension automatically generates a removed model file and solves two model files.
7. The extension reports:
   - The number of parameter files solved per model.
   - Solver nodes and time for each parameter file and model.
   - Average solver nodes and time for each model.
   - Graphical reports including scatter plots and bar charts related to solver time and nodes.

The removed model excludes the last constraints. Reduced constraints refer to constraints written after the last `such that` keyword.
Below is a sample essence file:

```essence
given n:int(1..)
find x,y,z : int(1..n)

$ A constraint will be included in original and removed models
such that x + y + z = 6

$ A constraint will be included in original model
such that x > y
```

## `Option`

The `Option` command follows this workflow:

1. Choose whether the model file being solved requires parameter files.
2. Select essence files in the workspace to solve.
3. Specify whether parameter files exist in the workspace or in a directory within the workspace.
4. Choose a directory if the parameter files exist within it.
5. Select parameter files.
6. The extension automatically generates a removed model file and solves two model files.
7. The extension reports:
   - The number of parameter files solved per model.
   - Solver node and time for each parameter file and model.
   - Average solver node and time for each model.
   - Graphical reports including scatter plots and bar charts related to solver time and average.

This command generates several models. The essence file should include `$$$ START-OPTION` at the start of constraints and `$$$ END-OPTION` at the end of constraints. There are two types of constraints:

- Base constraints
  - Constraints before `$$$ START-OPTION` and after `$$$ END-OPTION`, included in all models.
  
- Option constraints
  - Constraints between `$$$ START-OPTION` and `$$$ END-OPTION`.
  - Constraints consist of `such that`, name, and group.
  - Each model file includes a combination of constraints from each group.

In this case, 6 model files will be generated.
The combinations for options are: union6×TRUE1, union6×TRUE2, cardinal6×TRUE1, cardinal6×TRUE2, cardinal5×TRUE1, and cardinal5×TRUE2.

Below is a sample essence file:

```essence
given n:int(1..)
find x, y : set of int(1..n)

such that |x intersect y| = 4

$$$ START-OPTION
$$$ Name: union6
$$$ Group: A
such that |x union y | = 6

$$$ Name: cardinal6
$$$ Group: A
such that (sum i : int(1..10) . toInt(i in x \/ i in y)) = 6

$$$ Name: cardinal5
$$$ Group: A
such that (sum i : int(1..10) . toInt(i in x \/ i in y)) = 5

$$$ Name: TRUE1
$$$ Group: B
such that true

$$$ Name: TRUE2
$$$ Group: B
such that true

$$$ END-OPTION
```

## Extension Settings

This extension contributes the following settings:

- `conjure-model.option`: Executes the "Option" command.
- `conjure-model.compare`: Executes the "Compare" command.

## Known Issues

## Release Notes

### 1.0.0

Initial release of Conjure Analyzer

### 1.0.1

Unsolvable parameter files are displayed