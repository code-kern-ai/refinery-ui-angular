import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'kern-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
})
export class BarChartComponent implements OnInit {
  @Input() data: any[];

  @Input() xLabel: string;

  @Input() printXAxis: boolean;
  @Input() printYAxis: boolean;

  @Input() showRelativeValues: boolean;

  @Input() height: number;
  @Input() width: number;
  @Input() margin: any;

  totalValue: number;

  constructor() { }

  // ngOnChanges(changes: SimpleChanges) {
  ngOnChanges() {
    this.margin = { top: 0, right: 50, bottom: 50, left: 25 };

    if (this.printYAxis == true) {
      this.margin = { top: 0, right: 50, bottom: 50, left: 125 };
    }

    d3.selectAll('#bar-chart').remove();
    this.drawBarChart(this.data, this.margin, this.width, this.height);
  }

  ngOnInit(): void { }

  drawBarChart(data: any[], margin: any, width: number, height: number) {
    this.totalValue = 0;
    // get total of all values
    data.forEach((element) => {
      this.totalValue += element.value;
    });

    // append the svg object to the body of the page
    const svg = d3
      .select('#bar')
      .append('svg')
      .attr('id', 'bar-chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('class', 'text-sm text-gray-900')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Add X axis
    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value)])
      .nice()
      .range([0, width]);

    if (this.printXAxis == true) {
      svg
        .append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x))
        .selectAll('text')
        //.attr("transform", "translate(-10,0)rotate(-45)")
        .style('text-anchor', 'middle');
    }

    // Y axis
    const y = d3
      .scaleBand()
      .range([0, height])
      .domain(
        data.map(function (d) {
          return d.name;
        })
      )
      .padding(0.1);

    if (this.printYAxis == true) {
      svg
        .append('g')
        .attr('class', 'text-sm text-gray-900')
        .call(d3.axisLeft(y));
    }

    //color scale
    const color = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.value), d3.max(data, (d) => d.value)])
      .range(['#A2F2AF', '#F3ADAB']);

    // Bars
    svg
      .selectAll('myRect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', x(0))
      .attr('y', function (d) {
        return y(d.name);
      })
      .attr('width', function (d) {
        return x(d.value);
      })
      .attr('height', y.bandwidth())
      // .attr('fill', (d) => d.color);
      .attr('fill', (d) => color(d.value));

    // Adding X axis label
    svg
      .append('text')
      .attr(
        'transform',
        'translate(' + width / 2 + ' ,' + (height + margin.bottom) + ')'
      )
      .style('text-anchor', 'middle')
      .attr('class', 'text-sm text-gray-900')
      .text(this.xLabel);

    // Anteil:
    let labelValue = svg
      .append('g')
      .attr('text-anchor', 'end')
      // .attr('font-size', '9px')
      .selectAll('text')
      .data(data)
      .join('text')
      .attr('x', (d) => x(d.value))
      .attr('y', (d) => y(d.name) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('dx', -4)
      .attr('class', 'text-sm text-gray-900');

    // show percentage
    if (!this.showRelativeValues) {
      labelValue
        .text((d) => d.value + ' of ' + this.totalValue)
        .attr('class', 'text-gray-900')
        .call((text) =>
          text
            .filter((d) => x(d.value) - x(0) < 20) // short bars
            .attr('dx', +4)
            .attr('class', 'text-gray-900 text-sm')
            .attr('text-anchor', 'start')
        );
    } else {
      labelValue
        .text((d) => ((d.value / this.totalValue) * 100).toFixed(2) + '%')
        .attr('class', 'text-gray-900')
        .call((text) =>
          text
            .filter((d) => x(d.value) - x(0) < 20) // short bars
            .attr('dx', +4)
            .attr('class', 'text-gray-900 text-sm')
            .attr('text-anchor', 'start')
        );
    }
  }
}
