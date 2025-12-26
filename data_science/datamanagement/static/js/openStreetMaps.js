
/*============================================================================*/
/* START OPENSTREETMAPS */
/* GLOBALS */
/*============================================================================*/
var CartoDB_Voyager = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>',
  maxZoom: 18,
});
// For multiple Maps on one page, you have to use a layer for each map, otherwise it will overwrite the first one (var CartoDB_Voyager2 = exactly the same essentially)


var routeText = 'Routenplanung';
if($('html').is(':lang(en)')) {
    routeText = 'Routing';
} else if($('html').is(':lang(ja)')) {
    routeText = 'Routing';
} else {
	routeText = 'Routenplanung';
}

// create custom icon, if you would like
var customIcon = L.icon({
    iconUrl: 'files/libImages/icons/map-dot.png',
    iconSize: [16, 16], // size of the icon
    });

/*============================================================================*/
/* MAP */
/*============================================================================*/
if($('#leafletMap').length) {
    //create map
    var map = L.map('leafletMap',{
                scrollWheelZoom:false,
                zoomControl:true
                }).
                setView([49.7965843,8.5608873], 10);
    //other Handlers: boxZoom, doubleClickZoom, dragging, keaboard etc
    //https://leafletjs.com/reference-1.4.0.html

    // add Layers
    CartoDB_Voyager.addTo(map);

    // add markers
    var Marker = L.marker([49.7965843,8.5608873], {icon: customIcon}).addTo(map);
    Marker.bindPopup("<a href='https://www.google.de/maps/dir//PRIMES+GmbH,+Max-Planck-Stra%C3%9Fe+2,+64319+Pfungstadt/@49.7967109,8.4907304,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x47bd795af6eb861b:0xa2e6abed34dfe485!2m2!1d8.56077!2d49.796732?hl=en' target='_blank'>"+routeText+"</a>");
    Marker.on('click', onMarkerClick);

    // add fullscreen control:
    map.addControl(new L.Control.Fullscreen());
    // Handler Events
    // map.isFullscreen(); // Is the map fullscreen?
    // map.toggleFullscreen(); // Either go fullscreen, or cancel the existing fullscreen.
}

if($('#leafletJPMap').length) {
    //create map
    var map = L.map('leafletJPMap',{
                scrollWheelZoom:false,
                zoomControl:true
                }).
                setView([35.5096362,139.6149237], 10);
    //other Handlers: boxZoom, doubleClickZoom, dragging, keaboard etc
    //https://leafletjs.com/reference-1.4.0.html

    // add Layers
    CartoDB_Voyager.addTo(map);

    // add markers
    var Marker = L.marker([35.5096362,139.6149237], {icon: customIcon}).addTo(map);
    Marker.bindPopup("<a href='https://www.google.de/maps/dir//222-0033,+Japan/@35.5086685,139.5432955,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x60185ed10af9525b:0x9f0a77a613454f8f!2m2!1d139.6133356!2d35.5086887?hl=en' target='_blank'>"+routeText+"</a>");
    Marker.on('click', onMarkerClick);

    // add fullscreen control:
    map.addControl(new L.Control.Fullscreen());
    // Handler Events
    // map.isFullscreen(); // Is the map fullscreen?
    // map.toggleFullscreen(); // Either go fullscreen, or cancel the existing fullscreen.
}

/*============================================================================*/
/* FUNCTIONS */
/*============================================================================*/
function onMarkerClick() {
    var popup = Marker.getPopup();
    var status = popup.isOpen();

    if(status = false) {
          Marker.openPopup();
    } else {

    }
}
