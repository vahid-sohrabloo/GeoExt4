var mapPanel;

Ext.onReady(function() {
	Ext.state.Manager.setProvider(new Ext.state.CookieProvider());
	var map = new OpenLayers.Map();
	var layer = new OpenLayers.Layer.WMS("Global Imagery", "http://maps.opengeo.org/geowebcache/service/wms", {
		layers : "bluemarble"
	});
	map.addLayer(layer);
	mapPanel = Ext.create("GeoExt.panel.Map", {
		title : "GeoExt MapPanel",
		renderTo : "mappanel",
		stateId : "mappanel",
		height : 400,
		width : 600,
		map : map,
		center : new OpenLayers.LonLat(5, 45),
		zoom : 4
	});
});
// functions for resizing the map panel
function mapSizeUp() {
	var size = mapPanel.getSize();
	size.width += 40;
	size.height += 40;
	mapPanel.setSize(size);
}

function mapSizeDown() {
	var size = mapPanel.getSize();
	size.width -= 40;
	size.height -= 40;
	mapPanel.setSize(size);
}