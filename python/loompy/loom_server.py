import flask
from flask import request
from flask import make_response
from flask_compress import Compress
from werkzeug.utils import secure_filename
from functools import wraps, update_wrapper
import os
import os.path
import sys
import StringIO
import json
from datetime import datetime, timedelta
from loom_cache import LoomCache
import argparse
import errno
from socket import error as socket_error
import webbrowser
import subprocess
import logging
import signal
import inspect
import time
from wsgiref.handlers import format_date_time


def cache(expires=None, round_to_minute=False):
    """
    Add Flask cache response headers based on expires in seconds.
    
    If expires is None, caching will be disabled.
    Otherwise, caching headers are set to expire in now + expires seconds
    If round_to_minute is True, then it will always expire at the start of a minute (seconds = 0)
    
    Example usage:
    
    @app.route('/map')
    @cache(expires=60)
    def index():
      return render_template('index.html')
    
    """
    def cache_decorator(view):
        @wraps(view)
        def cache_func(*args, **kwargs):
            now = datetime.now()
 
            response = make_response(view(*args, **kwargs))
            response.headers['Last-Modified'] = format_date_time(time.mktime(now.timetuple()))
            
            if expires is None:
                response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
                response.headers['Expires'] = '-1'
            else:
                expires_time = now + timedelta(seconds=expires)

                if round_to_minute:
                    expires_time = expires_time.replace(second=0, microsecond=0)

                response.headers['Cache-Control'] = 'public'
                response.headers['Expires'] = format_date_time(time.mktime(expires_time.timetuple()))
 
            return response
        return cache_func
    return cache_decorator



app = flask.Flask(__name__)
app.cache = None

# enable GZIP compression
compress = Compress()
compress.init_app(app)

#
# Static assets
#

@app.route('/js/<path:path>')
@cache(expires=None)
def send_js(path):
	return flask.send_from_directory('/js', path)

@app.route('/css/<path:path>')
@cache(expires=None)
def send_css(path):
	return flask.send_from_directory('/css', path)

@app.route('/img/<path:path>')
@cache(expires=None)
def send_img(path):
	return flask.send_from_directory('/img', path)

#
# Catch-all for the react-router endpoints
#

@app.route('/')
@app.route('/dataset/')
@cache(expires=None)
def send_indexjs():
	return app.send_static_file('index.html')

@app.route('/dataset/<path:path>')
@cache(expires=None)
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
@cache(expires=None)
def send_dataset_list():
	(u,p) = get_auth(request)
	result = json.dumps(app.cache.list_datasets(u,p))
	return flask.Response(result, mimetype="application/json")

# Info for a single dataset
@app.route('/loom/<string:project>/<string:filename>', methods=['GET'])
@cache(expires=None)
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
		"colAttrs": dict([(name, vals.tolist()) for (name,vals) in ds.col_attrs.iteritems()]),
		"schema": {
			"matrix": ds.schema["matrix"],
			"rowAttrs": ds.schema["row_attrs"],
			"colAttrs": ds.schema["col_attrs"]
		}
	}
	return flask.Response(json.dumps(fileinfo), mimetype="application/json")

# Upload a dataset
# curl "http://127.0.0.1:8003/loom/Published/cortex2.loom" --upload-file ~/loom-datasets/Published/cortex.loom
@app.route('/loom/<string:project>/<string:filename>', methods=['PUT'])
@cache(expires=None)
def upload_file(project, filename):
	(u,p) = get_auth(request)
	filename = secure_filename(filename)

	if not app.cache.authorize(project, u, p, mode="write"):
		return "Not authorized", 403

	if not filename.endswith(".loom"):
		return "Filename must have .loom extension", 400

	path = app.cache.get_absolute_path(project, filename, u, p, check_exists=True)
	if path != None:
		# File exists, so we delete it
		os.remove(path)
	path = app.cache.get_absolute_path(project, filename, u, p, check_exists=False)

	data = request.get_data()
	with open(path, 'wb') as f:
		f.write(data)

	return "",201

# Download a dataset to the client
@app.route('/clone/<string:project>/<string:filename>', methods=['GET'])
@cache(expires=None)
def get_clone(project, filename):
	(u,p) = get_auth(request)
	path = app.cache.get_absolute_path(project, filename, u, p)
	if path == None:
		return "", 404

	return flask.send_file(path, mimetype='application/octet-stream')

# Get one row of data (i.e. all the expression values for a single gene)
@app.route('/loom/<string:project>/<string:filename>/row/<int:row>')
@cache(expires=None)
def send_row(project, filename, row):
	(u,p) = get_auth(request)
	ds = app.cache.connect_dataset_locally(project, filename, u, p)
	if ds == None:
		return "", 404
	return flask.Response(json.dumps(ds[row,:].tolist()), mimetype="application/json")

# Get one column of data (i.e. all the expression values for a single cell)
@app.route('/loom/<string:project>/<string:filename>/col/<int:col>')
@cache(expires=None)
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
@cache(expires=60*20)
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
