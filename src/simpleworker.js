(function (global) {
    'use strict';
    
    var code = 'onmessage = function(e) {\
        var func = e.data.func;\
        var params = e.data.params;\
        var async = e.data.async;\
        \
        var deferred = {\
            resolve: function(ret) {\
                postMessage({ret: ret});\
                close();\
            },\
            reject: function(err) {\
                postMessage({err: err});\
                close();\
            }\
        };\
        \
        try{\
            var f = eval("(" + func + ")");\
            var ret = f.apply(self, params);\
            \
            if (!async) {\
                deferred.resolve(ret);\
            }\
        } catch (e) {\
            deferred.reject(e);\
        }\
    }';
    
    var bb = new Blob([code], {type:'text/javascript'});
    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL || window.oURL;
    var bbURL = URL.createObjectURL(bb);
    
    function Deferred() {
    }
    
    Deferred.join = function(promises) {
        var deferred = new Deferred();
        var count = promises.length;
        var results = [];
        for(var i = 0; i < count; i++) {
            (function(i) {
                promises[i].then(function(ret) {
                    results[i] = ret;
                    if (--count === 0) {
                        deferred.resolve(results);
                    }
                }, function(err) {
                    deferred.reject(err);
                });
            }(i));
        }
        return deferred;
    };
    
    Deferred.prototype = {
        status: 0,  // 0: undecided, 1: resolved, 2: rejected, 3: fired
        reject: function (err) {
            if (this.status === 0) {
                this.status = 2;
                this._err = err;
                this._fire();
            }
        },
        resolve: function (ret) {
            if (this.status === 0) {
                this.status = 1;
                this._ret = ret;
                this._fire();
            }
        },
        then: function (resolvedHandler, rejectedHandler) {
            if (this.status !== 3) {
                this._resolvedHandler = resolvedHandler || this._resolvedHandler;
                this._rejectedHandler = rejectedHandler || this._rejectedHandler;
                this._fire();
                this._deferred = new Deferred();
                return this._deferred;
            }
        },
        _fire: function() {
            if (this.status === 1 && this._resolvedHandler) {
                this.status = 3;
                var ret = this._resolvedHandler(this._ret);
                this._deferred.resolve(ret);
            } else if (this.status === 2 && this._rejectedHandler) {
                this.status = 3;
                var ret = this._rejectedHandler(this._err);
                this._deferred.resolve(ret);
            }
        }
    };
    
    function $worker(func, params, async) {
        var deferred = new Deferred();
        var w = new Worker(bbURL);
        w.postMessage({func: func.toString(), params: params, async: async});
        w.onmessage = function(e) {
            if (e.data.err) {
                deferred.reject(e.data.err);
            } else {
                deferred.resolve(e.data.ret);
            }
        };
        
        return deferred;
    }
    
    function $map(data, func, async) {
        var promises = data.map(function(d, i) {
            return $worker(func, [d, i], async);
        });
        
        return Deferred.join(promises);
    }
    
    global.$worker = $worker;
    global.$map = $map;
    
}(self));