Ext.define('GeoExt.panel.Map', {
    extend : 'Ext.panel.Panel',

    requires : ['GeoExt.data.LayerStore'],
    alias : 'widget.gx_mappanel',
    alternateClassName : 'GeoExt.MapPanel',

    statics : {
        guess : function() {
            return Ext.ComponentQuery.query("gx_mappanel")
        }
    },

    /** api: config[map]
     *  ``OpenLayers.Map or Object``  A configured map or a configuration object
     *  for the map constructor.  A configured map will be available after
     *  construction through the :attr:`map` property.
     */

    /** api: property[map]
     *  ``OpenLayers.Map`` or ``Object``  A map or map configuration.
     */
    map : null,

    /** api: config[layers]
     *  ``GeoExt.data.LayerStore or GeoExt.data.GroupingStore or Array(OpenLayers.Layer)``
     *  A store holding records. The layers provided here will be added to this
     *  MapPanel's map when it is rendered.
     */

    /** api: property[layers]
     *  :class:`GeoExt.data.LayerStore`  A store containing
     *  :class:`GeoExt.data.LayerRecord` objects.
     */
    layers : null,

    /** api: config[center]
     *  ``OpenLayers.LonLat or Array(Number)``  A location for the map center.  If
     *  an array is provided, the first two items should represent x & y coordinates.
     */
    center : null,

    /** api: config[zoom]
     *  ``Number``  An initial zoom level for the map.
     */
    zoom : null,

    /** api: config[extent]
     *  ``OpenLayers.Bounds or Array(Number)``  An initial extent for the map (used
     *  if center and zoom are not provided.  If an array, the first four items
     *  should be minx, miny, maxx, maxy.
     */
    extent : null,

    /** api: config[prettyStateKeys]
     *  ``Boolean`` Set this to true if you want pretty strings in the MapPanel's
     *  state keys. More specifically, layer.name instead of layer.id will be used
     *  in the state keys if this option is set to true. But in that case you have
     *  to make sure you don't have two layers with the same name. Defaults to
     *  false.
     */
    prettyStateKeys : false,

    /** private: property[stateEvents]
     *  ``Array(String)`` Array of state events
     */
    stateEvents : ["aftermapmove", "afterlayervisibilitychange", "afterlayeropacitychange", "afterlayerorderchange", "afterlayernamechange", "afterlayeradd", "afterlayerremove"],

    /** private: method[initComponent]
     *  Initializes the map panel. Creates an OpenLayers map if
     *  none was provided in the config options passed to the
     *  constructor.
     */
    initComponent : function() {
        var me = this;
        if(!(me.map instanceof OpenLayers.Map)) {
            me.map = new OpenLayers.Map(Ext.applyIf(me.map || {}, {
                allOverlays : true
            }));
        }
        var layers = me.layers;
        if(!layers || layers instanceof Array) {

            me.layers = Ext.create('GeoExt.data.LayerStore', {
                layers : layers,
                map : me.map.layers.length > 0 ? me.map : null
            });
        }

        if( typeof me.center == "string") {
            me.center = OpenLayers.LonLat.fromString(me.center);
        } else if(me.center instanceof Array) {
            me.center = new OpenLayers.LonLat(me.center[0], me.center[1]);
        }
        if( typeof me.extent == "string") {
            me.extent = OpenLayers.Bounds.fromString(me.extent);
        } else if(me.extent instanceof Array) {
            me.extent = OpenLayers.Bounds.fromArray(me.extent);
        }

        me.callParent();

        me.addEvents(
        /** private: event[aftermapmove]
         *  Fires after the map is moved.
         */"aftermapmove",

        /** private: event[afterlayervisibilitychange]
         *  Fires after a layer changed visibility.
         */
        "afterlayervisibilitychange",

        /** private: event[afterlayeropacitychange]
         *  Fires after a layer changed opacity.
         */
        "afterlayeropacitychange",

        /** private: event[afterlayerorderchange]
         *  Fires after a layer order changed.
         */
        "afterlayerorderchange",

        /** private: event[afterlayernamechange]
         *  Fires after a layer name changed.
         */
        "afterlayernamechange",

        /** private: event[afterlayeradd]
         *  Fires after a layer added to the map.
         */
        "afterlayeradd",

        /** private: event[afterlayerremove]
         *  Fires after a layer removed from the map.
         */
        "afterlayerremove");
        me.map.events.on({
            "moveend" : me.onMoveend,
            "changelayer" : me.onChangelayer,
            "addlayer" : me.onAddlayer,
            "removelayer" : me.onRemovelayer,
            scope : me
        });
    },
    /** private: method[onMoveend]
     *
     *  The "moveend" listener.
     */
    onMoveend : function() {
        this.fireEvent("aftermapmove");
    },
    /** private: method[onChangelayer]
     *  :param e: ``Object``
     *
     * The "changelayer" listener.
     */
    onChangelayer : function(e) {
        var me = this;
        if(e.property) {
            if(e.property === "visibility") {
                me.fireEvent("afterlayervisibilitychange");
            } else if(e.property === "order") {
                me.fireEvent("afterlayerorderchange");
            } else if(e.property === "name") {
                me.fireEvent("afterlayernamechange");
            } else if(e.property === "opacity") {
                me.fireEvent("afterlayeropacitychange");
            }
        }
    },
    /** private: method[onAddlayer]
     */
    onAddlayer : function() {
        this.fireEvent("afterlayeradd");
    },
    /** private: method[onRemovelayer]
     */
    onRemovelayer : function() {
        this.fireEvent("afterlayerremove");
    },
    /** private: method[applyState]
     *  :param state: ``Object`` The state to apply.
     *
     *  Apply the state provided as an argument.
     */
    applyState : function(state) {
        var me = this;
        // if we get strings for state.x, state.y or state.zoom
        // OpenLayers will take care of converting them to the
        // appropriate types so we don't bother with that
        me.center = new OpenLayers.LonLat(state.x, state.y);
        me.zoom = state.zoom;

        // set layer visibility and opacity
        var i, l, layer, layerId, visibility, opacity;
        var layers = me.map.layers;
        for( i = 0, l = layers.length; i < l; i++) {
            layer = layers[i];
            layerId = me.prettyStateKeys ? layer.name : layer.id;
            visibility = state["visibility_" + layerId];
            if(visibility !== undefined) {
                // convert to boolean
                visibility = (/^true$/i).test(visibility);
                if(layer.isBaseLayer) {
                    if(visibility) {
                        me.map.setBaseLayer(layer);
                    }
                } else {
                    layer.setVisibility(visibility);
                }
            }
            opacity = state["opacity_" + layerId];
            if(opacity !== undefined) {
                layer.setOpacity(opacity);
            }
        }
    },
    /** private: method[getState]
     *  :return:  ``Object`` The state.
     *
     *  Returns the current state for the map panel.
     */
    getState : function() {
        var me = this;
        var state = me.callParent(arguments) || {};

        // Ext delays the call to getState when a state event
        // occurs, so the MapPanel may have been destroyed
        // between the time the event occurred and the time
        // getState is called
        if(!me.map) {
            return;
        }

        // record location and zoom level
        var center = me.map.getCenter();
        // map may not be centered yet, because it may still have zero
        // dimensions or no layers
        if(center) {
            Ext.apply(state, {
                x : center.lon,
                y : center.lat,
                zoom : me.map.getZoom()
            });
        }

        // record layer visibility and opacity
        var i, l, layer, layerId, layers = me.map.layers;
        for( i = 0, l = layers.length; i < l; i++) {
            layer = layers[i];
            layerId = me.prettyStateKeys ? layer.name : layer.id;
            state["visibility_" + layerId] = layer.getVisibility();
            state["opacity_" + layerId] = layer.opacity == null ? 1 : layer.opacity;
        }

        return state;
    },
    /** private: method[updateMapSize]
     *  Tell the map that it needs to recalculate its size and position.
     */
    updateMapSize : function() {
        if(this.map) {
            this.map.updateSize();
        }
    },
    /** private: method[renderMap]
     *  Private method called after the panel has been rendered or after it
     *  has been laid out by its parent's layout.
     */
    renderMap : function() {
        var me = this, map = me.map;
        map.render(me.body.dom);

        me.layers.bind(map);

        if(map.layers.length > 0) {
            me.setInitialExtent();
        } else {
            me.layers.on("add", me.setInitialExtent, me, {
                single : true
            });
        }
    },
    /** private: method[setInitialExtent]
     *  Sets the initial extent of this panel's map
     */
    setInitialExtent : function() {
        var me = this, map = this.map;
        if(me.center || me.zoom != null) {
            // both do not have to be defined
            map.setCenter(me.center, me.zoom);
        } else if(me.extent) {
            map.zoomToExtent(me.extent);
        } else {
            map.zoomToMaxExtent();
        }
    },
    /** private: method[afterRender]
     *  Private method called after the panel has been rendered.
     */
    afterRender : function() {
        var me = this;
        me.callParent(arguments);
        if(!me.ownerCt) {
            me.renderMap();
        } else {
            me.ownerCt.on("move", me.updateMapSize, me);
            me.ownerCt.on({
                "afterlayout" : {
                    fn : me.renderMap,
                    scope : me,
                    single : true
                }
            });
        }
    },
    /** private: method[afterLayout]
     *  Private method called after owner container has been laid out until
     *  this panel has dimensions greater than zero.
     */
    afterLayout : function() {
        var me = this, width = me.getInnerWidth() - me.body.getBorderWidth("lr"), height = me.getInnerHeight() - me.body.getBorderWidth("tb");
        if(width > 0 && height > 0) {
            me.ownerCt.un("afterlayout", me.afterLayout, me);
            me.renderMap();
        }
    },
    /** private: method[onResize]
     *  Private method called after the panel has been resized.
     */
    onResize : function() {
        this.callParent(arguments);
        this.updateMapSize();
    },
    /** private: method[onBeforeAdd]
     *  Private method called before a component is added to the panel.
     */
    onBeforeAdd : function(item) {
        if( typeof item.addToMapPanel === "function") {
            item.addToMapPanel(this);
        }
        this.callParent(arguments);
    },
    /** private: method[remove]
     *  Private method called when a component is removed from the panel.
     */
    remove : function(item, autoDestroy) {
        if( typeof item.removeFromMapPanel === "function") {
            item.removeFromMapPanel(this);
        }
        this.callParent(arguments);
    },
    /** private: method[beforeDestroy]
     *  Private method called during the destroy sequence.
     */
    beforeDestroy : function() {
        var me = this;
        if(me.ownerCt) {
            me.ownerCt.un("move", me.updateMapSize, me);
        }
        if(me.map && me.map.events) {
            me.map.events.un({
                "moveend": me.onMoveend,
                "changelayer": me.onChangelayer,
                "addlayer": me.onAddlayer,
                "removelayer": me.onRemovelayer,
                scope: me
            });
        }
        // if the map panel was passed a map instance, this map instance
        // is under the user's responsibility
        if(!me.initialConfig.map || !(me.initialConfig.map instanceof OpenLayers.Map)) {
            // we created the map, we destroy it
            if(me.map && me.map.destroy) {
                me.map.destroy();
            }
        }
        delete me.map;
        me.callParent(arguments);
    }
});
