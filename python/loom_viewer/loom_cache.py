# Copyright (c) 2016 Sten Linnarsson
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# * Redistributions of source code must retain the above copyright notice, this
#   list of conditions and the following disclaimer.
#
# * Redistributions in binary form must reproduce the above copyright notice,
#   this list of conditions and the following disclaimer in the documentation
#   and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import gzip
import os.path
import time
import logging
import loompy
import json

def load_compressed_json(filename):
	with gzip.open(filename,"rt") as f:
		jsonVal = f.read()
		return jsonVal

class LoomCache(object):
	"""
	Represents loom files in the local dataset directory
	"""

	def __init__(self, dataset_path):
		"""
		Create a LoomCache object that will cache loom files (on demand)

		Returns:
			The LoomCache object.
		"""
		if not os.path.exists(dataset_path):
			os.makedirs(dataset_path)
		self.dataset_path = dataset_path
		self.looms = {}
		self.list_entries = {}

	def authorize(self, project, username, password, mode="read"):
		"""
		Check authorization for the specific project and credentials

		Args:
			project (str):		Project name
			username (str):	Username
			password (str):		Password
			mode (str):			"read" or "write"

		Read access will be allowed if the credentials are valid, or if there is no auth.txt file
		in the project directory. Write access will only be allowed if the credentials match
		an existing auth.txt file (with 'w' flag for the user).
		"""
		users = {}
		authfile = os.path.join(self.dataset_path, project, "auth.txt")
		if not os.path.exists(authfile):
			return True if mode == "read" else False
		else:
			try:
				with open(authfile) as f:
					lines = [x.split(",") for x in f.read().splitlines()]
					users = {x[0]: (x[1], x[2]) for x in lines}
			except IndexError:
				return False
		if mode == "read":
			if '*' in users:
				return True
			if username in users and users[username][0] == password:
				return True
		else:
			if username in users and users[username][0] == password and users[username][1] == "w":
				return True
		return False

	def list_datasets(self, username=None, password=None):
		"""
		Return a list of (project, filename) tuples for loom files cached locally.
		"""
		projects = [x for x in os.listdir(self.dataset_path) if not x.startswith(".")]
		result = []
		for project in projects:
			if self.authorize(project, username, password):
				for filename in os.listdir(os.path.join(self.dataset_path, project)):
					if filename.endswith(".loom"):
						key = project + "/" + filename
						list_entry = self.list_entries.get(key)
						# if list_entry is cached and the file has not changed, use
						# cached list_entry, else recreate list_entry from loom file
						# (also, note that we don't update pickled files - that must
						#  be done manually when uploading a changed loom file!)
						if list_entry is None or self.format_last_mod(project, filename) != list_entry["lastModified"]:

							path = self.get_absolute_path(project, filename, username, password)
							md_filename = '%s.file_md.json.gzip' % (path)
							if os.path.isfile(md_filename):
								logging.debug('Loading metadata from %s' % (md_filename))
								list_entry = json.loads(load_compressed_json(md_filename))
							else:
								logging.debug('%s does not exist, using hdf5 fallback' % (md_filename))
								ds = self.connect_dataset_locally(project, filename, username, password)
								if ds is None:
									continue
								print("Outdated list-entry for " + key +", updating cache")
								list_entry = self.make_list_entry(project, filename, ds)

							self.list_entries[key] = list_entry

						result.append(list_entry)
		return result

	def make_list_entry(self, project, filename, ds):
		"""
		Generate object containing list entry metadata
		"""
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
		last_mod = self.format_last_mod(project, filename)
		creation_date = ds.attrs.get("creation_date", last_mod)
		return {
			"project": project,
			"filename": filename,
			"dataset": filename,
			"title": title,
			"description": descr,
			"url":url,
			"doi": doi,
			"creationDate": creation_date,
			"lastModified": last_mod,
			"totalCells": total_cells,
			"totalGenes": total_genes,
		}

	def format_last_mod(self, project, filename):
		"""
		Returns the last time the file was modified as a string,
		formatted year/month/day hour:minute:second
		"""
		path = os.path.join(self.dataset_path, project, filename)
		mtime = time.gmtime(os.path.getmtime(path))
		return time.strftime('%Y/%m/%d %H:%M:%S', mtime)

	def connect_dataset_locally(self, project, filename, username=None, password=None, mode='r+'):
		"""
		Download the dataset (if needed) and connect it as a local loom file.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			username (string):		Username or None
			password (string):		Password or None

		Returns:
			A loom file connection, or None if not authorized or file does not exist.
		"""

		# Authorize and get path
		absolute_path = self.get_absolute_path(project, filename, username, password)
		if absolute_path == None:
			return None

		key = project + "/" + filename
		cache = self.list_entries.get(key)
		if key in self.looms and cache != None and cache["lastModified"] == self.format_last_mod(project, filename):
			print("Serving dataset " + key +" from cache")
			return self.looms[key]

		try:
			result = loompy.connect(absolute_path, mode)
		except:
			return None
		self.looms[key] = result
		return result
	def update_cache(self, project, filename, username=None, password=None):
		"""
		Updates the cache if file was modified according to the OS
		"""
		# Similarly, update data in list_entry if required
		key = project + "/" + filename
		list_entry = self.list_entries.get(key)
		if list_entry is None or self.format_last_mod(project, filename) != list_entry["lastModified"]:
			print("Outdated cache for " + key + ", updating")
			# since we only use this function when the file has changed,
			# we can simply call connect_dataset_locally to update the cache
			ds = connect_dataset_locally(project, filename, username, password)
			# after updating the ds, we can update the list_entry
			list_entry = self.make_list_entry(project, filename, ds)
			self.list_entries[key] = list_entry

	def close(self):
		for ds in self.looms.values():
			ds.close()

	def get_absolute_path(self, project, filename, username=None, password=None, check_exists=True):
		"""
		Return the absolute path to the dataset, if authorized.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			username (string):		Username or None
			password (string):		Password or None
			check_exists (bool):	If true, return None if the file does not exist

		Returns:
			An absolute path string, or None if not authorized or file does not exist.
		"""

		if not self.authorize(project, username, password):
			return None

		absolute_path = os.path.join(self.dataset_path, project, filename)
		if os.path.exists(absolute_path) or not check_exists:
			return absolute_path
		else:
			return None
