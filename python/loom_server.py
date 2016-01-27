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

if len(sys.argv) != 2:
	print "ERROR: a single argument is required (name of h5 file to browse)"
	sys.exit(1)

try:
	ds = loom.connect(sys.argv[1])
except:
	print "ERROR: file not found, or not a valid .loom file."
	sys.exit(1)

if not ds.row_attrs.__contains__("GeneName"):
	if not ds.row_attrs.__contains__("Gene"):
		print "ERROR: Row attribute 'GeneName' is missing."


if not ds.col_attrs.__contains__("CellID"):
	print "ERROR: Column attribute 'CellID' is missing."
	sys.exit(1)

# Precompute zoom pyramid and tSNE
if not ds.loom_is_prepared():
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

class LoomServer(flask.Flask):
	# Disable cacheing 
    def get_send_file_max_age(self, name):
        return 0


os.chdir(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
print "Serving from: " + os.getcwd()
app = LoomServer(__name__)

#
# URL namespace
#
# /repo 										- List of all projects and datasets (JSON)
# /repo/public/{project}/{dataset}/rev15.json	- Metadata (JSON)
# /repo/public/{project}/{dataset}/tiles 	 	- Heatmap images
# /repo/public/{project}/{dataset}/row/ 	 	- Row data
# /repo/public/{project}/{dataset}/col/ 	 	- Column data


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

@app.route('/fileinfo.js')
def send_fileinfo():
	return flask.Response(fileinfo, mimetype="application/javascript")

@app.route('/row/<int:row>')
def send_row(row):
	return flask.Response(json.dumps(ds.file['/matrix'][row,:].tolist()), mimetype="application/json")

@app.route('/col/<int:col>')
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

if __name__ == '__main__':
	app.run(debug=False)



