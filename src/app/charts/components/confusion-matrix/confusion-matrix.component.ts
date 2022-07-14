import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { fromEvent, Observable, Subscription } from "rxjs";

import * as d3 from 'd3v4';

@Component({
  selector: 'kern-confusion-matrix',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './confusion-matrix.component.html',
  styleUrls: ['./confusion-matrix.component.scss'],
})
export class ConfusionMatrixComponent implements OnInit, OnChanges {
  constructor() { }

  @Input() data: any;

  resizeObservable$: Observable<Event>
  resizeSubscription$: Subscription

  ngOnInit(): void {
    this.resizeObservable$ = fromEvent(window, 'resize')
    this.resizeSubscription$ = this.resizeObservable$.subscribe(evt => {
      this.initSVG(this.data);
    })
  }


  ngOnChanges(changes: SimpleChanges): void {
    this.initSVG(this.data);
  }

  initSVG(data) {

    let columns = []
    data.forEach(e => {
      columns.push(e.labelIdManual);
    })
    const uniqueColumns = Array.from(new Set(columns));

    // set the dimensions and margins of the graph
    var svg = d3.select("#confusion-matrix"),
      margin = { top: 40, right: 20, bottom: 40, left: 70 },
      width = +(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) * 0.77 + margin.left + margin.right,
      height = 450 - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    // append the svg object to the body of the page
    var svg = d3.select("#confusion-matrix")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

    // Labels of row and columns
    var myGroups = uniqueColumns
    var myVars = uniqueColumns

    // Build x scales and axis:
    var x = d3.scaleBand()
      .range([0, width])
      .domain(myGroups)
      .padding(0.05);

    x.paddingOuter(20 / x.step())

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
      .text("Manually labeled");

    // Build y scales and axis:
    var y = d3.scaleBand()
      .range([height, 0])
      .domain(myVars.reverse())
      .padding(0.1)
    y.paddingOuter(20 / y.step())
    svg.append("g")
      .style("font-size", 12)
      .style('font-family', '"DM Sans", sans-serif')
      .call(d3.axisLeft(y))
      .append("text")
      .attr("x", 0)
      .attr("dy", 15)
      .attr("fill", "#000")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .text("Weakly supervised");

    // create a tooltip
    var divTooltip = d3.select("div.confusionMatrixTooltip")

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (d) {
      var elements = document.querySelectorAll(":hover.my-selector");
      if (elements.length > 0) {
        divTooltip.style("opacity", 1);
      }
    }
    var mousemove = function (d) {
      var elements = document.querySelectorAll(":hover.my-selector");
      if (elements.length > 0) {
        divTooltip.style("left", d3.event.pageX + 10 + "px")
        divTooltip.style("top", d3.event.pageY - 25 + "px")
        divTooltip.style("display", "inline-block")
        divTooltip.style("opacity", "0.9");
        var l = elements.length - 1;

        //@ts-ignore
        var elementData = elements[l].__data__;
        divTooltip.html('<span style="font-family: \'DM Sans\', sans-serif;">' + elementData.labelIdProgrammatic + " / " + elementData.labelIdManual + "</span>");
      }
    }
    var mouseleave = function (d) {
      divTooltip.style("opacity", 0)
    }


    // add the squares
    svg.selectAll()
      .data(data, function (d) { return d.labelIdManual + ':' + d.labelIdProgrammatic; })
      .enter()
      .append("rect")
      .classed("my-selector", true)
      .attr("x", function (d) { return x(d.labelIdManual) })
      .attr("y", function (d) { return y(d.labelIdProgrammatic) })
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d) {
        if (d.counts == 0) {
          return "#f9fafb";
        }
        if (d.labelIdManual == d.labelIdProgrammatic) {
          return '#86efac'; //green-300
        } else {
          return '#fca5a5'; //red-300
        }
      })
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .style('opacity', (d) => {
        if (d.counts == 0) {
          return 1;
        }
        return d3.max([d.counts / d3.max(data.map((e) => e.counts)), .5])
      })

    svg
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)


    svg.selectAll()
      .data(data, function (d) { return d.labelIdManual + ':' + d.labelIdProgrammatic; })
      .enter()
      .append('text')
      .text((d) => d.counts)
      .style('fill', 'black')
      .style("font-size", 14)
      .style('font-family', '"DM Sans", sans-serif')
      .style('opacity', 0.8)
      .attr('x', function (d) {
        return x(d.labelIdManual) + 0.5 * x.bandwidth() - ((d.counts + "").length / 2) * 5;
      })
      .attr('y', function (d) {
        return y(d.labelIdProgrammatic) + 0.5 * y.bandwidth() + 4
      })
  };
}
