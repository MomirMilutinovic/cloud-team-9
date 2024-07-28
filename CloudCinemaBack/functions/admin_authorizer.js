const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Create the verifier outside the Lambda handler (= during cold start),
// so the cache can be reused for subsequent invocations. Then, only during the
// first invocation, will the verifier actually need to fetch the JWKS.
const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.CLIENT_ID,
});

exports.handler = async (event, context, callback) => {
  const accessToken = event.authorizationToken;

  let payload;
  try {
    // If the token is not valid, an error is thrown:
    console.log('#ACCESS TOKEN');
    console.log(accessToken);
    payload = await jwtVerifier.verify(accessToken);
  } catch(error) {
    console.log('#Authentication error');
    console.log(error)
    // API Gateway wants this *exact* error message, otherwise it returns 500 instead of 401:
    throw new Error("Unauthorized");
  }

  console.log(payload);
  if (payload['custom:isAdmin']) {
    callback(null, generatePolicy('user', 'Allow', event.methodArn));
  }

  callback(null, generatePolicy('user', 'Deny', event.methodArn));
};

//Preuzeto od: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
// Help function to generate an IAM policy
var generatePolicy = function(principalId, effect, resource) {
  var authResponse = {};
  
  authResponse.principalId = principalId;
  if (effect && resource) {
      var policyDocument = {};
      policyDocument.Version = '2012-10-17'; 
      policyDocument.Statement = [];
      var statementOne = {};
      statementOne.Action = 'execute-api:Invoke'; 
      statementOne.Effect = effect;
      statementOne.Resource = resource;
      policyDocument.Statement[0] = statementOne;
      authResponse.policyDocument = policyDocument;
  }
  
  // Optional output with custom properties of the String, Number or Boolean type.
  authResponse.context = {
      "stringKey": "stringval",
      "numberKey": 123,
      "booleanKey": true
  };
  return authResponse;
}