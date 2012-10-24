# SimpleWorker

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

### $map (arrayData, workerFunction, async)

```javascript
$map([1, 2, 3, 4], function(data, index) {  // the data and index of each item in the arrayData are passed as parameters to workerFunction
  return data*data;  // return values are packed into a new array
}).then(function(results) {
  alert(results.join(','));  // 1, 4, 9, 16
});
```