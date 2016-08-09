#
# Upload dataset for loom file generation
#
def csv_to_dict(s):
	stringFile = StringIO.StringIO(s)
	data = DataFrame.from_csv(stringFile, sep=",", parse_dates=False, index_col=None)
	dataDict = data.to_dict(orient="list")
	return {key: np.array(dataDict[key]) for key in dataDict}

@app.route('/loom/upload', methods=['POST'])
@app.route('/loom', methods=['POST'])
def upload_dataset2():
	col_attrs = csv_to_dict(request.form["col_attrs"])
	if not col_attrs.has_key("CellID"):
		return "CellID attribute is missing", 400

	row_attrs = csv_to_dict(request.form["row_attrs"])
	if not row_attrs.has_key("TranscriptID"):
		return "TranscriptID attribute is missing", 400

	configJSON = json.loads(request.form["config"])
	dsc = loom_cloud.DatasetConfig(configJSON["transcriptome"], configJSON["project"], configJSON["dataset"],
		status = "willcreate",
		message = "Waiting for dataset to be generated.",
		n_features = configJSON["n_features"],
		cluster_method = configJSON["cluster_method"],
		regression_label = configJSON["regression_label"])
	pipeline.upload(dsc, col_attrs, row_attrs)
	return "", 200
