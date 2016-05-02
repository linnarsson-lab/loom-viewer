from flask import Flask, request, Response
import json
import pystan
import numpy as np
import grequests

model = """
	data {
			int<lower=0> N;				# number of outcomes
			int	<lower=0> K;			# number of predictors
			matrix<lower=0>[N,K] x;		# predictor matrix 
			int y[N];					# outcomes
	}

	parameters {
			vector<lower=0>[K] beta;	# coefficients
			real<lower=0> r;		# overdispersion
	}

	model {	
			vector[N] mu;

			# priors
			r ~ cauchy(0, 1);
			beta ~ pareto(0.01, 1.5);

			# regression
			mu <- x * beta;
			y ~ neg_binomial(mu / r, 1 / r);
	}
"""

def fit(x, y, chains=2, iterations=1000):
	"""
	Run a Bayesian generalized linear regression model on the given design matrix (x) and observed data (y).

	Args:
		x (numpy N-by-M matrix):			The design matrix
		y (numpy K-by-N matrix):			The observed values for K genes

	Returns:
		A numpy K-by-L-by-(M+2) matrix, where L is iterations*chains/2. The (M+2) columns are one for each of the predictors (beta), 
		one for the noise term (r) and one for the log probability (lp_). The L columns is one for each sample (the chains are concatenated).
		Note that if 1000 iterations and 2 chains are requested, the result will be 1000 samples, because half of the samples are used as warm-up.

	Example input, with N = 3, M = 4, K = 2:

		x							y

		1	3	7	2				4	3	6	(observables for gene 1)
			
		2	1	7	8				3	2	8	(observables for gene 2)

		2	3	2	2


	Note that the function will run all the independent inputs (rows in y) in parallel. 
	"""
	reqs = []
	for ix in xrange(y.shape[1]):
		reqs.append(grequests.post('http://localhost:5000', json={'x': x.tolist(),"N": x.shape[0], "K": x.shape[1], "y": y[ix,:].T.tolist()}, stream=True))
	responses = grequests.map(reqs)

	results = []
	for ix in xrange(len(responses)):
		if responses[ix] != None:
			results.append(np.frombuffer(responses[ix].raw.data))
		else:
			result.append(np.zeros((y.shape[0], iterations*chains/2, x.shape[1]) + 2))
	return np.concatenate(result, axis=0)

class StanServer(Flask):
	# Disable cacheing 
	def get_send_file_max_age(self, name):
		return 0

app = StanServer(__name__)

@app.route('/', methods=['POST'])
def regression():					# Run the regression model on a single gene
	data = request.get_json()
	fit = pystan.stan(model_code=model, data=data, iter=1000, chains=2)
	return Response(fit.extract(permuted=False).tobytes(), mimetype="application/octet-stream")

if __name__ == '__main__':
	app.run(debug=False, host="0.0.0.0", port=80)






