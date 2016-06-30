import flask
from flask import request
import os
import os.path
import loom
import loom_cloud
from loom_pipeline import LoomPipeline
import sys
import StringIO
import json
import numpy as np
from flask import make_response
from functools import wraps, update_wrapper
from datetime import datetime
from pandas import DataFrame
import subprocess
import logging

logger = logging.getLogger("loom")

DEBUG = False
if len(sys.argv) > 1:
	if sys.argv[1] == "debug":
		DEBUG = True
	else:
		print "Invalid flag: " + sys.argv[1]
		print "(only valid flag is 'debug')"
		sys.exit(1)

#os.chdir(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
#print "\nServing from: " + os.getcwd()
#os.chdir(os.path.dirname(os.path.realpath(__file__)))
logger.info("Serving from: " + os.getcwd())

pipeline = LoomPipeline()
cache = loom_cloud.LoomCache()

# And start the loom cache refresher in the background
if not DEBUG:
	subprocess.Popen(["python","python/loom_cloud.py"])


class LoomServer(flask.Flask):
	# Disable cacheing
    def get_send_file_max_age(self, name):
        return 0

app = LoomServer(__name__)

#
# Static assets
#

@app.route('/js/<path:path>')
def send_js(path):
	return flask.send_from_directory('/js', path)

@app.route('/css/<path:path>')
def send_css(path):
	return flask.send_from_directory('/css', path)

@app.route('/img/<path:path>')
def send_img(path):
	return flask.send_from_directory('/img', path)

@app.route('/')
def send_indexjs():
	return app.send_static_file('index.html')

#
# Loom datasets
#

# List of all datasets
@app.route('/loom')
def send_dataset_list():
	result = json.dumps([x.as_dict() for x in loom_cloud.list_datasets()])
	return flask.Response(result, mimetype="application/json")

# List of valid transcriptomes
@app.route('/loom/transcriptomes')
def send_transcriptome_list():
	result = json.dumps(pipeline.list_transcriptomes())
	return flask.Response(result, mimetype="application/json")


# Info for a single dataset
@app.route('/loom/<string:transcriptome>__<string:project>__<string:dataset>/fileinfo.json')
def send_fileinfo(transcriptome, project, dataset):
	ds = cache.connect_dataset_locally(transcriptome, project, dataset)
	if ds == None:
		return "", 404
	dims = ds.dz_dimensions()
	fileinfo = {
		"transcriptome": transcriptome,
		"project": project,
		"dataset": dataset,
		"shape": ds.shape,
		"zoomRange": ds.dz_zoom_range(),
		"fullZoomHeight": dims[1],
		"fullZoomWidth": dims[0],
		"rowAttrs": dict([(name, vals.tolist()) for (name,vals) in ds.row_attrs.iteritems()]),
		"colAttrs": dict([(name, vals.tolist()) for (name,vals) in ds.col_attrs.iteritems()])
	}
	return flask.Response(json.dumps(fileinfo), mimetype="application/json")


# Get one row of data (i.e. all the expression values for a single gene)
@app.route('/loom/<string:transcriptome>__<string:project>__<string:dataset>/row/<int:row>')
def send_row(transcriptome, project, dataset, row):
	ds = cache.connect_dataset_locally(transcriptome, project, dataset)
	return flask.Response(json.dumps(ds.file['/matrix'][row,:].tolist()), mimetype="application/json")

# Get one column of data (i.e. all the expression values for a single cell)
@app.route('/loom/<string:transcriptome>__<string:project>__<string:dataset>/col/<int:col>')
def send_col(transcriptome, project, dataset, col):
	ds = cache.connect_dataset_locally(transcriptome, project, dataset)
	return flask.Response(json.dumps(ds.file['/matrix'][:,col].tolist()), mimetype="application/json")

#
# Upload dataset for loom file generation
#
def csv_to_dict(s):
	stringFile = StringIO.StringIO(s)
	data = DataFrame.from_csv(stringFile, sep=",", parse_dates=False, index_col=None)
	dataDict = data.to_dict(orient="list")
	return {key: np.array(dataDict[key]) for key in dataDict}

# curl -X PUT -F "config=@./hg19_sUCSC__midbrain__human_20160505.json" -F "col_attrs=@/Users/Sten/tmp/midbrain__human_20160505.csv" http://loom.linnarssonlab.org/hg19_sUCSC__midbrain__human_20160505

@app.route('/loom/<string:transcriptome>__<string:project>__<string:dataset>', methods=['PUT'])
def upload_dataset(transcriptome, project, dataset):
	col_attrs = csv_to_dict(request.form["col_attrs"])
	if not col_attrs.has_key("CellID"):
		return "CellID attribute is missing", 400
	if request.form.has_key("row_attrs"):
		row_attrs = csv_to_dict(request.form["row_attrs"])
		if not row_attrs.has_key("TranscriptID"):
			return "TranscriptID attribute is missing", 400
	else:
		row_attrs = None
	configJSON = json.loads(request.form["config"])
	dsc = loom_cloud.DatasetConfig(transcriptome, project, dataset,
		status = "willcreate",
		message = "Waiting for dataset to be generated.",
		n_features = configJSON["n_features"],
		cluster_method = configJSON["cluster_method"],
		regression_label = configJSON["regression_label"])
	pipeline.upload(dsc, col_attrs, row_attrs)
	return "", 200

@app.route('/loom/upload', methods=['POST'])
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

#
# Tiles
#

def serve_image(img):
	img_io = StringIO.StringIO()
	img.save(img_io, 'PNG')
	img_io.seek(0)
	return flask.send_file(img_io, mimetype='image/png')

@app.route('/loom/<string:transcriptome>__<string:project>__<string:dataset>/tiles/<int:z>/<int:x>_<int:y>.png')
def send_tile(transcriptome, project, dataset, z,x,y):
	ds = cache.connect_dataset_locally(transcriptome, project, dataset)
	img = ds.dz_get_zoom_image(x,y,z)
	return serve_image(img)

if __name__ == '__main__':
	app.run(debug=DEBUG, host="0.0.0.0", port=80)


