import 'zone.js/dist/zone-node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';

import { AppServerModule } from './src/main.server';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';
import * as msal from "@azure/msal-node";


// The Express app is exported so that it can be used by serverless Functions.
export function app() {
  const REDIRECT_URI = "http://localhost:4200/redirect";
  const server = express();
  const distFolder = join(process.cwd(), 'dist/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';
  const config = {
      auth: {
          clientId: process.env.clientId,
          authority: "https://login.microsoftonline.com/common",
          clientSecret: process.env.clientSecret
      },
      system: {
          loggerOptions: {
              loggerCallback(loglevel, message, containsPii) {
                  console.log(message);
              },
              piiLoggingEnabled: false,
              logLevel: msal.LogLevel.Verbose,
          }
      }
  };

  const pca = new msal.ConfidentialClientApplication(config);
  
  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule,
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);
  server.get('/redirect', (req, res) => {
    const tokenRequest:any = {
        code: req.query.code,
        scopes: ["user.read"],
        redirectUri: REDIRECT_URI,
    };

    pca.acquireTokenByCode(tokenRequest).then((response) => {
        //console.log("\nResponse: \n:", response);
        res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
    }).catch((error) => {
        console.log(error);
        res.status(500).send(error);
    });
  });
  // TODO: implement data requests securely
  server.get('/api/**', (req, res) => {
    res.status(404).send('data requests are not yet supported');
  });

  //https://github.com/MicrosoftDocs/azure-docs/issues/39665
  server.get('/.well-known/microsoft-identity-association.json', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.write(
      JSON.stringify({
        associatedApplications: [
          {
            applicationId: '057827f5-f901-4941-a63a-95eece3fca81'
          }
        ]
      })
    );
    res.end();
  });

  //allow static files from this path in client dist folder
  server.use('/statics', express.static(distFolder + '/statics'));

  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', (req, res) => {
    const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri: REDIRECT_URI,
    };

    // get url to sign user in and consent to scopes needed for application
    pca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
        res.redirect(response);
    }).catch((error) => console.log(JSON.stringify(error)));
    
  });

  return server;
}

function run() {
  const port = process.env.PORT || 4200;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
