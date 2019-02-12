import fetch from "cross-fetch";
import { parseString } from "xml2js";

// Base URL for the Sesame query
let BASE_URL = "https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/";

// The supported name resolver services, in lower case.
const SUPPORTED_RESOLVERS = ["ned", "simbad", "vizier"];

/**
 * A target position.
 *
 * Params:
 * -------
 * rightAscension: Right ascension, in degrees.
 * declination: Declination, in degrees.
 * equinox: Equinox, as a float.
 */
export interface IPosition {
  rightAscension: number;
  declination: number;
  equinox: number;
}

/**
 * A resolver for resolving target names.
 */
type Resolver = "Simbad" | "NED" | "VizieR";

/**
 * Resolve a target name to a position by means of the Sesame web service.
 *
 * The position is returned as an object with a right ascension (in degrees), a
 * declination (in degrees) and an equinox (as a float).
 *
 * The function accepts an array of resolvers. The order of the array items
 * matters; the resolvers are tried in the order they appear in the array, and
 * the first target position found is returned.
 *
 * A promise is returned. If the target can be resolved, the promise is
 * resolved with the target position. Otherwise it is rejected with an Error.
 *
 * Params:
 * -------
 * targetName: Target name.
 * resolvers: Resolvers, in the order in which they should be tried,
 *
 * Returns:
 * --------
 * A promise which is resolved with the target position (if one is found) or
 * rejected with an Error.
 */
export default function targetPosition(
  targetName: string,
  resolvers: Resolver[] = ["Simbad", "NED", "VizieR"]
): Promise<IPosition | null> {
  return new Promise((resolve, reject) => {
    // Make sure we have a target name without leading or trailing white space
    const trimmedTargetName = (targetName && targetName.trim()) || "";

    // Check that there is a target name
    if (!trimmedTargetName) {
      return reject(new Error("The target name is missing."));
    }

    // Check that all resolvers are supported
    const unsupportedResolvers = resolvers.filter(
      resolver => SUPPORTED_RESOLVERS.indexOf(resolver.toLowerCase()) === -1
    );
    if (unsupportedResolvers.length > 0) {
      return reject(
        new Error(`The following resolver${
          unsupportedResolvers.length !== 1 ? "s are" : " is"
          } not supported: ${unsupportedResolvers.join(
          ", "
        )}. The available resolvers are Simbad, NED and VizieR.`)
      );
    }

    // Use lower case throughout for consistency
    const lowerCaseResolvers = resolvers.map(resolver =>
                                               resolver.toLowerCase()
    );

    // Check that there is at least one resolver
    if (lowerCaseResolvers.length === 0) {
      return reject(new Error("At least one resolver must be given."));
    }

    // Check that every resolver is included only once
    if (new Set(lowerCaseResolvers).size !== lowerCaseResolvers.length) {
      return reject(
        new Error("A resolver may be used only once in the array of resolvers.")
      );
    }

    // Encode the target name
    const encodedTargetName = encodeURIComponent(targetName);

    // Get the "code" (such "SNV" or "N") for the selected resolvers
    const resolverCode = lowerCaseResolvers
      .map(resolver => {
        switch (resolver) {
        case "simbad":
          return "S";
        case "ned":
          return "N";
        case "vizier":
          return "V";
        default:
          return "";
        }
      })
      .join("");

    // Construct the query URL
    const url = `${BASE_URL}/-ox/${resolverCode}?${encodedTargetName}`;

    // Parse the response text
    // (cf https://github.com/github/fetch/issues/203#issuecomment-266034180)
    const parseText = (res: Response): Promise<{ text: string, ok: boolean }> => {
      return new Promise((resolve, reject) => {
        res.text().then(text => {
          resolve({
                    text,
                    ok: res.ok
                  });
        })
          .catch(err => {
            reject(err);
          })
      })
    };

    // Query Sesame
    fetch(url)
      .then(parseText)
      .then(res => {
        // Handle errors
        if (!res.ok) {
          throw new Error(res.text);
        }

        /* tslint:disable:no-unsafe-any */
        // Extract the target
        parseString(res.text, (err, root) => {
          const resolver = root.Sesame.Target[0].Resolver;
          if (!resolver || resolver.length === 0) {
            // No target has been found for the name
            return resolve(null);
          }

          // Parse the coordinates
          const ra = parseFloat(resolver[0].jradeg);
          const dec = parseFloat(resolver[0].jdedeg);
          if (!isNaN(ra) && !isNaN(dec)) {
            return resolve({
                             declination: dec,
                             equinox: 2000,
                             rightAscension: ra
                           });
          }

          // We should never get here
          return resolve(null);
        });
      })
      .catch(reject);
  });
}

/**
 * Set the base URL for the Sesame web service.
 *
 * Params:
 * -------
 * url: The base URL for the Desame web service.
 */
export function setMirror(url: string) {
  BASE_URL = url;
}
