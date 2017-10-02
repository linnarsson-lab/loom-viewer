import { sparkline } from './sparkline';

export function groupedSparkline(indices, groupAttr) {
	indices = indices.slice(0);
	let groupedIndices = [],
		labels = [],
		totalPoints = indices.length;

	if (!groupAttr) {
		groupedIndices = [indices];
		labels = [''];
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
			let maxGroups = Math.min(uniques.length, 20);
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
		}
	}

	return (attr, mode, settings, label, labelGroups) => {
		let sparklines = [],
			lengths = [];
		for (let i = 0; i < groupedIndices.length; i++) {
			const indx = groupedIndices[i];
			// only label leftmost sparkline
			let _label = (labelGroups && i) ? labels[i] :
				labelGroups ? label + '   ' + labels[i] :
					!i ? label : '';
			sparklines.push(sparkline(attr, indx, mode, settings, _label));
			lengths.push(indx.length);
		}
		return (context) => {
			const {
				width,
				pixelRatio,
			} = context;
			const gapWidth = (4 * pixelRatio) | 0;
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