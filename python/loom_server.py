import flask
from flask import request
from flask import make_response
from flask_compress import Compress
from functools import wraps, update_wrapper
import os
import os.path
import sys
import StringIO
import json
from datetime import datetime
import loom
from loom_cache import LoomCache
import argparse
import errno
from socket import error as socket_error
import webbrowser
import subprocess
from multiprocessing import Process
import shutil
from urllib2 import urlopen # Python 2


parser = argparse.ArgumentParser(description='Launch the loom browser.')
def_dir = os.path.join(os.path.expanduser("~"),"loom-datasets")
parser.add_argument("--dataset-path", help="Full path to the datasets directory (default: %s)" % def_dir , default=def_dir)
parser.add_argument("-d", "--debug", action="store_true")
parser.add_argument("-p", "--port", help="Port to use for the server (default: 8003)", type=int, default=8003)
parser.add_argument("--no-browser", help="Do not launch a browser window", action="store_true")
args = parser.parse_args()

if not os.path.exists(args.dataset_path):
	print "Datasets directory '%s' not found, creating it." % args.dataset_path
	os.mkdir(args.dataset_path)

cache = LoomCache(args.dataset_path)


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
@app.route('/dataset/')
@app.route('/dataset/<path:path>')
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
@app.route('/loom/<string:project>/<string:filename>', methods=['GET'])
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

# Download a dataset to the client
@app.route('/clone/<string:project>/<string:filename>', methods=['GET'])
def get_clone(project, filename):
	(u,p) = get_auth(request)
	path = cache.get_absolute_path(project, filename, u, p)
	if path == None:
		return "", 404	
	return flask.send_file(path, mimetype='application/octet-stream')

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



	if not args.no_browser:
		url = "http://localhost:" + str(args.port)
		if sys.platform == "darwin":
			subprocess.Popen(['open', url])
		else:
			webbrowser.open(url)	
	try:
		app.run(debug=args.debug, host="0.0.0.0", port=args.port)
	except socket_error as serr:
		print serr
		if args.port < 1024:
			print "You may need to invoke the server with sudo: sudo python loom_server.py ..."
