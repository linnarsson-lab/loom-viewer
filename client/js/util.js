export function nMostFrequent(array, n) {
	var frequency = {};
	array.forEach((value)=>{frequency[value]=0;});
	var uniques = array.filter((value)=>{return ++frequency[value] == 1;});
	var result = uniques.sort((a,b)=>{
		return frequency[b] - frequency[a];
	});
	if(result[0] == "") {
		return result.slice(1,n+1);
	}
	return result.slice(0,n);
}