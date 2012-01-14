Ext.define('GeoExt.Action',{
    extend:'Ext.Action',
    /** api: config[control]
     *  ``OpenLayers.Control`` The OpenLayers control wrapped in this action.
     */
    control: null,

    /** api: config[activateOnEnable]
     *  ``Boolean`` Activate the action's control when the action is enabled.
     *  Default is ``false``.
     */

    /** api: property[activateOnEnable]
     *  ``Boolean`` Activate the action's control when the action is enabled.
     */
    activateOnEnable: false,

    /** api: config[deactivateOnDisable]
     *  ``Boolean`` Deactivate the action's control when the action is disabled.
     *  Default is ``false``.
     */

    /** api: property[deactivateOnDisable]
     *  ``Boolean`` Deactivate the action's control when the action is disabled.
     */
    deactivateOnDisable: false,

    /** api: config[map]
     *  ``OpenLayers.Map`` The OpenLayers map that the control should be added
     *  to.  For controls that don't need to be added to a map or have already
     *  been added to one, this config property may be omitted.
     */
    map: null,

    /** private: property[uScope]
     *  ``Object`` The user-provided scope, used when calling uHandler,
     *  uToggleHandler, and uCheckHandler.
     */
    uScope: null,

    /** private: property[uHandler]
     *  ``Function`` References the function the user passes through
     *  the "handler" property.
     */
    uHandler: null,

    /** private: property[uToggleHandler]
     *  ``Function`` References the function the user passes through
     *  the "toggleHandler" property.
     */
    uToggleHandler: null,

    /** private: property[uCheckHandler]
     *  ``Function`` References the function the user passes through
     *  the "checkHandler" property.
     */
    uCheckHandler: null,

    /** private */
    constructor: function(config) {
        var me=this;
        // store the user scope and handlers
        me.uScope = config.scope;
        me.uHandler = config.handler;
        me.uToggleHandler = config.toggleHandler;
        me.uCheckHandler = config.checkHandler;

        config.scope = me;
        config.handler = me.pHandler;
        config.toggleHandler = me.pToggleHandler;
        config.checkHandler = me.pCheckHandler;

        // set control in the instance, the Ext.Action
        // constructor won't do it for us
        var ctrl = me.control = config.control;
        delete config.control;
        
        me.activateOnEnable = !!config.activateOnEnable;
        delete config.activateOnEnable;
        me.deactivateOnDisable = !!config.deactivateOnDisable;
        delete config.deactivateOnDisable;

        // register "activate" and "deactivate" listeners
        // on the control
        if(ctrl) {
            // If map is provided in config, add control to map.
            if(config.map) {
                config.map.addControl(ctrl);
                delete config.map;
            }
            if((config.pressed || config.checked) && ctrl.map) {
                ctrl.activate();
            }
            if (ctrl.active) {
                config.pressed = true;
                config.checked = true;
            }
            ctrl.events.on({
                activate: this.onCtrlActivate,
                deactivate: this.onCtrlDeactivate,
                scope: this
            });
        }

        me.callParent([config])
    },

    /** private: method[pHandler]
     *  :param cmp: ``Ext.Component`` The component that triggers the handler.
     *
     *  The private handler.
     */
    pHandler: function(cmp) {
        var ctrl = this.control;
        if(ctrl &&
           ctrl.type == OpenLayers.Control.TYPE_BUTTON) {
            ctrl.trigger();
        }
        if(this.uHandler) {
            this.uHandler.apply(this.uScope, arguments);
        }
    },

    /** private: method[pTogleHandler]
     *  :param cmp: ``Ext.Component`` The component that triggers the toggle handler.
     *  :param state: ``Boolean`` The state of the toggle.
     *
     *  The private toggle handler.
     */
    pToggleHandler: function(cmp, state) {
        this.changeControlState(state);
        if(this.uToggleHandler) {
            this.uToggleHandler.apply(this.uScope, arguments);
        }
    },

    /** private: method[pCheckHandler]
     *  :param cmp: ``Ext.Component`` The component that triggers the check handler.
     *  :param state: ``Boolean`` The state of the toggle.
     *
     *  The private check handler.
     */
    pCheckHandler: function(cmp, state) {
        this.changeControlState(state);
        if(this.uCheckHandler) {
            this.uCheckHandler.apply(this.uScope, arguments);
        }
    },

    /** private: method[changeControlState]
     *  :param state: ``Boolean`` The state of the toggle.
     *
     *  Change the control state depending on the state boolean.
     */
    changeControlState: function(state) {
        var me=this;
        if(state) {
            if(!me._activating) {
                me._activating = true;
                me.control.activate();
                // update initialConfig for next component created from this action
                me.initialConfig.pressed = true;
                me.initialConfig.checked = true;
                me._activating = false;
            }
        } else {
            if(!me._deactivating) {
                me._deactivating = true;
                me.control.deactivate();
                // update initialConfig for next component created from this action
                me.initialConfig.pressed = false;
                me.initialConfig.checked = false;
                me._deactivating = false;
            }
        }
    },

    /** private: method[onCtrlActivate]
     *  
     *  Called when this action's control is activated.
     */
    onCtrlActivate: function() {
        var me=this,ctrl = me.control;
        if(ctrl.type == OpenLayers.Control.TYPE_BUTTON) {
            me.enable();
        } else {
            // deal with buttons
            me.safeCallEach("toggle", [true]);
            // deal with check items
            me.safeCallEach("setChecked", [true]);
        }
    },

    /** private: method[onCtrlDeactivate]
     *  
     *  Called when this action's control is deactivated.
     */
    onCtrlDeactivate: function() {
        var me=this,ctrl = me.control;
        if(ctrl.type == OpenLayers.Control.TYPE_BUTTON) {
            me.disable();
        } else {
            // deal with buttons
            me.safeCallEach("toggle", [false]);
            // deal with check items
            me.safeCallEach("setChecked", [false]);
        }
    },

    /** private: method[safeCallEach]
     *
     */
    safeCallEach: function(fnName, args) {
        var cs = this.items;
        for(var i = 0, len = cs.length; i < len; i++){
            if(cs[i][fnName]) {
                cs[i].rendered ?
                    cs[i][fnName].apply(cs[i], args) :
                    cs[i].on({
                        "render": Ext.bind(cs[i][fnName],cs[i],args),
                        single: true
                    });
            }
        }
    },
    
    /** private: method[setDisabled]
     *  :param v: ``Boolean`` Disable the action's components.
     *
     *  Override method on super to optionally deactivate controls on disable.
     */
    setDisabled : function(v) {
        var me=this;
        if (!v && me.activateOnEnable && me.control && !me.control.active) {
            me.control.activate();
        }
        if (v && me.deactivateOnDisable && me.control && me.control.active) {
            me.control.deactivate();
        }
        return this.callParent(arguments);
    }

});