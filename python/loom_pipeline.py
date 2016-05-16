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



from __future__ import division
import numpy as np
import os.path
import os
import __builtin__
import time
import loom
from loom_backspin import BackSPIN
from loom_cloud import DatasetConfig
from loom_cloud import list_datasets
import tempfile
import re
from gcloud import storage
import pymysql
import pymysql.cursors
import csv
from sklearn.cluster.affinity_propagation_ import affinity_propagation
import hdbscan
import logging

logger = logging.getLogger("loom")



class LoomPipeline(object):
	"""
	Pipeline to collect datasets from MySQL, create .loom files and perform standard analyses.
	"""
	def __init__(self, host = '104.197.219.40',	port = 3306, username = 'cloud_user', password = 'cloud_user'):
		self.mysql_connection = pymysql.connect(host=host, port=port, user=username, password=password, db='joomla', charset='utf8mb4')

	def _make_std_numpy_type(self, array, sql_type):
		field_type = {
			  0: "float",
			  1: "int",
			  2: "int",
			  3: "int",
			  4: "float",
			  5: "float",
			  6: "string",
			  7: "string",
			  8: "string",
			  9: "int",
			 10: "string",
			 11: "string",
			 12: "string",
			 13: "int32",
			 14: "string",
			 15: "string",
			 16: "int",
			246: "int",
			247: "string",
			248: "string",
			249: "string",
			250: "string",
			251: "string",
			252: "string",
			253: "string",
			254: "string",
			255: "string" 
		}
		try:
			return np.array(array).astype(field_type[sql_type])
		except:
			# So there might be some Nones, we need to fix that
			temp = np.array(array)
			temp[temp == np.array(None)] = 0
			return temp.astype(field_type[sql_type])

	def create_loom(self, config):
		"""
		Create a loom file by collecting cells from MySQL

		Args:
			config (DatasetConfig):	Configuration object for the dataset

		Returns:
			Nothing, but creates a .loom file
		"""
		transcriptome = config.transcriptome
		project = config.project
		dataset = config.dataset
		connection = self.mysql_connection
		logger.info("Processing: " + config.get_json_filename())
		
		# Get the transcriptome ID
		try:
			cursor = connection.cursor()
			cursor.execute('SELECT ID from jos_aaatranscriptome WHERE name = %s', transcriptome)
			transcriptome_id = cursor.fetchone()[0]
		except:
			raise ValueError, ("Could not find transcriptome ID for '%s'" % transcriptome)
		cursor.close()
		# Download gene annotations
		cursor = connection.cursor()
		query = """
			SELECT 
				jos_aaatranscriptomeid TranscriptID,
				Name,
				Type,
				GeneName,
				EntrezID,
				Description,
				Chromosome,
				Start,
				End,
				Length,
				Strand,
				ds.*
			FROM jos_aaatranscript tr
			LEFT JOIN datasets__%s.Genes__%s__%s ds 
			ON tr.jos_aaatranscriptomeid = ds.TranscriptID 
			WHERE tr.jos_aaatranscriptomeid = %d
			AND tr.Type <> "repeat"
			ORDER BY tr.ExprBlobIdx
		"""
		try:
			cursor.execute(query % (transcriptome, project, dataset, transcriptome_id))
		except ProgrammingError as pe:
			logger.error(pe)
			config.set_status("error","Dataset definition not found in database")
			return
				
		N_STD_FIELDS = 11 # UPDATE THIS IF YOU CHANGE THE SQL ABOVE!! 
		
		transcriptome_headers = map(lambda x: x[0],cursor.description)
		rows = cursor.fetchall()
		row_attrs = {}
		for i in xrange(len(transcriptome_headers)):
			hdr = transcriptome_headers[i]
			if i >= N_STD_FIELDS:
				hdr = "(" + dataset + ")_" + hdr
			row_attrs[hdr] = []
			for j in xrange(len(rows)):
				row_attrs[hdr].append(rows[j][i])
		cursor.close()

		# Convert to standard numpy types
		for ix in xrange(len(cursor.description)):
			row_attrs[cursor.description[ix][0]] = self._make_std_numpy_type(row_attrs[cursor.description[ix][0]], cursor.description[ix][1])
		gene_ids = row_attrs["TranscriptID"]
		
		matrix = []
		col_attrs = {}

		# Fetch counts
		nrows = 0
		
		# Fetch 1000 rows at a time
		while True:
			cursor = connection.cursor()
			cursor.execute("""
				SELECT  
					e.CellID,
					e.TranscriptomeID,
					ChipWell,
					PlateWell,
					Diameter,
					Area,
					Red,
					Green,
					Blue,
					c.Valid,
					ChipID,
					StrtProtocol,
					DateDissected,
					DateCollected,
					h.Species,
					Strain,
					DonorID,
					h.Age,
					h.Sex,
					h.Weight,
					h.Tissue,
					h.Treatment,
					h.SpikeMolecules,
					h.Comments,
					h.User,
					p.Time,
					Title,
					ProductionDate,
					PlateID,
					PlateReference,
					SampleType,
					CollectionMethod,
					FragmentLength,
					MolarConcentration,
					WeightConcentration,
					Protocol,
					BarcodeSet,
					Status,
					Comment,
					Aligner,
					ds.*,
					Data
				FROM jos_aaacell c 
				LEFT JOIN jos_aaachip h 
					ON c.jos_aaachipid=h.id 
				LEFT JOIN jos_aaaproject p 
					ON h.jos_aaaprojectid=p.id
				JOIN cells10k.ExprBlob e
					ON e.CellID=c.id
				JOIN datasets__%s.Cells__%s__%s ds 
					ON ds.CellID = c.id
				WHERE c.valid=1 AND e.TranscriptomeID = %s
				LIMIT 1000 OFFSET %s
			""" % (transcriptome, project, dataset, transcriptome_id, nrows))

			N_STD_FIELDS = 40	# UPDATE THIS IF YOU CHANGE THE SQL ABOVE!! 
								# Count all standard fields but not including "Data"
								# NOTE: Data field should always be last!
								
			if cursor.rowcount <= 0:
				if nrows == 0:
					print "No data available for this transcriptome: %d " % transcriptome_id
				break
			
			headers = map(lambda x: x[0], cursor.description)[:-2] # -2 because we don't want to include "Data"
			if nrows == 0:
				for i in xrange(len(headers)):		
					if i >= N_STD_FIELDS:
						headers[i] = "(" + dataset + ")_" + headers[i]
					col_attrs[headers[i]] = []
			dt = np.dtype('int32')  # datatype for unpacking the Data blob
			dt = dt.newbyteorder('>')
			for row in cursor:
				data = np.frombuffer(row[-1], dt)
				matrix.append(data)
				for i in xrange(len(headers)):
					col_attrs[headers[i]].append(row[i])
			nrows += cursor.rowcount
			cursor.close()

		# End of while-loop

		# Convert to the appropriate numpy datatype
		for ix in xrange(len(headers)):
			col_attrs[headers[ix]] = self._make_std_numpy_type(col_attrs[headers[ix]], cursor.description[ix][1])
		cell_ids = col_attrs["CellID"]

		# Create the loom file
		print len(matrix)
		print col_attrs["CellID"].shape
		print row_attrs["TranscriptID"].shape
		counts = np.array(matrix).transpose()
		print counts.shape
		loom.create(config.get_loom_filename(), counts, row_attrs, col_attrs)
			
	def prepare_loom(self, config):
		"""
		Prepare a loom file for browsing: clustering, projection, regression

		Args:
			config (DatasetConfig):	Configuration object for the dataset

		Returns:
			Nothing, but modifies the .loom file to add the following attributes:

			For cells:

				_PC1, _PC2			First and second principal component
				_tSNE1, _tSNE2		tSNE coordinates 1 and 2
				_Ordering			Ordering based on clustering
				_Cluster 			Cluster label
				_TotalRNA			Total number of RNA molecules (across included genes only)

			For genes:

				_Ordering			Ordering based on clustering
				_Cluster 			Cluster label
				_LogMean			Log of mean expression level
				_LogCV				Log of CV
				_Excluded			1 if the gene was excluded by feature selection, 0 otherwise
				_Noise				Excess noise above the noise model		

		"""

		# Connect
		config.set_status("creating", "Preparing the dataset: Step 0 (connecting).")
		ds = loom.connect(config.get_loom_filename())

		# feature selection
		config.set_status("creating", "Preparing the dataset: Step 1 (feature selection).")
		ds.feature_selection(config.n_features)

		# Projection
		config.set_status("creating", "Preparing the dataset: Step 2 (projection to 2D).")
		ds.project_to_2d()

		# Clustering
		if config.cluster_method == "BackSPIN_notimplemented":
			config.set_status("creating", "Preparing the dataset: Step 3 (BackSPIN clustering).")
			bsp = BackSPIN()
			result = bsp.backSPIN(ds)
			result.apply(dataset)

		elif config.cluster_method == "AP":
			config.set_status("creating", "Preparing the dataset: Step 3A (Affinity propagation on cells).")
			# Cells
			S = -ds.corr_matrix(axis = 1)
			preference = np.median(S) * 10
			cluster_centers_indices, labels = affinity_propagation(S, preference=preference)
			ds.set_attr("_Cluster", labels, axis = 1)
			ordering = np.argsort(labels)
			ds.set_attr("_Ordering", ordering, axis = 1)
			ds.permute(ordering, axis = 1)

			config.set_status("creating", "Preparing the dataset: Step 3B (Affinity propagation on genes).")
			# Genes
			S = -ds.corr_matrix(axis = 0)
			preference = np.median(S) * 10
			cluster_centers_indices, labels = affinity_propagation(S, preference=preference)
			ds.set_attr("_Cluster", labels, axis = 0)
			ordering = np.argsort(labels)
			ds.set_attr("_Ordering", ordering, axis = 0)
			ds.permute(ordering, axis = 0)

		elif config.cluster_method == "HDBSCAN":
			config.set_status("creating", "Preparing the dataset: Step 3A (HDBSCAN on cells).")
			# Cells
			S = -ds.corr_matrix(axis = 1)
			clusterer = hdbscan.HDBSCAN(min_cluster_size=10)
			labels = clusterer.fit_predict(S)
			ds.set_attr("_Cluster", labels, axis = 1)
			ordering = np.argsort(labels)
			ds.set_attr("_Ordering", ordering, axis = 1)
			ds.permute(ordering, axis = 1)

			config.set_status("creating", "Preparing the dataset: Step 3B (HDBSCAN on genes).")
			# Genes
			S = -ds.corr_matrix(axis = 0)
			labels = clusterer.fit_predict(S)
			ds.set_attr("_Cluster", labels, axis = 0)
			ordering = np.argsort(labels)
			ds.set_attr("_Ordering", ordering, axis = 0)
			ds.permute(ordering, axis = 0)

		# Regression
		config.set_status("creating", "Preparing the dataset: Step 4 (bayesian regression).")
		#ds.bayesian_regression(config.regression_label)

		# Heatmap tiles
		config.set_status("creating", "Preparing the dataset: Step 5 (preparing heatmap tiles).")
		ds.prepare_heatmap()

	def store_loom(self, config):
		client = storage.Client(project="linnarsson-lab")	# This is the Google Cloud "project", not same as our "project"
		bucket = client.get_bucket("linnarsson-lab-loom")
		config = DatasetConfig(config.transcriptome, config.project, config.dataset)
		blob = bucket.blob(config.get_loom_filename())
		blob.upload_from_filename(config.get_loom_filename())
		config.set_status("created", "Ready to browse.")
		
	def upload(self, config, cell_attrs, gene_attrs = None):
		"""
		Upload a custom dataset annotation to MySQL.

		Args:
			config (DatasetConfig):	Configuration for the dataset
			cell_attrs (dict):		Optional dictionary of cell annotations (numpy arrays)
			gene_attrs (dict): 		Optional dictionary of gene annotations (numpy arrays)

		Returns:
			Nothing.

		At least cell_attrs must be given. Both are dictionaries where the keys are attribute 
		names and the values are numpy arrays (of the same length). The 'CellID' (integer) field is required for
		cell_attrs, and the 'TranscriptID' (integer) is required for gene_attrs. However, if TranscriptID is a string
		array, integer TranscriptIDs will be created for you using the given transcriptome. Similarly, if CellID
		is not an integer array but a string array, it will be interpreted as a cell identifier based on the ChipID and
		PlateWell fields in the database (separated by an underscore). For example if CellID contains strings like
		"1772067-089_A01", these will be converted to integer CellIDs for you.
		"""

		# Check the ID attributes, and convert as needed from string identifiers
		if not cell_attrs.__contains__("CellID"):
			raise ValueError, "'CellID' attribute is missing from cell_attrs."
		if cell_attrs["CellID"].dtype.kind != 'i' and cell_attrs["CellID"].dtype.kind != 'S':
			raise ValueError, "'CellID' attribute is not of type INTEGER or STRING."
		if cell_attrs["CellID"].dtype.kind == 'S':
			cell_id_mapping = self.get_cell_id_mapping(config.transcriptome)
			cell_attrs["CellID"] = np.array([cell_id_mapping[cell] for cell in cell_attrs["CellID"]])

		if gene_attrs == None:
			gene_attrs = {"TranscriptID":np.zeros((0,))}
		else:
			if not gene_attrs.__contains__("TranscriptID"):
				raise ValueError, "'TranscriptID' attribute is missing from gene_attrs."
			if gene_attrs["TranscriptID"].dtype.kind != 'i' and gene_attrs["TranscriptID"].dtype.kind != 'S':
				raise ValueError, "'TranscriptID' attribute is not of type INTEGER or STRING."
			if gene_attrs["TranscriptID"].dtype.kind == 'S':
				gene_id_mapping = self.get_transcript_id_mapping(config.transcriptome)
				gene_attrs["TranscriptID"] = np.array([gene_id_mapping[gene] for gene in gene_attrs["TranscriptID"]])

		# Send the dataset to MySQL
		if cell_attrs != None:
			print "Uploading cell annotations"
			self._export_attrs_to_mysql(cell_attrs, config.transcriptome, "Cells__" + config.project + "__" + config.dataset, "CellID")
		if gene_attrs != None:
			print "Uploading gene annotations"
			self._export_attrs_to_mysql(gene_attrs, config.transcriptome, "Genes__" + config.project + "__" + config.dataset, "TranscriptID")
		# Save the config
		config.put()
		print "Done."

	def _export_attrs_to_mysql(self, attrs, transcriptome, tablename, pk):
		"""
		Export a set of attributes to a table in MySQL

		Args:
			
			attrs (dict): 			A dictionary of attributes. Keys are attribute names. Values are numpy arrays, all the same length.
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')
			tablename (str): 		Name of the MySQL table (e.g. 'Cells__project__dataset')
			pk (str):				Primary key, e.g. "CellID" or "TranscriptID"

		Returns:
			Nothing

		Tables for custom annotations are stored in table "dataset__<transcriptome>" (e.g. "dataset__hg19_sUCSC"), and are named 
		like so: {Cells|Genes}__<project>__<datatset>. For example, dataset "midbrain_embryo" in
		project "Midbrain" has annotations in Cells__Midbrain__midbrain_embryo and Genes__Midbrain__midbrain_embryo. Since project
		names can be used across transcriptome builds, projects can group together multi-species datasets.
		"""

		fields = attrs.keys()
		formats = []
		schema = []
		for ix in xrange(len(fields)):
			kind = attrs[fields[ix]].dtype.kind
			if kind == "S" or kind == "U":
				formats.append("%s")
				schema.append("`" + fields[ix] + "` text")
			elif kind == "b":
				formats.append("%s")
				schema.append("`" + fields[ix] + "` bool")
			elif kind == "f":
				formats.append("%f")
				schema.append("`" + fields[ix] + "` float")
			elif kind == "i" or kind == "u":
				formats.append("%d")
				schema.append("`" + fields[ix] + "` int")
			else:
				raise TypeError, "Unsupported numpy datatype of kind '%s'" % kind


		# Create the table in MySQL
		connection = self.mysql_connection
		cursor = connection.cursor()
		full_tablename = "datasets__" + transcriptome + "." + tablename
		query = """
			CREATE DATABASE IF NOT EXISTS %s;
			DROP TABLE IF EXISTS %s;
			CREATE TABLE %s (
			%s,
			PRIMARY KEY (`%s`)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8;
		""" % ("datasets__" + transcriptome, full_tablename,full_tablename,",".join(schema), pk)
		print query
		cursor.execute(query)
		cursor.close()
		
		# Upload the data
		rows = []
		for ix in xrange(attrs[attrs.keys()[0]].shape[0]):
			row = []
			for a in xrange(len(fields)):
				row.append(formats[a] % (attrs[fields[a]][ix]))
			rows.append(row)

		if len(rows) > 0:
			insert = """
				INSERT INTO %s VALUES %s;
			""" % (full_tablename, ",".join([connection.escape(row) for row in rows]))
			cursor = connection.cursor()
			cursor.execute(insert)
			cursor.close()
			
	def get_transcript_id_mapping(self, transcriptome):
		"""
		Get a dictionary that maps gene names to TranscriptID for the given transcriptome

		Args:
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')

		Returns:
			mapping (dict):		Mapping of gene names ("GeneName" column in "Transcript" table) to TranscriptID

		Performs a SQL query for each call. Best practice is to call it once, then use the resulting mapping for many conversions.
		"""
		connection = self.mysql_connection

		cursor = connection.cursor()
		cursor.execute("""
			SELECT GeneName, jos_aaatranscriptomeid TranscriptID FROM jos_aaatranscript t1
			JOIN jos_aaatranscriptome t2 ON t1.jos_aaatranscriptomeid = t2.id 
			WHERE t2.name = %s
		""", transcriptome)
		rows = cursor.fetchall()
		cursor.close()

		mapping = {}
		for j in xrange(len(rows)):
			mapping[rows[j][0]] = rows[j][1]
		cursor.close()
		return mapping

	def get_cell_id_mapping(self, transcriptome):
		"""
		Get a dictionary that maps cell string identifiers to CellID for the given transcriptome

		Args:
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')

		Returns:
			mapping (dict):		Mapping of gene names ("GeneName" column in "Transcript" table) to TranscriptID

		Performs a SQL query for each call. Best practice is to call it once, then use the resulting mapping for many conversions.
		The resulting dictionary can be used to map identifiers in the style "1772067-089_A01" to integer CellIDs
		"""
		connection = self.mysql_connection

		# Get the transcriptome ID
		try:
			cursor = connection.cursor()
			cursor.execute('SELECT ID from jos_aaatranscriptome WHERE name = %s', transcriptome)
			transcriptome_id = cursor.fetchone()[0]
		except:
			raise ValueError, ("Could not find transcriptome ID for '%s'" % transcriptome)
		cursor.close()

		cursor = connection.cursor()
		cursor.execute("""
			SELECT jos_aaacell.id as CellID, ChipID, ChipWell
			FROM jos_aaacell
			JOIN jos_aaachip ON jos_aaachip.id = jos_aaacell.jos_aaachipid
			JOIN jos_aaaexprblob ON jos_aaacell.id = jos_aaaexprblob.jos_aaacellid
			WHERE jos_aaaexprblob.jos_aaatranscriptomeid = %s
		""", transcriptome_id)
		rows = cursor.fetchall()
		cursor.close()

		mapping = {}
		for j in xrange(len(rows)):
			mapping[rows[j][1] + "_" + rows[j][2]] = rows[j][0]
		cursor.close()
		return mapping

	def list_transcriptomes(self):
		"""
		Get a list of valid transcriptomes

		Args:

		Returns:
			list of strings, valid transcriptomes
		"""
		cursor = self.mysql_connection.cursor()
		cursor.execute("""
			SELECT Name FROM jos_aaatranscriptome;
		""")
		rows = cursor.fetchall()
		return [r[0] for r in rows]



if __name__ == '__main__':
	logger.info("Starting the Loom pipeline...")
	lp = LoomPipeline()
	while True:
		for ds in list_datasets():
			if ds.status == "willcreate":
				lp.create_loom(ds)
				lp.prepare_loom(ds)
				lp.store_loom(ds)
		time.sleep(60*10)
