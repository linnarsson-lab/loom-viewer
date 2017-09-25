const { log, LOG2E, log2 } = Math;
if (typeof log2 !== 'function') {
	Math.log2 = function (x) {
		return log(x) * LOG2E;
	};
}