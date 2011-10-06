/**
 * Copyright (c) 2008-2010 The Open Source Geospatial Foundation
 *
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */

/**
 * @include GeoExt/data/LayerReader.js
 */

/** api: (define)
 *  module = GeoExt.data
 *  class = LayerStore
 *  base_link = `Ext.data.Store <http://dev.sencha.com/deploy/dev/docs/?class=Ext.data.Store>`_
 */
//Ext 4 no neead namespace
//Ext.namespace("GeoExt.data");

/** api: example
 *  Sample to create a new store containing a cache of
 *  :class:`GeoExt.data.LayerRecord` instances derived from map layers.
 *
 *  .. code-block:: javascript
 *
 *      var store = new GeoExt.data.LayerStore({
 *          map: myMap,
 *          layers: myLayers
 *      });
 */

/** api: constructor
 *  .. class:: LayerStore
 *
 *      A store that contains a cache of :class:`GeoExt.data.LayerRecord`
 *      objects.
 */
Ext.define('GeoExt.data.LayerStore', {
	extend : 'Ext.data.Store',

	statics : {
		MAP_TO_STORE : 1,
		STORE_TO_MAP : 2
	},

	/** api: config[map]
	 *  ``OpenLayers.Map``
	 *  Map that this store will be in sync with. If not provided, the
	 *  store will not be bound to a map.
	 */

	/** api: property[map]
	 *  ``OpenLayers.Map``
	 *  Map that the store is synchronized with, if any.
	 */
	map : null,

	/** api: config[layers]
	 *  ``Array(OpenLayers.Layer)``
	 *  Layers that will be added to the store (and the map, depending on the
	 *  value of the ``initDir`` option.
	 */

	/** api: config[initDir]
	 *  ``Number``
	 *  Bitfields specifying the direction to use for the initial sync between
	 *  the map and the store, if set to 0 then no initial sync is done.
	 *  Defaults to ``GeoExt.data.LayerStore.MAP_TO_STORE|GeoExt.data.LayerStore.STORE_TO_MAP``
	 */

	/** api: config[fields]
	 *  ``Array``
	 *  If provided a custom layer record type with additional fields will be
	 *  used. Default fields for every layer record are `layer`
	 *  (``OpenLayers.Layer``) `title` (``String``). The value of this option is
	 *  either a field definition objects as passed to the
	 *  :meth:`GeoExt.data.LayerRecord.create` function or a
	 *  :class:`GeoExt.data.LayerRecord` constructor created using
	 *  :meth:`GeoExt.data.LayerRecord.create`.
	 */

	/** api: config[reader]
	 *  ``Ext.data.DataReader`` The reader used to produce
	 *  :class:`GeoExt.data.LayerRecord` objects from ``OpenLayers.Layer``
	 *  objects.  If not provided, a :class:`GeoExt.data.LayerReader` will be
	 *  used.
	 */
	reader : null,

	/** private: method[constructor]
	 */
	constructor : function(config) {
		config = config || {};
		delete config.fields;
		// "map" option
		var map = config.map instanceof GeoExt.panel.Map ? config.map.map : config.map;
		delete config.map;
		// "layers" option - is an alias to "data" option
		if(config.layers) {
			config.data = config.layers;
		}
		delete config.layers;
		// "initDir" option
		var options = {
			initDir : config.initDir
		};
		delete config.initDir;

		if(this.model == undefined) {
			this.model = 'GeoExt.data.LayerModel';
		}

		Ext.applyIf(config, {
			proxy : {
				type : 'memory',
				reader : 'layer',
				writer : 'json'

			}
		});
		this.callParent([config]);
		if(map) {
			this.bind(map, options);
		}
	},
	/** private: method[bind]
	 *  :param map: ``OpenLayers.Map`` The map instance.
	 *  :param options: ``Object``
	 *
	 *  Bind this store to a map instance, once bound the store
	 *  is synchronized with the map and vice-versa.
	 */
	bind : function(map, options) {
		var me = this;
		if(me.map) {
			// already bound
			return;
		}
		me.map = map;
		options = options || {};

		var initDir = options.initDir;
		if(options.initDir == undefined) {
			initDir = GeoExt.data.LayerStore.MAP_TO_STORE | GeoExt.data.LayerStore.STORE_TO_MAP;
		}

		// create a snapshot of the map's layers
		var layers = map.layers.slice(0);

		if(initDir & GeoExt.data.LayerStore.STORE_TO_MAP) {
			me.each(function(record) {
				this.map.addLayer(record.getLayer());
			}, me);
		}
		if(initDir & GeoExt.data.LayerStore.MAP_TO_STORE) {
			this.loadData(layers, true);
		}

		map.events.on({
			"changelayer" : me.onChangeLayer,
			"addlayer" : me.onAddLayer,
			"removelayer" : me.onRemoveLayer,
			scope : me
		});
		me.on({
			"load" : me.onLoad,
			"clear" : me.onClear,
			"add" : me.onAdd,
			"remove" : me.onRemove,
			"update" : me.onUpdate,
			scope : me
		});
		me.data.on({
			"replace" : me.onReplace,
			scope : me
		});
	},
	/** private: method[unbind]
	 *  Unbind this store from the map it is currently bound.
	 */
	unbind : function() {
		var me = this;
		if(me.map) {
			me.map.events.un({
				"changelayer" : me.onChangeLayer,
				"addlayer" : me.onAddLayer,
				"removelayer" : me.onRemoveLayer,
				scope : me
			});
			me.un("load", me.onLoad, me);
			me.un("clear", me.onClear, me);
			me.un("add", me.onAdd, me);
			me.un("remove", me.onRemove, me);

			me.data.un("replace", me.onReplace, me);

			me.map = null;
		}
	},
	/** private: method[onChangeLayer]
	 *  :param evt: ``Object``
	 *
	 *  Handler for layer changes.  When layer order changes, this moves the
	 *  appropriate record within the store.
	 */
	onChangeLayer : function(evt) {
		var me = this, layer = evt.layer;
		var recordIndex = this.findBy(function(rec, id) {
			return rec.getLayer() === layer;
		});
		if(recordIndex > -1) {
			var record = me.getAt(recordIndex);
			if(evt.property === "order") {
				if(!me._adding && !me._removing) {
					var layerIndex = me.map.getLayerIndex(layer);
					if(layerIndex !== recordIndex) {
						me._removing = true;
						me.remove(record);
						delete me._removing;
						me._adding = true;
						me.insert(layerIndex, [record]);
						delete me._adding;
					}
				}
			} else if(evt.property === "name") {
				record.set("title", layer.name);
			} else {
				me.fireEvent("update", me, record, Ext.data.Model.EDIT);
			}
		}
	},
	/** private: method[onAddLayer]
	 *  :param evt: ``Object``
	 *
	 *  Handler for a map's addlayer event
	 */
	onAddLayer : function(evt) {
		var me=this;
		if(!me._adding) {
			var layer = evt.layer;
			me._adding = true;
			me.loadData([layer], true);
			delete me._adding;
		}
	},
	/** private: method[onRemoveLayer]
	 *  :param evt: ``Object``
	 *
	 *  Handler for a map's removelayer event
	 */
	onRemoveLayer : function(evt) {
		//TODO replace the check for undloadDestroy with a listener for the
		// map's beforedestroy event, doing unbind(). This can be done as soon
		// as http://trac.openlayers.org/ticket/2136 is fixed.
		var me=this;
		if(me.map.unloadDestroy) {
			if(!me._removing) {
				var layer = evt.layer;
				me._removing = true;
				me.remove(me.getById(layer.id));
				delete me._removing;
			}
		} else {
			me.unbind();
		}
	},
	/** private: method[onLoad]
	 *  :param store: ``Ext.data.Store``
	 *  :param records: ``Array(Ext.data.Model)``
	 *  :param options: ``Object``
	 *
	 *  Handler for a store's load event
	 */
	onLoad : function(store, records, options) {
		var me=this;
		if(!Ext.isArray(records)) {
			records = [records];
		}
		if(options && !options.add) {
			me._removing = true;
			for(var i = me.map.layers.length - 1; i >= 0; i--) {
				me.map.removeLayer(me.map.layers[i]);
			}
			delete me._removing;

			// layers has already been added to map on "add" event
			var len = records.length;
			if(len > 0) {
				var layers = new Array(len);
				for(var j = 0; j < len; j++) {
					layers[j] = records[j].getLayer();
				}
				me._adding = true;
				me.map.addLayers(layers);
				delete me._adding;
			}
		}
	},
	/** private: method[onClear]
	 *  :param store: ``Ext.data.Store``
	 *
	 *  Handler for a store's clear event
	 */
	onClear : function(store) {
		var me=this;
		me._removing = true;
		for(var i = me.map.layers.length - 1; i >= 0; i--) {
			me.map.removeLayer(me.map.layers[i]);
		}
		delete me._removing;
	},
	/** private: method[onAdd]
	 *  :param store: ``Ext.data.Store``
	 *  :param records: ``Array(Ext.data.Model)``
	 *  :param index: ``Number``
	 *
	 *  Handler for a store's add event
	 */
	onAdd : function(store, records, index) {
		var me=this;
		if(!me._adding) {
			me._adding = true;
			var layer;
			for(var i = records.length - 1; i >= 0; --i) {
				layer = records[i].getLayer();
				me.map.addLayer(layer);
				if(index !== me.map.layers.length - 1) {
					me.map.setLayerIndex(layer, index);
				}
			}
			delete this._adding;
		}
	},
	/** private: method[onRemove]
	 *  :param store: ``Ext.data.Store``
	 *  :param record: ``Ext.data.Model``
	 *  :param index: ``Number``
	 *
	 *  Handler for a store's remove event
	 */
	onRemove : function(store, record, index) {
		var me=this;
		if(!me._removing) {
			var layer = record.getLayer();
			if(me.map.getLayer(layer.id) != null) {
				me._removing = true;
				me.removeMapLayer(record);
				delete me._removing;
			}
		}
	},
	/** private: method[onUpdate]
	 *  :param store: ``Ext.data.Store``
	 *  :param record: ``Ext.data.Model``
	 *  :param operation: ``Number``
	 *
	 *  Handler for a store's update event
	 */
	onUpdate : function(store, record, operation) {
		if(operation === Ext.data.Model.EDIT) {
			if(record.modified && record.modified.title) {
				var layer = record.getLayer();
				var title = record.get("title");
				if(title !== layer.name) {
					layer.setName(title);
				}
			}
		}
	},
	/** private: method[removeMapLayer]
	 *  :param record: ``Ext.data.Model``
	 *
	 *  Removes a record's layer from the bound map.
	 */
	removeMapLayer : function(record) {
		this.map.removeLayer(record.getLayer());
	},
	/** private: method[onReplace]
	 *  :param key: ``String``
	 *  :param oldRecord: ``Object`` In this case, a record that has been
	 *      replaced.
	 *  :param newRecord: ``Object`` In this case, a record that is replacing
	 *      oldRecord.

	 *  Handler for a store's data collections' replace event
	 */
	onReplace : function(key, oldRecord, newRecord) {
		this.removeMapLayer(oldRecord);
	},
	/** public: method[getByLayer]
	 *  :param layer: ``OpenLayers.Layer``
	 *  :return: :class:`GeoExt.data.LayerRecord` or undefined if not found
	 *
	 *  Get the record for the specified layer
	 */
	getByLayer : function(layer) {
		var index = this.findBy(function(r) {
			return r.getLayer() === layer;
		});
		if(index > -1) {
			return this.getAt(index);
		}
	},
	/** private: method[destroy]
	 */
	destroy : function() {
		this.unbind();
		this.callParent(config);
	}
})


