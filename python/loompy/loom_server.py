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
from loom_cache import LoomCache
import argparse
import errno
from socket import error as socket_error
import webbrowser
import subprocess
import logging
import signal
import sys
import inspect

class LoomServer(flask.Flask):
	def __init__(self, name):
		super(LoomServer, self).__init__(name)
		self.cache = None

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
def send_indexjs():
	return app.send_static_file('index.html')

@app.route('/dataset/<path:path>')
def catch_all(path):
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
	result = json.dumps(app.cache.list_datasets(u,p))
	return flask.Response(result, mimetype="application/json")

# Info for a single dataset
@app.route('/loom/<string:project>/<string:filename>', methods=['GET'])
def send_fileinfo(project, filename):
	(u,p) = get_auth(request)
	ds = app.cache.connect_dataset_locally(project, filename, u, p)
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
	path = app.cache.get_absolute_path(project, filename, u, p)
	if path == None:
		return "", 404
	return flask.send_file(path, mimetype='application/octet-stream')

# Get one row of data (i.e. all the expression values for a single gene)
@app.route('/loom/<string:project>/<string:filename>/row/<int:row>')
def send_row(project, filename, row):
	(u,p) = get_auth(request)
	ds = app.cache.connect_dataset_locally(project, filename, u, p)
	if ds == None:
		return "", 404
	return flask.Response(json.dumps(ds[row,:].tolist()), mimetype="application/json")

# Get one column of data (i.e. all the expression values for a single cell)
@app.route('/loom/<string:project>/<string:filename>/col/<int:col>')
def send_col(project, filename, col):
	(u,p) = get_auth(request)
	ds = app.cache.connect_dataset_locally(project, filename, u, p)
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
	ds = app.cache.connect_dataset_locally(project, filename, u, p)
	if ds == None:
		return "", 404
	img = ds.dz_get_zoom_image(x,y,z)
	if img == None:
		return "", 404
	return serve_image(img)

def signal_handler(signal, frame):
	print('\nShutting down.')
	if app.cache != None:
		app.cache.close()
	sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def start_server(dataset_path, show_browser, port, debug):
	app.cache = LoomCache(dataset_path)
	os.chdir(os.path.dirname(os.path.realpath(__file__)))

	if show_browser:
		url = "http://localhost:" + str(port)
		if sys.platform == "darwin":
			subprocess.Popen(['open', url])
		else:
			webbrowser.open(url)
	try:
		app.run(debug=debug, host="0.0.0.0", port=port)
	except socket_error as serr:
		logging.error(serr)
		if port < 1024:
			print "You may need to invoke the server with sudo: sudo python loom_server.py ..."
