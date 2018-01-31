from typing import *

import os
import time
import logging

import json

from gevent.lock import BoundedSemaphore

from loompy import LoomConnection

from .loom_utils import load_gzipped_json_string
from .loom_utils import format_mtime

from loom_viewer import LoomExpand, LoomTiles


#
#  Helper objects to search over dataset directories for loom files
#

def def_dataset_dir() -> str:
		def_dir = os.environ.get('LOOM_PATH')
		if def_dir is None:
			def_dir = os.path.join(os.path.expanduser("~"), "loom-datasets")
		return def_dir


class LoomDatasetLists(object):
	"""
	An object that takes a root path to the dataset folder, and helps with listing projects and loom files inside of it
	"""
	__slots__ = [
		"dataset_path",
	]

	def __init__(self, dataset_path: str = None) -> None:
		if dataset_path is None:
			dataset_path = def_dataset_dir()

		dataset_path = os.path.abspath(dataset_path)

		if not os.path.exists(dataset_path):
			logging.debug("Dataset folder does not exist, creating directory at:")
			logging.debug(dataset_path)
			os.makedirs(dataset_path)
		else:
			logging.debug("Dataset folder: %s", dataset_path)

		self.dataset_path = dataset_path

	def is_abspath(self, path: str) -> bool:
		return os.path.exists(os.path.abspath(path))

	def split_from_abspath(self, file_path: str) -> Tuple[str, str, str]:
		"""
		If file_path is an absolute filepath in dataset folder,
		extract into (project, filename, file_path).

		Args:
			- file_path (string):		Absolute path to the loom file.

		Returns a tuple with
			- project folder name (str),
			- file name (str)
			- absolute file path (str)
		"""
		file_path = os.path.normpath(file_path)
		file_path = os.path.abspath(file_path)
		if os.path.exists(file_path):
			filename = os.path.basename(file_path)
			project = os.path.basename(os.path.dirname(file_path))
			dataset_path = os.path.basename(os.path.dirname(project))
			return (project, filename, file_path)
		return None

	def absolute_file_path(self, project: str, filename: str) -> str:
		"""
		Returns the absolute path to the dataset, or an empty string otherwise

		Args:
			- project (string):		Name of the project (e.g. "Midbrain")
			- filename (string):	Filename of the loom file (e.g. "Midbrain_20160701.loom")

		Returns:
			An absolute path string, or None if file is not a loom file.
		"""
		if not filename.endswith(".loom"):
			filename += ".loom"
		absolute_path = os.path.join(self.dataset_path, project, filename)
		if self.is_abspath(absolute_path):
			return absolute_path
		else:
			return ""

	def all_projects(self) -> Set[str]:
		"""
		List all project folders in the dataset folder.
		"""
		projects = [x for x in os.listdir(self.dataset_path) if os.path.isdir(os.path.join(self.dataset_path, x)) and not x.startswith(".")]
		return set(projects)

	def all_files(self) -> Set[Tuple[str, str, str]]:
		"""
		Find all Loom files in the dataset folder.

		Expects .loom extension name.

		Returns a set of tuples with:
			- project folder name (str),
			- file name (str)
			- absolute file path (str)
		"""
		projects = self.all_projects()
		loom_files = []
		for project in projects:
			project_path = os.path.join(self.dataset_path, project)
			if os.path.exists(project_path):
				project_files = os.listdir(project_path)
				for filename in project_files:
					if filename.endswith(".loom"):
						absolute_path = os.path.join(project_path, filename)
						loom_files.append((project, filename, absolute_path))
		return set(loom_files)

	def matching_filenames(self, filename: str) -> Set[Tuple[str, str, str]]:
		"""
		List all matching loom files in the dataset folder.
		If filename is an absolute path, there will be at most one match (obviously)

		Args:
			filename (string):		Filename of the loom file to match against (e.g. "Midbrain_20160701.loom"). May be an absolute path

		Returns a set of tuples with
			- project folder name (str),
			- file name (str)
			- absolute file path (str)
		"""
		if not filename.endswith(".loom"):
			filename += ".loom"

		if self.is_abspath(filename):
			split_abspath = self.split_from_abspath(filename)
			if split_abspath is not None:
				return {split_abspath}
			else:
				return set()
		else:
			matching_files = []
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

		Returns a set of tuples with
			- project folder name (str),
			- file name (str)
			- absolute file path (str)
		"""
		project_path = os.path.join(self.dataset_path, project)
		if os.path.exists(project_path):
			project_files = os.listdir(project_path)
			return {(project, filename, os.path.join(project_path, filename)) for filename in project_files if filename.endswith(".loom")}
		else:
			return set()


class LoomDatasetConnections(object):
	"""
	An object for handling opening connections and expanders to the loom files in the local dataset directory in a concurrent setting (using semaphores)

	Expanders are self-closing, but connections require a manual release.
	"""
	__slots__ = [
		"dataset_path",
		"list",
		"projects",
		"files",
		"dataset_locks",
	]

	def __init__(self, dataset_path: str = None) -> None:
		self.dataset_path = dataset_path
		self.list = LoomDatasetLists(dataset_path)
		self.projects = set()             # type: Set[str]
		self.files = set()                # type: Set[Tuple[str, str, str]]
		self.dataset_locks = {}           # type: Dict[str, BoundedSemaphore]

	def update_list(self) -> None:
		"""
		Scan dataset folder for new project folders
		Scan project folders for new loom files.
		Note that this does not handle deleted project folders or loom files,
		LoomDatasets needs to be closed and re-opened for that.
		"""
		ds_path = self.dataset_path
		logging.debug("Adding expander semaphores for new loom files in %s", ds_path)
		all_files = self.list.all_files()
		# if a tuple is in the new set,
		# but not in the old one, it's a new file
		new_files = all_files - self.files
		for project, filename, file_path in new_files:
			self.projects.add(project)
			logging.debug("  semaphore added for %s", file_path)
			self.dataset_locks[file_path] = BoundedSemaphore(value=1)
		# Store updated set of all files
		self.files = all_files

	def acquire(self, project: str, filename: str, timeout: float=10) -> bool:
		"""
		Attempt to acquire lock for a given loom file.

		Returns True if successfull, and False if not.
		"""
		absolute_path = self.list.absolute_file_path(project, filename)
		if absolute_path is not "":
			try:
				lock = self.dataset_locks.get(absolute_path)
				if lock is not None and lock.acquire(blocking=True, timeout=timeout):
					return True
				elif lock is None:
					logging.debug("    %s not among semaphores", absolute_path)
				elif lock.locked():
					logging.debug("    Lock not acquired")
			except TimeoutError as t:
				# May happen when multiple acquires were called before
				# timeout was reached. This is not a bug, so we just
				# return None to indicate that acquisition has failed
				pass
		return False

	def release(self, project: str, filename: str) -> None:
		"""
		Release lock for a given loom file.

		Will raise an error if it was not locked.
		"""
		absolute_path = self.list.absolute_file_path(project, filename)
		if absolute_path is not "":
			lock = self.dataset_locks.get(absolute_path)
			if lock is not None:
				lock.release()

	def locked(self, project: str, filename: str) -> bool:
		"""
		Return a boolean indicating whether a connection or expander can be acquired.
		"""
		absolute_path = self.list.absolute_file_path(project, filename)
		if absolute_path is not "":
			lock = self.dataset_locks[absolute_path]
			if lock is not None:
				return lock.locked()
		return True

	def connect(self, project: str, filename: str, mode: str="r+", timeout: float=10) -> LoomConnection:
		"""
		Try to connect to a local loom file. If returns None already connected.

		Uses a semaphore to ensure there is never more than one connection
		open to a loom file (as long as this is the only object that connects to the loom file)

		Remember to call `release(project, filename)` after closing the connection!

		Args:
			- project (string): 		Name of the project (e.g. "Midbrain")
			- filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")

		Returns:
			A loom file connection, or None if file does not exist or was already connected.
		"""
		if self.acquire(project, filename, timeout):
			absolute_path = self.list.absolute_file_path(project, filename)
			return LoomConnection(absolute_path, mode)
		return None

	def acquire_expander(self, project: str, filename: str, timeout: float=10) -> LoomExpand:
		"""
		Create LoomExpand object for a local loom file in the project subdirectory.
		Uses a semaphore to ensure there is never more than one connection
		open to a loom file (as long as this is the only object that connects to the loom file)

		Will unlock the semaphore by itself when closed.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			timeout (float):				Time to wait for connection to become available in seconds, or None to wait indefinitely

		Returns:
			A LoomExpander instance, or None if loom file does not exist or access to it is not authorized.
		"""
		if self.acquire(project, filename, timeout):
			absolute_path = self.list.absolute_file_path(project, filename)
			expander = None
			try:
				expander = LoomExpand(project, filename, absolute_path, self._release_expander)
				return expander
			except Exception as e:
				if expander is not None:
					expander.close()
				if self.locked(project, filename):
					self.release(project, filename)
		return None

	def _release_expander(self, expander: LoomExpand) -> None:
		"""
		Release the lock associated with an acquired expander.
		This should never be called manually - it is called automatically from within the expander when the latter is closed.
		"""
		if not expander.closed:
			lock = self.dataset_locks[expander.file_path]
			lock.release()


class LoomDatasets(object):
	"""
	An object for extracting JSON from the loom files in the local dataset directory.

	Assumes it is the only object connecting to the loom files in the dataset folder.
	"""
	__slots__ = [
		"dataset_path",
		"list",
		"connections",
		"projects",
		"files",
		"dataset_last_mtime",
		"dataset_last_mod",
		"metadata_entries",
		"attribute_entries",
		"expansion_entries"
	]

	def __init__(self, dataset_path: str = None) -> None:
		"""
		Create a LoomDatasets object that will help with connecting to loom files
		in the specified datasets folder
		"""
		self.dataset_path = dataset_path
		self.connections = LoomDatasetConnections(dataset_path)
		self.list = self.connections.list

		self.projects = set()             # type: Set[str]
		self.files = set()                # type: Set[Tuple[str, str, str]]

		self.dataset_last_mtime = {}      # type: Dict[str, str]
		self.dataset_last_mod = {}        # type: Dict[str, str]
		self.metadata_entries = {}        # type: Dict[str, Tuple[str, str]]
		self.attribute_entries = {}       # type: Dict[str, Tuple[str, str]]
		self.expansion_entries = {}       # type: Dict[str, LoomExpand]

		# Find all projects and loom files in the dataset folder
		self.update_dataset_list()

	def update_dataset_list(self) -> None:
		"""
		Scan dataset folder for new project folders
		Scan project folders for new loom files.
		Note that this does not handle deleted project folders or loom files,
		LoomDatasets needs to be closed and re-opened for that.
		"""
		# update semaphores
		self.connections.update_list()

		ds_path = self.dataset_path
		logging.debug("Updating files listed in %s", ds_path)
		all_files = self.list.all_files()
		for project, filename, file_path in all_files:
			self.projects.add(project)
		self.files = all_files

	def last_mod(self, file_path: str) -> str:
		"""
		Returns the last time the content of the Loom file was modified.
		If this changed since the last time this was called, an expander
		will be passed as well (for performing updates if necessary)

		Args:
			file_path (string):     Absolute path to Loom file

		Returns a tuple with two entries:
			- An ISO8601 timestamp, UTC timezone, compact format (e.g. "20180124T100436.901000Z").
			- A LoomExpand connection, if the loom file was modified since the last time this function was called this was called. None otherwise.
		"""
		cached_mtime = self.dataset_last_mtime.get(file_path, "")
		cached_mod = self.dataset_last_mod.get(file_path, "")
		last_mtime = format_mtime(file_path)
		if cached_mtime < last_mtime:
			project, filename, _ = self.list.split_from_abspath(file_path)
			expander = self.connections.acquire_expander(project, filename)
			if expander is not None:
				last_mod = expander.last_modified()
				if last_mod is not None and cached_mod < last_mod:
					# update last_mod
					self.dataset_last_mod[file_path] = last_mod
				# the expander might modify the mtime, meaning
				# we need to cache that again after closing it
				expander.close()
				last_mtime = format_mtime(file_path)
				self.dataset_last_mtime[file_path] = last_mtime
				return last_mod
		return cached_mod

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
			True (authorized) or False (not authorized).
		"""

		# Not the strongest protection, but better than nothing.
		# Basically, we only proceed to check if the provided
		# project string matches the list of project directory names
		# that we selected earlier ourselves.
		if project not in self.projects:
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

	def authorized_projects(self, username: str, password: str, mode: str ="read") -> Set[str]:
		"""
		Returns a set of all projects that are authorized for access with
		the given username and password
		"""
		projects = self.list.all_projects()
		return {p for p in projects if self.authorize(p, username, password)}

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
		authorized_projects = self.authorized_projects(username, password)

		for project, filename, file_path in self.files:
			if project in authorized_projects:
				key = "%s/%s" % (project, filename)
				logging.debug(key)
				metadata = self.JSON_metadata(project, filename)
				if metadata is not None:
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
			project (string):       Name of the project (e.g. "Midbrain")
			filename (string):      Filename of the loom file (e.g. "Midbrain_20160701.loom")
			truncate (bool):        Whether to overwrite previously expanded metadata files (defaults to False)

		Returns:
			a string of the JSON serialision of the metadata for the loom file at project/filename.
		"""
		absolute_file_path = self.list.absolute_file_path(project, filename)
		if absolute_file_path is "":
			logging.debug("  Invalid or inaccessible path to loom file")
			return None

		key = "%s/%s" % (project, filename)
		md_filename = "%s.file_md.json.gzip" % (absolute_file_path)

		# See if metadata was already loaded before
		metadata, cached_mod = self.metadata_entries.get(key, ("", ""))
		# get timestamp of most recent time file content was modified
		last_mod = self.last_mod(absolute_file_path)

		if truncate:
			logging.debug("  Truncate set, overwriting cache")
			expander = self.connections.acquire_expander(project, filename)
			if expander is None or expander.closed:
				# Only happens in case of concurrent access and time-out
				logging.debug("    connecting to loom file timed out, cancelling truncation")
				return None
			metadata, cached_mod = expander.metadata(True)
			expander.close(True)
			logging.debug("    cache replaced")
		elif metadata is not "" and cached_mod == last_mod:
			# If metadata is cached and up-to-date, return cache
			logging.debug("  Loaded %s from cache", key)
		else:
			# if not truncating nor previously loaded,
			# see if expanded and up-to-date JSON exists
			if os.path.isfile(md_filename) and cached_mod == last_mod:
				logging.debug("  Found previously extracted JSON file, loading")
				metadata = load_gzipped_json_string(md_filename)
				md_mod_filename = "%s.file_md.lastmod.gzip" % (absolute_file_path)
				cached_mod = load_gzipped_json_string(md_mod_filename)
			# If JSON does not exist or is out of date,
			# generate/update metadata and attributes
			if metadata is "" or cached_mod < last_mod:
				logging.debug("  Invalid or outdated JSON cache, attempting expansion")
				# expander may have been acquired through self.last_mod
				expander = self.connections.acquire_expander(project, filename)
				if expander is None or expander.closed:
					logging.debug("  Could not acquire expander")
					return None
				metadata, last_mod = expander.metadata(False)
				cached_mod = last_mod
				expander.close(True)

		self.metadata_entries[key] = (metadata, cached_mod)
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
		absolute_file_path = self.list.absolute_file_path(project, filename)
		if absolute_file_path is "":
			logging.debug("  Invalid or inaccessible path to loom file")
			return None

		key = "%s/%s" % (project, filename)
		attrs_name = "%s.attrs.json.gzip" % (absolute_file_path)

		# See if attributes were already loaded before
		attributes, cached_mod = self.attribute_entries.get(key, ("", ""))
		# get timestamp of most recent time file content was modified
		last_mod = self.last_mod(absolute_file_path)

		if truncate:
			logging.debug("  Truncate set, overwriting cache")
			expander = self.connections.acquire_expander(project, filename)
			if expander is None or expander.closed:
				# Only happens in case of concurrent access and time-out
				logging.debug("    connecting to loom file timed out, cancelling truncation")
				return None
			attributes, cached_mod = expander.attributes(True)
			expander.close(True)
			logging.debug("    cache replaced")
		elif attributes is not "" and cached_mod == last_mod:
			# If attributes is cached and up-to-date, return cache
			logging.debug("  Loaded %s from cache", key)
		else:
			# if not truncating nor previously loaded,
			# see if expanded and up-to-date JSON exists
			if os.path.isfile(attrs_name) and cached_mod == last_mod:
				logging.debug("  Found previously extracted JSON file, loading")
				attributes = load_gzipped_json_string(attrs_name)

			# Otherwise, generate/update attributes and attributes
			if attributes is "" or cached_mod < last_mod:
				logging.debug("  Invalid or outdated JSON cache, attempting expansion")
				expander = self.connections.acquire_expander(project, filename)
				if expander is None or expander.closed:
					logging.debug("  Could not acquire expander")
					return None
				attributes, last_mod = expander.attributes(False)
				cached_mod = last_mod
				expander.close(True)

		self.attribute_entries[key] = (attributes, cached_mod)
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

		absolute_file_path = self.list.absolute_file_path(project, filename)
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

		row_mod_filename = "%s.rows.lastmod.gzip" % absolute_file_path
		row_mod = load_gzipped_json_string(row_mod_filename)
		last_mod = self.last_mod(absolute_file_path)

		if row_mod < last_mod:
			expander = self.connections.acquire_expander(project, filename)
			if expander is None or expander.closed:
				return None
			expander.clear_rows()

		if os.path.isdir(row_dir) and last_mod is row_mod:
			logging.debug("%s.rows/ directory detected, loading expanded rows", filename)

		for i in row_numbers:
			row_file_name = "%s/%06d.json.gzip" % (row_dir, i)
			if os.path.exists(row_file_name):
				retRows.append(load_gzipped_json_string(row_file_name))
				retRows.append(comma)
			else:
				unexpanded.append(i)

		if len(unexpanded) is 0:
			retRows[len(retRows) - 1] = "]"
		elif len(unexpanded) > 0:
			logging.debug("Acquiring expander for uncached rows")
			if expander is None or expander.closed:
				expander = self.connections.acquire_expander(project, filename)
			if expander is None or expander.closed:
				return None
			logging.debug("Expanding for uncached rows")
			expanded_rows, _ = expander.selected_rows(unexpanded)
			logging.debug("Closing expander")
			expander.close(True)
			if len(row_numbers) is len(unexpanded):
				# all rows were newly expanded
				return expanded_rows
			# remember, expanded_rows is a string already!
			retRows.append(expanded_rows[1:])
		retRows_json = "".join(retRows)
		return retRows_json

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

		absolute_file_path = self.list.absolute_file_path(project, filename)
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

		col_mod_filename = "%s.cols.lastmod.gzip" % absolute_file_path
		col_mod = load_gzipped_json_string(col_mod_filename)
		last_mod = self.last_mod(absolute_file_path)

		if col_mod < last_mod:
			expander = self.connections.acquire_expander(project, filename)
			if expander is None or expander.closed:
				return None
			expander.clear_rows()

		if os.path.isdir(col_dir) and last_mod is col_mod:
			logging.debug("%s.cols/ directory detected, loading expanded columns", filename)

		for i in column_numbers:
			col_file_name = "%s/%06d.json.gzip" % (col_dir, i)
			if os.path.exists(col_file_name):
				retCols.append(load_gzipped_json_string(col_file_name))
				retCols.append(comma)
			else:
				unexpanded.append(i)

		if len(unexpanded) is 0:
			retCols[len(retCols) - 1] = "]"
		elif len(unexpanded) > 0:
			logging.debug("Acquiring expander for uncached columns")
			if expander is None or expander.closed:
				expander = self.connections.acquire_expander(project, filename)
			if expander is None or expander.closed:
				return None
			logging.debug("Expanding for uncached rows")
			expanded_cols, _ = expander.selected_columns(unexpanded)
			logging.debug("Closing expander")
			expander.close(True)
			if len(column_numbers) is len(unexpanded):
				# all columns were newly expanded
				return expanded_cols
			# remember, expanded_cols is a string already!
			retCols.append(expanded_cols[1:])

		return "".join(retCols)

	def tile(self, project: str, filename: str, truncate: bool = False) -> None:
		absolute_path = self.list.absolute_file_path(project, filename)
		ds = None
		if absolute_path is not "":
			try:
				lock = self.connections.dataset_locks.get(absolute_path)
				if lock is not None and lock.acquire(blocking=True, timeout=10):
					ds = LoomConnection(absolute_path, 'r')
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
