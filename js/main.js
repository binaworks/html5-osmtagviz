function runOsmTagVis() {

    'use strict';
    
    // library globals
    /*global L, $, crossfilter, d3, console, window*/
    /*jslint plusplus: true*/
    
    var OsmTagVis = {};
    
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
    
    function makeMarkers() {
        var markerCG = OsmTagVis.markerClusterGroup;
        markerCG.clearLayers();
        OsmTagVis.osmJson.forEach(function (node) {
            var marker;
            if (node.tags.hasOwnProperty(OsmTagVis.currentTag)) {
                marker = L.marker(new L.LatLng(node.lat, node.lon), {title: node.tags.name});
                markerCG.addLayer(marker);
            }
        });
    }
    
    function handleTagClick(tagData) {
        OsmTagVis.currentTag = tagData.key;
        makeMarkers();
    }
    
            
    function makeTagList() {
        var tagArray = [],
            tagCF,
            titleDimension,
            titleGroupCount,
            tagKVArray,
            formRB,
            taglistKeys,
            tagRadioButtons,
            osmJson = OsmTagVis.osmJson;
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
        taglistKeys = d3.select("#tagform").selectAll("div").data(tagKVArray).enter().append("div");
        tagRadioButtons = taglistKeys.insert("input")
                            .attr({ type: "radio",
                                    name: "tagRadioButton",
                                    value: function (d, i) { return i; }
                                  })
                            .attr("class", "radiobtn")
                            .property("checked", function (d, i) { return (d.key === "name"); });
        taglistKeys.insert("label").text(function (d) { return " " + d.key + " (" + d.value + ")"; });
        tagRadioButtons.on("click", handleTagClick);
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
                OsmTagVis.osmJson = data.elements;
                makeTagList();
                makeMarkers();
            }
            //beforeSend: setHeader
        });
    }
    
    function onMapViewReset() {
        queryOverpass();
    }
    
    function makeMap() {
        var map = OsmTagVis.map;
        map.setView(OsmTagVis.currentPosition, 13);
        //map.on('viewreset', queryOverpass);
    
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
    
    function showLocationError(error) {
        var errMsg;
        switch (error.code) {
        case error.PERMISSION_DENIED:
            errMsg = "User denied the request for Geolocation.";
            break;
        case error.POSITION_UNAVAILABLE:
            errMsg = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            errMsg = "The request to get user location timed out.";
            break;
        case error.UNKNOWN_ERROR:
            errMsg = "An unknown error occurred.";
            break;
        }
        window.alert(errMsg);
    }
    
    function setPosition(position) {
        OsmTagVis.currentPosition = [position.coords.latitude, position.coords.longitude];
        makeMap();
    }
    
    function getLocation() {
        if (window.navigator.geolocation) {
            window.navigator.geolocation.getCurrentPosition(setPosition, showLocationError);
        } else {
            window.alert("Geolocation is not supported by this browser.");
        }
    }
    //Initialize app variables.
    // default to Santa Barbara
    OsmTagVis.currentPosition = [34.4258, -119.7142];
    OsmTagVis.map = L.map('map');
    OsmTagVis.currentTag = "name";
    OsmTagVis.markerClusterGroup = L.markerClusterGroup();
    OsmTagVis.osmJson = {};
    // Try to get current location
    getLocation();
//    makeMap();
//    queryOverpass();

    
}

