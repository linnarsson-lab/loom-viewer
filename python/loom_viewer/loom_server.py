import flask
from flask import request
from flask import make_response
from flask_compress import Compress
from werkzeug.utils import secure_filename
from werkzeug.routing import BaseConverter
from functools import wraps, update_wrapper
import os
import os.path
import sys
from io import BytesIO

import numpy as np
from operator import itemgetter

from datetime import datetime, timedelta
import argparse
import errno
from socket import error as socket_error
import webbrowser
import subprocess
import logging
import signal
import inspect
import time
from loom_viewer import LoomCache, LoomTiles
from wsgiref.handlers import format_date_time

import gzip
import json


# ===================
# JSON Utils
# ===================

def np_to_list(vals):
	"""
	Convert a numpy array to a python list,
	ready for JSON conversion.
	"""
	try:
		# NaNs and Infinities are not supported by JSON
		vals[np.isnan(vals)] = 0
		vals[np.isinf(vals)] = 0

		# test if all values are integer
		vals_int = vals.astype(int)
		safe_conversion = (vals - vals_int) == 0

		if np.all(safe_conversion):
			return vals_int.tolist()
		else:
			# Because we use the client mainly to view, we
			# do not need the 20 digits of precision given
			# by float64 values. Eight digits lets us
			# blow up a single pixel to full screen size;
			# presumably this is enough.
			vals = np.around(vals, 8)
			# if there are _some_ integers, convert them
			# (arrays will likely have many zero values,
			# so this could still save a bit of space)
			vals = vals.tolist()
			if np.any(safe_conversion):
				for i in range(len(vals)):
					if safe_conversion[i]:
						vals[i] = int(vals[i])
			return vals
	except Exception as e:
		"""Not a numeric type (expected for strings, not reported)"""
		return vals.tolist()

def JSON_array(array):
	"""
	Takes a numpy array and produces an object wrapping
	an array with precomputed metadata, ready to be served
	or saved as a JSON file
	"""

	_un, _ind, _counts = np.unique(array, return_inverse=True, return_counts=True)

	_un = np_to_list(_un)
	_counts = np_to_list(_counts)

	_data = np_to_list(array)

	# default to string until proven otherwise
	array_type = 'string'
	indexed_val = None
	_min = 1
	_max = len(_un)
	try:
		_min = np.nanmin(array)
		_max = np.nanmax(array)
		# Convert to proper Python type (JSON conversion breaks otherwise)
		_min = int(_min) if int(_min) == _min else float(_min)
		_max = int(_max) if int(_max) == _max else float(_max)

		array_int = array.astype(int)
		if np.all((array - array_int) == 0):
			#integer
			if _min >= 0:
				if _max < 256:
					array_type = 'uint8'
				elif _max < 65535:
					array_type = 'uint16'
				else:
					array_type = 'uint32'
			elif _min > -128 and _max < 128:
				array_type = 'int8'
			elif _min > -32769 and _max < 32768:
				array_type = 'int16'
			else:
				array_type = 'int32'
		else:
			array_type = 'float32'
	except Exception as e:
		"""Not a numeric type (expected for strings, not reported)"""
		if len(_un) < 256:
			# strore strings in indexed_val
			indexed_val = _un

			# we will unshift `null` in front of the IndexedVal
			# array on the client-side, so we anticipate that by
			# increasing the indices now.
			_ind += 1
			_un, _counts = np.unique(_ind, return_counts=True)
			_un = np_to_list(_un)
			_counts = np_to_list(_counts)
			_ind = np_to_list(_ind)
			_data = _ind

	uniques = [ { "val": _un[i], "count": _counts[i] } for i in range(len(_un))]

	# slice off any values with count 1 - note that this implies
	# that arrays with only unique values have an empty `uniques` array
	uniques.sort(key=itemgetter('count'), reverse=True)
	for i in range(len(uniques)):
		if uniques[i]["count"] == 1:
			uniques = uniques[0:i]
			break

	color_length = min(len(uniques), 20)
	color_freq = { uniques[i]["val"]: i+1 for i in range(color_length) }
	color_indices = { "mostFreq": color_freq }

	retVal = {
		"arrayType": array_type,
		"data": _data,
		"uniques": uniques,
		"colorIndices": color_indices,
		"min": _min,
		"max": _max
	}
	if indexed_val is not None:
		retVal["indexedVal"] = indexed_val
	return retVal

def load_compressed_json(filename):
	with gzip.open(filename,"rt") as f:
		jsonVal = f.read()
		return jsonVal

# =================
# Server
# =================

from gevent.wsgi import WSGIServer
from gevent import monkey
monkey.patch_all()

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

# Advanced routing for fetching multiple rows/columns at once
# creates list of integers based on a '+' separated string
class IntDictConverter(BaseConverter):

	def to_python(self, value):
		return [int(v) for v in value.split('+')]

	def to_url(self, values):
		urlValues = [BaseConverter.to_url(value) for value in values]
		return '+'.join(urlValues)

app.url_map.converters['intdict'] = IntDictConverter

# enable GZIP compression
compress = Compress()
app.config['COMPRESS_MIMETYPES'] = ['text/html', 'text/css', 'text/xml', 'application/json', 'application/javascript']
app.config['COMPRESS_LEVEL'] = 2
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
	(u, p) = get_auth(request)
	result = json.dumps(app.cache.list_datasets(u, p))
	return flask.Response(result, mimetype="application/json")

# Info for a single dataset
@app.route('/loom/<string:project>/<string:filename>', methods=['GET'])
@cache(expires=None)
def send_fileinfo(project, filename):
	(u, p) = get_auth(request)
	path = app.cache.get_absolute_path(project, filename, u, p)
	ds_filename = '%s.attrs.json.gzip' % (path)
	fileinfo = None
	if os.path.isfile(ds_filename):
		logging.debug('Using file info from json.gzip ')
		fileinfo = load_compressed_json(ds_filename)
	else:
		ds = app.cache.connect_dataset_locally(project, filename, u, p)
		if ds == None:
			return "", 404
		tile_data = LoomTiles(ds)
		dims = tile_data.dz_dimensions()

		rowAttrs = { key: JSON_array(arr) for (key, arr) in ds.row_attrs.items() }
		colAttrs = { key: JSON_array(arr) for (key, arr) in ds.col_attrs.items() }

		fileinfo = json.dumps({
			"project": project,
			"dataset": filename,
			"filename": filename,
			"shape": ds.shape,
			"zoomRange": tile_data.dz_zoom_range(),
			"fullZoomHeight": dims[1],
			"fullZoomWidth": dims[0],
			"rowAttrs": rowAttrs,
			"colAttrs": colAttrs,
		})
	return flask.Response(fileinfo, mimetype="application/json")

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
		f.close()
		app.cache.update_cache(project, filename)

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

# Get one or more rows of data (i.e. all the expression values for a single gene)
@app.route('/loom/<string:project>/<string:filename>/row/<intdict:rows>')
@cache(expires=None)
def send_row(project, filename, rows):
	# path to desired rows
	(u,p) = get_auth(request)
	path = app.cache.get_absolute_path(project, filename, u, p)
	row_dir = '%s.rows' % ( path )
	if os.path.isdir(row_dir):
		logging.debug('Using json.gzip rows')
		retRows = ['[']
		comma = ','
		for row in rows:
			row_file_name = '%s/%06d.json.gzip' % (row_dir, row)
			retRows.append(load_compressed_json(row_file_name))
			retRows.append(comma)
		retRows[len(retRows)-1] = ']'
		retJSON = ''.join(retRows)
		return flask.Response(retJSON, mimetype="application/json")
	else:
		ds = app.cache.connect_dataset_locally(project, filename, u, p)
		if ds == None:
			return "", 404
		else:
			# return a list of {idx, data} objects.
			# This is to guarantee we match up row-numbers client-side
			#retRows = [{ 'idx': row, 'data': ds[row, :].tolist()} for row in rows]
			# Serialised like this is slightly faster
			rows.sort()
			dsRowsList = ds[rows,:]
			retRows = [JSON_array(row) for row in dsRowsList]
			return flask.Response(json.dumps(retRows), mimetype="application/json")

# Get one or more columns of data (i.e. all the expression values for a single cell)
@app.route('/loom/<string:project>/<string:filename>/col/<intdict:cols>')
@cache(expires=None)
def send_col(project, filename, cols):
	# path to desired cols
	(u,p) = get_auth(request)
	path = app.cache.get_absolute_path(project, filename, u, p)
	cols.sort()
	col_dir = '%s.cols' % ( path )
	if os.path.isdir(col_dir):
		logging.debug('Using json.gzip columns')
		retCols = ['[']
		comma = ','
		for col in cols:
			col_file_name = '%s/%06d.json.gzip' % (col_dir, col)
			col_data = load_compressed_json(col_file_name)
			retCols.append(load_compressed_json(col_file_name))
			retCols.append(comma)
		retCols[len(retCols)-1] = ']'
		retJSON = ''.join(retCols)
		return flask.Response(retJSON, mimetype="application/json")
	else:
		ds = app.cache.connect_dataset_locally(project, filename, u, p)
		if ds == None:
			return "", 404
		else:
			# See cols code for explanation
			cols.sort()
			# Transpose it into a row, so that it
			# will get converted to a list properly
			dsColsList = ds[:,cols].transpose()
			retCols = [JSON_array(col) for col in dsColsList]
			return flask.Response(json.dumps(retCols), mimetype="application/json")


#
# Tiles
#

@app.route('/loom/<string:project>/<string:filename>/tiles/<int:z>/<int:x>_<int:y>.png')
@cache(expires=60*20)
def send_tile(project, filename, z,x,y):
	(u,p) = get_auth(request)
	# path to desired tile
	path = app.cache.get_absolute_path(project, filename, u, p)
	# subfolder by zoom level to get more useful sorting order
	tiledir = '%s.tiles/z%02d/' % (path, z)
	tile = 'x%03d_y%03d.png' % (x, y)
	tilepath = '%s%s' % (tiledir, tile)

	if not os.path.isfile(tilepath):
		return "", 404
		# if there are no tiles, don't generate them during server-time
			## if the tile doesn't exist, we're either out of range,
			## or it still has to be generated
			#ds = app.cache.connect_dataset_locally(project, filename, u, p)
			#if ds == None:
			#	return "", 404
			#ds.dz_get_zoom_tile(x, y, z)
			## if the file still does not exist at this point,
			## we are out of range
			#if not os.path.isfile(tilepath):
			#	return "", 404

	return flask.send_file(open(tilepath, 'rb'), mimetype='image/png')

def signal_handler(signal, frame):
	print('\nShutting down.')
	if app.cache != None:
		app.cache.close()
	sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)


def start_server(dataset_path, show_browser=True, port="8003", debug=True):
	app.cache = LoomCache(dataset_path)
	os.chdir(os.path.dirname(os.path.realpath(__file__)))

	if show_browser:
		url = "http://localhost:" + str(port)
		if sys.platform == "darwin":
			subprocess.Popen(['open', url])
		else:
			webbrowser.open(url)
	try:
		#app.run(threaded=True, debug=debug, host="0.0.0.0", port=port)
		http_server = WSGIServer(('', port), app)
		http_server.serve_forever()
	except socket_error as serr:
		logging.error(serr)
		if port < 1024:
			print("You may need to invoke the server with sudo: sudo python loom_server.py ...")
