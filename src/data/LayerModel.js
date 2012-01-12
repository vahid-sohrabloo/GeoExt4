Ext.define('GeoExt.data.LayerModel', {
	extend : 'Ext.data.Model',
	idProperty : "name",
	fields : [{
		name : "layer",
	}, {
		name : "title",
		type : "string",
		mapping : "name"
	}],
	getLayer : function() {
		return this.get("layer");
	},
	setLayer : function(layer) {
		me.set("layer", layer);
		return;
		//
		var me = this;
		if(layer !== me.getLayer) {
			me.dirty = true;
			if(!me.modified) {
				me.modified = {};
			}
			if(me.modified.layer === undefined) {
				me.modified.layer = me.data.layer;
			}
			me.data.layer = layer;
			if(!me.editing) {
				me.afterEdit();
			}
		}
	},
	copy : function(id) {
		var layer = this.getLayer() && this.getLayer().clone();
		return new this.constructor(Ext.applyIf({
			layer : layer
		}, this.data), id || layer.id);
	}
});
