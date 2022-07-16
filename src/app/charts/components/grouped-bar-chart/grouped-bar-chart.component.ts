import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'kern-grouped-bar-chart',
  templateUrl: './grouped-bar-chart.component.html',
  styleUrls: ['./grouped-bar-chart.component.scss'],
})
export class GroupedBarChartComponent implements OnInit {
  // @Input() data: GroupedBars[];
  @Input() data: any[];
  @Input() yAxisLabel: string;
  @Input() xAxisLabel: string;
  @Input() height: number;
  @Input() width: number;
  @Input() drawYAxis: boolean;
  margin: any;

  constructor() { }

  ngOnInit(): void {
    if (this.drawYAxis) {
      this.margin = { top: 10, right: 10, bottom: 10, left: 10 };
    } else {
      this.margin = { top: 10, right: 10, bottom: 10, left: 10 };
    }
    this.drawGroupedBarChart(this.data, this.height, this.width, this.margin);
  }

  // drawGroupedBarChart(data: GroupedBars[], height: number, width: number, margin: any) {
  drawGroupedBarChart(data: any[], height: number, width: number, margin: any) {
    let nameColorDict = [];

    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].values.length; j++) {
        nameColorDict[data[i].values[j].name] = data[i].values[j].color;
      }
    }
    var groupKey = 'group';

    var y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data.map((d) => d3.max(d.values.map((c) => c.value)))),
      ])
      .nice()
      .rangeRound([height - margin.bottom, margin.top]);

    var x0 = d3
      .scaleBand()
      .domain(data.map((d) => d[groupKey]))
      .rangeRound([margin.left, width - margin.right])
      .paddingInner(0.1);

    var x1 = d3
      .scaleBand()
      .domain(Object.keys(nameColorDict))
      .rangeRound([0, x0.bandwidth()])
      .padding(0.05);

    var svg = d3
      .select('#grouped-bar')
      .append('svg')
      .attr('viewBox', '0 0 ' + this.width + ' ' + this.height);

    svg
      .append('g')
      .selectAll('g')
      .data(data)
      .join('g')
      .attr('transform', (d) => `translate(${x0(d[groupKey])},0)`)
      .selectAll('rect')
      .data((d) =>
        d.values.map((c) => {
          return { key: c.name, value: c.value, color: c.color };
        })
      )
      .join('rect')
      .attr('x', (d) => x1(d.key))
      .attr('y', (d) => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => y(0) - y(d.value))
      .attr('fill', (d) => d.color)
      .attr('class', 'grouped-bar-rect');

    // Add bar labels
    svg
      .append('g')
      .selectAll('g')
      .data(data)
      .join('g')
      .attr('transform', (d) => `translate(${x0(d[groupKey])},0)`)
      .selectAll('text')
      .data((d) =>
        d.values.map((c) => {
          return { key: c.name, value: c.value, color: c.color };
        })
      )
      .join('text')
      .attr('text-anchor', 'start')
      .attr('x', function (d) {
        return x1(d.key) + 3;
      })
      .attr('y', function (d) {
        return y(d.value) + 13;
      })
      .text(function (d) {
        return d.value.toFixed(3);
      })
      .attr('class', 'text-gray-900')
      .style('font-size', '9px');

    // Add the label for x Axis
    if (this.xAxisLabel.length > 0) {
      svg
        .append('text')
        .attr('transform', 'translate(' + width / 2 + ' ,' + height + ')')
        .style('text-anchor', 'middle')
        .attr('class', 'text-xs text-gray-900')
        .text(this.xAxisLabel);
    }

    if (this.drawYAxis) {
      svg.append('g').call((g) => this.yAxis(g, margin, data, y));
    }

    svg.append('g').call((g) => this.xAxis(g, height, margin, x0));

    svg.append('g').call((svg) => this.legend(svg, width, nameColorDict));
  }

  legend(svg, width, nameColorDict) {
    var g = svg
      .attr('transform', `translate(${width},0)`)
      .attr('text-anchor', 'end')
      .selectAll('g')
      .data(Object.keys(nameColorDict))
      .join('g')
      .attr('transform', (d, i) => `translate(0,${i * 20})`);

    g.append('rect')
      .attr('x', -19)
      .attr('width', 19)
      .attr('height', 19)
      .attr('fill', (d: any) => nameColorDict[d]);

    g.append('text')
      .attr('x', -24)
      .attr('y', 9.5)
      .attr('dy', '0.35em')
      .text((d: any) => d)
      .attr('class', 'text-sm text-gray-900');
  }

  yAxis(g, margin, data, y) {
    return g
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(null, 's'))
      .call((g) => g.select('.domain').remove())
      .call(d3.axisLeft(y).ticks(3, data.format))
      .call((g) =>
        g
          .select('.tick:last-of-type text')
          .clone()
          .attr('x', 3)
          .attr('text-anchor', 'start')
          .attr('font-weight', 'bold')
          .text(this.yAxisLabel)
          .attr('class', 'text-sm text-gray-900')
      );
  }

  xAxis(g, height, margin, x0) {
    return g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x0).tickSizeOuter(0));
  }
}
