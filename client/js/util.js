// Crude normal curve approximation by taking the average of 8 random values
// random value between [-1, 1)
export function rndNorm() {
	return ((Math.random() + Math.random() + Math.random() + Math.random() +
		Math.random() + Math.random() + Math.random() + Math.random()) - 4) * 0.25;
}


// expects two number arrays of [xmin, ymin, xmax, ymax].
export function inBounds(r1, r2) {
	return (
		r1[0] < r2[2] && // r1.xmin < r2.xmax
		r2[2] < r1[2] && // r2.xmin < r1.xmax
		r1[1] < r2[3] && // r1.ymin < r2.ymax
		r2[1] < r1[3]    // r2.ymin < r1.ymax
	);
}

export function countElements(array) {
	// Copy and sort the array. Note that after sorting,
	// undefined values will be at the end of the array!
	const sorted = array.slice(0).sort();

	// linearly run through the array, track the
	// unique entries and count how often they show up
	let i = 0;
	let uniques = [];
	// Note that, since JS returns undefined for
	// out of bounds values, we get a "sentinel"
	// value for free at the end of the data.
	while (sorted[i] !== undefined) {
		const val = sorted[i];
		// advance until a different value is found
		let count = 0;
		while (sorted[i + count] === val) {
			count++;
		}
		uniques.push({ val, count });
		i += count;
	}
	return uniques;
}

export function nMostFrequent(array, n) {
	let uniques = countElements(array);

	// if present, remove empty string from the result
	for (let i = 0; i < uniques.length; i++) {
		if (uniques[i].val === '') {
			uniques[i] = uniques.pop();
			break;
		}
	}

	uniques.sort((a, b) => {
		return a.count < b.count ? 1 :
			a.count > b.count ? -1 :
				a.val < b.val ? -1 : 1; // on equal count, sort alphabetically
	});

	// if n is undefined or zero, return the whole array
	n = n ? Math.min(n, uniques.length) : uniques.length;
	let values = [], count = [];
	for (let i = 0; i < n; i++) {
		values.push(uniques[i].val);
		count.push(uniques[i].count);
	}
	return { values, count };

	// // Sten's functional, elegant but slower original:
	// // (also not sure if it handles undefined values)
	// let frequence = {};
	// array.forEach((value) => { frequency[value] = 0; });
	// const uniques = array.filter((value) => {
	// 	return ++frequency[value] === 1;
	// });
	// const result = uniques.sort((a, b) => {
	// 	return frequency[b] - frequency[a];
	// });
	// return result[0] === '' ? result.slice(1, n + 1) : result.slice(0, n);
}

export function calcMinMax(data) {
	let min = 0;
	let max = 0;
	if (typeof data[0] === 'number') {
		min = Number.MAX_VALUE;
		max = Number.MIN_VALUE;
		for (let i = 0; i < data.length; i++) {
			min = min < data[i] ? min : data[i];
			max = max > data[i] ? max : data[i];
		}
	}
	return { min, max };
}

//=== Helper functions for updating Redux state ===

// Assumptions: these functions are for merging states
// in Redux, which is usually overwriting part of the
// old state with a new state.
// Most of the time the new state will have overlapping
// keys, and its number of keys will be relatively small.
// Given two trees with N total keys, with M overlapping,
// M will be very small most of the time. Note that when
// not overlapping, mergeTwo just copies the old/new
// values, and does not have to go through the whole tree.
// So while worst case behaviour is O(N²), when all keys
// overlap, in practice this is very unlikely to happen.


// IMPORTANT: Note that this does NOT work like lodash
// merge in some very significant ways!
//
// Returns a new object with values from the two objects
// passed as arguments merged into one.
//
//   For duplicate keys, values that are objects are
// recursively merged.
//
//   For other values (including arrays!) the value from
// newObj is assigned to the  resulting object.
//
//   Arrays are copied by reference, mainly for performance
// reasons. This means we do not touch values inside arrays,
// and that you have to create copies of arrays retrieved
// from the store to avoid mutating them!
//
//   This also means that unlike lodash.merge, objects in
// arrays are not merged.
export function merge(oldObj, newObj) {
	if (!oldObj){
		return newObj;
	} else if (!newObj){
		return oldObj;
	}
	let untouchedKeys = Object.keys(oldObj);
	let newKeys = Object.keys(newObj);
	// we need to track which keys overlap,
	// because these values need to be merged too
	let overlappingKeys = [];
	for (let i = 0; i < untouchedKeys.length; i++) {
		let untouchedKey = untouchedKeys[i];
		for (let j = 0; j < newKeys.length; j++) {
			let newKey = newKeys[j];
			// if a key overlaps
			if (untouchedKey === newKey) {
				// .. it clearly isn't untouched, so it
				// is removed from the untouched keys.
				// Make sure we neither skip a key, nor
				// accidentally keep the last key when
				// we should not.
				untouchedKey = untouchedKeys.pop();
				if (i < untouchedKeys.length) {
					untouchedKeys[i] = untouchedKey;
					i--;
				}
				// We only need to merge the value if it is
				// an an object, otherwise we can use the value from
				// the new object (as if it is a new key/value pair).
				let val = newObj[newKey];
				if (typeof val === 'object' && !Array.isArray(val)) {
					overlappingKeys.push(newKey);
					newKey = newKeys.pop();
					if (j < newKeys.length) {
						newKeys[j] = newKey;
					}
				}
				break;
			}
		}
	}
	let mergedObj = {};
	// merge object values by recursion
	for (let i = 0; i < overlappingKeys.length; i++) {
		let key = overlappingKeys[i];
		mergedObj[key] = merge(oldObj[key], newObj[key]);
	}
	// add all values that don't need merging
	for (let i = 0; i < untouchedKeys.length; i++) {
		let key = untouchedKeys[i];
		mergedObj[key] = oldObj[key];
	}
	for (let i = 0; i < newKeys.length; i++) {
		let key = newKeys[i];
		mergedObj[key] = newObj[key];
	}
	return mergedObj;
}

// Like merge, but for deleting fields from trees
// Produces a NEW object with the leaves of
// delTree pruned out of it.
// - The first argument is the source state, assumed
//   to be an object structured like a tree (think of
//   organising state like the files/folder tree on a
//   hard drive).
// - The second argument is a tree where the values
//   are either subtrees (objects) or anything that's
//   not an object (actual value does not matter)
//   If subtree, recurse. If anything else, prune key
export function prune(sourceTree, delTree) {
	if (!sourceTree){
		return undefined;
	} else if (!delTree){
		return sourceTree;
	}
	let sourceKeys = Object.keys(sourceTree);
	let delKeys = Object.keys(delTree);
	let subKeys = [];
	for (let i = 0; i < delKeys.length; i++) {
		let delKey = delKeys[i];
		for (let j = 0; j < sourceKeys.length; j++) {
			let sourceKey = sourceKeys[j];
			if (sourceKey === delKey) {
				// "delete" by virtue of not copying
				sourceKey = sourceKeys.pop();
				if (j < sourceKeys.length) {
					sourceKeys[j] = sourceKey;
				}
				// check if we need to recurse
				let val = delTree[delKey];
				if (typeof val === 'object' && !Array.isArray(val)) {
					subKeys.push(delKey);
				}
				break;
			}
		}
	}

	let prunedObj = {};
	// copy all values that aren't pruned
	for (let i = 0; i < sourceKeys.length; i++) {
		let key = sourceKeys[i];
		prunedObj[key] = sourceTree[key];
	}
	// recurse on all subtrees
	for (let i = 0; i < subKeys.length; i++) {
		let key = subKeys[i];
		prunedObj[key] = prune(sourceTree[key], delTree[key]);
	}
	return prunedObj;
}
