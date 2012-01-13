Ext.define('GeoExt.Popup', {
    extend : 'Ext.window.Window',
    alias : 'widget.gx_popup',
    /** api: config[anchored]
     *  ``Boolean``  The popup begins anchored to its location.  Default is
     *  ``true``.
     */
    anchored : true,

    /** api: config[map]
     *  ``OpenLayers.Map`` or :class:`GeoExt.MapPanel`
     *  The map this popup will be anchored to (only required if ``anchored``
     *  is set to true and the map cannot be derived from the ``location``'s
     *  layer.
     */
    map : null,

    /** api: config[panIn]
     *  ``Boolean`` The popup should pan the map so that the popup is
     *  fully in view when it is rendered.  Default is ``true``.
     */
    panIn : true,

    /** api: config[unpinnable]
     *  ``Boolean`` The popup should have a "unpin" tool that unanchors it from
     *  its location.  Default is ``true``.
     */
    unpinnable : true,

    /** api: config[location]
     *  ``OpenLayers.Feature.Vector`` or ``OpenLayers.LonLat`` or
     *  ``OpenLayers.Pixel`` or ``OpenLayers.Geometry`` A location for this
     *  popup's anchor.
     */

    /** private: property[location]
     *  ``OpenLayers.LonLat``
     */
    location : null,

    /** private: property[insideViewport]
     *  ``Boolean`` Wether the popup is currently inside the map viewport.
     */
    insideViewport : null,

    /**
     * Some Ext.Window defaults need to be overriden here
     * because some Ext.Window behavior is not currently supported.
     */

    /** private: config[animCollapse]
     *  ``Boolean`` Animate the transition when the panel is collapsed.
     *  Default is ``false``.  Collapsing animation is not supported yet for
     *  popups.
     */
    animCollapse : false,

    /** private: config[draggable]
     *  ``Boolean`` Enable dragging of this Panel.  Defaults to ``false``
     *  because the popup defaults to being anchored, and anchored popups
     *  should not be draggable.
     */
    draggable : false,

    /** private: config[shadow]
     *  ``Boolean`` Give the popup window a shadow.  Defaults to ``false``
     *  because shadows are not supported yet for popups (the shadow does
     *  not look good with the anchor).
     */
    shadow : false,

    /** api: config[popupCls]
     *  ``String`` CSS class name for the popup DOM elements.  Default is
     *  "gx-popup".
     */
    popupCls : "gx-popup",

    /** api: config[ancCls]
     *  ``String``  CSS class name for the popup's anchor.
     */
    ancCls : null,

    /** api: config[anchorPosition]
     *  ``String``  Controls the anchor position for the popup. If set to
     *  ``auto``, the anchor will be positioned on the top or the bottom of
     *  the window, minimizing map movement. Supported values are ``bottom-left``,
     *  ``bottom-right``, ``top-left``, ``top-right`` or ``auto``.
     *  Defaults to ``auto``.
     */
    anchorPosition : "auto",
    
    
     renderTpl: [
        '<div id="{id}-body" class="{baseCls}-body<tpl if="bodyCls"> {bodyCls}</tpl>',
            ' {baseCls}-body-{ui}<tpl if="uiCls">',
                '<tpl for="uiCls"> {parent.baseCls}-body-{parent.ui}-{.}</tpl>',
            '</tpl>"<tpl if="bodyStyle"> style="{bodyStyle}"</tpl>>',
        '</div>',
        '<div id="{id}-anc" class={ancCls}>'
    ],

    /** private: method[initComponent]
     *  Initializes the popup.
     */
    initComponent : function() {
        var me = this;
        if(me.map instanceof GeoExt.panel.Map) {
            me.map = me.map.map;
        }
        if(!me.map && me.location instanceof OpenLayers.Feature.Vector && me.location.layer) {
            me.map = me.location.layer.map;
        }
        if(me.location instanceof OpenLayers.Feature.Vector) {
            me.location = me.location.geometry;
        }
        if(me.location instanceof OpenLayers.Geometry) {
            if( typeof me.location.getCentroid == "function") {
                me.location = me.location.getCentroid();
            }
            me.location = me.location.getBounds().getCenterLonLat();
        } else if(me.location instanceof OpenLayers.Pixel) {
            me.location = me.map.getLonLatFromViewPortPx(me.location);
        }

        var mapExtent = me.map.getExtent();
        if(mapExtent && me.location) {
            me.insideViewport = mapExtent.containsLonLat(me.location);
        }

        if(me.anchored) {
            me.addAnchorEvents();
        }
        
        me.baseCls = me.popupCls + " " + me.baseCls;

        this.callParent();
    },
    /** private: method[onRender]
     *  Executes when the popup is rendered.
     */
    onRender : function(ct, position) {
       
        this.ancCls = this.popupCls + "-anc";
        //create anchor dom element.
        this.addChildEls('anc');
         this.callParent(arguments);
    },
    initRenderData: function() {
        return Ext.applyIf(this.callParent(), {
            ancCls:this.ancCls
        });
    },
    applyRenderSelectors: function() {
        var me = this,
            childEls = me.childEls,
            selectors = me.renderSelectors,
            el = me.el,
            dom = el.dom,
            baseId, childName, childId, i, selector;
       
        if (childEls) {
            baseId = me.id + '-';
            for (i = childEls.length; i--; ) {
                childName = childId = childEls[i];
                 
                if (typeof(childName) != 'string') {
                    childId = childName.id || (baseId + childName.itemId);
                    childName = childName.name;
                } else {
                    childId = baseId + childId;
                }

                // We don't use Ext.get because that is 3x (or more) slower on IE6-8. Since
                // we know the el's are children of our el we use getById instead:
                me[childName] = el.getById(childId);
            }
        }

        // We still support renderSelectors. There are a few places in the framework that
        // need them and they are a documented part of the API. In fact, we support mixing
        // childEls and renderSelectors (no reason not to).
        if (selectors) {
            for (selector in selectors) {
                if (selectors.hasOwnProperty(selector) && selectors[selector]) {
                    me[selector] = Ext.get(Ext.DomQuery.selectNode(selectors[selector], dom));
                }
            }
        }
    },
    /** private: method[initTools]
     *  Initializes the tools on the popup.  In particular,
     *  it adds the 'unpin' tool if the popup is unpinnable.
     */
    initTools : function() {
        var me=this;
        me.callParent();
        if(me.unpinnable) {
            me.addTool({
                type : 'unpin',
                handler : Ext.bind(me.unanchorPopup, me, [])
            });
        }
    },
    /** private: method[afterShow]
     *  Override.
     */
    afterShow : function(animateTarget) {
        this.callParent([animateTarget]);
        if(this.anchored) {
            this.position();
            if(this.panIn && !this._mapMove) {
                this.panIntoView();
            }
        }
    },
    /** private: method[maximize]
     *  Override.
     */
    maximize : function() {
        if(!this.maximized && this.anc) {
            this.unanchorPopup();
        }
        this.callParent(arguments);
    },
    /** api: method[setSize]
     *  :param w: ``Integer``
     *  :param h: ``Integer``
     *
     *  Sets the size of the popup, taking into account the size of the anchor.
     */
    
    setSize : function(w, h) {
        if(this.anc) {
            var ancSize = this.anc.getSize();
            if( typeof w == 'object') {
                h = w.height - ancSize.height;
                w = w.width;
            } else if(!isNaN(h)) {
                h = h - ancSize.height;
            }
        }
        this.callParent([w, h]);
        
    },
    
    /** private: method[position]
     *  Positions the popup relative to its location
     */
    position : function() {
        var me = this;
        if(me._mapMove === true) {
            me.insideViewport = me.map.getExtent().containsLonLat(me.location);
            if(me.insideViewport !== me.isVisible()) {
                me.setVisible(me.insideViewport);
            }
        }

        if(me.isVisible()) {
            var locationPx = me.map.getPixelFromLonLat(me.location), mapBox = Ext.fly(me.map.div).getBox(true), top = locationPx.y + mapBox.y, left = locationPx.x + mapBox.x, elSize = me.el.getSize(), ancSize = me.anc.getSize(), ancPos = me.anchorPosition;

            if(ancPos.indexOf("right") > -1 || locationPx.x > mapBox.width / 2) {
                // right
                me.anc.addCls("right");
                var ancRight = me.el.getX(true) + elSize.width - me.anc.getX(true) - ancSize.width;
                left -= elSize.width - ancRight - ancSize.width / 2;
            } else {
                // left
                me.anc.removeCls("right");
                var ancLeft = me.anc.getLeft(true);
                left -= ancLeft + ancSize.width / 2;
            }

            if(ancPos.indexOf("bottom") > -1 || locationPx.y > mapBox.height / 2) {
                // bottom
                me.anc.removeCls("top");
                top -= elSize.height + ancSize.height;
            } else {
                // top
                me.anc.addCls("top");
                top += ancSize.height;
                // ok
            }

            me.setPosition(left, top);
        }
    },
    /** private: method[unanchorPopup]
     *  Unanchors a popup from its location.  This removes the popup from its
     *  MapPanel and adds it to the page body.
     */
    unanchorPopup : function() {
        var me = this;
        me.removeAnchorEvents();

        //make the window draggable
        me.draggable = true;
        me.initDraggable();

        //remove anchor
        me.anc.remove();
        me.anc = null;

        //hide unpin tool
        me.header.down("[type=unpin]").hide();
    },
    /** private: method[panIntoView]
     *  Pans the MapPanel's map so that an anchored popup can come entirely
     *  into view, with padding specified as per normal OpenLayers.Map popup
     *  padding.
     */
    panIntoView : function() {
        var me = this, mapBox = Ext.fly(me.map.div).getBox(true);

        //assumed viewport takes up whole body element of map panel
        var popupPos = me.getPosition(true);
        popupPos[0] -= mapBox.x;
        popupPos[1] -= mapBox.y;

        var panelSize = [mapBox.width, mapBox.height],
        // [X,Y]
        popupSize = me.getSize(), newPos = [popupPos[0], popupPos[1]];

        //For now, using native OpenLayers popup padding.  This may not be ideal.
        var padding = me.map.paddingForPopups;

        // X
        if(popupPos[0] < padding.left) {
            newPos[0] = padding.left;
        } else if(popupPos[0] + popupSize.width > panelSize[0] - padding.right) {
            newPos[0] = panelSize[0] - padding.right - popupSize.width;
        }

        // Y
        if(popupPos[1] < padding.top) {
            newPos[1] = padding.top;
        } else if(popupPos[1] + popupSize.height > panelSize[1] - padding.bottom) {
            newPos[1] = panelSize[1] - padding.bottom - popupSize.height;
        }

        var dx = popupPos[0] - newPos[0];
        var dy = popupPos[1] - newPos[1];

        me.map.pan(dx, dy);
    },
    /** private: method[onMapMove]
     */
    onMapMove : function() {
        if(!(this.hidden && this.insideViewport)) {
            this._mapMove = true;
            this.position();
            delete this._mapMove;
        }
    },
    /** private: method[addAnchorEvents]
     */
    addAnchorEvents : function() {
        this.map.events.on({
            "move" : this.onMapMove,
            scope : this
        });

        this.on({
            "resize" : this.position,
            "collapse" : this.position,
            "expand" : this.position,
            scope : this
        });
    },
    /** private: method[removeAnchorEvents]
     */
    removeAnchorEvents : function() {
        //stop position with location
        this.map.events.un({
            "move" : this.onMapMove,
            scope : this
        });

        this.un("resize", this.position, this);
        this.un("collapse", this.position, this);
        this.un("expand", this.position, this);

    },
    /** private: method[beforeDestroy]
     *  Cleanup events before destroying the popup.
     */
    beforeDestroy : function() {
        if(this.anchored) {
            this.removeAnchorEvents();
        }
        this.callParent();
    }
});
