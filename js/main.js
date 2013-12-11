function onLocationFound(e) {
    var radius = e.accuracy / 2;

    L.marker(e.latlng).addTo(map).bindPopup("You are within " + radius + " meters from this point").openPopup();

    L.circle(e.latlng, radius).addTo(map);
}

function onLocationError(e) {
    alert(e.message);
}

function onMapViewReset() {
    queryOverpass();
}

function formatBBox() {
    mapLatLngBounds = map.getBounds();
    var bbString = "(" + mapLatLngBounds.getSouth() + "," + mapLatLngBounds.getWest() + "," + mapLatLngBounds.getNorth() + "," + mapLatLngBounds.getEast() + ")";
    return bbString;
}

function queryOverpass() {
    var bbString = formatBBox();
    console.log("Bounding Box: " + bbString);
    overpassQuery = "node" + '["name"]' + bbString + ";out body;";
    overpassQuery = encodeURIComponent(overpassQuery);

    overpassURL = "http://overpass-api.de/api/interpreter?data=[out:json];" + overpassQuery;
    console.log("Overpass Query URL=" + overpassURL);
    $.ajax({
        url : overpassURL,
        type : 'GET',
        crossDomain : true,
        success : function(data) {
            console.log(data);
        }
        //beforeSend: setHeader
    });
}

