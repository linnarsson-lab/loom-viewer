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
from gcloud import storage
import loom
import re
import json
import time

_valid_pattern = "^[A-Za-z0-9_-]+__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+.loom$"

def list_datasets(self):
	"""
	Return a list of DatasetConfig objects for loom files stored remotely.
	"""
	client = storage.Client(project="linnarsson-lab")	# This is the Google Cloud "project", not same as our "project"
	bucket = client.get_bucket("linnarsson-lab-loom")
	result = []
	for blob in bucket.list_blobs():
		if blob.name.endswith(".json"):
			parts = blob.name.split("__")
			config = get_dataset_config(parts[0], parts[1], parts[2][:-5])
			result.append(config)
	return result

def get_dataset_config(transcriptome, project, dataset):
	client = storage.Client(project="linnarsson-lab")	# This is the Google Cloud "project", not same as our "project"
	bucket = client.get_bucket("linnarsson-lab-loom")
	config = DatasetConfig(transcriptome, project, dataset)
	blob = bucket.get_blob(config.get_json_filename()).download_as_string()
	temp = json.loads(blob)

	return DatasetConfig(
		transcriptome, 
		project, 
		dataset, 
		status = temp["status"], 
		message=temp["message"], 
		n_features=temp["n_features"], 
		cluster_method=temp["cluster_method"],
		regression_label=temp["regression_label"]
		)

class DatasetConfig(object):
	"""
	Configuration and status for a .loom file in Cloud Storage.

	This object is stored as a JSON string under they same key as the corresponding dataset, but with
	extension .json instead of .loom. 
	"""
	def __init__(self, transcriptome, project, dataset, status = "unknown", message = "", n_features = 1000, cluster_method = "AP", regression_label = "_Cluster"):
		"""
		Create a config object for a dataset.

		Args:
			transcriptome (string): 	Name of the transcriptome (e.g. "hg19_sUCSC")
			project (string): 			Name of the project (e.g. "Midbrain")
			dataset (string): 			Short name of the dataset (e.g. "human")
			status (string):			"willcreate", "creating", "created", "unknown", or "error"
			message (string):			A user-friendly message describing the current status (default: "").
			n_features (int):			Number of genes to select for clustering (default: 1000)
			cluster_method (string):	"AP" (affinity propagation; default) or "BackSPIN"
			regression_label (strign):	The name of the attribute that will be used to group cells for regression (default: "_Cluster")

		Returns:
			A DatasetConfig object.s
		"""
		self.transcriptome = transcriptome
		self.project = project
		self.dataset = dataset
		self.status = status
		self.message = message
		self.n_features = 1000
		self.cluster_method = cluster_method
		self.regression_label = regression_label

	def as_dict(self):
		return {
			"transcriptome": self.transcriptome,
			"project": self.project,
			"dataset": self.dataset,
			"status": self.status,
			"message": self.message,
			"n_features": self.n_features,
			"cluster_method": self.cluster_method,
			"regression_label": self.regression_label
		}

	def put(self):
		client = storage.Client(project="linnarsson-lab")
		bucket = client.get_bucket("linnarsson-lab-loom")
		bucket.store(self.get_json_filename())
		blob.upload(json.dumps(self.as_dict()))

	def set_status(self, status, message=""):
		self.status = status
		self.message = message
		self.put()
		print status + ": " + message

	def get_loom_filename(self):	# Haha, those strings below look like grumpy cats!
		return self.transcriptome + "__" + self.project + "__" + self.dataset + ".loom"

	def get_json_filename(self):
		return self.transcriptome + "__" + self.project + "__" + self.dataset + ".json"

class LoomCloud(object):
	"""
	Represents loom files in Cloud Storage.
	"""
	def __init__(self, cache_dir):
		"""
		Create a LoomCloud object that will cache loom files (on demand) in cache_dir

		Args:
			cache_dir (string): 	Path to the directory in which loom files should be cached as needed

		Returns:
			The LoomCloud object.
		"""
		self.local_root = cache_dir
		self.remote_root = "linnarsson-lab-loom"
		self.client = storage.Client(project="linnarsson-lab")
		self.looms = {}

	def list_datasets(self):
		"""
		Return a list of DatasetConfig objects for loom files stored remotely.

		"""
		return list_datasets()

	def refresh_cache(self):
		for ds in self.list_datasets():
			if self.looms.__contains__(ds.get_loom_filename()):
				continue
			absolute_path = os.path.join(self.local_root, name)
			if not os.path.isfile(absolute_path):
				print "Fetching %s for cache." % absolute_path
				bucket = self.client.get_bucket(self.remote_root)
				blob = bucket.blob(name)
				with open(absolute_path, 'wb') as outfile:
					blob.download_to_file(outfile)
			
		
	def connect_dataset_locally(self, transcriptome, project, dataset):
		"""
		Download the dataset (if needed) and connect it as a local loom file.

		Args:
			transcriptome (string): 	Name of the transcriptome (e.g. "hg19_sUCSC")
			project (string): 			Name of the project (e.g. "Midbrain")
			dataset (string): 			Short name of the dataset (e.g. "human")

		Returns:
			A loom file connection.	Note that only files that have status "created" can be connected.
		"""
		config = DatasetConfig(transcriptome, project, dataset)
		name = config.get_loom_filename()

		if self.looms.__contains__(config.get_loom_filename()):
			return self.looms[name]

		absolute_path = os.path.join(self.local_root, name)
		if not os.path.isfile(absolute_path):
			print "Fetching %s for cache." % absolute_path
			bucket = self.client.get_bucket(self.remote_root)
			blob = bucket.blob(name)
			with open(absolute_path, 'wb') as outfile:
				blob.download_to_file(outfile)
		result = loom.connect(absolute_path)
		self.looms[name] = result
		return result

# Keep downloading datasets to the local cache
if __name__ == '__main__':
	cloud = LoomCloud(sys.argv[0])
	while True:
		cloud.refresh_cache()
		time.sleep(60*5)		# Sleep 5 minutes		
