// set some general properties of the chart
var sunburstWidth = 450,
  sunburstHeight = 450,
  radius = (Math.min(sunburstWidth, sunburstHeight) / 2) - 10;

var formatNumber = d3.format(",d");

var sunburstX = d3.scale.linear()
  .range([0, 2 * Math.PI]);

var sunburstY = d3.scale.sqrt()
  .range([0, radius]);

// set a color scale for the sunburst
var color = d3.scale.linear()
  .range(["#f7fbff", "#08306b"]);
// '#0075B4', '#70B5DC' blue range
// "#fcebff", "#3f004d" purple range


// make the data elements fit for the sunburst
var partition = d3.layout.partition()
  .value(function (d) { return d.size; });

// set the angle and radiusus of the chart
var arc = d3.svg.arc()
  .startAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, sunburstX(d.x))); })
  .endAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, sunburstX(d.x + d.dx))); })
  .innerRadius(function (d) { return Math.max(0, sunburstY(d.y)); })
  .outerRadius(function (d) { return Math.max(0, sunburstY(d.y + d.dy)); })
  .cornerRadius(function (d) { return 5; });

// append an svg the the correct column
var svg2 = d3.select("#sunburst-column").append("svg")
  .attr("width", sunburstWidth)
  .attr("height", sunburstHeight)
  .append("g")
  .attr("transform", "translate(" + sunburstWidth / 2 + "," + (sunburstHeight / 2) + ")");

// initialize tooltip
var tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// load the data
d3.json("https://raw.githubusercontent.com/ZoraLian/Sunburst/master/sunburst.json", function (error, root) {
  if (error) throw error;
  console.log(root);



  // store the total values of the countries in an array
  var countryTotals = [];
  for (i = 0; i < root["children"].length; i++) {
    var countryTotal = 0;
    for (j = 0; j < root["children"][i]["children"].length; j++) {
      countryTotal += root["children"][i]["children"][j]["size"];
    }
    countryTotals.push(countryTotal);
  }

  // set the domain for the color scale (0% - 100%)
  var minDomain = 0;
  var maxDomain = 100;
  color.domain([minDomain, maxDomain]);

  // append the cells to the sunburst
  var path = svg2.selectAll("path")
    .data(partition.nodes(root))
    .enter().append("path")
    .attr("d", arc)
    // fill the paths according to the % of it's parent (Europe will be gray)
    .style("fill", function (d) {
      if ((d.children ? d : d.parent).name == "WORLD") {
        return "#8f8f8f";
      } else {
        var parentValue = d.parent.value;
        var childValue = d.value;
        var childPercentage = Math.round(((100 * childValue / parentValue) * 100) / 100);
        return color(childPercentage);
      }
    })
    // call the function to zoom in when an element is clicked
    .on("click", clickSunburst)
    .on("mouseover", function (d, i) {
      // highlight a country in the map
      // highlightCountryChart(d.name, "highlight");
      // change the appearance of the mouse
      d3.select(this).style("cursor", "pointer");

      // make the data elements fit for the sunburst
      var nodePartition = partition.nodes(root);

      // set the tooltip for when hovering over Europe
      if (d.name == "WORLD") {
        var totalSize = path.node().__data__.value;
        var percentage = Math.round(((100 * d.value / totalSize) * 100) / 100);
        var percentageString = percentage + "%";

        tooltip.text(d.name + ": " + d.value.toLocaleString() + " " + "immigrants")
          .style("opacity", 0.8)
          .style("left", (d3.event.pageX) + 0 + "px")
          .style("top", (d3.event.pageY) + 10 + "px");
      } else {
        for (i = 0; i < partition.nodes(root).length; i++) {
          if (nodePartition[i]["name"] == d.name) {
            var subGroup = nodePartition[i];
            var parentSize = subGroup.parent.value;
          }
        }
        // set the text for the tooltip
        function makeTooltip(d, parentSize) {
          var percentage = Math.round(((100 * d.value / parentSize) * 100) / 100);
          var percentageString = percentage + "% ";
          tooltip.text(d.name + ": " + d.value.toLocaleString() + " immigrants" + " " + "(" + percentageString + "of " + d.parent.name + ")")
            .style("opacity", 0.8)
            .style("left", (d3.event.pageX) + 0 + "px")
            .style("top", (d3.event.pageY) + 10 + "px");
        }
        // set the tooltip for when hovering over the second layer of the chart
        if (d.depth == 2 || d.depth == 3) {
          // highlight the corresponding country in the map
          // highlightCountryChart(d.parent.name, "highlight");
          // make the correct tooltip
          var parentSize = d.parent.value;
          makeTooltip(d, parentSize)
          // set the tooltip for when hovering over the first layer of the chart (i.e. the countries)
        } else if (d.depth == 1) {
          // highlight the corresponding country in the map
          // highlightCountryChart(d.name, "highlight");
          // make the correct tooltip
          var parentSize = path.node().__data__.value;
          makeTooltip(d, parentSize)
        }
      }
    })
    // un-do all the events created by the .on("mouseover")-function
    .on("mouseout", function (d) {
      // if (d.depth == 2) {
      //   highlightCountryChart(d.parent.name, "de-highlight");
      // } else if (d.depth == 1) {
      //   highlightCountryChart(d.name, "de-highlight");
      // }
      d3.select(this).style("cursor", "default");
      tooltip.style("opacity", 0);
    });

  /*
  * This function is called when clicking on the sunburst
  * It zooms in at the selected element to let the user take a closer look.
  */
  function clickSunburst(d) {
    // set the value of the dropdown manu to the clicked country
    if (d.depth == 2) {
      selectDropdownCountry(d.parent.name);
    } else {
      selectDropdownCountry(d.name);
    }
    // zoom in at the input argument (d)
    zoomTransition(d)
  }
});

/*
* This function is called when clicking on one of the visualization
* It zooms in at the sunburst at selected element to let the user take a closer look.
*/
function zoomTransition(d) {
  svg2.transition()
    .duration(900)
    .tween("scale", function () {
      var xd = d3.interpolate(sunburstX.domain(), [d.x, d.x + d.dx]),
        yd = d3.interpolate(sunburstY.domain(), [d.y, 1]),
        yr = d3.interpolate(sunburstY.range(), [d.y ? 20 : 0, radius]);
      return function (t) {
        sunburstX.domain(xd(t)); sunburstY.domain(yd(t)).range(yr(t));
      };
    })
    .selectAll("path")
    .attrTween("d", function (d) {
      return function () { return arc(d); };
    });
}

/*
* This function is called when clicking on the map or bar chart
* It zooms in at the sunburst at selected element to let the user take a closer look.
* It only needs the countries name as an input argument.
*/
function zoomSunburst(countryName) {
  if (typeof (countryName) == "string") {
    // load the sunburst data
    d3.json("https://raw.githubusercontent.com/ZoraLian/Sunburst/master/sunburst.json", function (error, root) {
      // make the data elements fit for the sunburst
      var nodePartition = partition.nodes(root);
      for (i = 0; i < nodePartition.length; i++) {
        if (nodePartition[i]["name"] == countryName) {
          d = nodePartition[i]
          // zoom in on the sunburst
          zoomTransition(d)
        }
      }
    })
  }
}

/*
* This function is called by all the visualizations
* It changes the value in the dropdown menu to the country that was selected in one of the visualizations.
*/
function selectDropdownCountry(countryToSelect) {
  var DropdownCountry = document.getElementById('dropdown-countries');
  DropdownCountry.value = countryToSelect;
}

/*
* This function is called by the sunburst chart
* It zooms in or out at the sunburst according to the selection of the user in the dropdown menu.
*/
function Class(str) {
  var select = document.getElementById("dropdown-countries");
  var option = select.options[select.selectedIndex];
  zoomSunburst(option.id);
}

// set the correct height for the element
d3.select(self.frameElement).style("height", sunburstHeight + "px");