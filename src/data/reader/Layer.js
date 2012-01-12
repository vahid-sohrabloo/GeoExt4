/**
 * Copyright (c) 2008-2010 The Open Source Geospatial Foundation
 *
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */

/**
 * @include GeoExt/data/LayerRecord.js
 */

/** api: (define)
 *  module = GeoExt.data
 *  class = LayerReader
 *  base_link = `Ext.data.DataReader <http://dev.sencha.com/deploy/dev/docs/?class=Ext.data.DataReader>`_
 */
//Ext.namespace("GeoExt", "GeoExt.data");

/** api: example
 *  Sample using a reader to create records from an array of layers:
 *
 *  .. code-block:: javascript
 *
 *      var reader = new GeoExt.data.LayerReader();
 *      var layerData = reader.readRecords(map.layers);
 *      var numRecords = layerData.totalRecords;
 *      var layerRecords = layerData.records;
 */

/** api: constructor
 *  .. class:: LayerReader(meta, recordType)
 *
 *      Data reader class to create an array of
 *      :class:`GeoExt.data.LayerRecord` objects from an array of
 *      ``OpenLayers.Layer`` objects for use in a
 *      :class:`GeoExt.data.LayerStore` object.
 */

Ext.define('GeoExt.data.reader.Layer', {
	extend: 'Ext.data.reader.Json',
	alias : 'reader.layer',
	extractData: function(root) {
		var data=[],
		length = root.length;

		for (i = 0; i < length; i++) {
			data[i] = {
				layer:root[i],
				name:root[i].name
			}
		}
		return this.callParent([data]);
	},
});