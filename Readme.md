for azure deployment:
1. add configuration in azure app service Application settings: 

clientId

clientSecret

baseUri

PORT


2. add Startup Command in general settings:

npm run serve:ssr

** Note:
If you get the npm WARN error below do the following:

npm prune --production

npm WARN read-shrinkwrap This version of npm is compatible with lockfileVersion@1, but package-lock.json was generated for lockfileVersion@2. I'll try to do my best with it!


3. pre-deploy

npm prune --production

npm install

npm run build:ssr

4. Deploy