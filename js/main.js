// App variables
var OsmTagVis = {};

'use strict';

// library globals
/*global L, $, crossfilter, d3, console, window*/
/*jslint plusplus: true*/

function onLocationFound(e) {
    var radius = e.accuracy / 2,
        map = OsmTagVis.map;
    L.marker(e.latlng).addTo(map).bindPopup("You are within " + radius + " meters from this point").openPopup();
    L.circle(e.latlng, radius).addTo(map);
}

function onLocationError(e) {
    window.alert(e.message);
}

function formatBBox() {
    var map = OsmTagVis.map,
        mapLatLngBounds = map.getBounds(),
        bbString = "(" + mapLatLngBounds.getSouth() + "," + mapLatLngBounds.getWest() + "," + mapLatLngBounds.getNorth() + "," + mapLatLngBounds.getEast() + ")";
    return bbString;
}

//function enterTags(div) {
//    div.each(function () {
//        //d3.selectAll(this.childNodes).remove();
//        var tags = d3.select(this).selectAll(".tag").data(tagList.group().top(Infinity), function (d) {
//            return d.key + d.value;
//        }),
//            tagsEnter = tags.enter().append("div").attr("class", "tag");
//        tagsEnter.append("a").attr("class", "title")
//        //TODO not have javascript directly in the link
//        .attr("href", "#").attr("onclick", function(d) {
//            return ("javascript:filter('" + d.key + "');return false;");
//        }).text(function(d) {
//            return d.key + " (" + d.value + ")";
//        });
//        tags.exit().remove();
//        tags.order();
//    });
//}

function makeTagList(osmJson) {
    var tagArray = [],
        tagCF,
        titleDimension,
        titleGroupCount,
        tagKVArray;
    //console.log(data.elements);
    osmJson.forEach(function (node) {
        var tagName;
        console.log(node);
        for (tagName in node.tags) {
            if (node.tags.hasOwnProperty(tagName)) {
                tagArray.push({title: tagName, total: 1});
            }
        }
    });
    tagCF = crossfilter(tagArray);
    titleDimension = tagCF.dimension(function (d) {
        return d.title;
    });
    titleGroupCount = titleDimension.group().reduceCount();
    tagKVArray = titleGroupCount.top(titleGroupCount.size());
    d3.select("#taglist").selectAll(".tag").data(tagKVArray).enter().append("div").attr("class", "tag").text(function (d) {
        return d.key + " (" + d.value + ")";
    });
//    listTags = d3.select("#taglist").data([enterTags]);
    //console.log(tags);    
}

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
            var osmJson = data.elements;
            makeTagList(osmJson);
        }
        //beforeSend: setHeader
    });
}

function onMapViewReset() {
    queryOverpass();
}

function makeMap() {
    // Set default location (in London)
    OsmTagVis.map = L.map('map').setView([51.505, -0.09], 13);
    var map = OsmTagVis.map;
    map.on('viewreset', queryOverpass);

    // add an OpenStreetMap tile layer
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution : '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // add a marker in the given location, attach some popup content to it and open the popup
    //L.marker([51.5, -0.09]).addTo(map).bindPopup('A pretty CSS3 popup.<br>Easily customizable.').openPopup();
    // Try to locate user's position and move there.
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    map.locate({
        setView : true,
        maxZoom : 16
    });
}

function startUp() {
    makeMap();
    queryOverpass();
}

