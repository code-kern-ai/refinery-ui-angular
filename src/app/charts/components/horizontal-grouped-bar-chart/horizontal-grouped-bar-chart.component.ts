import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { fromEvent, Observable, Subscription } from "rxjs";
import * as d3 from 'd3v4';

@Component({
  selector: 'kern-horizontal-grouped-bar-chart',
  templateUrl: './horizontal-grouped-bar-chart.component.html',
  styleUrls: ['./horizontal-grouped-bar-chart.component.scss'],
})
export class HorizontalGroupedBarChartComponent implements OnInit, OnChanges, OnDestroy {
  // @Input() data: GroupedBars[];
  @Input() data: any[];
  margin: any;

  resizeObservable$: Observable<Event>;
  resizeSubscription$: Subscription;

  constructor() { }
  ngOnDestroy(): void {
    if (this.resizeSubscription$) this.resizeSubscription$.unsubscribe();
  }
  ngOnInit(): void {
    this.resizeObservable$ = fromEvent(window, 'resize')
    this.resizeSubscription$ = this.resizeObservable$.subscribe(evt => {
      this.initChart();
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.initChart();
  }

  initChart() {
    this.drawGroupedBarChart(this.data);
  }

  squashData(data) {
    let squashedData = [];
    data.forEach(e => {
      const groupName = e.group;
      let manuallyLabeled = 0;
      let manuallyLabeledAbsolute = 0;
      let weaklySupervised = 0;
      let weaklySupervisedAbsolute = 0;
      e.values.forEach(v => {
        if (v.name === "Manually labeled") {
          manuallyLabeled = v.value;
          manuallyLabeledAbsolute = v.valueAbsolute;
        } else {
          weaklySupervised = v.value;
          weaklySupervisedAbsolute = v.valueAbsolute;
        }
      })
      squashedData.push({
        "group": groupName,
        "Manually labeled": manuallyLabeled,
        "Manually labeled a": manuallyLabeledAbsolute,
        "Weakly supervised": weaklySupervised,
        "Weakly supervised a": weaklySupervisedAbsolute,
      })
    });
    return squashedData;
  }

  drawGroupedBarChart(inputData: any[]) {
    /* example for inputData
    [
        {
            "group": "Positive",
            "values": [
                {
                    "name": "weakly supervised",
                    "value": 100,
                }, {
                    "name": "manually labeled",
                    "value": 50,
                }
            ]
        }, {
            "group": "Negative",
            "values": [
                {
                    "name": "weakly supervised",
                    "value": 70,
                }, {
                    "name": "manually labeled",
                    "value": 60,
                }
            ]
        }
    ]
    */
    let data = this.squashData(inputData)
    const columns = ["group", "Manually labeled", "Weakly supervised"];
    // https://bl.ocks.org/gautamjo/42f15332a5402ade4b314504edd31fb5

    // variable for tooltip 
    var divTooltip = d3.select("div.labelDistTooltip")

    // selecting a svg and appending a group tag to it also setting up 
    // margins, width and height for inner drawing space
    var svg = d3.select("#horizontal-grouped-bar"),
      margin = {
        top: 40,
        right: 40,
        bottom: 40,
        left: 60
      },
      width = +(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) * 0.9 - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom

    svg.selectAll("*").remove();

    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // because the plot is grouped by months and then by weekdays it has two scales for the x axis
    // creating x0 scale which is grouped by months
    var x0 = d3.scaleBand()
      .rangeRound([0, width])
      .paddingInner(0.1);

    // creating x1 scale which is grouped by groups
    var x1 = d3.scaleBand()
      .padding(0.08);

    // creating a linear scale for y axis
    var y = d3.scaleLinear()
      .rangeRound([height, 0]);

    // creating an ordinal scale for color that is going to represent different groups
    var z = d3.scaleOrdinal()
      .range(['#E1B53E', '#5EC269']);

    var keys = columns.slice(1)
    // setting up domain for x0 as a list of all the names of months
    x0.domain(data.map(function (d) {
      return d.group;
    }));
    // setting up domain for x1 as a list of all the names of days
    x1.domain(keys).rangeRound([0, x0.bandwidth()]);
    // setting up domain for y which will be from 0 to max day of week for any month
    y.domain([0, d3.max(data, function (d) {
      return d3.max(keys, function (key) {
        return d[key] * 100;
      });
    })]).nice()


    // setting up x axis    
    g.append("g")
      .attr("class", "x axis")
      .style("font-size", 14)
      .style('font-family', '"DM Sans", sans-serif')
      .attr("transform", "translate(0," + height + ")")
      // setting up x axis opacity to 0 before transition
      .style("opacity", "0")
      .call(d3.axisBottom(x0));
    // setting up transiton for x axis
    g.select(".x")
      .transition()
      .duration(500)
      .delay(800)
      // setting up full opacity after transition 
      .style("opacity", "1")

    // setting up y axis    
    let yAxis =g.append("g")
      .attr("class", "y axis")
      .style("font-size", 14)
      .style('font-family', '"DM Sans", sans-serif')
      // setting up y axis opacity to 0 before transition
      .style("opacity", "0");

      yAxis.call(d3.axisLeft(y).ticks(null, "s").tickFormat(d3.format(".0%"))).selectAll(".tick").each(function (data) {
        var tick = d3.select(this);
        // pull the transform data out of the tick
        var positionString = tick.attr("transform")
        var position = parseFloat(positionString.substring(12, positionString.length - 1))

        g.append('line')
          .style("stroke", "lightgray")
          .style("stroke-width", 1)
          .attr("x1", 0)
          .attr("y1", position)
          .attr("x2", width)
          .attr("y2", position)
          .style("stroke-opacity", "0")
          .transition()
          .duration(500)
          .delay(600)
          // setting up full opacity after transition
          .style("stroke-opacity", "0.5");
      });

    yAxis
      .call(d3.axisLeft(y))
      .append("text")
      .attr("x", 0)
      .attr("dy", 15)
      .attr("fill", "#000")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .text("Label score (%)")

    // setting up y axis transition    
    g.select(".y")
      .transition()
      .duration(500)
      .delay(600)
      // setting up full opacity after transition
      .style("opacity", "1")

    // binding data to svg group elements
    g.append("g")
      .selectAll("g")
      .data(data)
      .enter()
      .append("g")
      .attr("transform", function (d) {
        return "translate(" + x0(d.group) + ",0)";
      })
      .attr("class", "labels")
      // binding days of week data to rectangles
      .selectAll("rect")
      .data(function (d) {
        return keys.map(function (key) {
          return {
            key: key,
            value: d[key] * 100,
            absolute: d[key + " a"] * 100
          };
        });
      })
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", function (d) {
        return x1(d.key);
      })
      .attr("width", x1.bandwidth())
      .attr("fill", function (d) {
        return z(d.key);
      })
      .style("opacity", "0.8")
      // setting up y coordinates and height position to 0 for transition
      .attr("y", function (d) {
        return y(0);
      })
      .attr("height", function (d) {
        return height - y(0);
      })
      // setting up tooltip and interactivity
      .on("mouseover", function (d) {
        divTooltip.style("opacity", 1);
      })
      .on("mousemove", function (d) {
        divTooltip.style("left", d3.event.pageX + 10 + "px")
        divTooltip.style("top", d3.event.pageY - 25 + "px")
        divTooltip.style("display", "inline-block")
        divTooltip.style("opacity", "0.9");
        var elements = document.querySelectorAll("#horizontal-grouped-bar :hover");
        var l = elements.length - 1;

        // ts is a bit strange here - so we ignore the error on .__data__
        // @ts-ignore
        var elementData = elements[l].__data__;

        divTooltip.html(HorizontalGroupedBarChartComponent.buildAbsoluteHtml(elementData));
        d3.select(this)
          .style("opacity", "1");

      })
      .on("mouseout", function (d) {
        divTooltip.style("display", "none")
        d3.select(this).transition().duration(250)
          .attr("fill", z(d.key))
          .style("stroke-opacity", "0").style("opacity", "0.8");
      })
      // setting up transition, delay and duration
      .transition()
      .delay(function (d) {
        return Math.random() * 250;
      })
      .duration(1000)
      // setting up normal values for y and height
      .attr("y", function (d) {
        return y(d.value);
      })
      .attr("height", function (d) {
        return height - y(d.value);
      });
  }


  private static buildAbsoluteHtml(elementData): string {
    return `<span style="font-family: \'DM Sans\', sans-serif;">
      <div class="flex flex-col items-center">
        <div class="font-bold">`+ elementData.key + `</div> 
        <div style="display: grid;grid-template-columns: max-content max-content;">
          <div class="font-bold">relative</div>
          <div>`+ Math.round(elementData.value * 10000) / 100 + `%</div>
          <div class="font-bold">absolute</div>
          <div>`+ elementData.absolute + `</div>
        </div>
      </div>
    </span>
    `
  }


}
