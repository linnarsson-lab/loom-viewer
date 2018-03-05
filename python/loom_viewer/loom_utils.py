from typing import *

import json
import os

import time
import gzip
import json

import numpy as np
from operator import itemgetter

from loompy import LoomConnection


#
#  JSON helper functions
#


def load_gzipped_json_string(file_path: str) -> str:
	"""
	Opens a gzipped file (used only for gzipped JSON text files)
	"""
	if os.path.isfile(file_path):
		with gzip.open(file_path, "rt") as f:
			return f.read()
	else:
		return ""


def load_gzipped_json(file_path: str) -> Any:
	"""
	Deserializes a gzipped JSON file.
	Returns None if an invalid file_path was passed.
	"""
	if os.path.isfile(file_path):
		return json.loads(load_gzipped_json_string(file_path))
	return None


def save_gzipped_json(json_filename: str, data: Any, truncate: bool = False) -> None:
	"""
		Save data as a gzipped JSON text file
	"""
	if truncate and os.path.isfile(json_filename):
		os.remove(json_filename)
	with gzip.open(filename=json_filename, mode="wt", compresslevel=6) as f:
		json.dump(data, f)


def save_gzipped_json_string(json_filename: str, json_string: str, truncate: bool = False) -> None:
	"""
		Save JSON string as a gzipped JSON text file
	"""
	if truncate and os.path.isfile(json_filename):
		os.remove(json_filename)
	with gzip.open(filename=json_filename, mode="wt", compresslevel=6) as f:
		f.write(json_string)


#
#  Converting numpy data to easily serialisable Python objects
#


def format_mtime(file_path: str) -> str:
	"""
	Returns the last time the file was modified as a string,
	formatted year/month/day hour:minute:second
	"""
	if os.path.isfile(file_path):
		mtime = time.gmtime(os.path.getmtime(file_path))
		return time.strftime("%Y/%m/%d %H:%M:%S", mtime)
	else:
		return ""


def np_to_list(vals: Any) -> Tuple[List[Any], str]:
	"""
	Convert a numpy array to a python list, ready for JSON conversion.
	Returns a tuple with (value_list, value_type), where:

		value_list:		list of converted values
		value_type:		string, either "int", "float32" or "string"

	Note that if value_type is "float32", individual number in value_list
	that are integers will still be converted to one, to avoid redundant
	trailing ".0" in the JSON conversion.
	"""
	try:
		# NaNs and Infinities are not supported by JSON
		vals[np.isnan(vals)] = 0
		vals[np.isinf(vals)] = 0

		# test if all values are integer
		vals_int = vals.astype(int)
		safe_conversion = (vals - vals_int) == 0

		if np.all(safe_conversion):
			return (vals_int.tolist(), "int")
		else:
			# The purpose of the loom-viewer is inspecting data, not doing calculations with it.
			# float64 values have 20 digits of precision, and we can save storage space and
			# data transferred by reducing this precision to what is truly required.
			# The extreme scenario to support is starting with a zoomed out view on
			# a 4k screen, and zooming in far enough that all data in one individual pixel
			# from that zoomed out starting point covers the whole screen.
			# 4K is 4096 × 2160, and 4096**2 = 16736256
			# This suggests that 8 digits of precision is enough to maintain
			# subpixel precision even in this scenario.
			# float32 has between six to nine significant decimal digits of precision,
			# so that should be a good fit.
			vals = vals.astype(np.float32)
			# if there are _some_ integers, convert them
			# (arrays will likely have many zero values,
			# so this could still save a bit of space in
			# our JSON text file output)
			vals = vals.tolist()
			if np.any(safe_conversion):
				for i in range(len(vals)):
					if safe_conversion[i]:
						vals[i] = int(vals[i])
			return (vals, "float32")
	except Exception as e:
		# Not a numeric type (expected for strings, not reported)
		return (vals.tolist(), "string")


def metadata_array(array: Any) -> Dict[str, Any]:
	"""
	Takes a Numpy array and produces an object wrapping
	an array with precomputed metadata, ready to be served
	or saved as a JSON file.

	Numpy strings are converted to Python strings

	Numpy numbers are converted to integers where possible,
	and truncated to float32-precision values otherwise.
	"""

	_un, _ind, _counts = np.unique(array, return_inverse=True, return_counts=True)

	_un, _ = np_to_list(_un)
	_counts, _ = np_to_list(_counts)

	_data, _data_type = np_to_list(array)

	# default to string until proven otherwise
	array_type = _data_type
	indexed_val = None
	_min = 1         # type: Union[int, float]
	_max = len(_un)  # type: Union[int, float]
	if array_type is "string":
		if len(_un) < 256:
			# strore strings in indexed_val
			indexed_val = _un

			# we will unshift `null` in front of the IndexedVal
			# array on the client-side, so we anticipate that by
			# increasing the indices now.

			_ind += 1
			_un, _counts = np.unique(_ind, return_counts=True)
			_un, _ = np_to_list(_un)
			_counts, _ = np_to_list(_counts)
			_ind, _ = np_to_list(_ind)
			_data = _ind
	else:
		_min = np.nanmin(array)
		_max = np.nanmax(array)
		# Convert to proper Python type (JSON conversion breaks otherwise)
		_min = int(_min) if int(_min) == _min else float(_min)
		_max = int(_max) if int(_max) == _max else float(_max)

		if array_type is "int":
			if _min >= 0:
				if _max < 256:
					array_type = "uint8"
				elif _max < 65535:
					array_type = "uint16"
				else:
					array_type = "uint32"
			elif _min > -128 and _max < 128:
				array_type = "int8"
			elif _min > -32769 and _max < 32768:
				array_type = "int16"
			else:
				array_type = "int32"

	uniques = []  # type: List[Dict[str, Any]]
	if len(_un) < len(_data):
		# skip any values with count 1 - note that this implies that for data where
		# every value is unique, uniques is empty (hence the check to skip this)
		uniques = [{"val": _un[i], "count": _counts[i]} for i in range(len(_un)) if _counts[i] > 1]
		# sort by value, ascending
		uniques.sort(key=itemgetter("val"))

	retVal = {
		"arrayType": array_type,
		"data": _data,
		"uniques": uniques,
		"min": _min,
		"max": _max
	}
	if indexed_val is not None:
		retVal["indexedVal"] = indexed_val

	return retVal
