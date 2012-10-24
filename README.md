# SimpleWorker

Usage
```javascript
$worker(function(from, to) { // function to run on worker
  // your logic here
  var sum = 0;
  for(var i = from; i <= to; i++) {
	sum += i;
  }
  return sum;	// return value is passed to the 3rd callback function
}, [1, 100], function(result) {
  alert(result);	// result is identical to sum above
});
```
