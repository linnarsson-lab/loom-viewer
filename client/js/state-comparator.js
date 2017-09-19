/*
It can get quite complicated to do deep comparison of state trees,
so inspired by the state-compressor encoder/decoder I wrote earlier,
I made a (much simpler) comparator generator.

It takes a schema and returns a compare function.

- for anything in the schema that is not an object or array,
	the returned comparator does a plain `===` comparison.
	Note that this lets you use strings to comments what kind of values you
	expect here.
- for an object in the schema, a comparator for all keys will be generated.
	The returned comparator will return true if all sub-comparators return true.
- for an array in the schema, a comparator for each passed value will be made
	The returned comparator will return true if all sub-comparators return true
	- for variable sized arrays with a fixed pattern, use vectorOf

Examples:

let a = { foo: 0, bar: 1, baz: [0, 1, { x: 0, y: 1 }] }
let b = { foo: 0, bar: 1, baz: [0, 1, { x: 0, y: 1 }] }

let compareSchema = {
	foo: 'nr',
	bar: 'nr',
	baz: ['nr', 'nr', { x: 'nr', y: 'nr' }],
};

let compareObject = createComparator(compareSchema);

a === b // false
compareObject(a, b); // true;

a = Uint8Array.from([0,1,2,3,4,5,6,7,8,9]);
b = Float64Array.from([0,1,2,3,4,5,6,7,8,9]);

compareArrays = createComparator(vectorOf(['nrs']))

a === b // false
compareArray(a, b) // true


// === Old:
shouldComponentUpdate(nextProps) {
	const { props } = this;

	const settings = props.dataset.viewState.col.scatterPlots.plotSettings[0];

	const nSettings = nextProps.dataset.viewState.col.scatterPlots.plotSettings[0];

	return nextProps.colAttr !== props.colAttr ||
		nextProps.colMode !== props.colMode ||
		nextProps.groupBy !== props.groupBy ||
		nextProps.dataset.col.filter !== props.dataset.col.filter ||
		nSettings.logScale !== settings.logScale ||
		nSettings.clip !== settings.clip ||
		nSettings.lowerBound !== settings.lowerBound ||
		nSettings.upperBound !== settings.upperBound ||
		nextProps.legendData !== props.legendData;

	//return compareState(this.props, nextProps);
}

// === New:
// less terse, and a bit more overhead, but a *lot*
// easier to follow and maintain.
const comparePlotSetting = createComparator({
	logScale: 'boolean',
	clip: 'boolean',
	lowerBound: 'number',
	upperBound: 'number',
});

// we only look at the first scatterPlot
const comparePlotSettings = (a, b) => {
	return comparePlotSetting(a[0], b[0]);
};

const compareProps = createComparator({
	colAttr: 'string',
	colMode: 'string',
	groupBy: 'boolean',
	legendData: 'object',
	// clip and log settings for heatmap
	// also affect the legend
	dataset: {
		viewState: {
			col: {
				filter: 'array',
				scatterPlots: {
					plotSettings: comparePlotSettings,
				},
			},
		},
	},
});

shouldComponentUpdate(nextProps) {
	return compareProps(this.props, nextProps);
}
*/

import { isArray } from '../js/util';

function baseCompare(a, b) {
	return a === b;
}

// Deep comparison of values in the array
// Arrays in the schema are assumed to be fixed size
// For variable sized arrays, use vectorOf()
function compareArray(patternArray) {
	let l = patternArray.length, i = l, compareArray = [];
	while (i--) {
		compareArray[i] = createComparator(patternArray[i]);
	}
	return (arr1, arr2) => {
		if (arr1 === arr2) {
			return true;
		} else if (!(isArray(arr1) && isArray(arr2) && arr1.length === l && arr2.length === l)) {
			return false;
		}
		let i = l;
		while (i--) {
			if (!compareArray[i](arr1[i], arr2[i])) {
				return false;
			}
		}
		return true;
	};
}

export function vectorOf(patternArray) {
	let l = patternArray.length, i = l, compareArray = [];
	while (i--) {
		compareArray[i] = createComparator(patternArray[i]);
	}
	return (arr1, arr2) => {
		if (arr1 === arr2) {
			return true;
		} else if (!(isArray(arr1) && isArray(arr2) && arr1.length === arr2.length)) {
			return false;
		}
		let i = arr1.length;
		while (i--) {
			if (!compareArray[i % l](arr1[i], arr2[i])) {
				return false;
			}
		}
		return true;
	};
}


function compareObj(schema) {
	let keys = Object.keys(schema);
	// sort keys to ensure consistent encoding/decoding
	keys.sort();

	// create a comparator for each key
	let subCompare = {},
		i = keys.length;
	while (i--) {
		let k = keys[i];
		subCompare[k] = createComparator(schema[k]);
	}

	let compare = (a, b) => {
		// if it's the same object, don't do deep comparison
		if (a === b) { return true; }
		// if a and b aren't both objects, return
		else if (!(typeof a === 'object' && typeof b === 'object')) {
			return false;
		}
		let i = keys.length;
		while (i--) {
			let k = keys[i];
			if (!subCompare[k](a[k], b[k])) {
				return false;
			}
		}
		return true;
	};
	return compare;
}

// make comparator for two object trees,
// checking for equivalence in passed schema
export function createComparator(schema) {
	if (schema) {
		switch (typeof schema) {
			case 'object':
				if (isArray(schema)) {
					return compareArray(schema);
				} else {
					return compareObj(schema);
				}
			case 'function':
				// assumed to be custom comparator
				return schema;
			default:
				// plain a === b comparator
				return baseCompare;
		}
	}
	return baseCompare;
}