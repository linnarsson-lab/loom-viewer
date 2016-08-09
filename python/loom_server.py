import flask
from flask import request
from flask import make_response
from flask.ext.compress import Compress
from functools import wraps, update_wrapper
import os
import os.path
import sys
import StringIO
import json
from datetime import datetime
import loom
import loom_cache

DEBUG = False
if len(sys.argv) > 2:
	if sys.argv[2] == "debug":
		DEBUG = True
	else:
		print "Invalid flag: " + sys.argv[2]
		print "(only valid flag is 'debug')"
		sys.exit(1)

if len(sys.argv) < 2:
	print "Usage: python loom_server.py <dataset-path> [debug]"
	sys.exit(1)

if not os.path.exists(sys.argv[1]):
	print "Invalid required argument (datasets directory '%s' doesn't exist')" % sys.argv[1]
	sys.exit(1)



cache = loom_cloud.LoomCache(sys.argv[1])


class LoomServer(flask.Flask):
	pass
	
app = LoomServer(__name__)

# enable GZIP compression
compress = Compress()
compress.init_app(app)

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

#
# Catch-all for the react-router endpoints
#

@app.route('/')
@app.route('/datasets/')
@app.route('/datasets/<path:path>')
@app.route('/view/')
@app.route('/view/<path:path>')
def send_indexjs():
	return app.send_static_file('index.html')


#
# API endpoints
#

def get_auth(request):
	if request.authorization != None:
		return (request.authorization.username, request.authorization.password)
	else:
		return (None, None)

# List of all datasets
@app.route('/loom', methods=['GET'])
def send_dataset_list():
	(u,p) = get_auth(request)
	result = json.dumps(cache.list_datasets(u,p))
	return flask.Response(result, mimetype="application/json")

# Info for a single dataset
@app.route('/loom/<string:project>/<string:filename>')
def send_fileinfo(project, filename):
	(u,p) = get_auth(request)
	ds = cache.connect_dataset_locally(project, filename, u, p)
	if ds == None:
		return "", 404
	dims = ds.dz_dimensions()
	fileinfo = {
		"project": project,
		"dataset": filename,
		"filename": filename,
		"shape": ds.shape,
		"zoomRange": ds.dz_zoom_range(),
		"fullZoomHeight": dims[1],
		"fullZoomWidth": dims[0],
		"rowAttrs": dict([(name, vals.tolist()) for (name,vals) in ds.row_attrs.iteritems()]),
		"colAttrs": dict([(name, vals.tolist()) for (name,vals) in ds.col_attrs.iteritems()])
	}
	return flask.Response(json.dumps(fileinfo), mimetype="application/json")


# Get one row of data (i.e. all the expression values for a single gene)
@app.route('/loom/<string:project>/<string:filename>/row/<int:row>')
def send_row(project, filename, row):
	(u,p) = get_auth(request)
	ds = cache.connect_dataset_locally(project, filename, u, p)
	if ds == None:
		return "", 404
	return flask.Response(json.dumps(ds[row,:].tolist()), mimetype="application/json")

# Get one column of data (i.e. all the expression values for a single cell)
@app.route('/loom/<string:project>/<string:filename>/col/<int:col>')
def send_col(project, filename, col):
	(u,p) = get_auth(request)
	ds = cache.connect_dataset_locally(project, filename, u, p)
	if ds == None:
		return "", 404
	return flask.Response(json.dumps(ds[:,col].tolist()), mimetype="application/json")


#
# Tiles
#

def serve_image(img):
	img_io = StringIO.StringIO()
	img.save(img_io, 'PNG')
	img_io.seek(0)
	return flask.send_file(img_io, mimetype='image/png')

@app.route('/loom/<string:project>/<string:filename>/tiles/<int:z>/<int:x>_<int:y>.png')
def send_tile(project, filename, z,x,y):
	(u,p) = get_auth(request)
	ds = cache.connect_dataset_locally(project, filename, u, p)
	if ds == None:
		return "", 404
	img = ds.dz_get_zoom_image(x,y,z)
	return serve_image(img)

if __name__ == '__main__':
	app.run(debug=DEBUG, host="0.0.0.0", port=80)


