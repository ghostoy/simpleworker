/**
 * SimpleWorker a multithreading library for JavaScript
 *
 * @author Cong Liu <cong.liux@gmail.com>
 **/
(function (global) {
    'use strict';

    var PA = global.ParallelArray;
    var Timer = global.setImmediate || function (f){ global.setTimeout(f,0);};
    
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
        var console = {\
            log: function () {\
                postMessage({log: Array.prototype.slice.call(arguments)});\
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
            deferred.reject(e.toString());\
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
                this._deferred = new Deferred();
                this._fire();
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
                this._deferred.reject(ret);
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
            } else if (e.data.ret) {
                deferred.resolve(e.data.ret);
            } else {
                console.log.apply(console, e.data.log);
            }
        };
        
        return deferred;
    }
    
    function $map(data, func) {
        if (PA && global.$disablePA) console.warn('ParallelArray is explicitly disabled by user. Set $disablePA to false to enable ParallelArray.');
        if (PA && !global.$disablePA) {
            var deferred = new Deferred();
            var pa = data instanceof PA ? data : new PA(data);
            var ret = pa.map(func).buffer;
            deferred.resolve(ret);
            return deferred;
        } else {
            var $maxWorkers = global.$maxWorkers > 1 ? global.$maxWorkers : 4;
            var length = data.length;
            var step = Math.ceil(length / $maxWorkers);
            var offset = 0;
            var promises = [];
            var funcString = func.toString();
            funcString = funcString.replace(/^function [^(]*/, 'function func');
            var type = Object.prototype.toString.call(data);
            type = type.substring(8, type.length - 1);
            if (type !== 'Array') { // for typed array use asm.js
				var Type = global[type];
				var BYTES_PER_ELEMENT = Type.BYTES_PER_ELEMENT;
                do {
                    var input = new Type(data.buffer, offset * BYTES_PER_ELEMENT, step);
                    var l = input.length;
                    var f = ['function (data) {',
                        'function asmModule(stdlib, foreign, heap) {',
                            '"use asm";',
                            'var input = new stdlib.' + type + '(heap);',
                            funcString,
                            'function map() {',
                                'var i = 0;',
                                'for(; (i|0) < ' + l + '; i = ((i|0) + 1)|0) {',
                                    'input[((i + ' + l + ')<<2) >> 2] = func(input[(i<<2)>>2]|0, ((i|0) + ' + offset + ')|0) | 0;',
                                '}',
                            '}',
                            'return {map: map};',
                        '}',
                        '',
                        'var half = ' + l * BYTES_PER_ELEMENT,
                        'var ab = new ArrayBuffer(1 << Math.ceil(Math.log(half * 2) / Math.log(2)));',
                        'var ta = new ' + type + '(ab, 0, ' + l + ');',
                        'ta.set(data);',
                        'asmModule(self, {}, ab).map();',
                        'var ret = new ' + type + '(ab, half, ' + l + ');',
                        'return ret;',
                    '}'].join('\n');
                    //console.log(f);
                    var promise = $worker(f, [input]);
                    promises.push(promise);
                    offset += step;
                } while (offset < length);
                return Deferred.join(promises).then(function(results) {
					var ta = new Type(length);
					for(var i = 0; i < results.length; i++) {
						var result = results[i];
						ta.set(result, step * i);
					}
					return ta;
                });
            } else {
                do {
                    var f = 'function (data) {' + funcString + '; return data.map(function (d, i) {return func(d, i + ' + offset + ')});}';
                    var promise = $worker(f, [data.slice(offset, offset + step)]);
                    promises.push(promise);
                    offset += step;
                } while (offset < length);
                return Deferred.join(promises).then(function(results) {
                    return results.reduce(function (a, b) {
                        return a.concat(b);
                    });
                });
            }
        }
    }
    
    global.$worker = $worker;
    global.$map = $map;
    
}(self));

