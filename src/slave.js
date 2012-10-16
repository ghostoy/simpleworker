(function() {
    
    
    onmessage = function(e) {
        var func = e.data.func;
        var params = e.data.params;
        var async = e.data.async;
    
        var deferred = {
            resolve: function(ret) {
                postMessage({ret: ret});
                close();
            }
        };
        
        var f = eval('(' + e.data + ')');
        var ret = f.apply(self, params);
        
        if (!async) {
            deferred.resolve(ret);
        }
    }
        
}());