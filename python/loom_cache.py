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
import loom
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
				with open(os.path.join(proj, "auth.txt")) as f:
					users = {x[0]: x[1] for x in f.read().splitlines().split(",")}
			except IndexError:
				return False
		return users.has_key(username) and users[username] == password

	def list_datasets(self, username=None, password=None):
		"""
		Return a list of (project, filename) tuples for loom files cached locally.
		"""
		projects = [x[0] for x in os.walk(self.dataset_path)]
		result = []
		for projpath in projects:
			proj = os.path.basename(os.path.normpath(projpath))
			if self._authorize(proj, username, password):
				for f in os.listdir(projpath):
					if f.endswith(".loom"):
						result.append({"project": proj, "filename": f})
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

		result = loom.connect(absolute_path)
		self.looms[key] = result
		return result

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

		if not self._authorize(proj, username, password):
			return None

		absolute_path = os.path.join(self.dataset_path, project, filename)
		if os.path.exists(absolute_path):
			return absolute_path
		else:
			return None