import os
import logging
from shutil import rmtree

from loompy import LoomConnection

from loom_viewer import JSON_array, LoomTiles

import time

import gzip
import json

class LoomExpand(object):
	"""
		Methods for extracting data as zipped json files for fast access.
		Deep Zoom handles expansion on its own (see LoomTiles in loom_tiles.py).
	"""
	__slots__ = ['ds', 'dataset_path', 'project', 'filename', 'file_path']
	def __init__(self, ds: LoomConnection, dataset_path: str, project: str, filename: str, file_path: str) -> None:
		self.ds = ds
		self.dataset_path = dataset_path
		self.project = project
		self.filename = filename
		self.file_path = file_path

	def save_compressed_json(self, json_filename, data):
			with gzip.open(filename=json_filename, mode="wt", compresslevel=6) as f:
				json.dump(data, f)


	def metadata(self, truncate=False):
		"""
		Generate object containing list entry metadata
		"""

		ds = self.ds
		filename = self.filename
		md_filename = '%s.file_md.json.gzip' % (self.file_path)

		if os.path.isfile(md_filename):
			if not truncate:
				#logging.info('  Metadata already expanded (truncate not set)')
				return
			else:
				#logging.info('  Removing previously expanded metadata (truncate set)')
				os.remove(md_filename)

		logging.info("  Expanding metada (stored as %s.file_md.json.gzip)" % filename)
		title = ds.attrs.get("title", filename)
		descr = ds.attrs.get("description", "")
		url = ds.attrs.get("url", "")
		doi = ds.attrs.get("doi", "")
		# get arbitrary col/row attribute, they're all lists
		# of equal size. The length equals total cells/genes
		total_cells = ds.shape[1]
		total_genes = ds.shape[0]
		# default to last_modified for older files that do
		# not have a creation_date field
		last_mod = self.format_last_mod()
		creation_date = ds.attrs.get("creation_date", last_mod)
		md_data = {
			"project": self.project,
			"filename": filename,
			"dataset": filename,
			"title": filename,
			"description": descr,
			"url":url,
			"doi": doi,
			"creationDate": creation_date,
			"lastModified": last_mod,
			"totalCells": total_cells,
			"totalGenes": total_genes,
		}
		self.save_compressed_json(md_filename, md_data)

	def format_last_mod(self):
		"""
		Returns the last time the file was modified as a string,
		formatted year/month/day hour:minute:second
		"""
		mtime = time.gmtime(os.path.getmtime(self.file_path))
		return time.strftime('%Y/%m/%d %H:%M:%S', mtime)

	# Includes attributes
	def attributes(self, truncate=False):

		ds = self.ds
		filename = self.filename

		attrs_name = '%s.attrs.json.gzip' % ( self.file_path )

		if os.path.isfile(attrs_name):
			if not truncate:
				#logging.info('  Attributes already expanded (truncate not set)')
				return
			else:
				#logging.info('  Removing previously expanded attributes (truncate set)')
				os.remove(attrs_name)

		logging.info("  Expanding attributes (stored as %s.attrs.json.gzip)" % filename)
		tile_data = LoomTiles(ds)
		dims = tile_data.dz_dimensions()
		rowAttrs = { key: JSON_array(arr) for (key, arr) in ds.row_attrs.items() }
		colAttrs = { key: JSON_array(arr) for (key, arr) in ds.col_attrs.items() }
		fileinfo = {
			"project": self.project,
			"filename": filename,
			"dataset": filename,
			"shape": ds.shape,
			"zoomRange": tile_data.dz_zoom_range(),
			"fullZoomHeight": dims[1],
			"fullZoomWidth": dims[0],
			"rowAttrs": rowAttrs,
			"colAttrs": colAttrs
		}
		self.save_compressed_json(attrs_name, fileinfo)

	def rows(self, truncate=False):

		ds = self.ds

		row_dir = '%s.rows' % ( self.file_path )

		if os.path.isdir(row_dir):
			if not truncate:
				#logging.info('  Rows already expanded (truncate not set)')
				return
			else:
				#logging.info('  Removing previously expanded rows (truncate set)')
				rmtree(row_dir)

		try:
			os.makedirs(row_dir, exist_ok=True)
		except OSError as exception:
			# if the error was that the directory already
			# exists, ignore it, since that is expected.
			if exception.errno != errno.EEXIST:
				raise

		logging.info("  Expanding rows (stored in %s.rows subfolder)" % self.filename)

		# 64 is the default chunk size, so probably the most cache
		# friendly option to batch over
		total_rows = ds.shape[0]
		i = 0
		while i+64 < total_rows:
			row64 = ds[i:i+64,:]
			for j in range(64):
				row = {'idx': i+j, 'data': JSON_array(row64[j])}
				row_file_name = '%s/%06d.json.gzip' % (row_dir, i+j)
				self.save_compressed_json(row_file_name, row)
			i += 64
		while i < total_rows:
			row = {'idx': i, 'data': JSON_array(ds[i,:])}
			row_file_name = '%s/%06d.json.gzip' % (row_dir, i)
			self.save_compressed_json(row_file_name, row)
			i += 1

	def columns(self, truncate=False):

		ds = self.ds

		col_dir = '%s.cols' % ( ds.file_path )

		if os.path.isdir(col_dir):
			if not truncate:
				#logging.info('  Columns already expanded (truncate not set)')
				return
			else:
				#logging.info('  Removing previously expanded columns (truncate set)')
				rmtree(col_dir)

		try:
			os.makedirs(col_dir, exist_ok=True)
		except OSError as exception:
			# if the error was that the directory already
			# exists, ignore it, since that is expected.
			if exception.errno != errno.EEXIST:
				raise

		logging.info("  Expanding columns (stored in %s.cols subfolder)" % self.filename)

		total_cols = ds.shape[1]
		i = 0
		while i+64 < total_cols:
			col64 = ds[:, i:i+64]
			for j in range(64):
				# Transpose it into a row, so that it
				# will get converted to a list properly
				data = JSON_array(col64[:, j].transpose())
				col = {'idx': i, 'data': data}
				col_file_name = '%s/%06d.json.gzip' % (col_dir, i+j)
				self.save_compressed_json(col_file_name, col)
			i += 64
		while i < total_cols:
			data = JSON_array(ds[:, i].transpose())
			col = {'idx': i, 'data': data}
			col_file_name = '%s/%06d.json.gzip' % (col_dir, i)
			self.save_compressed_json(col_file_name, col)
			i += 1