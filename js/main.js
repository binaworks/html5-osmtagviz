/**
  * OpenStreetMap Tag Explorer encapsulating function.
  * Contains all app variables and functions.
  */
function runOsmTagVis() {

    'use strict';
    
    // library globals
    /*global L, $, crossfilter, d3, Spinner, console, window*/
    /*jslint plusplus: true*/
    
    var OsmTagVis = {};
    
    /**
      * Respond to Leaflet locationfound event.
      * @param {LocationEvent} e Holds information about the location found.
      */
    function onLocationFound(e) {
        var radius = e.accuracy / 2,
            map = OsmTagVis.map;
        L.marker(e.latlng).addTo(map).bindPopup("You are within " + radius + " meters from this point").openPopup();
        L.circle(e.latlng, radius).addTo(map);
    }
    
    /**
      * Display Leaflet locate error.
      * @param {ErrorEvent} e Contains the error message.
      */
    function onLocationError(e) {
        window.alert(e.message);
    }
    
    /**
      * Get the current map bounding box.
      * @return {string} The bounding box formatted for use in Overpass API query.
      */
    function formatBBox() {
        var map = OsmTagVis.map,
            mapLatLngBounds = map.getBounds(),
            bbString = "(" + mapLatLngBounds.getSouth() + "," + mapLatLngBounds.getWest() + "," + mapLatLngBounds.getNorth() + "," + mapLatLngBounds.getEast() + ")";
        return bbString;
    }
    
    /**
      * Format OpenStreetMap node's tag information for use in map pop-up.
      * @param {object} node
      * @return {string} Formatted tag information.
      */
    function formatMarkerInfo(node) {
        var formattedString = "",
            tagName;
        for (tagName in node.tags) {
            if (node.tags.hasOwnProperty(tagName)) {
                formattedString = formattedString + "<b>" + tagName + "</b>:\t" + node.tags[tagName] + "<br>";
            }
        }
        return formattedString;
    }
    
    /**
      * Create markers for every OpenStreetMap node in last query result.
      * Use Leaflet MarkerCluster plugin for clustering.
      */
    function makeMarkers() {
        var markerCG = OsmTagVis.markerClusterGroup;
        markerCG.clearLayers();
        OsmTagVis.osmJson.forEach(function (node) {
            var marker;
            if (node.tags.hasOwnProperty(OsmTagVis.currentTag)) {
                marker = L.marker(new L.LatLng(node.lat, node.lon), {title: node.tags.name});
                marker.bindPopup(formatMarkerInfo(node));
                markerCG.addLayer(marker);
            }
        });
    }
    
    /**
      * Get color for current bar. Determined by last selection.
      * @return {string} The color.
      */
    function getBarColor(d) {
        return d.key === OsmTagVis.currentTag ? "orange" : "lightsteelblue";
    }
    
    /**
      * Get font-weight for current text. Determined by last selection.
      * @return {string} The font-weight.
      */
    function getLabelWeight(d) {
        return d.key === OsmTagVis.currentTag ? "bold" : "normal";
    }
    
    /**
      * When a tag is clicked, update map to display markers for nodes having the selected tag.
      * @param {object} tagData Data associated with selected tag.
      */
    function handleTagClick(tagData) {
        OsmTagVis.currentTag = tagData.key;
        OsmTagVis.chartBars.style("fill", getBarColor);
        OsmTagVis.chartLabels.style("font-weight", getLabelWeight);
        makeMarkers();
    }
    
    /**
      * Group and count tag names in last query result.
      * @return {object} Crossfilter grouping.
      */
    function groupTagsByName() {
        var tagArray = [],
            tagCF,
            titleDimension,
            titleGroupCount,
            tagKVArray,
            osmJson = OsmTagVis.osmJson;
        //
        // Create array of tags from last query result.
        //
        osmJson.forEach(function (node) {
            var tagName;
            for (tagName in node.tags) {
                if (node.tags.hasOwnProperty(tagName)) {
                    tagArray.push({title: tagName, total: 1});
                }
            }
        });
        //
        // Use Crossfilter to count occurrences of each tag.
        //
        tagCF = crossfilter(tagArray);
        titleDimension = tagCF.dimension(function (d) {
            return d.title;
        });
        titleGroupCount = titleDimension.group().reduceCount();
        return titleGroupCount;
    }
    
    /**
      * Create bar chart for tag names in last query result.
      * @param {object} tagGrouping Crossfilter grouping (key : tag name, value : count).
      */
    function makeBarChart(tagGrouping) {
        var svgElt = d3.select("#tagchart"),
            yInc = 25,
            barHeight = yInc - 1,
            sectionWidth = 100,
            textEndPosition = sectionWidth - 1,
            rectX = sectionWidth + 1,
            maxCount,
            xInc = 1,
            tagKVArray;
        OsmTagVis.chartBars = svgElt.selectAll("rect").remove();
        OsmTagVis.chartLabels = svgElt.selectAll("text").remove();
        if (tagGrouping.size() > 0) {
            tagKVArray = tagGrouping.all(tagGrouping.size());
            maxCount = tagGrouping.top(1)[0].value;
            xInc = (sectionWidth - 2) / maxCount;
            OsmTagVis.chartBars = svgElt.selectAll("rect")
                    .data(tagKVArray)
                    .enter()
                    .append("rect")
                    .attr({ x : rectX,
                            y : function (d, i) { return i * yInc; },
                            width : function (d) { return d.value * xInc; },
                            height : barHeight
                          })
                    .style("fill", getBarColor)
                    .on("click", handleTagClick);
            OsmTagVis.chartLabels = svgElt.selectAll("text")
                    .data(tagKVArray)
                    .enter()
                    .append("text")
                    .text(function (d) { return d.key; })
                    .attr({ x : textEndPosition,
                            y : function (d, i) { return i * yInc + yInc / 2; }
                          })
                    .style("font-weight", getLabelWeight)
                    .on("click", handleTagClick);
        }
    }
                  
    /**
      * Generate list of selectable tag names with counts.
      */
    function makeTagList() {
        var tagGrouping;
        tagGrouping = groupTagsByName();
        makeBarChart(tagGrouping);
    }
    
    /**
      * Execute Overpass API query for named nodes within map's current bounding box.
      * If successful, update list of selectable tags and map markers.
      */
    function queryOverpass() {
        var bbString = formatBBox(),
            overpassQuery = encodeURIComponent("node" + '["name"]' + bbString + ";out body;"),
            overpassURL = "http://overpass-api.de/api/interpreter?data=[out:json];" + overpassQuery;
        console.log("Bounding Box: " + bbString);
        console.log("Overpass Query URL=" + overpassURL);
        $.ajax({
            url : overpassURL,
            type : 'GET',
            crossDomain : true,
            success : function (data) {
                //console.log(data);
                OsmTagVis.osmJson = data.elements;
                makeTagList();
                makeMarkers();
            },
            error : function (request, status, errorThrown) {
                window.alert("Overpass Query failed with error: \n" + errorThrown);
            }
        });
    }
    
    /**
      * Respond to Leaflet viewreset event - execute query for current bounding box.
      * @param {Event} e Leaflet event object.
      */
    function onMapViewReset(e) {
        console.log("Map View Reset.");
        queryOverpass();
    }
    
    /**
      * Respond to Leaflet moveend event - execute query for current bounding box.
      * @param {Event} e Leaflet event object.
      */
    function onMapMoveEnd(e) {
        console.log("Map Moved.");
        queryOverpass();
    }
    
    /**
      * Create initial view of map with base map layer.
      */
    function makeMap() {
        var map = OsmTagVis.map;
        map.setView(OsmTagVis.currentPosition, 16);
        map.on('viewreset', onMapViewReset);
        map.on('moveend', onMapMoveEnd);

        // add an OpenStreetMap tile layer
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution : '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        OsmTagVis.map.addLayer(OsmTagVis.markerClusterGroup);
    
        // add a marker in the given location, attach some popup content to it and open the popup
        //L.marker([51.5, -0.09]).addTo(map).bindPopup('A pretty CSS3 popup.<br>Easily customizable.').openPopup();
        // Try to locate user's position and move there.
        map.on('locationfound', onLocationFound);
        map.on('locationerror', onLocationError);
    
    //    map.locate({
    //        setView : true,
    //        maxZoom : 16
    //    });
        queryOverpass();
    }
    
    /**
      * Use Spinner plugin for slow operations.
      * Not currently used.
      */
    function startSpinner() {
        var opts = {
                lines: 6, // The number of lines to draw
                length: 3, // The length of each line
                width: 3, // The line thickness
                radius: 10, // The radius of the inner circle
                corners: 1, // Corner roundness (0..1)
                rotate: 0, // The rotation offset
                direction: 1, // 1: clockwise, -1: counterclockwise
                color: '#000', // #rgb or #rrggbb or array of colors
                speed: 1, // Rounds per second
                trail: 60, // Afterglow percentage
                shadow: false, // Whether to render a shadow
                hwaccel: false, // Whether to use hardware acceleration
                className: 'spinner', // The CSS class to assign to the spinner
                zIndex: 2e9, // The z-index (defaults to 2000000000)
                top: 'auto', // Top position relative to parent in px
                left: 'auto' // Left position relative to parent in px
            },
            target = window.document.getElementById('map');
        OsmTagVis.spinner = new Spinner(opts).spin(target);
        
    }
    
    //
    // Initialize app variables.
    //
    // Default location is in Santa Barbara.
    OsmTagVis.currentPosition = [34.4258, -119.7142];
    OsmTagVis.map = L.map('map');
    OsmTagVis.currentTag = "name";
    OsmTagVis.markerClusterGroup = L.markerClusterGroup();
    OsmTagVis.osmJson = {};
    makeMap();
}

