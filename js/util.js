

export function nMostFrequent(array, n) {
	var frequency = {};
	array.forEach((value)=>{frequency[value]=0;});
	var uniques = array.filter((value)=>{return ++frequency[value] == 1;});
	return uniques.sort((a,b)=>{
		return frequency[b] - frequency[a];
	}).slice(0,n);
}