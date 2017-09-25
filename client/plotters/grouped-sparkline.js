import { sparkline } from './sparkline';

export function groupedSparkline(indices, groupAttr) {
	indices = indices.slice(0);
	let groupedIndices = [], labels = [], totalPoints = indices.length;

	if (!groupAttr) {
		groupedIndices = [indices];
		labels = [''];
	} else {
		const { data, uniques, indexedVal } = groupAttr;
		if (uniques.length === 0) {
			groupedIndices = [indices];
			labels = [''];
		} else {
			let other = [];
			let vals = {};
			let maxGroups = Math.min(uniques.length, 20);
			for (let i = 0; i < maxGroups; i++) {
				const v = uniques[i].val;
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
		let sparklines = [], lengths = [];
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
			const { width, pixelRatio } = context;
			const gapWidth = (4 * pixelRatio) | 0;
			const gaps = (sparklines.length - 2) * gapWidth;
			const baseWidth = width - gaps;
			let x0 = 0;
			for (let i = 0; i < sparklines.length; i++) {
				const sparklineWidth = (lengths[i] * baseWidth / totalPoints) | 0;
				const xRounded = x0|0;
				context.translate(xRounded, 0);
				context.width = sparklineWidth;
				sparklines[i](context);
				context.translate(-xRounded, 0);
				x0 += sparklineWidth + gapWidth;
			}
			context.width = width;
		};
	};
}