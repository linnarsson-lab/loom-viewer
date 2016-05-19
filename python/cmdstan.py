import numpy as np
import os
import subprocess

class CmdStan(object):
	def __init__(self, stan_folder):
		self.stan_folder = stan_folder

	def compile(self, model_name, model_code, debug=True):
		"""
		Complie the model and save it for future use
		
		Args:
			model_name (string):		Name of the model, without the '.stan' extension
			model_code (string):		Code for the model
			debug (bool):				If true, print the output from the Stan compiler
		"""
		current_dir = os.path.realpath(os.curdir)
		os.chdir(self.stan_folder)

		with open("models/" + model_name + ".stan", "w") as model_file:
			model_file.write(model_code)
		process = subprocess.Popen(["make", "models/" + model_name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		output = process.communicate()
		if debug:
			print "*** Verbose output (call with debug=False to suppress) ***"
			print output[0]
			print output[1]
		if process.returncode != 0:
			raise RuntimeError("Model could not be compiled, return code: " + str(process.returncode))

		os.chdir(current_dir)

	def fit(self, model_name, data, chains=2, iterations=1000, method="sample", debug=True):
		"""
		Fit the model using the supplied data and return posterior samples
		
		Args:
			model_name (string):		The name of the model (must be already compiled)
			data (dict): 				Input data as numpy arrays or simple scalars
			chains (int):				Number of parallel chains to run
			iteratons (int):			Number of iterations to run
			method (string): 			"sample", "optimize" or "variational"
			debug (bool):				If true, print verbose error messages instead of raising exceptions
		"""
		current_dir = os.path.realpath(os.curdir)
		os.chdir(self.stan_folder)

		# Save the data in R dump() format
		data_file_name = "data/" + model_name + ".data.R"
		with open(data_file_name, "w") as data_file:
			for key,val in data.items():
				data_file.write(key + " <- ")
				if type(val) == np.ndarray:
					if len(val.shape) == 1:
						data_file.write("c(" + ",".join([str(x) for x in val])+ ")")
					else:
						temp = val.flatten('F')
						data_file.write(("structure(c(" + ",".join([str(x) for x in val.flatten('F')])+ "),.Dim=c(%d,%d))") % val.shape)
				else: # scalar
					data_file.write(str(val))
				data_file.write("\n")
		
		process = subprocess.Popen(["models/" + model_name, method, "data", "file=" + data_file_name, "output", "file=samples/" + model_name + ".csv"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		output = process.communicate()
		if debug:
			print "*** Verbose output (call with debug=False to suppress) ***"
			print output[0]
			print output[1]
		if process.returncode != 0:
			if debug:
				print "ERROR: No samples were generated!"
				return {}
			else:
				raise RuntimeError("No samples were generated, return code: " + str(process.returncode))
			
		params = []
		samples = []
		with open("samples/" + model_name + ".csv","r") as infile:
			for line in infile:
				if line[0:2] == "lp":
					params = line.strip().split(",")
					continue
				if line[0] == "#" or line[0] == "\n":
					continue
				samples.append([float(x) for x in line.split(",")])
		samples = np.array(samples)
		result = {}
		for ix in xrange(len(params)):
			result[params[ix]] = samples[:,ix]

		os.chdir(current_dir)

		return result	
	