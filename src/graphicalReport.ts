import * as vscode from "vscode";

export function graphicalReport(data: string[]) {
  const solutionsText = data[0].replace(/\n/g, "<br>");
  console.log(data);
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <h1>Report</h1>
        </head>
    <body>
    <div>${solutionsText}</div>
        <canvas id="nodeChart" style="background-color: #FFF" width="200" height="100" ></canvas>
        <canvas id="timeChart" style="background-color: #FFF" width="200" height="100"></canvas>
        <script
            type="text/javascript"
            src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.2.0/chart.min.js">
        </script>
        <script type="text/javascript">
        const ctx1 = document.getElementById("nodeChart").getContext("2d");
        const ctx2 = document.getElementById("timeChart").getContext("2d");
        const nodeChart = new Chart(ctx1, ${data[1]});
        const timeChart = new Chart(ctx2, ${data[2]});
      </script>
    </body>
    </html>`;
}
