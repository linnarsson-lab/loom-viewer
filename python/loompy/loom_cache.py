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

import os.path
import csv
import loompy
import re
import json
import time

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

	def _authorize(self, proj, username, password):
		users = {}
		authfile = os.path.join(self.dataset_path, proj, "auth.txt")
		if not os.path.exists(authfile):
			return True
		else:
			try:
				with open(os.path.join(self.dataset_path, proj, "auth.txt")) as f:
					lines = [x.split(",") for x in f.read().splitlines()]
					users = {x[0]: x[1] for x in lines }
			except IndexError:
				return False
		return users.has_key(username) and users[username] == password

	def list_datasets(self, username=None, password=None):
		"""
		Return a list of (project, filename) tuples for loom files cached locally.
		"""
		projects = [x for x in os.listdir(self.dataset_path) if not x.startswith(".")]
		result = []
		for proj in projects:
			if self._authorize(proj, username, password):
				for f in os.listdir(os.path.join(self.dataset_path, proj)):
					if f.endswith(".loom"):
						ds = self.connect_dataset_locally(proj, f, username, password)
						title = ds.attrs.get("title", f) 
						descr = ds.attrs.get("description", "") 
						url = ds.attrs.get("url", "")
						doi = ds.attrs.get("doi", "")
						result.append({"project": proj, "filename": f, "dataset": f, "title": title, "description": descr, "url":url, "doi":doi})
		return result

	def connect_dataset_locally(self, project, filename, username=None, password=None):
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
		if self.looms.has_key(key):
			return self.looms[key]

		result = loompy.connect(absolute_path)
		self.looms[key] = result
		return result

	def close(self):
		for ds in self.looms.itervalues():
			ds.close()
			
	def get_absolute_path(self, project, filename, username=None, password=None):
		"""
		Return the absolute path to the dataset, if authorized.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			username (string):		Username or None
			password (string):		Password or None

		Returns:
			An absolute path string, or None if not authorized or file does not exist.	
		"""

		if not self._authorize(project, username, password):
			return None

		absolute_path = os.path.join(self.dataset_path, project, filename)
		if os.path.exists(absolute_path):
			return absolute_path
		else:
			return None