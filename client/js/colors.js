// Category colors from D3 (https://github.com/mbostock/d3/wiki/Ordinal-Scales)
export const category20 = [
	'#ffffff',	// White for zeros
	'#1f77b4',
	'#ff7f0e',
	'#2ca02c',
	'#d62728',
	'#9467bd',
	'#8c564b',
	'#e377c2',
	'#7f7f7f',
	'#bcbd22',
	'#17becf',
	'#9edae5',
	'#aec7e8',
	'#ffbb78',
	'#98df8a',
	'#ff9896',
	'#c5b0d5',
	'#c49c94',
	'#f7b6d2',
	'#c7c7c7',
	'#dbdb8d',
];

// Continuous color from color brewer (http://colorbrewer2.org)
export const solar9 = [
	'#ffffff',	// White for zeros
	'#ffffcc',
	'#ffeda0',
	'#fed976',
	'#feb24c',
	'#fd8d3c',
	'#fc4e2a',
	'#e31a1c',
	'#bd0026',
	'#800026',
];

// solar9 interpolated to 256 points with
// http://gka.github.io/palettes/
// Beyond 256, fine colour differences become
// indistinguishable on most screens, and
// even then only when sorted as a gradient.
// So this is already slight overkill.
export const solar256 = [
	'#ffffff',
	'#ffffcc', '#fffeca', '#fffdc8', '#fffcc6', '#fffcc4', '#fffac1', '#fffabf', '#fff9bc', '#fff8ba', '#fff6b7', '#fff5b5', '#fff4b2', '#fff3b0', '#fff3ae', '#fff1ab', '#fff0a9', '#ffefa6', '#ffefa4', '#ffeea1', '#ffed9f', '#ffeb9d', '#ffeb9b', '#ffe999', '#ffe997', '#ffe795', '#ffe692', '#ffe590', '#ffe48e', '#ffe38c', '#ffe38a', '#ffe288', '#ffe086', '#ffdf84', '#ffde82', '#fedd80', '#fedd7d', '#fedb7b', '#feda79', '#fed977', '#fed975', '#fed773', '#fed672', '#fed571', '#fed370', '#fed26f', '#fed16e', '#fed06d', '#ffce6b', '#ffce6a', '#ffcd69', '#ffcc67', '#ffca66', '#ffc965', '#ffc964', '#ffc763', '#ffc561', '#ffc560', '#ffc45f', '#ffc35e', '#ffc15d', '#ffc05c', '#ffbf5a', '#ffbe58', '#ffbd58', '#febc56', '#feba55', '#feba54', '#feb953', '#feb852', '#feb751', '#feb54f', '#feb34e', '#feb34d', '#feb14c', '#feb04b', '#feaf4b', '#feae4a', '#fead4a', '#feac49', '#feab49', '#fea848', '#fea847', '#fea747', '#fea546', '#fea446', '#fea245', '#fea145', '#fea044', '#fe9f43', '#fe9d43', '#fe9d42', '#fe9c42', '#fe9a41', '#fe9941', '#fe9740', '#fd9740', '#fd963f', '#fd943f', '#fd933e', '#fd913e', '#fd8f3d', '#fd8f3d', '#fd8d3c', '#fd8b3b', '#fd8b3b', '#fd8a3b', '#fd883a', '#fd863a', '#fd8539', '#fd8339', '#fd8238', '#fd8038', '#fd7f37', '#fd7e37', '#fd7d36', '#fd7b36', '#fd7935', '#fd7835', '#fd7735', '#fd7534', '#fd7334', '#fd7233', '#fd7033', '#fd6e32', '#fd6e32', '#fd6c31', '#fd6931', '#fd6830', '#fd6630', '#fd652f', '#fd642f', '#fd622f', '#fd602e', '#fd5d2e', '#fd5d2d', '#fd5b2d', '#fc592d', '#fc582c', '#fc552c', '#fc542b', '#fc522b', '#fc4f2a', '#fc4d2a', '#fb4d29', '#fa4b29', '#fa4a29', '#f94928', '#f84828', '#f74627', '#f74527', '#f64427', '#f54326', '#f54126', '#f44125', '#f33f25', '#f23e25', '#f23c24', '#f13b24', '#f13a23', '#f03823', '#ef3722', '#ee3622', '#ed3422', '#ed3221', '#ec3021', '#eb3020', '#eb2e20', '#ea2c20', '#e92b1f', '#e9291f', '#e7271e', '#e7241e', '#e6241e', '#e6221d', '#e51f1d', '#e41d1d', '#e31b1c', '#e21a1c', '#e0191d', '#e0181d', '#de171e', '#de171e', '#dc161e', '#db151f', '#d9151f', '#d8141f', '#d81320', '#d51220', '#d41120', '#d41121', '#d21021', '#d10f21', '#d00e22', '#cf0d22', '#cd0c22', '#cc0c23', '#cb0a23', '#ca0923', '#c90923', '#c70824', '#c60724', '#c50524', '#c40525', '#c30425', '#c10325', '#c00225', '#be0126', '#bd0026', '#bd0026', '#bc0026', '#b90026', '#b80026', '#b80026', '#b50026', '#b50026', '#b30026', '#b10026', '#b10026', '#af0026', '#ae0026', '#ac0026', '#ac0026', '#aa0026', '#a80026', '#a70026', '#a60026', '#a40026', '#a30026', '#a30026', '#a10026', '#a00026', '#9e0026', '#9e0026', '#9b0026', '#9a0026', '#990026', '#980026', '#970026', '#960026', '#940026', '#930026', '#910026', '#910026', '#900026', '#8e0026', '#8c0026', '#8b0026', '#8a0026', '#890026', '#880026', '#870026', '#850026', '#840026', '#820026', '#810026', '#800026'
];

export const YlGnBu9 = [
	'#ffffff',
	'#ffffd9', '#c6e8b4', '#84cfbb',
	'#3eb2c4', '#1d90c0', '#236fb0',
	'#254ea1', '#202f88', '#081d58',
];

export const YlGnBu256 = [
	'#ffffff',
	'#ffffd9', '#fefed8', '#fbfdd7', '#fafdd5', '#f8fcd5', '#f6fcd3', '#f4fbd2', '#f2fad1', '#f1fad0', '#eff9ce', '#edf8cd', '#ebf7cc', '#eaf6cb', '#e7f5c9', '#e6f5c8', '#e5f4c8', '#e2f4c6', '#e0f3c5', '#dff2c4', '#ddf2c3', '#dbf0c1', '#d9f0c0', '#d8efc0', '#d6eebe', '#d4edbd', '#d2edbc', '#d1ecbb', '#cfebb9', '#ccebb8', '#cbeab7', '#caeab6', '#c7e9b5', '#c5e8b4', '#c4e7b4', '#c2e6b4', '#c0e5b5', '#bee5b5', '#bbe4b5', '#bae3b5', '#b8e2b6', '#b6e2b6', '#b4e0b6', '#b1dfb7', '#b0dfb7', '#aedeb7', '#acddb7', '#a9dcb7', '#a7dcb8', '#a5dbb8', '#a4dbb8', '#a2dab8', '#9fd8b8', '#9cd8b9', '#9bd7b9', '#9ad7b9', '#97d6b9', '#94d5ba', '#91d4ba', '#90d3ba', '#8ed3ba', '#8bd2ba', '#88d0bb', '#85cfbb', '#84cfbb', '#83cfbb', '#81cebb', '#7fcdbc', '#7dcbbc', '#7ccabc', '#7ac9bd', '#78c8bd', '#76c8bd', '#74c6be', '#72c5be', '#71c5be', '#6fc5be', '#6dc4bf', '#6bc3bf', '#69c2bf', '#67c0c0', '#64bfc0', '#62bec0', '#60bdc1', '#5dbdc1', '#5cbcc1', '#5abbc1', '#58bac2', '#55bac2', '#53b8c2', '#50b7c2', '#4db6c3', '#4ab5c3', '#47b5c3', '#44b4c3', '#41b3c4', '#40b2c4', '#3eb2c4', '#3db0c4', '#3cafc4', '#3badc4', '#3aadc3', '#39abc3', '#39aac3', '#38a9c3', '#37a9c3', '#36a7c3', '#36a7c3', '#35a6c3', '#34a5c3', '#33a3c2', '#32a2c2', '#31a2c2', '#30a0c2', '#2fa0c2', '#2f9fc2', '#2e9ec2', '#2d9cc2', '#2c9cc1', '#2a9bc1', '#2999c1', '#2898c1', '#2798c1', '#2697c1', '#2595c1', '#2394c1', '#2294c0', '#2193c0', '#1f92c0', '#1e90c0', '#1d8fc0', '#1e8ebf', '#1e8dbe', '#1f8bbe', '#1f8bbd', '#1f8abd', '#2089bc', '#2088bc', '#2086bb', '#2086bb', '#2184ba', '#2184ba', '#2183ba', '#2181b9', '#2180b9', '#2280b8', '#227eb8', '#227db7', '#227cb7', '#227bb6', '#227bb6', '#2379b5', '#2378b5', '#2377b4', '#2376b3', '#2374b3', '#2374b2', '#2373b2', '#2371b1', '#2371b1', '#2370b0', '#236fb0', '#236eaf', '#246caf', '#246cae', '#246aae', '#246aae', '#2469ad', '#2568ad', '#2567ac', '#2565ac', '#2565ab', '#2563ab', '#2563aa', '#2561aa', '#2561a9', '#255fa9', '#265ea8', '#265da8', '#265ba7', '#265ba7', '#2659a6', '#2659a6', '#2658a5', '#2656a5', '#2655a4', '#2555a4', '#2554a4', '#2552a3', '#2551a3', '#2550a2', '#254fa2', '#254ea1', '#254ea1', '#254ca0', '#254b9f', '#254b9e', '#25499d', '#25489d', '#24489c', '#24479b', '#24469a', '#244499', '#244398', '#244398', '#244197', '#244096', '#234096', '#233f94', '#233e94', '#233d93', '#233c93', '#233b92', '#233a91', '#223a90', '#223890', '#22378f', '#22378e', '#22358d', '#21348c', '#21348c', '#21338b', '#21318a', '#203089', '#203088', '#1f2e87', '#1f2e85', '#1e2d84', '#1d2d83', '#1d2d81', '#1c2c7f', '#1b2b7f', '#1a2b7c', '#1a2a7b', '#192979', '#182977', '#182876', '#162874', '#162773', '#152771', '#142670', '#14266f', '#13256d', '#12246c', '#11246a', '#112368', '#102367', '#0f2266', '#0e2164', '#0e2162', '#0d2061', '#0c1f5f', '#0b1f5f', '#0a1e5c', '#0a1e5b', '#091e59', '#081d58',
];