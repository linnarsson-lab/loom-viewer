import { sparkline } from './sparkline';

function maxVal(arr) {
	let max = 0;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] > max) { max = arr[i]; }
	}
	return max;
}

function findConstr(indices) {
	let maxIdx = maxVal(indices);
	return maxIdx <= 0xFF ?
		Uint8Array :
		maxIdx <= 0xFFFF ?
			Uint16Array :
			maxIdx <= 0xFFFFFFFF ?
				Uint32Array :
				Float64Array;
}

function fitToSmallestIndex(indices){
	return findConstr(indices).from(indices);
}

export function groupedSparkline(indices, groupAttr) {
	let groupedIndices = [],
		labels = [],
		lengths = [],
		totalPoints = indices.length;
	// convert to smallest fitting TypedArray
	indices = fitToSmallestIndex(indices);

	if (!groupAttr) {
		groupedIndices = [indices];
		labels = [''];
		lengths = fitToSmallestIndex([indices.length]);
	} else {
		const {
			data,
			uniques,
			indexedVal,
		} = groupAttr;
		if (uniques.length === 0) {
			groupedIndices = [indices];
			labels = [''];
		} else {
			let other = [];
			let vals = {};
			let maxGroups = Math.min(uniques.length, 100);
			const sortedUniques = uniques
				.slice(0, maxGroups)
				.sort((a, b) => {
					return a.val < b.val ?
						-1 :
						a.val > b.val ?
							1 :
							0;
				});
			for (let i = 0; i < maxGroups; i++) {
				const v = sortedUniques[i].val;
				vals[v] = i;
				groupedIndices.push([]);
				labels.push(indexedVal ? indexedVal[v] : v);
			}

			for (let i = 0; i < indices.length; i++) {
				const idx = indices[i];
				let val = data[idx];
				let groupIdx = vals[val];
				if (groupIdx !== undefined) {
					groupedIndices[groupIdx].push(idx);
				} else {
					other.push(idx);
				}
			}
			if (other.length) {
				groupedIndices.push(other);
				labels.push('(other)');
			}
			// convert to typed array for faster lookup later
			for (let i = 0; i < groupedIndices.length; i++) {
				let indx = groupedIndices[i];
				lengths.push(indx.length);
				groupedIndices[i] = fitToSmallestIndex(indx);
			}
			lengths = fitToSmallestIndex(lengths);
		}
	}

	return (attr, mode, settings, label, labelGroups) => {
		let sparklines = [];
		for (let i = 0; i < groupedIndices.length; i++) {
			// only label leftmost sparkline
			let _label = (labelGroups && i) ?
				labels[i] :
				labelGroups ?
					label + '  ' + labels[i] :
					!i ?
						label :
						'';
			sparklines.push(
				sparkline(attr, groupedIndices[i], mode, settings, _label)
			);
		}
		return (context) => {

			const {
				width,
				height,
				pixelRatio,
			} = context;
			context.clearRect(0, 0, width, height);

			const gapWidth = Math.max(1, (2 * pixelRatio) | 0);
			const gaps = (sparklines.length - 2) * gapWidth | 0;
			const baseWidth = width - gaps | 0;
			const ratio = baseWidth / totalPoints;
			let slWidthSum = 0;
			let x = 0;
			for (let i = 0; i < sparklines.length; i++) {
				const sparklineWidth = lengths[i] * ratio | 0;
				x = (slWidthSum * ratio | 0) + gapWidth * i;
				context.translate(x, 0);
				context.width = sparklineWidth | 0;
				sparklines[i](context);
				context.translate(-x, 0);
				slWidthSum += lengths[i];
			}
			context.width = width;
		};
	};
}