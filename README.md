# target-position
Resolve target names to positions with the [Sesame](http://cds.u-strasbg.fr/cgi-bin/Sesame) web service.

## Installation

target-position can be installed with npm:

```bash
npm install target-position
```

Alternatively you may use yarn:

```bash
yarn add target-position
```

## Usage

You can use the `targetPosition` function for resolving a target name to the corresponding position.

```javascript
import targetPosition from 'target-position';
// or: const targetPosition = require('target-position').default;

targetPosition('NGC 1234', ['Simbad', 'NED'])
  .then(pos => {
    if (pos) {
      console.log(`Target position:
    Right ascension: ${pos.rightAscension}
    Declination:     ${pos.declination}
    Equinox:         ${pos.equinox}
`);
    } else {
      console.log('No target could be found.');
    }
  })
  .catch(err => {
    console.error(err.message);
  });
```

As shown in this example, `targetPosition` returns a promise, which is either resolved with the target position (if a target is found for the target name) or `null` (otherwise). In case of an error the promise is rejected with an `Error` object.

The position is given as an object with the following properties.

Property | Explanation
---- | ----
rightAscension | The right ascension, in degrees between 0&deg; and 360&deg;
declination | The declination, in degrees between -90&deg; and 90&deg;
equinox | The equinox, as a float.

[Sesame](http://cds.u-strasbg.fr/cgi-bin/Sesame) is used to resolve the target name passed as the first argument to `targetPosition`. The second argument specifies the resolvers Sesame should use. The available options are Simbad, NED and VizieR. They must be given as a list, and the order of the list items determines the order in which Sesame uses the resolvers. The search for a target stops once the first result is found.

For example, in the code above Sesame would first use Simbad to resolve NGC 1234. Only if Simbad returns no result, VizieR is used to resolve this name. If his also fails. the search stops.

The second argument is optional. If it isn't supplied, all of Simbad, NED and VizieR will be queried, in this order. But note that it is an error to pass an empty array as the second argument.

The Sesame web service at https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/ is used. However, if you prefer, you may instead use its Harvard mirror, https://vizier.cfa.harvard.edu/viz-bin/nph-sesame/. You do this by calling the `setMirror` function before calling `targetPosition`.

```javascript
import { setMirror } from 'target-position';
// or: const { setMirror } = require('target-position');

setMirror('https://vizier.cfa.harvard.edu/viz-bin/nph-sesame/');
```

Note the trailing slash at the end of the URL.

## TypeScript

The package ships with a type definition file, so that you should be able to use it in a TypeScript project out of the box.

## Support for browsers and NodeJS

This package works in browsers supported by the [cross-fetch](https://github.com/lquixada/cross-fetch) package. It can also be used with NodeJS.

## Disclaimer

`target-position` is not endorsed by Sesame or any of the resolvers it uses.

## Thanks

Thanks to the University of Strasbourg / CNRS for providing the Sesame web service. Thanks also to Carl-Johan Kihl for his instructive [article on building and publishing a TypeScript package with npm](https://itnext.io/step-by-step-building-and-publishing-an-npm-typescript-package-44fe7164964c).
