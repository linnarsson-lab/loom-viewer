import flask
import os
import loom
import sys
import StringIO
import json
#import click
from flask import make_response
from functools import wraps, update_wrapper
from datetime import datetime

os.chdir(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
print "Serving from: " + os.getcwd()

if len(sys.argv) != 2:
	print "ERROR: a single argument is required (name of h5 file to browse)"
	sys.exit(1)

try:
	ds = loom.connect(sys.argv[1])
except:
	print "ERROR: file not found, or not a valid .loom file."
	sys.exit(1)

# Precompute zoom pyramid and tSNE
#if not ds.loom_is_prepared():
ds.loom_prepare()

# Create fileinfo (javascript format)
dims = ds.dz_dimensions()
#fileinfo = "window.fileinfo = {fileName: '%s', pixelHeight: %s, pixelWidth: %s} " % (os.path.basename(sys.argv[1]), dims[1], dims[0])
fileinfo = "window.fileinfo = " + json.dumps({
		"fileName": os.path.basename(sys.argv[1]),
		"shape": ds.shape,
		"zoomRange": ds.dz_zoom_range(),
		"fullZoomHeight": dims[1],
		"fullZoomWidth": dims[0],
		"rowAttrs": dict([(name, vals.tolist()) for (name,vals) in ds.row_attrs.iteritems()]),
		"colAttrs": dict([(name, vals.tolist()) for (name,vals) in ds.col_attrs.iteritems()])
	})

def nocache(view):
	@wraps(view)
	def no_cache(*args, **kwargs):
		response = make_response(view(*args, **kwargs))
		response.headers['Last-Modified'] = datetime.now()
		response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
		response.headers['Pragma'] = 'no-cache'
		response.headers['Expires'] = '-1'
		return response
		
	return update_wrapper(no_cache, view)

app = flask.Flask(__name__)

#
# Static assets
#

@app.route('/js/<path:path>')
@nocache
def send_js(path):
	return flask.send_from_directory('/js', path)

@app.route('/css/<path:path>')
@nocache
def send_css(path):
	return flask.send_from_directory('/css', path)

@app.route('/img/<path:path>')
@nocache
def send_img(path):
	return flask.send_from_directory('/img', path)

@app.route('/')
@nocache
def send_indexjs():
	return app.send_static_file('index.html')

@app.route('/fileinfo.js')
@nocache
def send_fileinfo():
	return flask.Response(fileinfo, mimetype="application/javascript")

@app.route('/row/<int:row>')
@nocache
def send_row(row):
	return flask.Response(json.dumps(ds.file['/matrix'][row,:].tolist()), mimetype="application/json")

@app.route('/col/<int:col>')
@nocache
def send_col(col):
	return flask.Response(json.dumps(ds.file['/matrix'][:,col].tolist()), mimetype="application/json")

#
# Tiles 
#

def serve_pil_image(img):
	img_io = StringIO.StringIO()
	img.save(img_io, 'PNG')
	img_io.seek(0)
	return flask.send_file(img_io, mimetype='image/png')

@app.route('/tiles/<int:z>/<int:x>_<int:y>.png')
def send_tile(z,x,y):
	img = ds.dz_get_zoom_image(x,y,z)
	return serve_pil_image(img)



class LoomRepo(object):
	def __init__(self):
		


if __name__ == '__main__':
	app.run(debug=False)









