import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { fromEvent, Observable, Subscription } from "rxjs";

import * as d3 from 'd3v4';

@Component({
  selector: 'kern-line-chart',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
})
export class LineChartComponent implements OnInit, OnChanges {
  @Input() data: any;

  resizeObservable$: Observable<Event>
  resizeSubscription$: Subscription

  constructor() { }

  ngOnInit(): void {
    this.resizeObservable$ = fromEvent(window, 'resize')
    this.resizeSubscription$ = this.resizeObservable$.subscribe(evt => {
      this.initSVG(this.data);
    })
  }


  ngOnChanges(changes: SimpleChanges): void {
    this.initSVG(this.data);
  }

  initSVG(data_) {

    let data = []
    for (var i = 0; i < data_.length; i++) {
      data.push({ idx: i, value: data_[i] * 100 });
    }

    // set the dimensions and margins of the graph
    var margin = { top: 40, right: 20, bottom: 40, left: 50 },
      width = +(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) * 0.78 + margin.left + margin.right,
      height = 450 - margin.top - margin.bottom;

    d3.select("#line-chart").selectAll("*").remove();

    // append the svg object to the body of the page
    var svg = d3.select("#line-chart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    var x = d3.scaleLinear()
      .domain(d3.extent(data, function (d) { return d.idx; }))
      .range([0, width]);


    // Add Y axis
    var y = d3.scaleLinear()
      .domain([0, d3.max(data, function (d) { return +d.value; })])
      .range([height, 0]);


    // Add the area
    svg.append("path")
      .datum(data)
      .attr("fill", "#bbf7d0")
      .attr("stroke", "#22c55e")
      .attr("stroke-width", 1.5)
      .attr("d", d3.area()
        .x(function (d) { return x(d.idx) })
        .y0(y(0))
        .y1(function (d) { return y(d.value) })
      )

    svg.append("g")
      .style("font-size", 14)
      .style('font-family', '"DM Sans", sans-serif')
      .call(d3.axisLeft(y))
      .append("text")
      .attr("x", 0)
      .attr("dy", 15)
      .attr("fill", "#000")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .text("Confidence score (%)");

    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .style("font-size", 14)
      .style('font-family', '"DM Sans", sans-serif')
      .call(d3.axisBottom(x))
      .append("text")
      .attr("y", -5)
      .attr("dx", width)
      .attr("fill", "#000")
      .attr("text-anchor", "end")
      .text("Percentile (%)");
  };

}
