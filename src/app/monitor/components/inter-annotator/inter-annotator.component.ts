import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { fromEvent, Observable, Subscription } from "rxjs";

import * as d3 from 'd3v4';

@Component({
  selector: 'kern-inter-annotator',
  templateUrl: './inter-annotator.component.html',
  styleUrls: ['./inter-annotator.component.scss'],
})
export class InterAnnotatorComponent implements OnInit, OnChanges {
  constructor() { }

  @Input() data: any;
  margin: any;
  width: any;
  height: any;

  fontSizeXAxis: number = 0;
  fontSizeYAxis: number = 0;

  resizeObservable$: Observable<Event>
  resizeSubscription$: Subscription

  ngOnInit(): void {
    this.resizeObservable$ = fromEvent(window, 'resize')
    this.resizeSubscription$ = this.resizeObservable$.subscribe(evt => {
      this.setUpGraph(this.data);
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.setUpGraph(this.data);
  }

  setUpGraph(data) {

    const colorScale = d3.scaleLinear()
      .domain([0, 0.5, 1])
      .range(["#fca5a5", '#fde047', "#86efac"]);

    const users = this.data.allUsers.map((u) => {
      let avatarUri, svgField, name
      if (u.name == "Gold Star") {
        //TODO: find correct SVG for gold star
        svgField = `<svg xmlns="http://www.w3.org/2000/svg" class="inline-block" fill="#6DD87F" height=32 width=32 viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>`
        name = svgField
      } else {
        let avatarSelector;
        if (u.name == "Unknown") {
          let s = 0;
          for (let i = 0; i < 5; i++)s += u.user.id.charCodeAt(i);
          avatarSelector = s % 5;
        } else {
          avatarSelector = (u.name.charCodeAt(0) + u.name.charCodeAt(3)) % 5
        }
        avatarUri = "assets/avatars/" + avatarSelector + ".png"
        name = u.name
      }

      return { id: u.user.id, name: name, image: avatarUri, svg: svgField }
    });
    const userLookup = {}
    users.forEach((u) => userLookup[u.id] = u);

    // set the dimensions and margins of the graph
    var svg = d3.select("#annotator-matrix"),
      margin = { top: 40, right: 20, bottom: 60, left: 60 },
      width = +(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) * 0.77 + margin.left + margin.right,
      height = 450 - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    // append the svg object to the body of the page
    var svg = svg
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

    // Labels of row and columns
    var myGroups = users.map(u => u.id)
    var myVars = users.map(u => u.id)

    // Build x scales and axis:
    var x = d3.scaleBand()
      .range([0, width])
      .domain(myGroups)
      .padding(0.05)

    let xAxis = d3.axisBottom(x).tickFormat(function (d) { return ''; })
    var tw = 32;
    var th = 32;
    var tx = -(tw / 2);
    var ty = 10;

    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .style("font-size", 14)
      .style('font-family', '"DM Sans", sans-serif')
      .call(xAxis)//d3.axisBottom(x).tickFormat(u => userLookup[u].name));
      .selectAll("g")
      .append("svg:foreignObject")
      .attr("width", tw)
      .attr("height", th)
      .attr("x", tx)
      .attr("y", ty)
      .append("xhtml:div")
      .html(function (u) {
        let user = userLookup[u]
        if (user.image) {
          return "<img src='" + user.image + "'>";
        } else {
          return user.svg;
        }
      });

    // Build y scales and axis:
    var y = d3.scaleBand()
      .range([height, 0])
      .domain(myVars.reverse())
      .padding(0.1);

    let yAxis = d3.axisLeft(y).tickFormat(function (d) { return ''; })
    var tx = -(tw + 10);
    var ty = -(th / 2);

    svg.append("g")
      .style("font-size", 14)
      .style('font-family', '"DM Sans", sans-serif')
      .call(yAxis)
      .selectAll("g")
      .append("svg:foreignObject")
      .attr("width", tw)
      .attr("height", th)
      .attr("x", tx)
      .attr("y", ty)
      .append("xhtml:div")
      .html(function (u) {
        let user = userLookup[u]
        if (user.image) {
          return "<img src='" + user.image + "'>";
        } else {
          return user.svg;
        }
      });


    // create a tooltip
    var divTooltip = d3.select("div.annotatorMatrixTooltip")


    var mouseover = function (d) {
      var elements = document.querySelectorAll(":hover.my-selector");
      if (elements.length > 0) {
        divTooltip.style("opacity", 1);
      }
    }
    var mousemove = function (d) {
      var elements = document.querySelectorAll(":hover.my-selector");
      if (elements.length > 0) {
        var l = elements.length - 1;
        //@ts-ignore
        var elementData = elements[l].__data__;
        if (elementData.userIdA != elementData.userIdB) {
          divTooltip.style("left", d3.event.pageX + 10 + "px")
          divTooltip.style("top", d3.event.pageY - 25 + "px")
          divTooltip.style("display", "inline-block")
          divTooltip.style("opacity", "0.9");
          divTooltip.html('<span style="font-family: \'DM Sans\', sans-serif;">' + userLookup[elementData.userIdA].name + " / " + userLookup[elementData.userIdB].name + "</span>");
        }
      }
    }
    var mouseleave = function (d) {
      divTooltip.style("opacity", 0)
    }

    // add the squares
    svg.selectAll()
      .data(data.elements, e => e.userIdA + ':' + e.userIdB)
      .enter()
      .append("rect")
      .classed("my-selector", true)
      .attr("x", function (e) { return x(userLookup[e.userIdA].id) })
      .attr("y", function (e) { return y(userLookup[e.userIdB].id) })
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d) {
        if (d.userIdA == d.userIdB) return 'white';
        else if (d.percent == -1) return "#f9fafb";
        else return colorScale(d.percent);
      })

    svg
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)


    svg.selectAll()
      .data(data.elements, e => e.userIdA + ':' + e.userIdB)
      .enter()
      .append('text')
      .text((d) => {
        if (d.userIdA == d.userIdB) return "";
        if (d.percent == -1) return "n/a";
        return Math.round(d.percent * 10000) / 100 + " %"
      })
      .style('fill', 'black')
      .style("font-size", 14)
      .style('font-family', '"DM Sans", sans-serif')
      .style('opacity', 0.8)
      .attr('x', function (d) {
        return x(d.userIdA) + 0.5 * x.bandwidth();
      })
      .attr('y', function (d) {
        return y(d.userIdB) + 0.5 * y.bandwidth()
      })
  };
}
