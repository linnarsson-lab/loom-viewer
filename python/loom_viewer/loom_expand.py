from typing import *

import os
import errno
import logging
from shutil import rmtree

import json

import loompy

from .loom_utils import np_to_list, metadata_array
from .loom_utils import format_mtime
from .loom_utils import load_gzipped_json_string
from .loom_utils import save_gzipped_json
from .loom_utils import save_gzipped_json_string
from .loom_tiles import LoomTiles


class LoomExpand(object):
	"""
		Methods for extracting data as zipped json files for fast access.
		Deep Zoom handles expansion on its own (see LoomTiles).
	"""
	__slots__ = [
		"project",
		"filename",
		"file_path",
		"close_connection_on_exit",
		"callback_on_close",
		"_closed",
		"ds"
	]

	def __init__(self, project: str, filename: str, file_path: str, callback_on_close: Callable = None, close_connection_on_exit: bool = True) -> None:
		self.project = project
		self.filename = filename
		self.file_path = file_path
		self.close_connection_on_exit = close_connection_on_exit
		self.callback_on_close = callback_on_close
		self._closed = False
		self.ds = None
		try:
			self.ds = loompy.connect(file_path, 'r')
		except Exception as e:
			logging.warning("Could not open loom file at %s, closing LoomExpand object", file_path)
			if self.ds is not None:
				self.ds.close(True)
			self.ds = None
			if self.callback_on_close is not None:
				self.callback_on_close(self)
			self._closed = True
			raise e

	def __enter__(self) -> Any:
		return self

	def __exit__(self, type: Any, value: Any, traceback: Any) -> None:
		self.close(True)

	def close(self, suppress_warning: bool = False) -> None:
		if self._closed:
			if not suppress_warning:
				# Warn user that they're being paranoid
				# and should clean up their code
				logging.warn("Expander for %s is already closed", self.file_path)
		else:
			if self.callback_on_close is not None:
				self.callback_on_close(self)
			if self.close_connection_on_exit and self.ds is not None:
				self.ds.close(True)
			self.ds = None
			self._closed = True

	@property
	def closed(self) -> bool:
		return self._closed

	def last_modified(self) -> str:
		"""
		As of version 2.0.2, loompy keeps track of changes to
		data in the loom file via a timestamp. This makes it
		possible to automatically detect and update stale cache.

		This particular function returns the timestamp of the
		latest time *any* data was modified.

		Returns a timestamp with the current modification date
		"""
		if not self._closed:
			timestamp = self.ds.last_modified()
			return timestamp
		return None

	def clear_metadata(self) -> None:
		if not self._closed:
			md_filename = "%s.file_md.json.gzip" % (self.file_path)
			if os.path.isfile(md_filename):
				logging.debug("  Removing previously expanded %s", md_filename)
				os.remove(md_filename)
			md_mod_filename = "%s.file_md.lastmod.gzip" % (self.file_path)
			if os.path.isfile(md_mod_filename):
				os.remove(md_mod_filename)

	def metadata(self, truncate: bool = False) -> Tuple[str, str]:
		"""
		Generates a dictionary containing metadata,
		and saves it as a GZipped JSON file

		Returns a tuple with:
			- The JSON-serialized string of the metadata
			- A timestamp string of the last modification date of the metadata
		"""
		if not self._closed:
			filename = self.filename
			md_filename = "%s.file_md.json.gzip" % (self.file_path)
			md_mod_filename = "%s.file_md.lastmod.gzip" % (self.file_path)
			logging.debug("Expanding metada (stored as %s.file_md.json.gzip)", filename)

			last_mod = self.last_modified()
			if os.path.isfile(md_filename):
				logging.debug("  Found previously extracted JSON file")
				if truncate:
					self.clear_metadata()
				else:
					md_json = load_gzipped_json_string(md_filename)
					md_mod = load_gzipped_json_string(md_mod_filename)
					# check if cached metadata is up to date
					# if so return cache, otherwise clean it
					logging.debug("      md_mod: %s", md_mod)
					logging.debug("    last_mod: %s", last_mod)
					if md_mod == last_mod:
						logging.debug("  Cache up to date")
						return (md_json, last_mod)
					else:
						self.clear_metadata()

			ds = self.ds
			attrs = ds.attrs.keys()
			title = filename if "title" not in attrs else ds.attrs.title
			descr = "" if "description" not in attrs else ds.attrs.description
			url = "" if "url" not in attrs else ds.attrs.url
			doi = "" if "doi" not in attrs else ds.attrs.doi
			creation_date = last_mod if "creation_date" not in attrs else ds.attrs.creation_date
			# get arbitrary col/row attribute, they are all lists
			# of equal size. The length equals total cells/genes
			total_cells = ds.shape[1]
			total_genes = ds.shape[0]
			# default to last_modified for older files that do
			# not have a creation_date field
			md_data = {
				"project": self.project,
				"filename": filename,
				"dataset": filename,
				"title": title,
				"description": descr,
				"url": url,
				"doi": doi,
				"creationDate": creation_date,
				"lastModified": last_mod,
				"totalCells": total_cells,
				"totalGenes": total_genes,
			}
			logging.debug("  Saving extracted metadata as JSON file")
			md_json = json.dumps(md_data)
			save_gzipped_json_string(md_filename, md_json)
			save_gzipped_json_string(md_mod_filename, json.dumps(last_mod))
			return (md_json, last_mod)
		return None

	def clear_attributes(self) -> None:
		if not self._closed:
			attrs_filename = "%s.attrs.json.gzip" % (self.file_path)
			if os.path.isfile(attrs_filename):
				logging.debug("  Removing previously expanded %s", attrs_filename)
				os.remove(attrs_filename)
			attrs_mod_filename = "%s.attrs.lastmod.gzip" % (self.file_path)
			if os.path.isfile(attrs_mod_filename):
				os.remove(attrs_mod_filename)

	def attributes(self, truncate: bool = False) -> Tuple[str, str]:
		"""
		Extracts attribute metadata and saves it as a GZipped JSON file

		Returns a tuple with:
			- The JSON-serialized string of the attributes
			- A timestamp string of the last modification date of the attributes
		"""
		if not self._closed:
			filename = self.filename
			attrs_filename = "%s.attrs.json.gzip" % (self.file_path)
			attrs_mod_filename = "%s.attrs.lastmod.gzip" % (self.file_path)
			logging.debug("Expanding attributes (stored as %s)", attrs_filename)

			last_col_mod = self.ds.col_attrs.last_modified()
			last_row_mod = self.ds.row_attrs.last_modified()
			last_mod = max(last_col_mod, last_row_mod)

			if os.path.isfile(attrs_filename):
				logging.debug("  Found previously extracted JSON file")
				if truncate:
					self.clear_attributes()
				else:
					attrs_json = load_gzipped_json_string(attrs_filename)
					attrs_mod = load_gzipped_json_string(attrs_mod_filename)
					logging.debug("    attrs_mod: %s", attrs_mod)
					logging.debug("     last_mod: %s", last_mod)
					if attrs_mod == last_mod:
						logging.debug("  Cache up to date")
						return (attrs_json, last_mod)
					else:
						self.clear_attributes()

			ds = self.ds
			tile_data = LoomTiles(ds)
			dims = tile_data.dz_dimensions()
			rowAttrs = {key: metadata_array(arr) for (key, arr) in ds.ra.items()}
			colAttrs = {key: metadata_array(arr) for (key, arr) in ds.ca.items()}
			attrs_data = {
				"project": self.project,
				"filename": filename,
				"dataset": filename,
				"shape": ds.shape,
				"zoomRange": tile_data.dz_zoom_range(),
				"fullZoomHeight": dims[1],
				"fullZoomWidth": dims[0],
				"rowAttrs": rowAttrs,
				"colAttrs": colAttrs,
			}
			logging.debug("  Saving extracted attributes as JSON file")
			attrs_json = json.dumps(attrs_data)
			save_gzipped_json_string(attrs_filename, attrs_json)
			save_gzipped_json_string(attrs_mod_filename, json.dumps(last_mod))
			return (attrs_json, last_mod)
		return None

	def clear_rows(self) -> None:
		if not self._closed:
			row_dir = "%s.rows" % (self.file_path)
			if os.path.isdir(row_dir):
				logging.debug("  Removing previously expanded %s", row_dir)
				rmtree(row_dir)
			row_mod_filename = "%s.rows.lastmod.gzip" % (self.file_path)
			if os.path.isdir(row_mod_filename):
				os.remove(row_mod_filename)

	def rows(self, truncate: bool = False) -> str:
		"""
		Expands all rows. Will skip expansion if row subfolder exists,
		truncate is not set, and if the layer had not changed since
		the last expansion.

		Returns:
			- A timestamp string of the last modification date of the layer
		"""
		if not self._closed:
			row_dir = "%s.rows" % (self.file_path)
			logging.debug("Expanding rows (stored in %s.rows subfolder)", self.filename)

			row_mod_filename = "%s.rows.lastmod.gzip" % (self.file_path)
			row_mod = load_gzipped_json_string(row_mod_filename)
			last_mod = self.ds.layers.last_modified()

			# If truncate is set, or cache is stale,
			# remove previously expanded rows
			if os.path.isdir(row_dir):
				logging.debug("  Found previously extracted row directory")
				if truncate or row_mod != last_mod:
					self.clear_rows()
				else:
					return last_mod

			save_gzipped_json_string(row_mod_filename, last_mod)

			try:
				os.makedirs(row_dir, exist_ok=True)
			except OSError as exception:
				# It is expected that the directory already exists
				if exception.errno is not errno.EEXIST:
					raise exception

			ds = self.ds

			# 64 is the default chunk size, so probably the most cache
			# friendly option to batch over
			i = 0
			total_rows = ds.shape[0]

			while i + 64 < total_rows:
				row64 = ds[i:i + 64, :]
				for j in range(64):
					row = {"idx": i + j, "data": metadata_array(row64[j])}
					row_file_name = "%s/%06d.json.gzip" % (row_dir, i + j)
					save_gzipped_json(row_file_name, row)
				i += 64

			while i < total_rows:
				row = {"idx": i, "data": metadata_array(ds[i, :])}
				row_file_name = "%s/%06d.json.gzip" % (row_dir, i)
				save_gzipped_json(row_file_name, row)
				i += 1
			logging.debug(" done")
			return last_mod
		return None

	def selected_rows(self, row_numbers: List[int]) -> Tuple[str, str]:
		"""
		Returns a JSON string with the selected rows, generating
		gzipped JSON files from the loom file if necesary.
		(never truncates, may clear outdated cache)

		Returns:
			- The JSON serialised list of the rows
			- A timestamp string of the last modification date of the layer
		"""
		if not self._closed:
			row_dir = "%s.rows" % (self.file_path)
			logging.debug("Expanding selected row numbers, if not previously expanded: (stored in %s.rows subfolder)" % self.filename)
			logging.debug(",".join(str(row_nr) for row_nr in row_numbers))

			row_mod_filename = "%s.rows.lastmod.gzip" % (self.file_path)
			row_mod = load_gzipped_json_string(row_mod_filename)
			last_mod = self.ds.layers.last_modified()

			# If cache is stale, remove previously expanded rows
			if os.path.isdir(row_dir) and row_mod != last_mod:
				self.clear_rows()

			save_gzipped_json_string(row_mod_filename, last_mod)

			try:
				os.makedirs(row_dir, exist_ok=True)
			except OSError as exception:
				if exception.errno is not errno.EEXIST:
					raise exception

			# make sure all rows are included only once
			row_numbers = list(set(row_numbers))

			if len(row_numbers) is 0:
				return ("[]", last_mod)

			row_numbers.sort()

			ds = self.ds
			retRows = ["["]
			comma = ","

			rowMax = ds.shape[0]
			newly_expanded = []
			previously_expanded = []
			for i in row_numbers:
				# ignore out of bounds values
				if isinstance(i, int) and i >= 0 and i < rowMax:
					row_file_name = "%s/%06d.json.gzip" % (row_dir, i)
					if os.path.exists(row_file_name):
						retRows.append(load_gzipped_json_string(row_file_name))
						previously_expanded.append(i)
					else:
						row = json.dumps({"idx": i, "data": metadata_array(ds[i, :])})
						retRows.append(row)
						save_gzipped_json_string(row_file_name, row)
						newly_expanded.append(i)
					retRows.append(comma)

			logging.debug("loaded rows: %s", previously_expanded)
			logging.debug("newly expanded rows: %s", newly_expanded)

			if len(retRows) is 1:
				return ("[]", last_mod)

			# convert last "," to "]" to make it a valid JSON array
			retRows[len(retRows) - 1] = "]"
			return ("".join(retRows), last_mod)
		return None

	def clear_columns(self) -> None:
		if not self._closed:
			col_dir = "%s.cols" % (self.file_path)
			if os.path.isdir(col_dir):
				logging.debug("  Removing previously expanded %s", col_dir)
				rmtree(col_dir)
			col_mod_filename = "%s.cols.lastmod.gzip" % (self.file_path)
			if os.path.isdir(col_mod_filename):
				os.remove(col_mod_filename)

	def columns(self, truncate: bool = False) -> str:
		if not self._closed:
			col_dir = "%s.cols" % (self.file_path)
			logging.debug("Expanding columns (stored in %s.cols subfolder)", self.filename)

			col_mod_filename = "%s.cols.lastmod.gzip" % (self.file_path)
			col_mod = load_gzipped_json_string(col_mod_filename)
			last_mod = self.ds.layers.last_modified()

			# If truncate is set, or cache is stale,
			# remove previously expanded columns
			if os.path.isdir(col_dir):
				logging.debug("  Found previously extracted row directory")
				if truncate or col_mod != last_mod:
					self.clear_columns()
				else:
					return last_mod

			save_gzipped_json_string(col_mod_filename, last_mod)

			try:
				os.makedirs(col_dir, exist_ok=True)
			except OSError as exception:
				# It is expected that the directory already exists
				if exception.errno is not errno.EEXIST:
					raise exception

			ds = self.ds

			# 64 is the default chunk size, so probably the most cache
			# friendly option to batch over
			i = 0
			total_cols = ds.shape[1]

			while i + 64 < total_cols:
				col64 = ds[:, i:i + 64]
				for j in range(64):
					# Transpose it into a row, so that it
					# will get converted to a list properly
					data = metadata_array(col64[:, j].transpose())
					col = {"idx": i, "data": data}
					col_file_name = "%s/%06d.json.gzip" % (col_dir, i + j)
					save_gzipped_json(col_file_name, col)
				i += 64
			while i < total_cols:
				data = metadata_array(ds[:, i].transpose())
				col = {"idx": i, "data": data}
				col_file_name = "%s/%06d.json.gzip" % (col_dir, i)
				save_gzipped_json(col_file_name, col)
				i += 1
			logging.debug(" done")
			return last_mod
		return None

	def selected_columns(self, column_numbers: List[int]) -> Tuple[str, str]:
		"""
		Returns a JSON string with the selected columns, generating
		gzipped JSON files from the loom file if necesary.
		(never truncates, may clear outdated cache)

		Returns:
			- The JSON serialised list of the rows
			- A timestamp string of the last modification date of the layer
		"""
		if not self._closed:
			col_dir = "%s.cols" % (self.file_path)
			logging.debug("Expanding selected column numbers, if not previously expanded: (stored in %s.cols subfolder)" % self.filename)
			logging.debug(",".join(str(column_nr) for column_nr in column_numbers))

			col_mod_filename = "%s.cols.lastmod.gzip" % (self.file_path)
			col_mod = load_gzipped_json_string(col_mod_filename)
			last_mod = self.ds.layers.last_modified()

			# If cache is stale, remove previously expanded columns
			if os.path.isdir(col_dir) and col_mod != last_mod:
				self.clear_columns()

			save_gzipped_json_string(col_mod_filename, last_mod)

			try:
				os.makedirs(col_dir, exist_ok=True)
			except OSError as exception:
				if exception.errno is not errno.EEXIST:
					raise

			# make sure all columns are included only once
			column_numbers = list(set(column_numbers))

			if len(column_numbers) is 0:
				return ("[]", last_mod)

			column_numbers.sort()

			ds = self.ds
			retCols = ["["]
			comma = ","

			colMax = ds.shape[1]
			newly_expanded = []
			previously_expanded = []
			for i in column_numbers:
				# ignore out of bounds values
				if isinstance(i, int) and i >= 0 and i < colMax:
					col_file_name = "%s/%06d.json.gzip" % (col_dir, i)
					if os.path.exists(col_file_name):
						retCols.append(load_gzipped_json_string(col_file_name))
						previously_expanded.append(i)
					else:
						data = metadata_array(ds[:, i].transpose())
						column = json.dumps({"idx": i, "data": data})
						retCols.append(column)
						save_gzipped_json_string(col_file_name, column)
						newly_expanded.append(i)
					retCols.append(comma)

			logging.debug("loaded columns: %s", previously_expanded)
			logging.debug("newly expanded columns: %s", newly_expanded)

			if len(retCols) is 1:
				return ("[]", last_mod)

			# convert last "," to "]" to make it a valid JSON array
			retCols[len(retCols) - 1] = "]"
			return ("".join(retCols), last_mod)
		return None
