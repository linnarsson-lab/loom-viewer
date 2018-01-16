from typing import *

import os
import errno
import logging
from shutil import rmtree

import json

import loompy

from .loom_utils import np_to_list, metadata_array
from .loom_utils import format_last_mod
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
		try:
			logging.debug("LoomExpander: opening LoomConnection at %s", file_path)
			self.ds = loompy.connect(file_path, "r")
		except Exception as e:
			logging.debug("Could not open loom file at %s, closing LoomExpand object", file_path)
			self.ds = None
			if self.callback_on_close is not None:
				self.callback_on_close(self)
			self._closed = True

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
				logging.debug("LoomExpander: closing LoomConnection at %s", self.file_path)
				self.ds.close()
			self.ds = None
			self._closed = True

	@property
	def closed(self) -> bool:
		return self._closed

	def clear_metadata(self) -> None:
		if not self._closed:
			md_filename = "%s.file_md.json.gzip" % (self.file_path)
			if os.path.isfile(md_filename):
				logging.debug("LoomExpander: removing %s", md_filename)
				os.remove(md_filename)
			else:
				logging.debug("LoomExpander: cannot remove %s, does not exist", md_filename)

	def metadata(self, truncate: bool = False) -> str:
		"""
		Generates a dictionary containing metadata,
		and saves it as a GZipped JSON file

		Returns a tuple with:
			- the JSON string of the metadata
			- a string with the last modification date of the loom file
		"""
		if not self._closed:
			filename = self.filename
			md_filename = "%s.file_md.json.gzip" % (self.file_path)
			logging.debug("Expanding metada (stored as %s.file_md.json.gzip)", filename)

			if os.path.isfile(md_filename):
				logging.debug("  Found previously extracted JSON file")
				if truncate:
					logging.debug("    Truncate set, replacing file")
					os.remove(md_filename)
				else:
					return load_gzipped_json_string(md_filename)

			ds = self.ds
			title = ds.attrs.get("title", filename)
			descr = ds.attrs.get("description", "")
			url = ds.attrs.get("url", "")
			doi = ds.attrs.get("doi", "")
			# get arbitrary col/row attribute, they are all lists
			# of equal size. The length equals total cells/genes
			total_cells = ds.shape[1]
			total_genes = ds.shape[0]
			# default to last_modified for older files that do
			# not have a creation_date field
			last_mod = format_last_mod(self.file_path)
			creation_date = ds.attrs.get("creation_date", last_mod)
			md_data = {
				"project": self.project,
				"filename": filename,
				"dataset": filename,
				"title": filename,
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
			return md_json
		return None

	def clear_attributes(self) -> None:
		if not self._closed:
			attrs_name = "%s.attrs.json.gzip" % (self.file_path)
			if os.path.isfile(attrs_name):
				logging.debug("LoomExpander: removing %s", attrs_name)
				os.remove(attrs_name)
			else:
				logging.debug("LoomExpander: cannot remove %s, does not exist", attrs_name)

	def attributes(self, truncate: bool = False) -> str:
		"""
		Extracts attribute metadata and saves it as a GZipped JSON file

		Returns the JSON string
		"""
		if not self._closed:
			filename = self.filename
			attrs_name = "%s.attrs.json.gzip" % (self.file_path)
			logging.debug("Expanding attributes (stored as %s)", attrs_name)

			if os.path.isfile(attrs_name):
				logging.debug("  Found previously extracted JSON file")
				if truncate:
					logging.debug("    Truncate set, replacing file")
					self.clear_attributes()
				else:
					return load_gzipped_json_string(attrs_name)

			ds = self.ds
			tile_data = LoomTiles(ds)
			dims = tile_data.dz_dimensions()
			rowAttrs = {key: metadata_array(arr) for (key, arr) in ds.row_attrs.items()}
			colAttrs = {key: metadata_array(arr) for (key, arr) in ds.col_attrs.items()}
			attrs_data = {
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
			logging.debug("  Saving extracted attributes as JSON file")
			attrs_json = json.dumps(attrs_data)
			save_gzipped_json_string(attrs_name, attrs_json)
			return attrs_json
		return None

	def clear_rows(self) -> None:
		if not self._closed:
			row_dir = "%s.rows" % (self.file_path)
			if os.path.isdir(row_dir):
				logging.debug("LoomExpander: removing %s", row_dir)
				rmtree(row_dir)
			else:
				logging.debug("LoomExpander: cannot remove %s, does not exist", row_dir)

	def rows(self, truncate: bool = False) -> None:
		if not self._closed:
			row_dir = "%s.rows" % (self.file_path)
			logging.debug("Expanding rows (stored in %s.rows subfolder)", self.filename)

			if os.path.isdir(row_dir):
				logging.debug("  Found previously extracted row directory")
				if truncate:
					logging.debug("    Truncate set, replacing directory")
					self.clear_rows()
				else:
					return

			try:
				os.makedirs(row_dir, exist_ok=True)
			except OSError as exception:
				# it is expected that the directory already exists
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
		return None

	def selected_rows(self, row_numbers: List[int]) -> str:
		"""
		Returns a JSON string with the selected row,
		generating the associated gzipped JSON files from the
		loom file if necesary. (never truncates)
		"""
		if not self._closed:
			row_dir = "%s.rows" % (self.file_path)
			logging.debug("Expanding selected row numbers, if not previously expanded: (stored in %s.rows subfolder)" % self.filename)
			logging.debug(",".join(str(row_nr) for row_nr in row_numbers))

			try:
				os.makedirs(row_dir, exist_ok=True)
			except OSError as exception:
				if exception.errno is not errno.EEXIST:
					raise exception

			# make sure all rows are included only once
			row_numbers = list(set(row_numbers))
			if len(row_numbers) is 0:
				return ""
			row_numbers.sort()

			ds = self.ds
			retRows = ["["]
			comma = ","

			rowMax = ds.shape[0]
			for i in row_numbers:
				# ignore out of bounds values
				if isinstance(i, int) and i >= 0 and i < rowMax:
					row_file_name = "%s/%06d.json.gzip" % (row_dir, i)
					if os.path.exists(row_file_name):
						retRows.append(load_gzipped_json_string(row_file_name))
					else:
						row = json.dumps({"idx": i, "data": metadata_array(ds[i, :])})
						retRows.append(row)
						save_gzipped_json_string(row_file_name, row)
					retRows.append(comma)

			if len(retRows) is 1:
				return "[]"

			# convert last "," to "]" to make it a valid JSON array
			retRows[len(retRows) - 1] = "]"
			return "".join(retRows)
		return None

	def clear_columns(self) -> None:
		if not self._closed:
			col_dir = "%s.cols" % (self.file_path)
			if os.path.isdir(col_dir):
				logging.debug("LoomExpander: removing %s", col_dir)
				rmtree(col_dir)
			else:
				logging.debug("LoomExpander: cannot remove %s, does not exist", col_dir)

	def columns(self, truncate: bool = False) -> None:
		if not self._closed:
			col_dir = "%s.cols" % (self.file_path)
			logging.debug("Expanding columns (stored in %s.cols subfolder)", self.filename)
			if os.path.isdir(col_dir):
				logging.debug("  Found previously extracted row directory")
				if truncate:
					logging.debug("    Truncate set, replacing directory")
					self.clear_columns()
				else:
					return

			try:
				os.makedirs(col_dir, exist_ok=True)
			except OSError as exception:
				# if the error was that the directory already
				# exists, ignore it, since that is expected.
				if exception.errno is not errno.EEXIST:
					raise exception

			ds = self.ds
			total_cols = ds.shape[1]
			i = 0
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
		return None

	def selected_columns(self, column_numbers: List[int]) -> str:
		"""
		Returns a JSON string with the selected columns,
		generating the associated gzipped JSON files from the
		loom file if necesary. (never truncates)
		"""
		if not self._closed:
			col_dir = "%s.cols" % (self.file_path)
			logging.debug("Expanding selected column numbers, if not previously expanded: (stored in %s.cols subfolder)" % self.filename)
			logging.debug(",".join(str(column_nr) for column_nr in column_numbers))

			try:
				os.makedirs(col_dir, exist_ok=True)
			except OSError as exception:
				if exception.errno is not errno.EEXIST:
					raise

			# make sure all columns are included only once
			column_numbers = list(set(column_numbers))

			if len(column_numbers) is 0:
				return ""

			column_numbers.sort()

			ds = self.ds
			retCols = ["["]
			comma = ","

			colMax = ds.shape[1]
			for i in column_numbers:
				# ignore out of bounds values
				if isinstance(i, int) and i >= 0 and i < colMax:
					col_file_name = "%s/%06d.json.gzip" % (col_dir, i)
					if os.path.exists(col_file_name):
						retCols.append(load_gzipped_json_string(col_file_name))
					else:
						data = metadata_array(ds[:, i].transpose())
						column = json.dumps({"idx": i, "data": data})
						retCols.append(column)
						save_gzipped_json_string(col_file_name, column)
					retCols.append(comma)

			if len(retCols) is 1:
				return "[]"
			# convert last "," to "]" to make it a valid JSON array
			retCols[len(retCols) - 1] = "]"
			return "".join(retCols)
		return None
