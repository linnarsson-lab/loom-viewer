from typing import *
from mypy_extensions import NoReturn

import os
import sys

from functools import wraps, update_wrapper

from datetime import datetime, timedelta
import webbrowser
import subprocess
import logging
import signal
import time

import flask
from flask import request
from flask import make_response
from flask_compress import Compress
from werkzeug.routing import BaseConverter

from wsgiref.handlers import format_date_time

import socket

import gevent.monkey
import gevent.socket
import gevent.wsgi

from .loom_datasets import LoomDatasets


def cache(expires: int = None, round_to_minute: bool = False) -> Any:
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
	def cache_decorator(view: Any) -> Any:
		@wraps(view)
		def cache_func(*args: Any, **kwargs: Any) -> Any:
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


# Advanced routing for fetching multiple rows/columns at once
# creates list of integers based on a '+' separated string
class IntDictConverter(BaseConverter):

	def to_python(self, valueString: str) -> List[int]:
		return [int(v) for v in valueString.split('+')]

	def to_url(self, values: List[int]) -> str:
		base_to_url = super().to_url
		urlValues = [base_to_url(value) for value in values]
		return '+'.join(urlValues)


app.url_map.converters['intdict'] = IntDictConverter

# enable GZIP compression
compress = Compress()
app.config['COMPRESS_MIMETYPES'] = ['text/plain', 'text/html', 'text/css', 'text/xml', 'application/json', 'text/javascript']
app.config['COMPRESS_LEVEL'] = 2
compress.init_app(app)

#
# Static assets
#


@app.route('/static/js/<path:path>')
@cache(expires=604800)
def send_static_js(path: str) -> Any:
	return flask.send_from_directory('static/js/', path, mimetype='text/javascript')


@app.route('/static/style/<path:path>')
@cache(expires=604800)
def send_static_css(path: str) -> Any:
	return flask.send_from_directory('static/styles/', path, mimetype='text/css')


@app.route('/static/fonts/<path:path>')
@cache(expires=604800)
def send_static_fonts(path: str) -> Any:
	mimetype = 'application/font-woff'
	if path.endswith('.woff'):
		mimetype = 'application/font-woff'
	elif path.endswith('.woff2'):
		mimetype = 'application/font-woff2'
	elif path.endswith('.ttf'):
		mimetype = 'application/x-font-truetype'
	elif path.endswith('.otf'):
		mimetype = 'application/x-font-opentype'
	elif path.endswith('.eot'):
		mimetype = 'application/vnd.ms-fontobject'
	elif path.endswith('.svg'):
		mimetype = 'image/svg+xml'
	elif path.endswith('.sfnt'):
		mimetype = 'application/font-sfnt'

	return flask.send_from_directory('static/fonts/', path, mimetype=mimetype)


@app.route('/sw.js')
@cache(expires=None)
def send_service_worker() -> Any:
	return flask.send_file('static/sw.js', mimetype='text/javascript')


@app.route('/favicon.ico')
@cache(expires=604800)
def send_favicon() -> Any:
	return app.send_static_file('favicon.ico')


@app.route('/')
@app.route('/index.html')
@cache(expires=604800)
def send_indexjs() -> Any:
	return flask.send_file('static/index.html', mimetype='text/html')


# Catch-all for the react-router endpoints
@app.route('/dataset/')
@app.route('/dataset/<path:path>')
@cache(expires=None)
def catch_all(path: str) -> Any:
	return flask.send_file('static/index.html', mimetype='text/html')

#
# API endpoints
#


def get_auth(request: Any) -> Any:
	if request.authorization is not None:
		return (request.authorization.username, request.authorization.password)
	else:
		return (None, None)


# List of all datasets
@app.route('/loom', methods=['GET'])
@cache(expires=None)
def send_dataset_list() -> Any:
	(u, p) = get_auth(request)
	dataset_list = app.loom_datasets.JSON_metadata_list(u, p)
	return flask.Response(dataset_list, mimetype="application/json")


# Info for a single dataset
@app.route('/loom/<string:project>/<string:filename>', methods=['GET'])
@cache(expires=None)
def send_fileinfo(project: str, filename: str) -> Any:
	(u, p) = get_auth(request)
	if app.loom_datasets.authorize(project, u, p):
		attributes = app.loom_datasets.JSON_attributes(project, filename)
		if attributes is not None and attributes is not "":
			return flask.Response(attributes, mimetype="application/json")
	return "", 404


# Download a dataset to the client
@app.route('/clone/<string:project>/<string:filename>', methods=['GET'])
@cache(expires=None)
def get_clone(project: str, filename: str) -> Any:
	(u, p) = get_auth(request)
	if app.loom_datasets.authorize(project, u, p):
		file_path = app.loom_datasets.get_absolute_file_path(project, filename)
		return flask.send_file(file_path, mimetype='application/octet-stream')
	return "", 404


# Get one or more rows of data (i.e. all the expression values for a single gene)
@app.route('/loom/<string:project>/<string:filename>/row/<intdict:row_numbers>')
@cache(expires=None)
def send_row(project: str, filename: str, row_numbers: List[int]) -> Any:
	# path to desired rows
	(u, p) = get_auth(request)
	if app.loom_datasets.authorize(project, u, p):
		rows = app.loom_datasets.JSON_rows(row_numbers, project, filename)
		if rows is not None:
			return flask.Response(rows, mimetype="application/json")
	return flask.Response("[]", mimetype="application/json")


# Get one or more columns of data (i.e. all the expression values for a single cell)
@app.route('/loom/<string:project>/<string:filename>/col/<intdict:column_numbers>')
@cache(expires=None)
def send_col(project: str, filename: str, column_numbers: List[int]) -> Any:
	# path to desired cols
	(u, p) = get_auth(request)
	if app.loom_datasets.authorize(project, u, p):
		columns = app.loom_datasets.JSON_columns(column_numbers, project, filename)
		if columns is not None:
			return flask.Response(columns, mimetype="application/json")
	return flask.Response("[]", mimetype="application/json")


#
# Tiles
#


@app.route('/loom/<string:project>/<string:filename>/tiles/<int:z>/<int:x>_<int:y>.png')
@cache(expires=60 * 24 * 30)
def send_tile(project: str, filename: str, z: int, x: int, y: int) -> Any:
	(u, p) = get_auth(request)
	if app.loom_datasets.authorize(project, u, p):
		# path to desired tile
		file_path = app.loom_datasets.get_absolute_file_path(project, filename)
		# subfolder by zoom level to get more useful sorting order
		tile_path = '%s.tiles/z%02d/x%03d_y%03d.png' % (file_path, z, x, y)

		if os.path.isfile(tile_path):
			return flask.send_file(tile_path, mimetype='image/png')
	return "", 404


def signal_handler(signal: int, frame: object) -> NoReturn:
	print('\nShutting down.')
	sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)


def start_server(dataset_path: str=None, show_browser: bool=True, port: int=8003, debug: bool=True) -> Any:
	if debug:
		logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(module)s, %(lineno)d - %(message)s')
		app.config['DEBUG'] = True
	else:
		logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
		app.config['DEBUG'] = False

	app.loom_datasets = LoomDatasets(dataset_path)
	os.chdir(os.path.dirname(os.path.realpath(__file__)))

	if show_browser:
		url = "http://localhost:" + str(port)
		if sys.platform == "darwin":
			subprocess.Popen(['open', url])
		else:
			webbrowser.open(url)
	try:
		# app.run(threaded=True, debug=debug, host="0.0.0.0", port=port)
		# Monkey-patch if this has not happened yet
		if socket.socket is not gevent.socket.socket:
			gevent.monkey.patch_all()
		http_server = gevent.wsgi.WSGIServer(('', port), app)

		http_server.serve_forever()
	except socket.error as serr:
		if int(port) < 1024:
			print("You may need to invoke the server with sudo: sudo python loom_server.py ...")
		raise serr
