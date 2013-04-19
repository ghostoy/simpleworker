# SimpleWorker

SimpleWorker is a multithread library based on HTML5 WebWorkers, ParallelArray and asm.js. You just write a function, and the library makes it run in another thread. The return value will be correctly passed back to browser thread, and asynchronized functions are also supported.

# Why WebWorker is better?

See [this test on jsperf.com](http://jsperf.com/webworker-vs-single-thread/7)

## Usage
### $worker (workerFunction, parameters, async)

```javascript
// sum up 1~100 within web worker
$worker(function(from, to) { // function to run on worker
  // your logic here
  var sum = 0;
  for(var i = from; i <= to; i++) {
	sum += i;
  }
  return sum;	// return value is passed to function below
}, [1, 100])
.then(function(result) {
  alert(result);	// result is identical to sum above
});

// Async calls within web worker
$worker(function(s) {
  // delayed s seconds
  setTimeout(function() {
    deferred.resolve('hello');	// "deferred" object is provided to aynchronized calls
  }, s * 1000);
}, [5], true)	// set the last parameter to true to identify the function as async
.then(function(greetings) {
  alert(greetings);  // greetings shows 5 seconds later
});
```

### $map (arrayData, workerFunction)
Utility function for map operations.
* `arrayData` (mixed) The data to be mapped with. Accepted types are: `Array`, `ArrayBufferView`, `ParallelArray`. Underlying speed up methods will be benifit from following specs:
 1. [ParallelArray](http://wiki.ecmascript.org/doku.php?id=strawman:data_parallelism)
 1. [asm.js](http://asmjs.org/)
* `workerFunction` (function) The map function (`workerFunction(data, index)`).

```javascript
$map([1, 2, 3, 4], function(data, index) {  // the data and index of each item in the arrayData are passed as parameters to workerFunction
  return data*data;  // return values are packed into a new array
}).then(function(results) {
  alert(results.join(','));  // 1, 4, 9, 16
});
```

# License
(BSD License)

Copyright (c) 2012, Cong Liu

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
