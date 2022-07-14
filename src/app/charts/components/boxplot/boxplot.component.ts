import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ConfidenceDistribution } from 'src/app/base/entities/confidence-distribution';

@Component({
  selector: 'kern-boxplot',
  templateUrl: './boxplot.component.html',
  styleUrls: ['./boxplot.component.scss'],
})
export class BoxplotComponent implements OnInit {
  constructor() { }

  @Input() data: ConfidenceDistribution[] = [];

  ngOnInit(): void {
    this.drawChart(this.data);
  }

  drawChart(inputData: ConfidenceDistribution[]) {
    // set the dimensions and margins of the graph
    let margin = { top: 10, right: 30, bottom: 30, left: 40 },
      width = 400 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    let svg = d3
      .select('#boxplot')
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    let allValuesSorted: number[] = [];

    let sumstat = d3.rollup(
      inputData,
      (confidenceDistributionArray: ConfidenceDistribution[]) => {
        return confidenceDistributionArray.map(
          (confidenceDistribution: ConfidenceDistribution) => {
            let dataSorted = confidenceDistribution.confidenceList
              .slice()
              .sort(d3.ascending);

            let q1 = 0;
            let median = 0;
            let q3 = 0;
            let interQuantileRange = 0;
            let min = 0;
            let max = 0;

            dataSorted.forEach((e) => allValuesSorted.push(e));
            // allValuesSorted.push(dataSorted);
            q1 = d3.quantile(dataSorted, 0.25);
            median = d3.quantile(dataSorted, 0.5);
            q3 = d3.quantile(dataSorted, 0.75);
            interQuantileRange = q3 - q1;
            min = d3.min(dataSorted); //q1 - 1.5 * interQuantileRange;
            max = d3.max(dataSorted); //q3 + 1.5 * interQuantileRange;
            return {
              q1: q1,
              median: median,
              q3: q3,
              interQuantileRange: interQuantileRange,
              min: min,
              max: max,
            };
          }
        );
      },
      (d) => d.labelId
    );

    // Show the X scale
    let x = d3
      .scaleBand()
      .range([0, width])
      .domain(inputData.map((d: ConfidenceDistribution) => d.labelId))
      .paddingInner(1)
      .paddingOuter(0.5);
    svg
      .append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(x));

    // Show the Y scale
    let y = d3.scaleLinear().domain([0, 1]).range([height, 0]);
    svg.append('g').call(d3.axisLeft(y));

    // Show the main vertical line
    svg
      .selectAll('vertLines')
      .data(sumstat)
      .enter()
      .append('line')
      .attr('x1', (d) => x(d[0]))
      .attr('x2', (d) => x(d[0]))
      .attr('y1', (d) => y(sumstat.get(d[0]).flatMap((d) => d.min)[0]))
      .attr('y2', (d) => y(sumstat.get(d[0]).flatMap((d) => d.max)[0]))
      .attr('stroke', 'black')
      .style('width', 40);

    // rectangle for the main box
    let boxWidth = 100;
    svg
      .selectAll('boxes')
      .data(sumstat)
      .enter()
      .append('rect')
      .attr('x', function (d) {
        return x(d[0]) - boxWidth / 2;
      })
      .attr('y', function (d) {
        return y(sumstat.get(d[0]).flatMap((d) => d.q3)[0]);
      })
      .attr('height', function (d) {
        return (
          y(sumstat.get(d[0]).flatMap((d) => d.q1)[0]) -
          y(sumstat.get(d[0]).flatMap((d) => d.q3)[0])
        );
      })
      .attr('width', boxWidth)
      .attr('stroke', 'black')
      .style('fill', '#69b3a2');

    // Show the median
    svg
      .selectAll('medianLines')
      .data(sumstat)
      .enter()
      .append('line')
      .attr('x1', function (d) {
        return x(d[0]) - boxWidth / 2;
      })
      .attr('x2', function (d) {
        return x(d[0]) + boxWidth / 2;
      })
      .attr('y1', function (d) {
        return y(sumstat.get(d[0]).flatMap((d) => d.median)[0]);
      })
      .attr('y2', function (d) {
        return y(sumstat.get(d[0]).flatMap((d) => d.median)[0]);
      })
      .attr('stroke', 'black')
      .style('width', 80);

    // Show the min
    svg
      .selectAll('minLines')
      .data(sumstat)
      .enter()
      .append('line')
      .attr('x1', function (d) {
        return x(d[0]) - boxWidth / 2;
      })
      .attr('x2', function (d) {
        return x(d[0]) + boxWidth / 2;
      })
      .attr('y1', function (d) {
        return y(sumstat.get(d[0]).flatMap((d) => d.min)[0]);
      })
      .attr('y2', function (d) {
        return y(sumstat.get(d[0]).flatMap((d) => d.min)[0]);
      })
      .attr('stroke', 'black')
      .style('width', 80);

    // Show the min
    svg
      .selectAll('maxLines')
      .data(sumstat)
      .enter()
      .append('line')
      .attr('x1', function (d) {
        return x(d[0]) - boxWidth / 2;
      })
      .attr('x2', function (d) {
        return x(d[0]) + boxWidth / 2;
      })
      .attr('y1', function (d) {
        return y(sumstat.get(d[0]).flatMap((d) => d.max)[0]);
      })
      .attr('y2', function (d) {
        return y(sumstat.get(d[0]).flatMap((d) => d.max)[0]);
      })
      .attr('stroke', 'black')
      .style('width', 80);
  }
}
