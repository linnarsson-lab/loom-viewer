from typing import *

import os
import time
import logging

import json

from gevent.lock import BoundedSemaphore

from loompy import LoomConnection

from .loom_utils import load_gzipped_json_string
from .loom_utils import format_last_mod

from loom_viewer import LoomExpand, LoomTiles


#
#  Helper functions to search over dataset directories for loom files
#


class LoomDatasets(object):
	"""
	A connection to the loom files in the local dataset directory
	"""

	def __init__(self, dataset_path: str = None) -> None:
		"""
		Create a LoomDatasets object that will help with connecting to loom files
		in the specified datasets folder
		"""
		__slots__ = [
			"dataset_path",
			"projects",
			"absolute_file_paths",
			"dataset_locks",
			"metadata_entries",
			"attribute_entries",
			"expansion_entries"
		]

		if dataset_path is None:
			def_dir = os.environ.get('LOOM_PATH')
			if def_dir is None:
				def_dir = os.path.join(os.path.expanduser("~"), "loom-datasets")
			dataset_path = def_dir

		dataset_path = os.path.abspath(dataset_path)

		if not os.path.exists(dataset_path):
			logging.info("Dataset folder does not exist, creating directory at:")
			logging.info(dataset_path)
			os.makedirs(dataset_path)
		else:
			logging.info("Dataset folder: %s", dataset_path)

		self.dataset_path = dataset_path
		self.projects = {}                # type: Dict[str, Set[str]]
		self.absolute_file_paths = set()  # type: Set[str]
		self.dataset_locks = {}           # type: Dict[str, BoundedSemaphore]

		self.metadata_entries = {}   # type: Dict[str, str]
		self.attribute_entries = {}  # type: Dict[str, str]
		self.expansion_entries = {}  # type: Dict[str, LoomExpand]

		# Find all projects and loom files in the dataset folder
		self.update_dataset_list()

	def update_dataset_list(self) -> None:
		"""
		Scan dataset folder for new project folders
		Scan project folders for new loom files.
		Note that this does not handle project folders or deleted loom files,
		in that context LoomDatasets needs to be closed and re-opened.
		"""
		ds_path = self.dataset_path
		logging.debug("Updating file index in %s", ds_path)
		project_list = [x for x in os.listdir(ds_path) if os.path.isdir(os.path.join(ds_path, x)) and not x.startswith(".")]
		for project in project_list:

			logging.debug("   %s", project)

			loom_files = self.projects.get(project, set())  # type: Set[str]

			project_files = self.files_in_project(project)
			all_file_paths = {file_path for _, _, file_path in project_files}

			# if a file_path is in the new set, but not in the old one, it's a new file
			new_file_paths = all_file_paths - self.absolute_file_paths

			for _, filename, file_path in project_files:
				logging.debug("       %s", filename)
				if file_path in new_file_paths:
					loom_files.add(filename)
					self.absolute_file_paths.add(file_path)
					self.dataset_locks[file_path] = BoundedSemaphore()

			# store updated file names in projects dictionary
			self.projects[project] = loom_files

	def is_abspath(self, path: str) -> bool:
		return os.path.exists(os.path.abspath(path))

	def get_absolute_file_path(self, project: str, filename: str) -> str:
		"""
		Returns the absolute path to the dataset.
		Returns an empty string otherwise

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")

		Returns:
			An absolute path string, or None if not authorized or file does not exist.
		"""
		absolute_path = os.path.join(self.dataset_path, project, filename)

		if absolute_path in self.absolute_file_paths:
			return absolute_path
		else:
			return ""

	def split_from_abspath(self, file_path: str) -> Tuple[str, str, str]:
		"""
		If file_path is an absolute filepath in dataset folder,
		extract into (project, filename, file_path).
		Return None.
		"""
		if os.path.normpath(file_path) is os.path.abspath(file_path) and os.path.exists(file_path):
			filename = os.path.basename(file_path)
			project = os.path.basename(os.path.dirname(file_path))
			dataset_path = os.path.basename(os.path.dirname(project))
			if dataset_path is self.dataset_path:
				return (project, filename, file_path)
		return None

	def list_all_files(self) -> Set[Tuple[str, str, str]]:
		"""List all files in the dataset folder"""
		projects = [x for x in os.listdir(self.dataset_path) if os.path.isdir(os.path.join(self.dataset_path, x)) and not x.startswith(".")]
		loom_files = []
		for project in projects:
			project_path = os.path.join(self.dataset_path, project)
			if os.path.exists(project_path):
				project_files = os.listdir(project_path)
				for filename in project_files:
					if filename.endswith(".loom"):
						loom_files.append((project, filename, os.path.join(project_path, filename)))
		return set(loom_files)

	def matching_filenames(self, filename: str) -> Set[Tuple[str, str, str]]:
		"""
		List all matching loom files in the dataset folder.
		If filename is an absolute path, there will be at most one match (obviously)

		Args:
			filename (string): 		Filename of the loom file to match against (e.g. "Midbrain_20160701.loom"). May be an absolute path

		Returns:
			A set of tuples of (project, filename, file_path), each of which are strings.
		"""
		if self.is_abspath(filename):
			split_abspath = self.split_from_abspath(filename)
			if split_abspath is not None:
				return {split_abspath}
			else:
				return set()
		else:
			matching_files = []
			if filename.endswith(".loom"):
				projects = [x for x in os.listdir(self.dataset_path) if os.path.isdir(os.path.join(self.dataset_path, x)) and not x.startswith(".")]
				for project in projects:
					project_path = os.path.join(self.dataset_path, project)
					if os.path.exists(project_path):
						project_files = os.listdir(project_path)
						file_path = os.path.join(project_path, filename)
						if os.path.isfile(file_path):
							matching_files.append((project, filename, file_path))
			return set(matching_files)

	def files_in_project(self, project: str) -> Set[Tuple[str, str, str]]:
		"""
		List all loom files for the given project in the dataset folder.

		Returns:
			A set of tuples of (project, filename, file_path), each of which are strings.
		"""
		project_path = os.path.join(self.dataset_path, project)
		if os.path.exists(project_path):
			project_files = os.listdir(project_path)
			return {(project, filename, os.path.join(project_path, filename)) for filename in project_files if filename.endswith(".loom")}
		else:
			return set()

	def authorize(self, project: str, username: str, password: str, mode: str ="read") -> bool:
		"""
		Check authorization for the specific project and credentials

		Write access will only be allowed if the credentials match
		an existing auth.txt file (with 'w' flag for the user).
		Read access will be allowed if the credentials are valid,
		or if there is no auth.txt file in the project directory
		and the requested access is read-only.

		Args:
			project (str):		Project name
			username (str):	Username
			password (str):	Password
			mode (str):			"read" or "write"

		Returns:
			True (authorised) or False (not authorised).
		"""

		# Not the strongest protection, but better than nothing.
		# Basically, we only proceed to check if the provided
		# project string matches the list of project directory names
		# that we selected earlier ourselves.
		loom_files = self.projects.get(project)
		if loom_files is None:
			logging.debug("Project does not exist!")
			return False

		users = {}  # type: Dict[str, Tuple[str, str]]
		authfile = os.path.join(self.dataset_path, project, "auth.txt")
		if not os.path.exists(authfile):
			if mode == "read":
				return True
			else:
				return False
		else:
			try:
				with open(authfile) as f:
					lines = [x.split(", ") for x in f.read().splitlines()]
					users = {x[0]: (x[1], x[2]) for x in lines}
			except Exception:
				logging.warn("Broken authfile")
				return False
		if mode == "read":
			if "*" in users:
				return True
			if username in users and users[username][0] == password:
				return True
		else:
			if username in users and users[username][0] == password and users[username][1] == "w":
				return True
		return False

	def connect(self, project: str, filename: str, mode: str="r+") -> LoomConnection:
		"""
		Connect to a local loom file.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")

		Returns:
			A loom file connection, or None if file does not exist.
		"""
		absolute_path = self.get_absolute_file_path(project, filename)
		if absolute_path is not "":
			return LoomConnection(absolute_path, mode)
		return None

	def _acquire_expander(self, project: str, filename: str, timeout: float=10) -> LoomExpand:
		"""
		Create LoomExpand object for a local loom file in the project subdirectory.
		Uses a semaphore to ensure there is never more than one connection
		open to a loom file (provided this is the only method that connects to it)

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			timeout (float):				Time to wait for connection to become available in seconds, or None to wait indefinitely

		Returns:
			A LoomExpander instance, or None if loom file does not exist or access to it is not authorized.
		"""
		absolute_path = self.get_absolute_file_path(project, filename)
		if absolute_path is not "":
			try:
				lock = self.dataset_locks[absolute_path]
				if lock.acquire(blocking=True, timeout=timeout):
					return LoomExpand(project, filename, absolute_path, self._release_expander)
			except TimeoutError:
				# May happen when multiple acquires were called before
				# timeout was reached. This is not a bug, so we just
				# return None to indicate that acquisition has failed
				pass
		return None

	def _release_expander(self, expander: LoomExpand) -> None:
		"""
		Release the lock associated with an acquired expander.
		Called automatically from within the expander when it is closed.
		"""
		if not expander.closed:
			lock = self.dataset_locks[expander.file_path]
			lock.release()

	def JSON_metadata_list(self, username: str = None, password: str = None) -> str:
		"""
		Generates expanded metadata for all (accessible) loom files
		and returns a JSON serialised string of the listed metadata

		Args:
			username (str):	Username
			password (str):	Password

		Returns:
			a JSON string listing metadata for all loom files authorized to see.
		"""
		self.update_dataset_list()

		dataset_path = self.dataset_path
		logging.debug("Listing datasets in %s", dataset_path)

		# list of all non-hidden folders in root dataset folder
		metadata_list = ["["]
		comma = ","
		for project in self.projects:
			if self.authorize(project, username, password):
				logging.debug("  project: %s", project)
				for filename in self.projects[project]:
					logging.debug("    filename: %s", filename)
					# See if metadata was already loaded before
					key = "%s/%s" % (project, filename)
					metadata = self.metadata_entries.get(key, "")
					if metadata is "":
						metadata = self.JSON_metadata(project, filename)
					if metadata is not None:
						self.metadata_entries[key] = metadata
						metadata_list.append(metadata)
						metadata_list.append(comma)
		if len(metadata_list) is 1:
			return "[]"

		# convert last "," to "]" to make it a valid JSON array
		metadata_list[len(metadata_list) - 1] = "]"
		return "".join(metadata_list)

	def JSON_metadata(self, project: str, filename: str, truncate: bool = False) -> str:
		"""
		Generates expanded metadata for a loom file.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			truncate (bool):			Whether to overwrite previously expanded metadata files (defaults to False)

		Returns:
			a string of the JSON serialision of the metadata for the loom file at project/filename.
		"""
		absolute_file_path = self.get_absolute_file_path(project, filename)
		if absolute_file_path is "":
			logging.debug("      Invalid or inaccessible path to loom file")
			return None

		key = "%s/%s" % (project, filename)
		md_filename = "%s.file_md.json.gzip" % (absolute_file_path)

		metadata = None

		if truncate:
			expand = self._acquire_expander(project, filename)
			if expand is None:
				# Only happens in case of concurrent access and time-out
				return None
			logging.debug("      Truncate set, clearing cache")
			metadata = expand.metadata(False)
			expand.close(True)
		else:
			# See if metadata was already loaded before
			logging.debug("      Attempting to load %s from cache", key)
			metadata = self.metadata_entries.get(key, "")

			# If not, see if expanded metadata json file exists
			if metadata is "":
				md_filename = "%s.file_md.json.gzip" % (absolute_file_path)
				if os.path.isfile(md_filename):
					logging.debug("      Found previously extracted JSON file, loading")
					metadata = load_gzipped_json_string("%s.file_md.json.gzip" % (absolute_file_path))

			# If neither expanded generate/update metadata and attributes
			if metadata is "":
				logging.debug("      No previous extracted JSON file, expanding")
				expand = self._acquire_expander(project, filename)
				if expand is None:
					return None
				metadata = expand.metadata(False)
				expand.close(True)

		self.metadata_entries[key] = metadata
		return metadata

	def JSON_attributes(self, project: str, filename: str, truncate: bool = False) -> str:
		"""
		Generates expanded attributes for a loom file.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			truncate (bool):			Whether to overwrite previously expanded attribute files (defaults to False)

		Returns:
			a string of the JSON serialision of the attributes for the loom file at project/filename.
		"""
		absolute_file_path = self.get_absolute_file_path(project, filename)
		if absolute_file_path is "":
			logging.debug("      Invalid or inaccessible path to loom file")
			return None

		key = "%s/%s" % (project, filename)
		attrs_name = "%s.attrs.json.gzip" % (absolute_file_path)

		attributes = None

		if truncate:
			expand = self._acquire_expander(project, filename)
			if expand is None:
				return None
			logging.debug("      Truncate set, clearing cache")
			attributes = expand.attributes(True)
			expand.close(True)
		else:
			# See if attributes were already loaded before
			logging.debug("      Attempting to find attributes in cache")
			attributes = self.attribute_entries.get(key, "")
			# If not, see if expanded attribute json file exists
			if attributes is "":
				if os.path.isfile(attrs_name):
					logging.debug("      Found previously extracted JSON file, loading")
					attributes = load_gzipped_json_string("%s.attrs.json.gzip" % (absolute_file_path))
			# If not, expand attributes
			if attributes is "":
				logging.debug("      No previous extracted JSON file, expanding")
				expand = self._acquire_expander(project, filename)
				if expand is None:
					return None
				attributes = expand.attributes(False)
				expand.close(True)

		self.attribute_entries[key] = attributes
		return attributes

	def JSON_rows(self, row_numbers: List[int], project: str, filename: str) -> str:
		"""
		Generates expanded rows for a loom file.

		Args:
			row_numbers (list of integers):	List of the row numbers to expand.
			project (string): 					Name of the project (e.g. "Midbrain")
			filename (string): 					Filename of the loom file (e.g. "Midbrain_20160701.loom")

		Returns:
			a string of the JSON serialision of the selected row numbers for the loom file at project/filename.
		"""

		absolute_file_path = self.get_absolute_file_path(project, filename)
		if absolute_file_path is "":
			logging.debug("Invalid or inaccessible path to loom file")
			return None

		# make sure all rows are included only once
		row_numbers = list(set(row_numbers))
		if len(row_numbers) is 0:
			return "[]"

		row_numbers.sort()
		retRows = ["["]
		comma = ","

		unexpanded = []

		row_dir = "%s.rows" % (absolute_file_path)
		if os.path.isdir(row_dir):
			logging.debug("%s.rows/ directory detected, loading expanded rows", filename)

		for i in row_numbers:
			row_file_name = "%s/%06d.json.gzip" % (row_dir, i)
			if os.path.exists(row_file_name):
				logging.debug(row_file_name)
				retRows.append(load_gzipped_json_string(row_file_name))
				retRows.append(comma)
			else:
				unexpanded.append(i)

		if len(unexpanded) is 0:
			retRows[len(retRows) - 1] = "]"
		elif len(unexpanded) > 0:
			logging.debug("acquiring expander")
			expand = self._acquire_expander(project, filename)
			if expand is None:
				return None
			expanded_rows = expand.selected_rows(unexpanded)
			logging.debug("closing expander")
			expand.close(True)
			if len(row_numbers) is len(unexpanded):
				# all rows were newly expanded
				return expanded_rows
			# remember, expanded_rows is a string already!
			retRows.append(expanded_rows[1:])

		return "".join(retRows)

	def JSON_columns(self, column_numbers: List[int], project: str, filename: str) -> str:
		"""
		Generates expanded columns for a loom file.

		Args:
			column_numbers (list of integers):	List of the row numbers to expand.
			project (string): 					Name of the project (e.g. "Midbrain")
			filename (string): 					Filename of the loom file (e.g. "Midbrain_20160701.loom")

		Returns:
			a string of the JSON serialision of the selected column numbers for the loom file at project/filename.
		"""

		absolute_file_path = self.get_absolute_file_path(project, filename)
		if absolute_file_path is "":
			logging.debug("Invalid or inaccessible path to loom file")
			return None

		# make sure all columns are included only once
		column_numbers = list(set(column_numbers))

		if len(column_numbers) is 0:
			return "[]"

		column_numbers.sort()
		retCols = ["["]
		comma = ","

		unexpanded = []

		col_dir = "%s.cols" % (absolute_file_path)
		if os.path.isdir(col_dir):
			logging.debug("%s.cols/ directory detected, loading expanded columns", filename)

		for i in column_numbers:
			col_file_name = "%s/%06d.json.gzip" % (col_dir, i)
			if os.path.exists(col_file_name):
				logging.debug(col_file_name)
				retCols.append(load_gzipped_json_string(col_file_name))
				retCols.append(comma)
			else:
				unexpanded.append(i)

		if len(unexpanded) is 0:
			retCols[len(retCols) - 1] = "]"
		elif len(unexpanded) > 0:
			logging.debug("acquiring expander")
			expand = self._acquire_expander(project, filename)
			if expand is None:
				return None
			expanded_cols = expand.selected_columns(unexpanded)
			logging.debug("closing expander")
			expand.close(True)
			if len(column_numbers) is len(unexpanded):
				# all columns were newly expanded
				return expanded_cols
			# remember, expanded_cols is a string already!
			retCols.append(expanded_cols[1:])

		return "".join(retCols)

	def tile(self, project: str, filename: str, truncate: bool = False) -> None:
		absolute_path = self.get_absolute_file_path(project, filename)
		ds = None
		if absolute_path is not "":
			try:
				lock = self.dataset_locks[absolute_path]
				if lock.acquire(blocking=True, timeout=10):
					ds = LoomConnection(absolute_path)
					tiles = LoomTiles(ds)
					tiles.prepare_heatmap(truncate)
					ds.close()
					lock.release()
			except TimeoutError:
				# May happen when cancelled by the environment (for example, on a server).
				# If so, and the lock was acquired, release the dataset and lock
				if ds is not None:
					ds.close()
					lock.release()
				pass
