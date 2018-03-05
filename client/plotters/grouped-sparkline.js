import { sparkline } from './sparkline';
import { Uint32Vector } from '../js/typed-vector';

export function groupedSparkline(indices, groupAttr) {
	// convert to TypedArray
	indices = Uint32Array.from(indices);

	let groupedIndices = [],
		// an array *of* Uint32Vector
		groupedIndicesVectorArray = [],
		labels = [],
		lengths = new Uint32Array(0),
		lengthsVector = new Uint32Vector(0),
		totalPoints = indices.length;

	// without an attribute to group, this is just a sparkline.
	if (!groupAttr) {
		groupedIndices = [indices];
		labels = [''];
		lengths = new Uint32Array(1);
		lengths[0] = indices.length;
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
			let other = new Uint32Vector(0),
				vals = {},
				maxGroups = Math.min(uniques.length, 100);
			const sortedUniques = uniques
				.slice(0, maxGroups)
				.sort(groupValComparator);

			for (let i = 0; i < maxGroups; i++) {
				const v = sortedUniques[i].val;
				vals[v] = i;
				groupedIndicesVectorArray.push(new Uint32Vector(0));
				labels.push(indexedVal ? indexedVal[v] : v);
			}

			for (let i = 0; i < indices.length; i++) {
				const idx = indices[i];
				let val = data[idx];
				let groupIdx = vals[val];
				if (groupIdx !== undefined) {
					groupedIndicesVectorArray[groupIdx].push(idx);
				} else {
					other.push(idx);
				}
			}
			if (other.length) {
				groupedIndicesVectorArray.push(other);
				labels.push('(other)');
			}
			// convert to typed array for faster lookup later
			for (let i = 0; i < groupedIndicesVectorArray.length; i++) {
				let indx = groupedIndicesVectorArray[i];
				lengthsVector.push(indx.length);
				groupedIndices[i] = indx.toTypedArray();
			}
			lengths = lengthsVector.toTypedArray();
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

function groupValComparator(a, b) {
	return a.val < b.val ?
		-1 :
		a.val > b.val ?
			1 :
			0;
}